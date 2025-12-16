# 🔔 Activation des Alertes Automatiques pour Enseignants

## 📋 Vue d'ensemble

Le système d'alertes automatiques envoie des notifications push aux enseignants qui n'ont pas complété leurs plans hebdomadaires.

### ⏰ Fréquence des Alertes:
- **Jour**: UNIQUEMENT le **LUNDI**
- **Heures**: Toutes les **3 heures** (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC)
- **Condition**: L'enseignant a au moins un champ "Travaux de classe" vide
- **Arrêt**: Dès que l'enseignant remplit tous ses "Travaux de classe"

---

## 🚀 MÉTHODE SIMPLE: Utiliser cron-job.org (RECOMMANDÉ)

### Étape 1: Générer une Clé API

```bash
# Sur votre ordinateur ou sur https://www.random.org/strings/
openssl rand -base64 32
```

Exemple de clé générée:
```
Kx7vQ2pL9mN3wR8tY4uI6oP0aS5dF1gH2jK3lZ4xC6v=
```

---

### Étape 2: Configurer Vercel

1. Allez sur **Vercel Dashboard**
2. Sélectionnez votre projet: `plan-hebdomadaire-2026-boys`
3. **Settings** → **Environment Variables**
4. Cliquez **Add New**
5. Nom: `CRON_API_KEY`
6. Valeur: Collez la clé générée
7. Cochez toutes les environnements (Production, Preview, Development)
8. Cliquez **Save**
9. **Redéployer l'application** (Deployments → ... → Redeploy)

---

### Étape 3: Créer un compte sur cron-job.org

1. Allez sur **https://cron-job.org/**
2. Créez un compte gratuit
3. Confirmez votre email

---

### Étape 4: Créer le Cron Job

1. Cliquez sur **"Create cronjob"**

2. **Configuration de base:**
   - **Title**: `Alertes Enseignants - Plans Hebdomadaires`
   - **URL**: `https://plan-hebdomadaire-2026-boys.vercel.app/api/send-weekly-reminders`
   
3. **Request Settings:**
   - **Request method**: `POST`
   - **Request body**: Cliquez sur "Enable request body"
   - **Content type**: `application/json`
   - **Body**:
     ```json
     {
       "apiKey": "Kx7vQ2pL9mN3wR8tY4uI6oP0aS5dF1gH2jK3lZ4xC6v="
     }
     ```
     ⚠️ **Remplacez par votre vraie clé API!**

4. **Schedule Settings:**
   - **Schedule type**: `Custom`
   - **Cron expression**: `0 */3 * * 1`
   
   Explication:
   - `0` = À la minute 0
   - `*/3` = Toutes les 3 heures
   - `*` = Tous les jours du mois
   - `*` = Tous les mois
   - `1` = Uniquement le lundi (0=Dimanche, 1=Lundi, ..., 6=Samedi)

5. **Timezone**: Sélectionnez `UTC` ou votre timezone

6. **Cliquez sur "Create cronjob"**

---

### Étape 5: Tester le Cron Job

