# 🧪 GUIDE DE TEST - Plan Hebdomadaire 2025-2026

**Objectif** : Vérifier que le système fonctionne correctement avec la semaine de 5 jours (Dimanche → Jeudi).

---

## ✅ Tests à Effectuer

### Test 1 : Vérification Console Navigateur

1. Ouvrir l'application dans le navigateur
2. Appuyer sur `F12` pour ouvrir la console développeur
3. Taper dans la console :
   ```javascript
   console.log(translations.fr.fullDays)
   ```
4. **Résultat attendu** :
   ```javascript
   ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"]
   ```
5. ✅ **VALIDATION** : Il doit y avoir exactement **5 éléments**, pas de "Vendredi" ou "Samedi"

---

### Test 2 : Sélecteur de Jour (Filtre)

1. Connectez-vous à l'application
2. Sélectionnez une semaine (ex: Semaine 15)
3. Cliquez sur le filtre "Jour" / "Day" / "اليوم"
4. **Résultat attendu** : Le menu déroulant doit afficher uniquement :
   - Tous
   - Dimanche
   - Lundi
   - Mardi
   - Mercredi
   - Jeudi
5. ✅ **VALIDATION** : ❌ Pas de "Vendredi" ou "Samedi" dans la liste

---

### Test 3 : Affichage de la Colonne "Jour"

1. Sélectionnez **Semaine 15** (07/12/2025 - 11/12/2025)
2. Regardez la colonne "Jour" dans le tableau
3. **Résultat attendu** : Vous devriez voir des dates complètes comme :
   - "Dimanche 07 December 2025"
   - "Lundi 08 December 2025"
   - "Mardi 09 December 2025"
   - "Mercredi 10 December 2025"
   - "Jeudi 11 December 2025"
4. ✅ **VALIDATION** : 
   - Les dates doivent être affichées en **format complet**
   - ❌ **Aucune date de Samedi** (13/12/2025 serait un samedi - ne doit PAS apparaître)
   - ❌ **Aucune date de Vendredi** (12/12/2025 serait un vendredi - ne doit PAS apparaître)

---

### Test 4 : Vérification des Périodes

1. Vérifiez la colonne "Période" dans le tableau
2. **Résultat attendu** : Les périodes doivent être affichées telles quelles :
   - 1, 2, 3, 4, 5, 6, 7, 8
3. ✅ **VALIDATION** : 
   - Les périodes restent des **nombres de 1 à 8**
   - ❌ Pas de conversion en noms de jours
   - Chaque jour a **8 périodes**

---

### Test 5 : Génération de Document Word

#### Préparation
1. Connectez-vous à l'application
2. Sélectionnez **Semaine 15**
3. Sélectionnez une classe (ex: "PEI1")

#### Génération
4. Cliquez sur le bouton **"Générer Word par Classe"**
5. Attendez que le document soit téléchargé
6. Ouvrez le fichier Word téléchargé (ex: `plan_s15_PEI1.docx`)

#### Vérification du Document Word
7. **Résultat attendu** dans le document Word :

   **En-tête du document :**
   - Semaine : 15
   - Classe : PEI1 (ou traduction arabe)
   - Période : 07 December 2025 - 11 December 2025

   **Sections de jours (maximum 5) :**
   
   ```
   Dimanche 07 December 2025
   ┌────────┬──────────┬────────┬──────────┬──────────┐
   │Période │ Matière  │ Leçon  │ Travaux  │ Devoirs  │
   ├────────┼──────────┼────────┼──────────┼──────────┤
   │   1    │    ...   │   ...  │   ...    │   ...    │
   │   2    │    ...   │   ...  │   ...    │   ...    │
   │  ...   │    ...   │   ...  │   ...    │   ...    │
   │   8    │    ...   │   ...  │   ...    │   ...    │
   └────────┴──────────┴────────┴──────────┴──────────┘

   Lundi 08 December 2025
   [8 périodes...]

   Mardi 09 December 2025
   [8 périodes...]

   Mercredi 10 December 2025
   [8 périodes...]

   Jeudi 11 December 2025
   [8 périodes...]
   ```

