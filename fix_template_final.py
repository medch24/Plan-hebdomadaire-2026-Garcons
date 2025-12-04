#!/usr/bin/env python3
"""
Script pour nettoyer les balises fragmentées dans un template Word
en préservant la structure XML valide
"""
import zipfile
import re
import os
import sys
from xml.etree import ElementTree as ET

def extract_text_from_run(run_elem):
    """Extrait tout le texte d'un <w:r> (run)"""
    texts = []
    for t_elem in run_elem.findall('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
        if t_elem.text:
            texts.append(t_elem.text)
    return ''.join(texts)

def set_run_text(run_elem, new_text):
    """Définit le texte d'un run en supprimant les anciens <w:t> et en créant un nouveau"""
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    
    # Supprimer tous les <w:t> existants
    for t_elem in run_elem.findall('.//w:t', ns):
        run_elem.remove(t_elem)
    
    # Créer un nouveau <w:t> avec le texte
    t_new = ET.Element('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')
    t_new.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    t_new.text = new_text
    run_elem.append(t_new)

def fix_template(input_path, output_path):
    """Nettoie le template Word"""
    print(f"📖 Lecture du template: {input_path}")
    
    # Extraire le zip
    with zipfile.ZipFile(input_path, 'r') as zip_ref:
        zip_ref.extractall('temp_fix')
    
    # Lire document.xml
    doc_path = 'temp_fix/word/document.xml'
    tree = ET.parse(doc_path)
    root = tree.getroot()
    
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    
    # Trouver tous les paragraphes
    paragraphs = root.findall('.//w:p', ns)
    
    print(f"📄 {len(paragraphs)} paragraphes trouvés")
    
    tags_found = set()
    tags_fixed = 0
    
    for para in paragraphs:
        runs = para.findall('.//w:r', ns)
        
        # Parcourir les runs pour trouver des balises fragmentées
        i = 0
        while i < len(runs):
            run = runs[i]
            text = extract_text_from_run(run)
            
            # Si le run contient { mais pas }
            if '{' in text and '}' not in text:
                # Accumuler le texte des runs suivants
                combined_text = text
                runs_to_merge = [run]
                j = i + 1
                
                while j < len(runs) and '}' not in combined_text:
                    next_run = runs[j]
                    next_text = extract_text_from_run(next_run)
                    combined_text += next_text
                    runs_to_merge.append(next_run)
                    j += 1
                
                # Si on a trouvé une balise complète
                if '{' in combined_text and '}' in combined_text:
                    # Extraire la balise
                    match = re.search(r'\{[^}]+\}', combined_text)
                    if match:
                        tag = match.group(0)
                        tags_found.add(tag)
                        
                        # Mettre le tag dans le premier run
                        set_run_text(runs_to_merge[0], tag)
                        
                        # Supprimer les runs suivants
                        for run_to_remove in runs_to_merge[1:]:
                            para.remove(run_to_remove)
                        
                        tags_fixed += 1
                        print(f"  ✅ Fusion: {tag}")
                        
                        # Mettre à jour la liste des runs
                        runs = para.findall('.//w:r', ns)
            
            i += 1
    
    print(f"\n📊 {tags_fixed} balises fusionnées")
    print(f"📋 Balises trouvées: {', '.join(sorted(tags_found))}")
    
    # Sauvegarder le XML
    tree.write(doc_path, encoding='utf-8', xml_declaration=True)
    
    # Recréer le zip
    print(f"\n📦 Création du nouveau fichier...")
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root_dir, dirs, files in os.walk('temp_fix'):
            for file in files:
                file_path = os.path.join(root_dir, file)
                arcname = file_path.replace('temp_fix/', '')
                zipf.write(file_path, arcname)
    
    # Nettoyer
    import shutil
    shutil.rmtree('temp_fix')
    
    file_size = os.path.getsize(output_path)
    print(f"✅ Template nettoyé: {output_path} ({file_size} octets)")

if __name__ == '__main__':
    input_file = sys.argv[1] if len(sys.argv) > 1 else 'template_reference.docx'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'template_clean_final.docx'
    
    try:
        fix_template(input_file, output_file)
        print("\n✅ Terminé avec succès!")
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
