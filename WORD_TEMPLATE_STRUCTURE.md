# Structure du Template Word

## Variables disponibles

Le template Word doit utiliser les balises suivantes pour afficher correctement les données :

### Variables simples
- `{semaine}` : Numéro de la semaine (ex: 15)
- `{classe}` : Nom de la classe (ex: "6A")
- `{plageSemaine}` : Plage de dates de la semaine (ex: "du Dimanche 30 Novembre 2025 à Jeudi 04 Décembre 2025")
- `{notes}` : Notes de classe (texte formaté avec sauts de ligne)

### Boucle sur les jours
Le template doit contenir une boucle pour afficher chaque jour :

```
{#jours}
  {jourDateComplete}
  
  {#matieres}
    Matière: {matiere}
    Leçon: {Lecon}
    Travail de classe: {travailDeClasse}
    Support: {Support}
    Devoirs: {devoirs}
  {/matieres}
{/jours}
```

## Structure des données envoyées

```json
{
  "semaine": 15,
  "classe": "6A",
  "plageSemaine": "du Dimanche 30 Novembre 2025 à Jeudi 04 Décembre 2025",
  "notes": {...formatted text...},
  "jours": [
    {
      "jourDateComplete": "Dimanche 30 Novembre 2025",
      "matieres": [
        {
          "matiere": "Mathématiques",
          "Lecon": {...formatted text...},
          "travailDeClasse": {...formatted text...},
          "Support": {...formatted text...},
          "devoirs": {...formatted text...}
        }
      ]
    },
    {
      "jourDateComplete": "Lundi 01 Décembre 2025",
      "matieres": [...]
    }
  ]
}
```

## Format des textes formatés

Les champs `Lecon`, `travailDeClasse`, `Support`, `devoirs`, et `notes` sont formatés avec la fonction `formatTextForWord()` qui :
- Préserve les sauts de ligne
- Applique des couleurs (rouge pour Leçon et Support, bleu pour devoirs)
- Applique l'italique au Support

## Balises Word requises

Le template Word (.docx) doit utiliser :
1. **Boucle paragraphLoop** activée : `{#jours}...{/jours}` pour itérer sur les jours
2. **Boucle imbriquée** : `{#matieres}...{/matieres}` pour itérer sur les matières de chaque jour
3. **Balises simples** : `{jourDateComplete}`, `{matiere}`, etc. pour afficher les valeurs

## Exemple de template Word

```
Plan Hebdomadaire - Semaine {semaine}
Classe: {classe}
Période: {plageSemaine}

{#jours}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{jourDateComplete}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{#matieres}
📚 Matière: {matiere}
📖 Leçon: {Lecon}
✏️ Travail de classe: {travailDeClasse}
📋 Support: {Support}
📝 Devoirs: {devoirs}

{/matieres}
{/jours}

Notes de la classe:
{notes}
```

## Vérification

Pour vérifier que le template est correct :
1. Assurez-vous que les balises `{#jours}` et `{/jours}` encadrent bien tout le contenu répétitif des jours
2. Assurez-vous que les balises `{#matieres}` et `{/matieres}` encadrent bien tout le contenu répétitif des matières
3. Vérifiez que `{jourDateComplete}` est à l'intérieur de `{#jours}` mais à l'extérieur de `{#matieres}`
4. Vérifiez que les noms de balises correspondent exactement (sensible à la casse)