8. ✅ **VALIDATION** :
   - Le document doit contenir **exactement 5 sections de jours**
   - Ordre : Dimanche → Lundi → Mardi → Mercredi → Jeudi
   - ❌ **Aucune section pour Vendredi ou Samedi**
   - Chaque section groupe les **8 périodes du jour**
   - Les données (Matière, Leçon, Travaux, Devoirs) doivent être correctement remplies

---

### Test 6 : Génération Excel

1. Sélectionnez une semaine (ex: Semaine 15)
2. Cliquez sur **"Générer Excel (1 Fichier)"**
3. Ouvrez le fichier Excel téléchargé
4. **Résultat attendu** :
   - Une feuille par classe
   - La colonne "Jour" contient des dates complètes
   - Format : "Dimanche 07 December 2025"
5. ✅ **VALIDATION** :
   - ❌ Aucune ligne avec un Samedi
   - ❌ Aucune ligne avec un Vendredi
   - Les périodes sont affichées : 1-8

---

### Test 7 : Multi-Langues

#### Test en Français
1. Sélectionnez la langue **Français**
2. Vérifiez que les jours affichés sont :
   - Dimanche, Lundi, Mardi, Mercredi, Jeudi

#### Test en Arabe
3. Sélectionnez la langue **العربية** (Arabe)
4. Vérifiez que les jours affichés sont :
   - الأحد (Dimanche)
   - الاثنين (Lundi)
   - الثلاثاء (Mardi)
   - الأربعاء (Mercredi)
   - الخميس (Jeudi)

#### Test en Anglais
5. Sélectionnez la langue **English**
6. Vérifiez que les jours affichés sont :
   - Sunday, Monday, Tuesday, Wednesday, Thursday

7. ✅ **VALIDATION** : 
   - Dans **toutes les langues**, il doit y avoir **exactement 5 jours**
   - ❌ Pas de Friday/Vendredi/الجمعة
   - ❌ Pas de Saturday/Samedi/السبت

---

### Test 8 : Filtrage par Jour

1. Sélectionnez **Semaine 15**
2. Dans le filtre "Jour", sélectionnez **"Lundi"**
3. **Résultat attendu** :
   - Le tableau affiche uniquement les lignes du Lundi (08/12/2025)
   - Les périodes 1-8 pour toutes les classes
4. Changez le filtre pour **"Mercredi"**
5. **Résultat attendu** :
   - Le tableau affiche uniquement les lignes du Mercredi (10/12/2025)
6. ✅ **VALIDATION** :
   - Le filtrage fonctionne correctement
   - Seules les données du jour sélectionné s'affichent

---

## 🔍 Tests de Validation Backend

### Test 9 : Validation des Dates (Console Serveur)

Si vous avez accès aux logs du serveur (Vercel ou local) :

1. Démarrez le serveur en local : `npm start` ou `npm run dev`
2. Sélectionnez une semaine
3. Regardez les logs dans le terminal
4. **Résultat attendu** : Vous devriez voir des logs comme :
   ```
   ✅ Week 15: Start: Dimanche, End: Jeudi
   ✅ validateWeekDateRanges PASSED for all weeks
   ```
5. ✅ **VALIDATION** :
   - ❌ Aucun log d'erreur concernant des samedis
   - Les plages de dates sont validées

---

## 📊 Tableau Récapitulatif des Tests

| # | Test | Résultat Attendu | Status |
|---|------|------------------|--------|
| 1 | Console Browser | 5 jours dans `fullDays` | ⬜ |
| 2 | Filtre Jour | 5 options de jours | ⬜ |
| 3 | Colonne "Jour" | Dates complètes (Dim-Jeu) | ⬜ |
| 4 | Périodes | Affichage 1-8 | ⬜ |
| 5 | Génération Word | 5 sections de jours | ⬜ |
| 6 | Génération Excel | Pas de Vendredi/Samedi | ⬜ |
| 7 | Multi-Langues | 5 jours dans chaque langue | ⬜ |
| 8 | Filtrage par Jour | Fonctionne correctement | ⬜ |
| 9 | Validation Backend | Logs sans erreur | ⬜ |

