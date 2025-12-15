# 🧪 Instructions de Test - Fonctionnalités Plans de Leçon

## ⚠️ PROBLÈME IDENTIFIÉ ET CORRIGÉ

Le problème des boutons de téléchargement absents était dû à un **format incohérent du champ "Jour"**.

### 🐛 Cause du Problème:
- Le champ "Jour" contenait des dates complètes: `"Lundi 15 Décembre 2025"`
- L'ID généré incluait toute la date: `48_Mohamed_PEI1_Maths_P1_Lundi_15_Décembre_2025`
- Lors de la recherche, le système ne trouvait pas de correspondance exacte

### ✅ Solution Appliquée:
- Extraction automatique du **nom du jour uniquement** (Dimanche, Lundi, Mardi, Mercredi, Jeudi)
- Application de la correction dans **2 endroits critiques**:
  1. `/api/plans/:week` - Lors du chargement des données
  2. `/api/save-lesson-plan` - Lors de la sauvegarde

### 📝 Code Ajouté:
```javascript
// Extraire uniquement le nom du jour
const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'];
for (const dayName of dayNames) {
  if (jour.includes(dayName)) {
    jour = dayName;
    break;
  }
}
```

---

## 🚀 Étapes de Test Après Déploiement

### 1️⃣ Vérifier le Déploiement Vercel

1. Aller sur **Vercel Dashboard**
2. Vérifier que le dernier commit est déployé
3. Attendre la fin du déploiement (1-2 minutes)
4. URL: https://plan-hebdomadaire-2026-boys.vercel.app

---

### 2️⃣ Test de la Fonctionnalité 1: Auto-enregistrement

**Objectif:** Vérifier que les plans générés sont automatiquement sauvegardés.

#### Étapes:
1. **Se connecter en tant que Mohamed (coordinateur)**
   - Username: `Mohamed`
   - Password: `Mohamed`

2. **Sélectionner une semaine** (ex: Semaine 16)

3. **Aller dans la section "Génération des Plans de Leçon (Coordinateur)"**

4. **Sélectionner une classe** (ex: PEI1)

5. **Cocher 1-2 matières** (ex: Maths, Sciences)

6. **Cliquer sur "Générer Plans de Leçon Sélectionnés"**

7. **Attendre la génération** (1-2 minutes par plan)

8. **✅ Résultat attendu:**
   - Message: "X plan(s) de leçon généré(s) et sauvegardé(s) avec succès !"
   - Dans la console du navigateur (F12):
     ```
     ✅ Plan 1/2 généré ET sauvegardé automatiquement
     ✅ Plan 2/2 généré ET sauvegardé automatiquement
     ```

#### Vérification MongoDB (Optionnel):
```bash
# Se connecter à MongoDB
mongo "votre_connection_string"

# Lister les plans de la semaine
use votre_database
db.lessonPlans.find({ week: 16 }).pretty()

# Vous devriez voir les plans sauvegardés avec leurs IDs
```

---

### 3️⃣ Test de la Fonctionnalité 2: Boutons de Téléchargement

**Objectif:** Vérifier que les boutons 📥 apparaissent pour les plans générés.

#### Étapes:
1. **Se connecter en tant qu'enseignant** (ex: Kamel)
   - Username: `Kamel`
   - Password: `Kamel`

2. **Sélectionner la même semaine** (ex: Semaine 16)

3. **Vérifier le tableau:**
   - Rechercher les lignes où des plans ont été générés
   - **✅ Résultat attendu:**
     - Bouton 📥 visible dans la colonne "Actions"
     - Bouton présent UNIQUEMENT pour les matières non-arabes
     - Bouton absent pour les lignes sans plan généré

4. **Cliquer sur un bouton 📥**
   - **✅ Résultat attendu:**
     - Téléchargement automatique d'un fichier `.docx`
     - Nom du fichier: `Plan de lecon-Maths-P1-PEI1-Semaine16.docx`
     - Le fichier s'ouvre correctement dans Word

5. **Vérifier les logs console (F12):**
   ```
   ✅ lessonPlanId trouvé: 16_Mohamed_PEI1_Maths_P1_Lundi
   ✅ Bouton téléchargement ajouté pour: 16_Mohamed_PEI1_Maths_P1_Lundi
   Téléchargement du plan de leçon: 16_Mohamed_PEI1_Maths_P1_Lundi
   ```

#### Cas de Test:
- ✅ **Matière française** → Bouton présent
- ✅ **Matière anglaise** → Bouton présent  
- ❌ **Matière arabe** → Bouton ABSENT
- ❌ **Pas de plan généré** → Bouton ABSENT

---

### 4️⃣ Test de la Fonctionnalité 3: Alertes Automatiques

**Objectif:** Vérifier que les alertes sont envoyées aux enseignants.

#### Test Manuel Immédiat:
```bash
# Remplacer par votre clé API
CRON_API_KEY="votre-cle-secrete"

curl -X POST https://plan-hebdomadaire-2026-boys.vercel.app/api/send-weekly-reminders \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\": \"$CRON_API_KEY\"}"
```

**✅ Résultat attendu:**
```json
{
  "message": "Rappels hebdomadaires envoyés pour la semaine 16.",
  "week": 16,
  "day": "Lundi",
  "incompleteCount": 3,
  "notificationsSent": 2,
  "results": [
    {
      "teacher": "Kamel",
      "classes": "PEI1, PEI2",
      "language": "en",
      "status": "sent"
    }
  ]
}
```

