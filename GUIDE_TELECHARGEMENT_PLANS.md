# 📥 Guide de Téléchargement des Plans de Leçon

## 🎯 Problème Résolu
Les boutons de téléchargement des plans de leçon apparaissent maintenant automatiquement devant chaque ligne.

## ✅ Solutions Implémentées

### 1️⃣ **Génération et Téléchargement ZIP Automatique (Coordinateur)**

**Comment ça marche :**
1. Se connecter en tant que **Mohamed** (Coordinateur)
2. Sélectionner la **semaine** (ex: Semaine 16)
3. Cliquer sur "**📋 Générer Plans de Leçon**"
4. Cocher les **classes** et **matières** à générer (matières arabes exclues automatiquement)
5. Cliquer sur "**Générer les Plans Sélectionnés**"

**Résultat :**
- ✅ Tous les plans sont générés par l'IA (Gemini)
- ✅ Chaque plan est **automatiquement sauvegardé** dans MongoDB
- ✅ Un fichier **ZIP** est téléchargé automatiquement : `Plans_Lecon_SemaineX_2025-12-16.zip`
- ✅ Le ZIP contient tous les plans générés au format `.docx`

---

### 2️⃣ **Boutons de Téléchargement Individuels (Enseignants)**

**Quand apparaît le bouton 📥 ?**
Le bouton de téléchargement apparaît **SEULEMENT** si :
1. ✅ Un plan a été **généré par le coordinateur**
2. ✅ Le plan est **sauvegardé dans MongoDB**
3. ✅ La matière **n'est PAS une matière arabe** (Arabe, Coran, Hadith, etc.)

**Comment télécharger un plan individuel ?**
1. Se connecter en tant qu'**enseignant** (ex: Kamel, Omar, etc.)
2. Sélectionner la **semaine**
3. Regarder la colonne **Actions** (dernière colonne)
4. Si un bouton **📥** apparaît, cliquer dessus
5. Le plan `.docx` se télécharge automatiquement

---

## 🔧 Diagnostic et Résolution des Problèmes

### **Outil de Diagnostic Interactif**

**Page de diagnostic :**
```
https://plan-hebdomadaire-2026-boys.vercel.app/diagnostic-plans.html
```

Cette page permet de :
- ✅ Voir combien de plans sont sauvegardés dans MongoDB
- ✅ Vérifier si les IDs correspondent correctement
- ✅ Identifier les plans manquants
- ✅ Diagnostiquer les problèmes d'extraction de jour

**Endpoint API de diagnostic :**
```
GET /api/debug/lesson-plans/:week
```

Exemple : `https://plan-hebdomadaire-2026-boys.vercel.app/api/debug/lesson-plans/16`

**Réponse JSON attendue :**
```json
{
  "week": 16,
  "lessonPlansCount": 25,
  "planRowsCount": 120,
  "lessonPlans": [...],
  "samplePlanRows": [...]
}
```

---

### **Problème : Pas de bouton de téléchargement**

#### **Solution 1 : Vérifier que les plans existent**
1. Ouvrir `https://plan-hebdomadaire-2026-boys.vercel.app/diagnostic-plans.html`
2. Entrer le numéro de semaine
3. Vérifier que `lessonPlansCount` > 0

**Si `lessonPlansCount` = 0 :**
➡️ **Aucun plan généré**. Se connecter en tant que Mohamed et générer les plans.

#### **Solution 2 : Effacer le cache du navigateur**
1. Appuyer sur **F12** (Outils de développement)
2. Aller dans **Application** > **Storage** > **Clear site data**
3. Cliquer sur **Clear site data**
4. Recharger la page (**F5**)

#### **Solution 3 : Vérifier la console**
1. Appuyer sur **F12**
2. Aller dans l'onglet **Console**
3. Regarder les messages lors du chargement de la semaine

**Messages attendus :**
```
📋 Plans disponibles pour S16: ["16_Mohamed_6A_Maths_1_Lundi", ...]
✅ lessonPlanId trouvé: 16_Mohamed_6A_Maths_1_Lundi
✅ Bouton téléchargement ajouté pour: 16_Mohamed_6A_Maths_1_Lundi
```

**Messages d'erreur possibles :**
```
⚠️ lessonPlanId non trouvé: 16_Mohamed_6A_Maths_1_Lundi
⚠️ Matière arabe exclue: Arabe
```

---

## 🚀 Actions Immédiates Recommandées

### **1. Merger la Pull Request**
➡️ https://github.com/medch24/Plan-hebdomadaire-2026-Garcons/pull/5

### **2. Attendre le déploiement Vercel**
Vérifier que le déploiement est terminé sur https://vercel.com

### **3. Tester la génération**
1. Se connecter en tant que **Mohamed**
2. Générer les plans pour **Semaine 16** (ou semaine actuelle)
3. Vérifier que le ZIP se télécharge automatiquement

### **4. Tester le téléchargement individuel**
1. Se connecter en tant qu'**enseignant** (ex: Kamel)
2. Vérifier que les boutons **📥** apparaissent
3. Cliquer sur un bouton et vérifier que le plan se télécharge

### **5. Utiliser l'outil de diagnostic**
```
https://plan-hebdomadaire-2026-boys.vercel.app/diagnostic-plans.html
```

---

## 📊 Matières Exclues (Pas de Bouton)

Les matières suivantes sont **automatiquement exclues** :
- ❌ Arabe / العربية / اللغة العربية
- ❌ Coran / قرآن / القرآن
- ❌ Tajwid / تجويد / التجويد
- ❌ Hadith / حديث / الحديث
- ❌ Éducation Islamique / تربية / islamique
- ❌ Tawhid / توحيد / التوحيد
- ❌ Fiqh / فقه / الفقه

**Raison :** Ces matières nécessitent un traitement spécifique en arabe.

---

## 🐛 Dépannage Avancé

### **Erreur : "JSZip non chargé"**
✅ **Solution :** JSZip est maintenant chargé via CDN dans `public/index.html`

### **Erreur : "saveAs non disponible"**
✅ **Solution :** FileSaver.js est maintenant chargé via CDN dans `public/index.html`

### **Erreur 404 : Plan introuvable**
✅ **Solution :**
1. Vérifier avec l'outil de diagnostic
2. Régénérer le plan si nécessaire

### **Les boutons n'apparaissent toujours pas**
✅ **Solutions :**
1. Effacer le cache du navigateur
2. Vérifier la console (F12) pour les erreurs
3. Utiliser l'outil de diagnostic
4. Régénérer tous les plans pour la semaine

---

## ✅ Checklist Finale

- [ ] Pull Request mergée
- [ ] Déploiement Vercel terminé
- [ ] Cache navigateur effacé
- [ ] Plans générés par Mohamed (coordinateur)
- [ ] ZIP téléchargé automatiquement
- [ ] Boutons 📥 visibles pour les enseignants
- [ ] Téléchargement individuel fonctionnel
- [ ] Outil de diagnostic vérifié
- [ ] Matières arabes correctement exclues

---

**Date de dernière mise à jour :** 2025-12-16  
**Version :** 3.0 (Solution finale avec outil de diagnostic)
