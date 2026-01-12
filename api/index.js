// api/index.js — v1, sélection dynamique du modèle, sortie JSON via prompt (sans generationConfig)

const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const XLSX = require('xlsx');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
const archiver = require('archiver');
const webpush = require('web-push');

// ========================================================================
// ====================== AIDES POUR GÉNÉRATION WORD ======================
// ========================================================================

const xmlEscape = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
};

const containsArabic = (text) => {
  if (typeof text !== 'string') return false;
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
};

const formatTextForWord = (text, options = {}) => {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return '<w:p/>';
  }
  
  // Nettoyer le texte : supprimer les espaces/sauts de ligne avant et après
  const cleanedText = text.trim();
  
  const { color, italic } = options;
  const runPropertiesParts = [];
  runPropertiesParts.push('<w:sz w:val="22"/><w:szCs w:val="22"/>');
  if (color) runPropertiesParts.push(`<w:color w:val="${color}"/>`);
  if (italic) runPropertiesParts.push('<w:i/><w:iCs w:val="true"/>');

  let paragraphProperties = '';
  if (containsArabic(cleanedText)) {
    // Pour le texte arabe : RTL + centré
    paragraphProperties = '<w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr>';
    runPropertiesParts.push('<w:rtl/>');
  }

  const runProperties = `<w:rPr>${runPropertiesParts.join('')}</w:rPr>`;
  
  // Conserver uniquement les sauts de ligne intentionnels de l'enseignant
  const lines = cleanedText.split(/\r\n|\n|\r/);
  const content = lines
    .map(line => `<w:t xml:space="preserve">${xmlEscape(line)}</w:t>`)
    .join('<w:br/>');
  return `<w:p>${paragraphProperties}<w:r>${runProperties}${content}</w:r></w:p>`;
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload());

const MONGO_URL = process.env.MONGO_URL;
const WORD_TEMPLATE_URL = process.env.WORD_TEMPLATE_URL;
const LESSON_TEMPLATE_URL = process.env.LESSON_TEMPLATE_URL;

// Configuration Web Push (VAPID)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BDuAoL4lagqZmYl4BPdCFYBwRhoqGMrcWUFAbF1pMBWq2e0JOV6fL_WitURlXXhXTROGB2vYpnvgSDZfAoZq0Jo';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'TVK1zF6o5s-SK3OQnGCMgu4KZCNxg3py4YA4sMqtItg';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@plan-hebdomadaire.com';

// Configuration de web-push avec les clés VAPID
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push VAPID configuré');
} else {
  console.warn('⚠️ Clés VAPID manquantes - notifications push désactivées');
}

const arabicTeachers = ['Majed', 'Jaber', 'Imad', 'Saeed'];
const englishTeachers = ['Kamel'];

const specificWeekDateRangesNode = {
  1:{start:'2025-08-31',end:'2025-09-04'}, 2:{start:'2025-09-07',end:'2025-09-11'}, 3:{start:'2025-09-14',end:'2025-09-18'}, 4:{start:'2025-09-21',end:'2025-09-25'}, 5:{start:'2025-09-28',end:'2025-10-02'}, 6:{start:'2025-10-05',end:'2025-10-09'}, 7:{start:'2025-10-12',end:'2025-10-16'}, 8:{start:'2025-10-19',end:'2025-10-23'}, 9:{start:'2025-10-26',end:'2025-10-30'},10:{start:'2025-11-02',end:'2025-11-06'},
  11:{start:'2025-11-09',end:'2025-11-13'},12:{start:'2025-11-16',end:'2025-11-20'}, 13:{start:'2025-11-23',end:'2025-11-27'},14:{start:'2025-11-30',end:'2025-12-04'}, 15:{start:'2025-12-07',end:'2025-12-11'},16:{start:'2025-12-14',end:'2025-12-18'}, 17:{start:'2025-12-21',end:'2025-12-25'},18:{start:'2026-01-18',end:'2026-01-22'}, 19:{start:'2026-01-25',end:'2026-01-29'},20:{start:'2026-02-01',end:'2026-02-05'},
  21:{start:'2026-02-08',end:'2026-02-12'},22:{start:'2026-02-15',end:'2026-02-19'}, 23:{start:'2026-02-22',end:'2026-02-26'},24:{start:'2026-03-01',end:'2026-03-05'}, 25:{start:'2026-03-29',end:'2026-04-02'},26:{start:'2026-04-05',end:'2026-04-09'}, 27:{start:'2026-04-12',end:'2026-04-16'},28:{start:'2026-04-19',end:'2026-04-23'}, 29:{start:'2026-04-26',end:'2026-04-30'},30:{start:'2026-05-03',end:'2026-05-07'},
  31:{start:'2026-05-10',end:'2026-05-14'}
};

const validUsers = {
  "Mohamed": "Mohamed", "Abas": "Abas", "Jaber": "Jaber", "Imad": "Imad", "Kamel": "Kamel",
  "Majed": "Majed", "Mohamed Ali": "Mohamed Ali", "Morched": "Morched",
  "Saeed": "Saeed", "Sami": "Sami", "Sylvano": "Sylvano", "Tonga": "Tonga", "Oumarou": "Oumarou", "Zine": "Zine", "Youssouf": "Youssouf"
};