1. Sur cron-job.org, trouvez votre cronjob
2. Cliquez sur **"Run now"** (même si ce n'est pas lundi)
3. Vérifiez le statut:
   - ✅ **200 OK** = Succès
   - ❌ **401** = Clé API incorrecte
   - ❌ **500** = Erreur serveur

4. Cliquez sur **"View log"** pour voir la réponse:
   ```json
   {
     "message": "Pas lundi aujourd'hui. Aucune alerte envoyée.",
     "day": "Dimanche",
     "timestamp": "2025-12-15T..."
   }
   ```
   C'est normal si ce n'est pas lundi!

---

## 🧪 Test Manuel Immédiat

Pour tester sans attendre lundi:

```bash
# Remplacez par votre vraie clé API
curl -X POST https://plan-hebdomadaire-2026-boys.vercel.app/api/send-weekly-reminders \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "Kx7vQ2pL9mN3wR8tY4uI6oP0aS5dF1gH2jK3lZ4xC6v="}'
```

**Réponse attendue (si pas lundi):**
```json
{
  "message": "Pas lundi aujourd'hui. Aucune alerte envoyée.",
  "day": "Dimanche",
  "timestamp": "2025-12-15T..."
}
```

**Réponse attendue (si lundi):**
```json
{
  "message": "Rappels hebdomadaires envoyés pour la semaine 16.",
  "week": 16,
  "day": "Lundi",
  "hour": 9,
  "incompleteCount": 3,
  "notificationsSent": 2,
  "results": [...]
}
```

---

## 📱 Activer les Notifications Push (Enseignants)

Pour que les enseignants reçoivent les alertes:

### Pour chaque enseignant:

1. **Se connecter à l'application**
   - https://plan-hebdomadaire-2026-boys.vercel.app

2. **Autoriser les notifications**
   - Une popup apparaîtra demandant l'autorisation
   - Cliquer sur "Autoriser" ou "Allow"
   
3. **Si la popup n'apparaît pas:**
   - Vérifier les paramètres du navigateur
   - Chrome: Paramètres → Confidentialité → Notifications → Autoriser
   - Firefox: Préférences → Vie privée → Permissions → Notifications

4. **Tester la notification:**
   - Console du navigateur (F12)
   - Exécuter:
     ```javascript
     window.NotificationManager.test('votre_nom_utilisateur')
     ```

---

## 🔍 Vérifier que ça fonctionne

### 1. Vérifier les logs Vercel:

1. **Vercel Dashboard** → Votre projet
2. **Functions** → `api/index.js`
3. Filtrer par: `[Weekly Reminders]`

Logs à chercher:
```
✅ [Weekly Reminders] Notification envoyée à Mohamed (fr)
📊 [Weekly Reminders] 3 enseignants incomplets: ["Mohamed", "Kamel", "Sami"]
```

### 2. Vérifier sur cron-job.org:

1. Aller sur votre cronjob
2. **Execution history**
3. Voir les dernières exécutions:
   - ✅ Vert = Succès (200 OK)
   - ❌ Rouge = Erreur

---

## 🐛 Dépannage

### Erreur 401: Non autorisé

**Cause**: La clé API est incorrecte

**Solution**:
1. Vérifiez que la clé dans Vercel = la clé dans cron-job.org
2. Assurez-vous qu'il n'y a pas d'espaces avant/après
3. Redéployez Vercel après modification

---

### Erreur 500: Erreur serveur

**Cause**: Problème avec MongoDB ou le code

**Solution**:
1. Vérifiez les logs Vercel
2. Vérifiez que `MONGO_URL` est configuré
3. Testez la connexion MongoDB

---

### Les enseignants ne reçoivent pas de notifications

**Causes possibles**:
1. L'enseignant n'a pas activé les notifications
2. Le navigateur bloque les notifications
3. L'abonnement push est invalide

**Solution**:
1. Demander à l'enseignant de réactiver les notifications
2. Tester avec:
   ```javascript
   window.NotificationManager.test('nom_enseignant')
   ```

---

### Le cron job ne se déclenche pas

**Causes possibles**:
1. Le cron job est désactivé
2. L'expression cron est incorrecte
3. Le compte cron-job.org a expiré

**Solution**:
1. Vérifier que le cronjob est activé (toggle ON)
2. Vérifier l'expression: `0 */3 * * 1`
3. Vérifier votre compte cron-job.org

---

## 📊 Monitoring

### Statistiques à surveiller:

1. **Nombre d'enseignants incomplets** chaque lundi
2. **Taux de complétion** des plans au fil de la semaine
3. **Nombre de notifications envoyées** vs reçues

### Consulter les stats dans MongoDB:

```javascript
// Se connecter à MongoDB
use votre_database

// Compter les enseignants incomplets
db.plans.aggregate([
  { $match: { week: 16 } },
  { $unwind: "$data" },
  { $match: { "data.Travaux de classe": { $in: [null, ""] } } },
  { $group: { _id: "$data.Enseignant", count: { $sum: 1 } } }
])

// Vérifier les abonnements push actifs
db.pushSubscriptions.countDocuments()
```

---

## ✅ Checklist de Validation

Avant de considérer le système opérationnel:

- [ ] `CRON_API_KEY` configuré dans Vercel
- [ ] Vercel redéployé avec la nouvelle variable
- [ ] Cron job créé sur cron-job.org
- [ ] Test manuel réussi avec cURL
- [ ] Au moins un enseignant a activé les notifications
- [ ] Notification de test reçue avec succès
- [ ] Logs Vercel montrent `[Weekly Reminders]`
- [ ] Expression cron `0 */3 * * 1` configurée

---

## 🎯 Résultat Attendu

Une fois configuré:

✅ **Chaque lundi:**
- Le système vérifie automatiquement tous les plans
- Identifie les enseignants avec des champs vides
- Envoie des notifications push personnalisées
- En français pour les enseignants français
- En arabe pour les enseignants arabes
- En anglais pour Kamel

✅ **Toutes les 3 heures (le lundi):**
- Les alertes continuent jusqu'à ce que l'enseignant remplisse son plan
- Dès que "Travaux de classe" est rempli → Plus d'alertes

✅ **Résultat:**
- Taux de complétion des plans proche de 100%
- Moins de retards et d'oublis
- Conformité automatique garantie

---

**Le système est maintenant activé! 🚀**
