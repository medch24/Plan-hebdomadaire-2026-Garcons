// fix_template.js - Nettoyer le template Word pour fusionner les balises fragmentées
const fs = require('fs');
const PizZip = require('pizzip');

// Fonction pour nettoyer les balises fragmentées dans le XML
function fixFragmentedTags(xmlContent) {
  // Pattern pour trouver les balises docxtemplater fragmentées
  // Exemple: {</w:t>...@</w:t>...devoirs}
  
  // Étape 1: Supprimer les runs XML entre les parties d'une balise
  let fixed = xmlContent;
  
  // Fusionner les fragments de balises sur plusieurs <w:r>
  // Pattern: {X</w:t></w:r>...<w:r>...<w:t>Y}
  const fragmentPattern = /(\{[^}]*)<\/w:t><\/w:r>.*?<w:r[^>]*>.*?<w:t[^>]*>([^{]*\})/g;
  
  let iterations = 0;
  let previousFixed = '';
  
  // Répéter jusqu'à ce qu'il n'y ait plus de changement (pour les fragments multiples)
  while (fixed !== previousFixed && iterations < 20) {
    previousFixed = fixed;
    fixed = fixed.replace(fragmentPattern, (match, start, end) => {
      // Extraire juste les balises sans le XML
      const cleanStart = start.replace(/<[^>]+>/g, '');
      const cleanEnd = end.replace(/<[^>]+>/g, '');
      const completeTag = cleanStart + cleanEnd;
      
      // Si c'est une balise valide, la garder
      if (completeTag.match(/^\{[#@\/]?[a-zA-Z_]+\}$/)) {
        return `<w:t xml:space="preserve">${completeTag}</w:t></w:r><w:r><w:t xml:space="preserve">`;
      }
      return match;
    });
    iterations++;
  }
  
  console.log(`Nettoyage effectué en ${iterations} itérations`);
  
  return fixed;
}

// Fonction principale
async function fixTemplate(inputPath, outputPath) {
  try {
    console.log('📖 Lecture du template:', inputPath);
    const content = fs.readFileSync(inputPath);
    const zip = new PizZip(content);
    
    // Lire document.xml
    const documentXml = zip.file('word/document.xml').asText();
    console.log('📄 Taille du document.xml:', documentXml.length, 'caractères');
    
    // Afficher les balises trouvées avant nettoyage
    const tagsBefore = documentXml.match(/\{[^}]*\}/g) || [];
    console.log('\n=== BALISES AVANT NETTOYAGE ===');
    const uniqueTagsBefore = [...new Set(tagsBefore)].filter(t => 
      t.includes('@') || t.includes('#') || t.includes('/')
    );
    uniqueTagsBefore.forEach(tag => console.log(tag));
    
    // Nettoyer
    console.log('\n🔧 Nettoyage des balises fragmentées...');
    const fixedXml = fixFragmentedTags(documentXml);
    
    // Afficher les balises après nettoyage
    const tagsAfter = fixedXml.match(/\{[^}]*\}/g) || [];
    console.log('\n=== BALISES APRÈS NETTOYAGE ===');
    const uniqueTagsAfter = [...new Set(tagsAfter)].filter(t => 
      t.includes('@') || t.includes('#') || t.includes('/')
    );
    uniqueTagsAfter.forEach(tag => console.log(tag));
    
    // Mettre à jour le zip
    zip.file('word/document.xml', fixedXml);
    
    // Générer le nouveau fichier
    const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(outputPath, buf);
    
    console.log('\n✅ Template nettoyé sauvegardé:', outputPath);
    console.log('Taille:', buf.length, 'octets');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
}

// Exécution
const inputPath = process.argv[2] || 'template_reference.docx';
const outputPath = process.argv[3] || 'template_fixed.docx';

fixTemplate(inputPath, outputPath)
  .then(() => {
    console.log('\n✅ Terminé avec succès!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Échec:', error.message);
    process.exit(1);
  });