let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db();
  cachedDb = db;
  return db;
}

function formatDateFrenchNode(date) {
  if (!date || isNaN(date.getTime())) return "Date invalide";
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const dayName = days[date.getUTCDay()];
  const dayNum = String(date.getUTCDate()).padStart(2, '0');
  const monthName = months[date.getUTCMonth()];
  const yearNum = date.getUTCFullYear();
  return `${dayName} ${dayNum} ${monthName} ${yearNum}`;
}
function extractDayNameFromString(dayString) {
  if (!dayString || typeof dayString !== 'string') return null;
  const trimmed = dayString.trim();
  const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"];
  
  // Check if it's already just a day name
  if (dayNames.includes(trimmed)) {
    return trimmed;
  }
  
  // Extract day name from formatted date (e.g., "Dimanche 07 Décembre 2025")
  for (const dayName of dayNames) {
    if (trimmed.startsWith(dayName)) {
      return dayName;
    }
  }
  
  return null;
}

function getDateForDayNameNode(weekStartDate, dayName) {
  if (!weekStartDate || isNaN(weekStartDate.getTime())) return null;
  const dayOrder = { "Dimanche": 0, "Lundi": 1, "Mardi": 2, "Mercredi": 3, "Jeudi": 4 };
  const offset = dayOrder[dayName];
  if (offset === undefined) return null;
  const specificDate = new Date(Date.UTC(
    weekStartDate.getUTCFullYear(),
    weekStartDate.getUTCMonth(),
    weekStartDate.getUTCDate()
  ));
  specificDate.setUTCDate(specificDate.getUTCDate() + offset);
  return specificDate;
}
const findKey = (obj, target) => obj ? Object.keys(obj).find(k => k.trim().toLowerCase() === target.toLowerCase()) : undefined;

// ======================= Sélection dynamique du modèle ==================

/**
 * Liste les modèles disponibles via l'API v1 et retourne le premier modèle
 * correspondant à la liste de préférence ET supportant generateContent.
 *
 * On gère les changements de noms (EoL des 1.5, arrivée des 2.5, etc.).
 */
