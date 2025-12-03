// test_template.js - Tester que le template est valide
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

try {
  console.log('📖 Lecture du template...');
  const content = fs.readFileSync('public/plan_template.docx');
  
  console.log('📦 Décompression...');
  const zip = new PizZip(content);
  
  console.log('🔧 Initialisation Docxtemplater...');
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => ""
  });
  
  console.log('✅ Template valide !');
  console.log('\n📋 Tags trouvés:');
  const tags = doc.getFullText().match(/\{[^}]+\}/g) || [];
  [...new Set(tags)].forEach(tag => console.log(`  - ${tag}`));
  
  // Test de rendu avec des données simples
  console.log('\n🧪 Test de rendu...');
  doc.render({
    classe: 'TEST',
    semaine: 99,
    plageSemaine: 'du Test à Test',
    notes: 'Notes de test',
    jours: [
      {
        jourDateComplete: 'Lundi 01 Janvier 2025',
        matieres: [
          {
            matiere: 'Mathématiques',
            Lecon: 'Test leçon',
            travailDeClasse: 'Test travail',
            Support: 'Test support',
            devoirs: 'Test devoirs'
          }
        ]
      }
    ]
  });
  
  console.log('✅ Rendu réussi !');
  
  // Sauvegarder le test
  const buf = doc.getZip().generate({ type: 'nodebuffer' });
  fs.writeFileSync('test_output.docx', buf);
  console.log('✅ Document test sauvegardé: test_output.docx');
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
  console.error(error.stack);
  process.exit(1);
}