**Légende** :
- ⬜ À tester
- ✅ Test réussi
- ❌ Test échoué

---

## 🚨 Problèmes Potentiels et Solutions

### Problème 1 : Des samedis apparaissent encore

**Cause possible** : Cache du navigateur
**Solution** :
1. Appuyez sur `Ctrl + Shift + R` (Windows/Linux) ou `Cmd + Shift + R` (Mac)
2. Cela force le rechargement complet sans cache
3. Ou videz le cache du navigateur manuellement

---

### Problème 2 : La génération Word ne produit rien

**Cause possible 1** : Problème de connexion au template Google Docs
**Solution** :
1. Vérifiez que l'URL du template est accessible
2. URL : `https://docs.google.com/document/d/1E4JZY34Mbk7cE4E8Yu3dzG8zJIiraGDJ/export?format=docx`
3. Essayez d'ouvrir cette URL dans un navigateur

**Cause possible 2** : Problème de données
**Solution** :
1. Vérifiez que la semaine sélectionnée contient des données
2. Vérifiez dans la console développeur (F12) s'il y a des erreurs

---

### Problème 3 : Les périodes sont remplacées par des noms de jours

**Cause possible** : Version incorrecte du code
**Solution** :
1. Vérifiez que vous êtes sur la dernière version du repository
2. Commit actuel devrait être : `1230b96`
3. Faites un `git pull origin main` pour récupérer la dernière version

---

## 📞 Support

Si vous rencontrez des problèmes après avoir effectué tous ces tests :

1. **Vérifiez le commit actuel** :
   ```bash
   git log --oneline -1
   # Devrait afficher: 1230b96 docs: Add comprehensive final summary
   ```

2. **Vérifiez les fichiers modifiés** :
   ```bash
   git diff HEAD~5 public/script.js | grep "fullDays"
   # Devrait montrer les tableaux avec 5 jours uniquement
   ```

3. **Redéployez sur Vercel** :
   - Vercel devrait détecter automatiquement les nouveaux commits
   - Attendez que le déploiement soit terminé
   - Testez sur l'URL de production

---

## ✅ Checklist Finale de Validation

Avant de considérer le système comme **100% fonctionnel**, assurez-vous que :

- [ ] ✅ Tous les tests (1-9) sont passés avec succès
- [ ] ✅ Le filtre "Jour" affiche uniquement 5 options
- [ ] ✅ La colonne "Jour" affiche des dates complètes (format long)
- [ ] ✅ Les périodes restent affichées comme 1-8 (pas de conversion)
- [ ] ✅ La génération Word produit des documents avec 5 sections de jours
- [ ] ✅ Aucun samedi n'apparaît nulle part dans l'interface ou les documents
- [ ] ✅ Les 3 langues (FR, AR, EN) fonctionnent correctement
- [ ] ✅ Le filtrage par jour fonctionne
- [ ] ✅ L'export Excel est correct (pas de Vendredi/Samedi)

---

## 🎉 Validation Finale

Une fois **tous les tests réussis** :

**✅ LE SYSTÈME EST 100% FONCTIONNEL ET CONFORME**

Le système respecte maintenant complètement vos exigences :
- 🗓️ Semaine de **5 jours** (Dimanche → Jeudi)
- 📅 **8 périodes** par jour (1-8)
- 📄 Génération **Word et Excel** correcte
- ❌ **Aucun samedi** dans le système
- 🌍 Support **multi-langues** (FR, AR, EN)

---

**Guide créé le** : 2025-12-04  
**Version du système** : 1.0.0 (Stable)  
**Repository** : https://github.com/medch24/Plan-hebdomadaire-2026-Garcons