async function resolveGeminiModel(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Impossible de lister les modèles (HTTP ${resp.status}) ${body}`);
  }
  const json = await resp.json();
  const models = Array.isArray(json.models) ? json.models : [];

  // Préférence (ordre décroissant) – ajuste si besoin selon tes coûts/perf
  const preferredNames = [
    // Généraux actuels
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    // Anciennes séries (si encore exposées pour ta clé)
    "gemini-1.5-flash-001",
    "gemini-1.5-pro-002",
    "gemini-1.5-flash"
  ];

  const nameSet = new Map(models.map(m => [m.name, m]));
  // Cherche d'abord dans les préférés
  for (const short of preferredNames) {
    const full = `models/${short}`;
    const m = nameSet.get(full);
    if (m && Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent")) {
      return short;
    }
  }
  // Sinon, prends le premier qui supporte generateContent
  const any = models.find(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"));
  if (any) return any.name.replace(/^models\//, "");

  throw new Error("Aucun modèle compatible v1 trouvé pour votre clé (generateContent). Vérifiez l'accès de la clé et l'API activée.");
}

// ------------------------- Web Push Subscriptions -------------------------

app.post('/api/subscribe', async (req, res) => {
  try {
    const subscription = req.body.subscription;
    const username = req.body.username;
    if (!subscription || !username) {
      return res.status(400).json({ message: 'Subscription et username requis.' });
    }

    const db = await connectToDatabase();
    // Utiliser l'endpoint comme _id pour garantir l'unicité de l'abonnement
    await db.collection('subscriptions').updateOne(
      { _id: subscription.endpoint },
      { $set: { subscription: subscription, username: username, createdAt: new Date() } },
      { upsert: true }
    );

    res.status(201).json({ message: 'Abonnement enregistré.' });
  } catch (error) {
    console.error('Erreur MongoDB /subscribe:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/unsubscribe', async (req, res) => {
  try {
    const endpoint = req.body.endpoint;
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint requis.' });
    }

    const db = await connectToDatabase();
    await db.collection('subscriptions').deleteOne({ _id: endpoint });

    res.status(200).json({ message: 'Abonnement supprimé.' });
  } catch (error) {
    console.error('Erreur MongoDB /unsubscribe:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ------------------------- Rappels Automatiques (Cron) -------------------------

// Fonction utilitaire pour déterminer la semaine actuelle
function getCurrentWeekNumber() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Utiliser UTC pour la comparaison avec les dates stockées

  for (const week in specificWeekDateRangesNode) {
    const dates = specificWeekDateRangesNode[week];
    const startDate = new Date(dates.start + 'T00:00:00Z');
    const endDate = new Date(dates.end + 'T00:00:00Z');

    // Ajouter un jour à la date de fin pour inclure le dernier jour
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    if (today >= startDate && today <= endDate) {
      return parseInt(week, 10);
    }
  }
  return null; // Semaine non trouvée
}

app.get('/api/send-reminders', async (req, res) => {
  try {
    const weekNumber = getCurrentWeekNumber();
    if (!weekNumber) {
      console.log('⚠️ Semaine actuelle non définie dans la configuration.');
      return res.status(200).json({ message: 'Semaine actuelle non définie.' });
    }

    const db = await connectToDatabase();
    const planDocument = await db.collection('plans').findOne({ week: weekNumber });

    if (!planDocument || !planDocument.data || planDocument.data.length === 0) {
      console.log(`⚠️ Aucun plan trouvé pour la semaine ${weekNumber}.`);
      return res.status(200).json({ message: `Aucun plan trouvé pour la semaine ${weekNumber}.` });
    }

    // 1. Identifier les enseignants avec au moins une leçon vide
    const teachersToRemind = new Set();
    const leconKey = findKey(planDocument.data[0] || {}, 'Leçon');

    if (leconKey) {
      planDocument.data.forEach(row => {
        const enseignantKey = findKey(row, 'Enseignant');
        const enseignant = enseignantKey ? row[enseignantKey] : null;
        const lecon = row[leconKey];

        // Si l'enseignant est valide et la leçon est vide ou non définie
        if (enseignant && (!lecon || lecon.trim() === '')) {
          teachersToRemind.add(enseignant);
        }
      });
    }

    if (teachersToRemind.size === 0) {
      console.log(`✅ Tous les plans de la semaine ${weekNumber} semblent complets.`);
      return res.status(200).json({ message: 'Tous les plans sont complets. Aucun rappel envoyé.' });
    }

    console.log(`🔔 Enseignants à rappeler pour S${weekNumber}:`, Array.from(teachersToRemind));

    // 2. Récupérer les abonnements pour ces enseignants
    const subscriptions = await db.collection('subscriptions').find({
      username: { $in: Array.from(teachersToRemind) }
    }).toArray();

    if (subscriptions.length === 0) {
      console.log('⚠️ Aucun abonnement push trouvé pour les enseignants à rappeler.');
      return res.status(200).json({ message: 'Aucun abonnement push trouvé.' });
    }

    // 3. Envoyer les notifications
    const notificationPayload = JSON.stringify({
      title: 'Rappel Plan Hebdomadaire',
      body: `Veuillez compléter votre plan de leçon pour la semaine ${weekNumber}.`,
      icon: '/icons/icon-192x192.png', // Assurez-vous que cette icône existe
      data: {
        url: '/', // URL à ouvrir lors du clic sur la notification
        week: weekNumber
      }
    });

    const sendPromises = subscriptions.map(sub => {
      return webpush.sendNotification(sub.subscription, notificationPayload)
        .then(() => console.log(`Notification envoyée à ${sub.username}`))
        .catch(async (error) => {
          console.error(`Échec envoi notification à ${sub.username}:`, error);
          // Supprimer l'abonnement si l'erreur est 410 Gone (abonnement expiré)
          if (error.statusCode === 410) {
            await db.collection('subscriptions').deleteOne({ _id: sub.subscription.endpoint });
            console.log(`Abonnement expiré pour ${sub.username} supprimé.`);
          }
        });
    });

    await Promise.allSettled(sendPromises);

    res.status(200).json({ 
      message: `${sendPromises.length} rappels tentés.`,
      teachersReminded: Array.from(teachersToRemind)
    });

  } catch (error) {
    console.error('❌ Erreur serveur /send-reminders:', error);
    res.status(500).json({ message: 'Erreur interne /send-reminders.' });
  }
});

// ------------------------- Auth & CRUD simples -------------------------

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongoConfigured: !!MONGO_URL,
    geminiConfigured: !!GEMINI_API_KEY
  });
});

app.post('/api/login', (req, res) => {
  try {
    console.log('[LOGIN] Requête reçue de:', req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    const { username, password } = req.body;
    console.log('[LOGIN] Tentative pour utilisateur:', username);
    
    if (!username || !password) {
      console.log('[LOGIN] Username ou password manquant');
      return res.status(400).json({ success: false, message: 'Nom d\'utilisateur et mot de passe requis' });
    }
    
    if (validUsers[username] && validUsers[username] === password) {
      console.log('[LOGIN] Authentification réussie pour:', username);
      res.status(200).json({ success: true, username: username });
    } else {
      console.log('[LOGIN] Échec authentification pour:', username);
      res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }
  } catch (error) {
    console.error('[LOGIN] CRASH in /api/login:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
});

app.get('/api/plans/:week', async (req, res) => {
  const weekNumber = parseInt(req.params.week, 10);
  if (isNaN(weekNumber)) return res.status(400).json({ message: 'Semaine invalide.' });
  try {
    const db = await connectToDatabase();
    const planDocument = await db.collection('plans').findOne({ week: weekNumber });
    
    if (planDocument) {
      // Récupérer tous les plans de leçon disponibles pour cette semaine
(Content truncated due to size limit. Use page ranges or line ranges to read remaining content)
