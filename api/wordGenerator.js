// wordGenerator.js - Génération de documents Word sans template externe
const { Document, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel, BorderStyle } = require('docx');

/**
 * Crée un document Word pour un plan hebdomadaire
 * @param {Object} data - Données du plan
 * @param {number} data.semaine - Numéro de la semaine
 * @param {string} data.classe - Nom de la classe
 * @param {string} data.plageSemaine - Plage de dates
 * @param {Array} data.jours - Tableau des jours avec leurs matières
 * @param {string} data.notes - Notes de classe
 * @returns {Document} Document Word
 */
function createWeeklyPlanDocument({ semaine, classe, plageSemaine, jours, notes }) {
  const sections = [];
  
  // En-tête du document
  const headerParagraphs = [
    new Paragraph({
      text: "PLAN HEBDOMADAIRE",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Année scolaire 2025-2026`,
          bold: false,
          size: 24
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `CLASSE: `,
          bold: true,
          size: 28,
          color: "FF0000"
        }),
        new TextRun({
          text: classe,
          bold: true,
          size: 28
        }),
        new TextRun({
          text: `     SEMESTRE: 1`,
          bold: true,
          size: 28
        })
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Semaine: `,
          bold: true,
          size: 24,
          color: "0000FF"
        }),
        new TextRun({
          text: `${semaine}     `,
          bold: true,
          size: 24
        }),
        new TextRun({
          text: plageSemaine,
          bold: false,
          size: 24,
          color: "FF0000"
        })
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 300 }
    })
  ];

  sections.push(...headerParagraphs);

  // Contenu des jours
  if (jours && jours.length > 0) {
    jours.forEach((jour, jourIndex) => {
      // Séparateur de jour
      sections.push(
        new Paragraph({
          text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 }
        })
      );

      // Nom du jour avec date
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: jour.jourDateComplete || "Jour inconnu",
              bold: true,
              size: 28,
              color: "0000FF"
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 }
        })
      );

      sections.push(
        new Paragraph({
          text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );

      // Matières du jour
      if (jour.matieres && jour.matieres.length > 0) {
        jour.matieres.forEach((matiere, matiereIndex) => {
          // Nom de la matière
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `📚 Matière: `,
                  bold: true,
                  size: 24
                }),
                new TextRun({
                  text: matiere.matiere || "",
                  bold: true,
                  size: 24,
                  color: "000080"
                })
              ],
              spacing: { before: 150, after: 100 }
            })
          );

          // Leçon
          if (matiere.Lecon) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `📖 Leçon: `,
                    bold: true,
                    size: 22
                  }),
                  new TextRun({
                    text: extractTextFromFormattedObject(matiere.Lecon),
                    size: 22,
                    color: "FF0000"
                  })
                ],
                spacing: { after: 80 }
              })
            );
          }

          // Travail de classe
          if (matiere.travailDeClasse) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `✏️ Travail de classe: `,
                    bold: true,
                    size: 22
                  }),
                  new TextRun({
                    text: extractTextFromFormattedObject(matiere.travailDeClasse),
                    size: 22
                  })
                ],
                spacing: { after: 80 }
              })
            );
          }

          // Support
          if (matiere.Support) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `📋 Support: `,
                    bold: true,
                    size: 22
                  }),
                  new TextRun({
                    text: extractTextFromFormattedObject(matiere.Support),
                    size: 22,
                    color: "FF0000",
                    italics: true
                  })
                ],
                spacing: { after: 80 }
              })
            );
          }

          // Devoirs
          if (matiere.devoirs) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `📝 Devoirs: `,
                    bold: true,
                    size: 22
                  }),
                  new TextRun({
                    text: extractTextFromFormattedObject(matiere.devoirs),
                    size: 22,
                    color: "0000FF"
                  })
                ],
                spacing: { after: 150 }
              })
            );
          }

          // Ligne séparatrice entre matières
          if (matiereIndex < jour.matieres.length - 1) {
            sections.push(
              new Paragraph({
                text: "- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -",
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 100 }
              })
            );
          }
        });
      } else {
        sections.push(
          new Paragraph({
            text: "Aucune matière pour ce jour",
            italics: true,
            spacing: { after: 200 }
          })
        );
      }
    });
  } else {
    sections.push(
      new Paragraph({
        text: "Aucun jour à afficher",
        italics: true,
        spacing: { after: 200 }
      })
    );
  }

  // Notes de classe
  if (notes) {
    sections.push(
      new Paragraph({
        text: "",
        spacing: { before: 400 }
      })
    );
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Notes de la classe:",
            bold: true,
            size: 26,
            underline: {}
          })
        ],
        spacing: { before: 200, after: 150 }
      })
    );
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: extractTextFromFormattedObject(notes),
            size: 22
          })
        ]
      })
    );
  }

  // Créer le document
  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });

  return doc;
}

/**
 * Extrait le texte d'un objet formaté créé par formatTextForWord
 * @param {Object|string} obj - Objet formaté ou chaîne simple
 * @returns {string} Texte extrait
 */
function extractTextFromFormattedObject(obj) {
  if (typeof obj === 'string') {
    return obj;
  }
  
  if (obj && typeof obj === 'object') {
    // Si c'est un objet avec des fragments
    if (Array.isArray(obj)) {
      return obj.map(fragment => {
        if (typeof fragment === 'string') return fragment;
        if (fragment.text) return fragment.text;
        return '';
      }).join('');
    }
    
    // Si c'est un objet avec une propriété text
    if (obj.text) {
      return obj.text;
    }
  }
  
  return '';
}

module.exports = { createWeeklyPlanDocument };