#### Test Automatique (GitHub Actions):
1. **Vérifier que le workflow est configuré:**
   - GitHub → Repository → Actions
   - Workflow "Weekly Reminders" doit être visible

2. **Test manuel du workflow:**
   - Cliquer sur "Weekly Reminders"
   - Cliquer sur "Run workflow"
   - Sélectionner "main" ou "genspark_ai_developer"
   - Cliquer "Run workflow"

3. **✅ Résultat attendu:**
   - Exécution réussie (coche verte)
   - Logs montrant l'envoi des notifications
   - Durée: ~30 secondes

#### Test des Notifications Push:
1. **Activer les notifications** (en tant qu'enseignant)
   - Se connecter
   - Cliquer sur le bouton "🔔 Activer Notifications"
   - Autoriser les notifications dans le navigateur

2. **Déclencher une alerte manuellement** (avec cURL ci-dessus)

3. **✅ Résultat attendu:**
   - Notification apparaît dans le système d'exploitation
   - Message en français pour les enseignants français
   - Message en arabe pour les enseignants arabes
   - Message en anglais pour Kamel

---

## 🐛 Dépannage

### Problème 1: Boutons toujours absents

**Solutions:**

#### A. Vider le cache du navigateur:
```
1. F12 → Onglet "Application" ou "Stockage"
2. Cliquer sur "Clear storage" ou "Vider le stockage"
3. Cocher "Cache", "Local Storage", "Session Storage"
4. Cliquer "Clear site data"
5. Recharger la page (Ctrl+R ou Cmd+R)
```

#### B. Vérifier les logs console:
```
F12 → Console
Rechercher:
- "lessonPlanId trouvé" → Boutons devraient apparaître
- "lessonPlanId non trouvé" → Plans non générés ou ID incorrect
```

#### C. Vérifier les données API:
```javascript
// Dans la console du navigateur (F12)
fetch('/api/plans/16')
  .then(r => r.json())
  .then(data => {
    console.log('Plans disponibles:', data.planData.filter(r => r.lessonPlanId));
  });
```

#### D. Forcer la régénération des plans:
```
1. Se connecter en tant que Mohamed
2. Régénérer les plans pour une semaine spécifique
3. Recharger la page en tant qu'enseignant
```

---

### Problème 2: Erreur 401 pour les alertes

**Cause:** Clé API incorrecte ou manquante

**Solution:**
1. Vérifier Vercel → Settings → Environment Variables
2. `CRON_API_KEY` doit être définie
3. La même clé doit être dans GitHub → Settings → Secrets
4. Redéployer l'application après modification

---

### Problème 3: Workflow GitHub Actions ne se déclenche pas

**Causes possibles:**
- Le fichier workflow n'est pas sur la branche `main`
- Les secrets GitHub ne sont pas configurés
- Les permissions GitHub Actions sont désactivées

**Solution:**
```bash
# Vérifier que le fichier existe
git checkout main
ls -la .github/workflows/weekly-reminders.yml

# Si absent, l'ajouter
git checkout genspark_ai_developer -- .github/workflows/weekly-reminders.yml
git add .github/workflows/weekly-reminders.yml
git commit -m "chore: Ajout workflow alertes hebdomadaires"
git push origin main
```

---

## 📊 Checklist Complète de Vérification

### Avant le Test:
- [ ] Code déployé sur Vercel
- [ ] Variables d'environnement configurées (`CRON_API_KEY`, `MONGO_URL`, etc.)
- [ ] Base de données MongoDB accessible
- [ ] Application accessible via https://plan-hebdomadaire-2026-boys.vercel.app

### Tests Fonctionnels:
- [ ] Génération de plans → Sauvegarde automatique
- [ ] Boutons 📥 visibles pour les plans générés
- [ ] Téléchargement de plans → Fichier .docx correct
- [ ] Boutons absents pour matières arabes
- [ ] Alertes envoyées via cURL
- [ ] Workflow GitHub Actions exécuté avec succès
- [ ] Notifications push reçues sur les appareils

### Tests de Régression:
- [ ] Chargement du plan hebdomadaire fonctionne
- [ ] Édition des cellules fonctionne
- [ ] Sauvegarde des lignes fonctionne
- [ ] Génération Word par classe fonctionne
- [ ] Génération Excel fonctionne

---

## 📞 Support

Si les tests échouent:

1. **Consulter les logs Vercel:**
   - Vercel Dashboard → Votre projet → Functions → api/index.js
   - Filtrer par "lessonPlanId" ou "[Save Lesson Plan]"

2. **Consulter la console du navigateur:**
   - F12 → Console
   - Rechercher les erreurs en rouge

3. **Tester l'API directement:**
   ```bash
   # Vérifier les plans disponibles
   curl https://plan-hebdomadaire-2026-boys.vercel.app/api/plans/16
   
   # Vérifier un plan spécifique
   curl https://plan-hebdomadaire-2026-boys.vercel.app/api/lesson-plans/16
   ```

4. **Vérifier MongoDB:**
   - Se connecter à MongoDB Atlas ou votre instance
   - Vérifier la collection `lessonPlans`
   - Compter les documents: `db.lessonPlans.countDocuments()`

---

## ✅ Succès Attendu

Après tous les tests:
- ✅ Les plans générés sont sauvegardés automatiquement
- ✅ Les boutons 📥 apparaissent pour les plans disponibles
- ✅ Le téléchargement fonctionne correctement
- ✅ Les alertes sont envoyées automatiquement le lundi
- ✅ Les enseignants reçoivent des notifications jusqu'à remplissage

**Le système est opérationnel! 🎉**
