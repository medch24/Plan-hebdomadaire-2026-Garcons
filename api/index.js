// api/index.js — v1, sélection dynamique du modèle, sortie JSON via prompt (sans generationConfig)

const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const XLSX = require('xlsx');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
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
  11:{start:'2025-11-09',end:'2025-11-13'},12:{start:'2025-11-16',end:'2025-11-20'}, 13:{start:'2025-11-23',end:'2025-11-27'},14:{start:'2025-11-30',end:'2025-12-04'}, 15:{start:'2025-12-07',end:'2025-12-11'},16:{start:'2025-12-14',end:'2025-12-18'}, 17:{start:'2025-12-21',end:'2025-12-25'},18:{start:'2025-12-28',end:'2026-01-01'}, 19:{start:'2026-01-04',end:'2026-01-08'},20:{start:'2026-01-11',end:'2026-01-15'},
  21:{start:'2026-01-18',end:'2026-01-22'},22:{start:'2026-01-25',end:'2026-01-29'}, 23:{start:'2026-02-01',end:'2026-02-05'},24:{start:'2026-02-08',end:'2026-02-12'}, 25:{start:'2026-02-15',end:'2026-02-19'},26:{start:'2026-02-22',end:'2026-02-26'}, 27:{start:'2026-03-01',end:'2026-03-05'},28:{start:'2026-03-08',end:'2026-03-12'}, 29:{start:'2026-03-15',end:'2026-03-19'},30:{start:'2026-03-22',end:'2026-03-26'},
  31:{start:'2026-03-29',end:'2026-04-02'},32:{start:'2026-04-05',end:'2026-04-09'}, 33:{start:'2026-04-12',end:'2026-04-16'},34:{start:'2026-04-19',end:'2026-04-23'}, 35:{start:'2026-04-26',end:'2026-04-30'},36:{start:'2026-05-03',end:'2026-05-07'}, 37:{start:'2026-05-10',end:'2026-05-14'},38:{start:'2026-05-17',end:'2026-05-21'}, 39:{start:'2026-05-24',end:'2026-05-28'},40:{start:'2026-05-31',end:'2026-06-04'},
  41:{start:'2026-06-07',end:'2026-06-11'},42:{start:'2026-06-14',end:'2026-06-18'}, 43:{start:'2026-06-21',end:'2026-06-25'},44:{start:'2026-06-28',end:'2026-07-02'}, 45:{start:'2026-07-05',end:'2026-07-09'},46:{start:'2026-07-12',end:'2026-07-16'}, 47:{start:'2026-07-19',end:'2026-07-23'},48:{start:'2026-07-26',end:'2026-07-30'}
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
      const lessonPlans = await db.collection('lessonPlans')
        .find({ week: weekNumber }, { projection: { _id: 1 } })
        .toArray();
      
      // Créer un Set des IDs disponibles pour recherche rapide
      const availableLessonPlanIds = new Set(lessonPlans.map(lp => lp._id));
      
      // Enrichir les données avec lessonPlanId si disponible
      console.log(`📋 Plans disponibles pour S${weekNumber}:`, Array.from(availableLessonPlanIds));
      
      const enrichedData = (planDocument.data || []).map(row => {
        const enseignant = row[findKey(row, 'Enseignant')] || '';
        const classe = row[findKey(row, 'Classe')] || '';
        const matiere = row[findKey(row, 'Matière')] || '';
        const periode = row[findKey(row, 'Période')] || '';
        const jour = row[findKey(row, 'Jour')] || '';
        
        const potentialLessonPlanId = `${weekNumber}_${enseignant}_${classe}_${matiere}_${periode}_${jour}`.replace(/\s+/g, '_');
        
        if (availableLessonPlanIds.has(potentialLessonPlanId)) {
          console.log(`✅ lessonPlanId trouvé: ${potentialLessonPlanId}`);
          return { ...row, lessonPlanId: potentialLessonPlanId };
        } else {
          console.log(`⚠️ lessonPlanId non trouvé: ${potentialLessonPlanId}`);
        }
        return row;
      });
      
      res.status(200).json({ planData: enrichedData, classNotes: planDocument.classNotes || {} });
    } else {
      res.status(200).json({ planData: [], classNotes: {} });
    }
  } catch (error) {
    console.error('Erreur MongoDB /plans/:week:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/save-plan', async (req, res) => {
  const weekNumber = parseInt(req.body.week, 10);
  const data = req.body.data;
  if (isNaN(weekNumber) || !Array.isArray(data)) return res.status(400).json({ message: 'Données invalides.' });
  try {
    const db = await connectToDatabase();
    await db.collection('plans').updateOne(
      { week: weekNumber },
      { $set: { data: data } },
      { upsert: true }
    );
    res.status(200).json({ message: `Plan S${weekNumber} enregistré.` });
  } catch (error) {
    console.error('Erreur MongoDB /save-plan:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/save-notes', async (req, res) => {
  const weekNumber = parseInt(req.body.week, 10);
  const { classe, notes } = req.body;
  if (isNaN(weekNumber) || !classe) return res.status(400).json({ message: 'Données invalides.' });
  try {
    const db = await connectToDatabase();
    await db.collection('plans').updateOne(
      { week: weekNumber },
      { $set: { [`classNotes.${classe}`]: notes } },
      { upsert: true }
    );
    res.status(200).json({ message: 'Notes enregistrées.' });
  } catch (error) {
    console.error('Erreur MongoDB /save-notes:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/save-row', async (req, res) => {
  const weekNumber = parseInt(req.body.week, 10);
  const rowData = req.body.data;
  if (isNaN(weekNumber) || typeof rowData !== 'object') return res.status(400).json({ message: 'Données invalides.' });
  try {
    const db = await connectToDatabase();
    const updateFields = {};
    const now = new Date();
    for (const key in rowData) {
      updateFields[`data.$[elem].${key}`] = rowData[key];
    }
    updateFields['data.$[elem].updatedAt'] = now;

    const arrayFilters = [{
      "elem.Enseignant": rowData[findKey(rowData, 'Enseignant')],
      "elem.Classe": rowData[findKey(rowData, 'Classe')],
      "elem.Jour": rowData[findKey(rowData, 'Jour')],
      "elem.Période": rowData[findKey(rowData, 'Période')],
      "elem.Matière": rowData[findKey(rowData, 'Matière')]
    }];

    const result = await db.collection('plans').updateOne(
      { week: weekNumber },
      { $set: updateFields },
      { arrayFilters: arrayFilters }
    );

    if (result.modifiedCount > 0 || result.matchedCount > 0) {
      res.status(200).json({ message: 'Ligne enregistrée.', updatedData: { updatedAt: now } });
    } else {
      res.status(404).json({ message: 'Ligne non trouvée.' });
    }
  } catch (error) {
    console.error('Erreur MongoDB /save-row:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Correction MongoDB ($ne dupliqué → $nin)
app.get('/api/all-classes', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const classes = await db.collection('plans').distinct('data.Classe', { 'data.Classe': { $nin: [null, ""] } });
    res.status(200).json((classes || []).sort());
  } catch (error) {
    console.error('Erreur MongoDB /api/all-classes:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// --------------------- Génération Word (plan hebdo) ---------------------

app.post('/api/generate-word', async (req, res) => {
  try {
    const { week, classe, data, notes } = req.body;
    const weekNumber = Number(week);
    if (!Number.isInteger(weekNumber) || !classe || !Array.isArray(data)) {
      return res.status(400).json({ message: 'Données invalides.' });
    }

    let templateBuffer;
    try {
      const response = await fetch(WORD_TEMPLATE_URL);
      if (!response.ok) throw new Error(`Échec modèle Word (${response.status})`);
      templateBuffer = Buffer.from(await response.arrayBuffer());
    } catch (e) {
      console.error("Erreur de récupération du modèle Word:", e);
      return res.status(500).json({ message: `Erreur récup modèle Word.` });
    }

    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      nullGetter: () => "",
    });

    const groupedByDay = {};
    const dayOrder = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"];
    const datesNode = specificWeekDateRangesNode[weekNumber];
    let weekStartDateNode = null;
    if (datesNode?.start) {
      weekStartDateNode = new Date(datesNode.start + 'T00:00:00Z');
    }
    if (!weekStartDateNode || isNaN(weekStartDateNode.getTime())) {
      return res.status(500).json({ message: `Dates serveur manquantes pour S${weekNumber}.` });
    }

    const sampleRow = data[0] || {};
    const jourKey = findKey(sampleRow, 'Jour'),
          periodeKey = findKey(sampleRow, 'Période'),
          matiereKey = findKey(sampleRow, 'Matière'),
          leconKey = findKey(sampleRow, 'Leçon'),
          travauxKey = findKey(sampleRow, 'Travaux de classe'),
          supportKey = findKey(sampleRow, 'Support'),
          devoirsKey = findKey(sampleRow, 'Devoirs');

    data.forEach(item => {
      const day = item[jourKey];
      if (day && dayOrder.includes(day)) {
        if (!groupedByDay[day]) groupedByDay[day] = [];
        groupedByDay[day].push(item);
      }
    });

    const joursData = dayOrder.map(dayName => {
      if (!groupedByDay[dayName]) return null;

      const dateOfDay = getDateForDayNameNode(weekStartDateNode, dayName);
      const formattedDate = dateOfDay ? formatDateFrenchNode(dateOfDay) : dayName;
      const sortedEntries = groupedByDay[dayName].sort((a, b) => (parseInt(a[periodeKey], 10) || 0) - (parseInt(b[periodeKey], 10) || 0));

      const matieres = sortedEntries.map(item => ({
        matiere: item[matiereKey] ?? "",
        Lecon: formatTextForWord(item[leconKey], { color: 'FF0000' }),
        travailDeClasse: formatTextForWord(item[travauxKey]),
        Support: formatTextForWord(item[supportKey], { color: 'FF0000', italic: true }),
        devoirs: formatTextForWord(item[devoirsKey], { color: '0000FF', italic: true })
      }));

      return { jourDateComplete: formattedDate, matieres: matieres };
    }).filter(Boolean);

    let plageSemaineText = `Semaine ${weekNumber}`;
    if (datesNode?.start && datesNode?.end) {
      const startD = new Date(datesNode.start + 'T00:00:00Z');
      const endD = new Date(datesNode.end + 'T00:00:00Z');
      if (!isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
        plageSemaineText = `du ${formatDateFrenchNode(startD)} à ${formatDateFrenchNode(endD)}`;
      }
    }

    const templateData = {
      semaine: weekNumber,
      classe: classe,
      jours: joursData,
      notes: formatTextForWord(notes),
      plageSemaine: plageSemaineText
    };

    doc.render(templateData);

    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    const filename = `Plan_hebdomadaire_S${weekNumber}_${classe.replace(/[^a-z0-9]/gi, '_')}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buf);

  } catch (error) {
    console.error('❌ Erreur serveur /generate-word:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erreur interne /generate-word.' });
    }
  }
});

// --------------------- Génération Excel (workbook) ---------------------

app.post('/api/generate-excel-workbook', async (req, res) => {
  try {
    const weekNumber = Number(req.body.week);
    if (!Number.isInteger(weekNumber)) return res.status(400).json({ message: 'Semaine invalide.' });

    const db = await connectToDatabase();
    const planDocument = await db.collection('plans').findOne({ week: weekNumber });
    if (!planDocument?.data?.length) return res.status(404).json({ message: `Aucune donnée pour S${weekNumber}.` });

    const finalHeaders = [ 'Enseignant', 'Jour', 'Période', 'Classe', 'Matière', 'Leçon', 'Travaux de classe', 'Support', 'Devoirs' ];
    const formattedData = planDocument.data.map(item => {
      const row = {};
      finalHeaders.forEach(header => {
        const itemKey = findKey(item, header);
        row[header] = itemKey ? item[itemKey] : '';
      });
      return row;
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(formattedData, { header: finalHeaders });
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
      { wch: 45 }, { wch: 45 }, { wch: 25 }, { wch: 45 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, `Plan S${weekNumber}`);

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const filename = `Plan_Hebdomadaire_S${weekNumber}_Complet.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('❌ Erreur serveur /generate-excel-workbook:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Erreur interne Excel.' });
  }
});

// --------------- Rapport Excel par classe (toutes semaines) ------------

app.post('/api/full-report-by-class', async (req, res) => {
  try {
    const { classe: requestedClass } = req.body;
    if (!requestedClass) return res.status(400).json({ message: 'Classe requise.' });

    const db = await connectToDatabase();
    const allPlans = await db.collection('plans').find({}).sort({ week: 1 }).toArray();
    if (!allPlans || allPlans.length === 0) return res.status(404).json({ message: 'Aucune donnée.' });

    const dataBySubject = {};
    const monthsFrench = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

    allPlans.forEach(plan => {
      const weekNumber = plan.week;
      let monthName = 'N/A';
      const weekDates = specificWeekDateRangesNode[weekNumber];
      if (weekDates?.start) {
        try {
          const startDate = new Date(weekDates.start + 'T00:00:00Z');
          monthName = monthsFrench[startDate.getUTCMonth()];
        } catch (e) {}
      }

      (plan.data || []).forEach(item => {
        const itemClassKey = findKey(item, 'classe');
        const itemSubjectKey = findKey(item, 'matière');
        if (itemClassKey && item[itemClassKey] === requestedClass && itemSubjectKey && item[itemSubjectKey]) {
          const subject = item[itemSubjectKey];
          if (!dataBySubject[subject]) dataBySubject[subject] = [];
          const row = {
            'Mois': monthName,
            'Semaine': weekNumber,
            'Période': item[findKey(item, 'période')] || '',
            'Leçon': item[findKey(item, 'leçon')] || '',
            'Travaux de classe': item[findKey(item, 'travaux de classe')] || '',
            'Support': item[findKey(item, 'support')] || '',
            'Devoirs': item[findKey(item, 'devoirs')] || ''
          };
          dataBySubject[subject].push(row);
        }
      });
    });

    const subjectsFound = Object.keys(dataBySubject);
    if (subjectsFound.length === 0) return res.status(404).json({ message: `Aucune donnée pour la classe '${requestedClass}'.` });

    const workbook = XLSX.utils.book_new();
    const headers = ['Mois', 'Semaine', 'Période', 'Leçon', 'Travaux de classe', 'Support', 'Devoirs'];

    subjectsFound.sort().forEach(subject => {
      const safeSheetName = subject.substring(0, 30).replace(/[*?:/\\\[\]]/g, '_');
      const worksheet = XLSX.utils.json_to_sheet(dataBySubject[subject], { header: headers });
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 40 }, { wch: 40 }, { wch: 25 }, { wch: 40 }
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
    });

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    const filename = `Rapport_Complet_${requestedClass.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('❌ Erreur serveur /full-report-by-class:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Erreur interne du rapport.' });
  }
});

// --------------------- Génération IA (REST, v1, modèle dynamique) ------

app.post('/api/generate-ai-lesson-plan', async (req, res) => {
  try {
    console.log('📝 [AI Lesson Plan] Nouvelle demande de génération');
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error('❌ [AI Lesson Plan] Clé API GEMINI manquante');
      return res.status(503).json({ message: "Le service IA n'est pas initialisé. Vérifiez la clé API GEMINI du serveur." });
    }

    const lessonTemplateUrl = process.env.LESSON_TEMPLATE_URL || LESSON_TEMPLATE_URL;
    if (!lessonTemplateUrl) {
      console.error('❌ [AI Lesson Plan] URL du template de leçon manquante');
      return res.status(503).json({ message: "L'URL du modèle de leçon Word n'est pas configurée." });
    }

    const { week, rowData } = req.body;
    if (!rowData || typeof rowData !== 'object' || !week) {
      console.error('❌ [AI Lesson Plan] Données invalides:', { week, hasRowData: !!rowData });
      return res.status(400).json({ message: "Les données de la ligne ou de la semaine sont manquantes." });
    }
    
    console.log(`✅ [AI Lesson Plan] Génération pour semaine ${week}`);

    // Charger le modèle Word
    let templateBuffer;
    try {
      const response = await fetch(lessonTemplateUrl);
      if (!response.ok) throw new Error(`Échec du téléchargement du modèle Word (${response.status})`);
      templateBuffer = Buffer.from(await response.arrayBuffer());
    } catch (e) {
      console.error("Erreur de récupération du modèle Word:", e);
      return res.status(500).json({ message: "Impossible de récupérer le modèle de leçon depuis l'URL fournie." });
    }

    // Extraire données
    const enseignant = rowData[findKey(rowData, 'Enseignant')] || '';
    const classe = rowData[findKey(rowData, 'Classe')] || '';
    const matiere = rowData[findKey(rowData, 'Matière')] || '';
    const lecon = rowData[findKey(rowData, 'Leçon')] || '';
    const jour = rowData[findKey(rowData, 'Jour')] || '';
    const seance = rowData[findKey(rowData, 'Période')] || '';
    const support = rowData[findKey(rowData, 'Support')] || 'Non spécifié';
    const travaux = rowData[findKey(rowData, 'Travaux de classe')] || 'Non spécifié';
    const devoirsPrevus = rowData[findKey(rowData, 'Devoirs')] || 'Non spécifié';
    
    console.log(`📚 [AI Lesson Plan] Données: ${enseignant} | ${classe} | ${matiere} | ${lecon}`);

    // Date formatée
    let formattedDate = "";
    const weekNumber = Number(week);
    const datesNode = specificWeekDateRangesNode[weekNumber];
    if (jour && datesNode?.start) {
      const weekStartDateNode = new Date(datesNode.start + 'T00:00:00Z');
      if (!isNaN(weekStartDateNode.getTime())) {
        // Extract day name from the jour field (in case it contains a full date)
        const dayName = extractDayNameFromString(jour);
        if (dayName) {
          const dateOfDay = getDateForDayNameNode(weekStartDateNode, dayName);
          if (dateOfDay) formattedDate = formatDateFrenchNode(dateOfDay);
        }
      }
    }

    // Prompt + structure JSON
    const jsonStructure = `{"TitreUnite":"un titre d'unité pertinent pour la leçon","Methodes":"liste des méthodes d'enseignement","Outils":"liste des outils de travail","Objectifs":"une liste concise des objectifs d'apprentissage (compétences, connaissances), séparés par des sauts de ligne (\\\\n). Commence chaque objectif par un tiret (-).","etapes":[{"phase":"Introduction","duree":"5 min","activite":"Description de l'activité d'introduction pour l'enseignant et les élèves."},{"phase":"Activité Principale","duree":"25 min","activite":"Description de l'activité principale, en intégrant les 'travaux de classe' et le 'support' si possible."},{"phase":"Synthèse","duree":"10 min","activite":"Description de l'activité de conclusion et de vérification des acquis."},{"phase":"Clôture","duree":"5 min","activite":"Résumé rapide et annonce des devoirs."}],"Ressources":"les ressources spécifiques à utiliser.","Devoirs":"une suggestion de devoirs.","DiffLents":"une suggestion pour aider les apprenants en difficulté.","DiffTresPerf":"une suggestion pour stimuler les apprenants très performants.","DiffTous":"une suggestion de différenciation pour toute la classe."}`;

    let prompt;
    if (englishTeachers.includes(enseignant)) {
      prompt = `Return ONLY valid JSON. No markdown, no code fences, no commentary.

As an expert pedagogical assistant, create a detailed 45-minute lesson plan in English. Structure the lesson into timed phases and integrate the teacher's existing notes:
- Subject: ${matiere}, Class: ${classe}, Lesson Topic: ${lecon}
- Planned Classwork: ${travaux}
- Mentioned Support/Materials: ${support}
- Planned Homework: ${devoirsPrevus}

Use the following JSON structure with professional, concrete values in English (keys exactly as specified):
${jsonStructure}`;
    } else if (arabicTeachers.includes(enseignant)) {
      prompt = `أعد فقط JSON صالحًا. بدون Markdown أو أسوار كود أو تعليقات.

بصفتك مساعدًا تربويًا خبيرًا، أنشئ خطة درس مفصلة باللغة العربية مدتها 45 دقيقة. قم ببناء الدرس في مراحل محددة زمنياً وادمج ملاحظات المعلم:
- المادة: ${matiere}، الفصل: ${classe}، الموضوع: ${lecon}
- أعمال الصف المخطط لها: ${travaux}
- الدعم/المواد: ${support}
- الواجبات المخطط لها: ${devoirsPrevus}

استخدم البنية التالية بالقيم المهنية والملموسة (المفاتيح كما هي بالإنجليزية):
${jsonStructure}`;
    } else {
      prompt = `Renvoie UNIQUEMENT du JSON valide. Pas de markdown, pas de blocs de code, pas de commentaire.

En tant qu'assistant pédagogique expert, crée un plan de leçon détaillé de 45 minutes en français. Structure en phases chronométrées et intègre les notes de l'enseignant :
- Matière : ${matiere}, Classe : ${classe}, Thème : ${lecon}
- Travaux de classe : ${travaux}
- Support/Matériel : ${support}
- Devoirs prévus : ${devoirsPrevus}

Utilise la structure JSON suivante (valeurs concrètes et professionnelles ; clés strictement identiques) :
${jsonStructure}`;
    }

    // === Résolution dynamique du modèle compatible v1 ===
    console.log('🤖 [AI Lesson Plan] Résolution du modèle Gemini...');
    const MODEL_NAME = await resolveGeminiModel(GEMINI_API_KEY);
    console.log(`🤖 [AI Lesson Plan] Modèle sélectionné: ${MODEL_NAME}`);
    
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
      contents: [
        { role: "user", parts: [{ text: prompt }] }
      ]
      // Pas de generationConfig pour éviter les 400 sur certains déploiements
    };

    console.log('🔄 [AI Lesson Plan] Appel à l\'API Gemini...');
    const aiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.json().catch(() => ({}));
      console.error("❌ [AI Lesson Plan] Erreur de l'API Google AI:", JSON.stringify(errorBody, null, 2));
      
      // Message spécifique pour quota dépassé
      if (aiResponse.status === 429) {
        throw new Error(`⚠️ QUOTA API GEMINI DÉPASSÉ : Limite gratuite atteinte (20 requêtes/jour). Veuillez réessayer demain ou upgrader votre compte Google AI. Détails : ${errorBody.error?.message || 'Quota dépassé'}`);
      }
      
      throw new Error(`[${aiResponse.status} ${aiResponse.statusText}] ${errorBody.error?.message || "Erreur inconnue de l'API."}`);
    }
    
    console.log('✅ [AI Lesson Plan] Réponse reçue de Gemini');

    const aiResult = await aiResponse.json();

    // Extraction robuste du texte JSON renvoyé
    let text = "";
    try {
      text = aiResult?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text && Array.isArray(aiResult?.candidates?.[0]?.content?.parts)) {
        text = aiResult.candidates[0].content.parts.map(p => p.text || "").join("").trim();
      }
      if (!text && aiResult?.candidates?.[0]?.output_text) {
        text = String(aiResult.candidates[0].output_text).trim();
      }
    } catch (_) {}

    if (!text) {
      console.error("Réponse IA vide ou non reconnue:", JSON.stringify(aiResult, null, 2));
      return res.status(500).json({ message: "Réponse IA vide ou non reconnue." });
    }

    // Parse JSON avec petit nettoyage si Markdown accidentel
    let aiData;
    try {
      aiData = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();
      aiData = JSON.parse(cleaned);
    }

    // Préparer le DOCX
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });

    let minutageString = "";
    let contenuString = "";
    if (aiData.etapes && Array.isArray(aiData.etapes)) {
      minutageString = aiData.etapes.map(e => e.duree || "").join('\n');
      contenuString = aiData.etapes.map(e => `▶ ${e.phase || ""}:\n${e.activite || ""}`).join('\n\n');
    }

    const templateData = {
      ...aiData,
      Semaine: week,
      Lecon: lecon,
      Matiere: matiere,
      Classe: classe,
      Jour: jour,
      Seance: seance,
      NomEnseignant: enseignant,
      Date: formattedDate,
      Deroulement: minutageString,
      Contenu: contenuString,
    };

    doc.render(templateData);
    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

    const sanitizeForFilename = (str) => {
      if (typeof str !== 'string') str = String(str);
      const normalized = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '_')
        .replace(/__+/g, '_');
    };

    const filename = `Plan de lecon-${sanitizeForFilename(matiere)}-${sanitizeForFilename(seance)}-${sanitizeForFilename(classe)}-Semaine${weekNumber}.docx`;
    console.log(`📄 [AI Lesson Plan] Envoi du fichier: ${filename}`);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buf);
    console.log('✅ [AI Lesson Plan] Génération terminée avec succès');

  } catch (error) {
    console.error('❌ Erreur serveur /generate-ai-lesson-plan:', error);
    if (!res.headersSent) {
      const errorMessage = error.message || "Erreur interne.";
      res.status(500).json({ message: `Erreur interne lors de la génération IA: ${errorMessage}` });
    }
  }
});

// Sauvegarder un plan de leçon généré dans MongoDB
app.post('/api/save-lesson-plan', async (req, res) => {
  try {
    console.log('💾 [Save Lesson Plan] Sauvegarde d\'un plan de leçon');
    
    const { week, rowData, fileBuffer, filename } = req.body;
    
    if (!week || !rowData || !fileBuffer || !filename) {
      return res.status(400).json({ message: 'Données manquantes pour la sauvegarde.' });
    }
    
    const db = await connectToDatabase();
    
    // Créer ou mettre à jour le document du plan de leçon
    const enseignant = rowData[findKey(rowData, 'Enseignant')] || '';
    const classe = rowData[findKey(rowData, 'Classe')] || '';
    const matiere = rowData[findKey(rowData, 'Matière')] || '';
    const periode = rowData[findKey(rowData, 'Période')] || '';
    const jour = rowData[findKey(rowData, 'Jour')] || '';
    
    const lessonPlanId = `${week}_${enseignant}_${classe}_${matiere}_${periode}_${jour}`.replace(/\s+/g, '_');
    
    await db.collection('lessonPlans').updateOne(
      { _id: lessonPlanId },
      {
        $set: {
          week: Number(week),
          enseignant,
          classe,
          matiere,
          periode,
          jour,
          filename,
          fileBuffer: Buffer.from(fileBuffer, 'base64'),
          createdAt: new Date(),
          rowData
        }
      },
      { upsert: true }
    );
    
    console.log(`✅ [Save Lesson Plan] Plan sauvegardé: ${lessonPlanId}`);
    res.status(200).json({ success: true, message: 'Plan de leçon sauvegardé.', lessonPlanId });
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde plan de leçon:', error);
    res.status(500).json({ message: 'Erreur lors de la sauvegarde du plan de leçon.' });
  }
});

// Télécharger un plan de leçon depuis MongoDB
app.get('/api/download-lesson-plan/:lessonPlanId', async (req, res) => {
  try {
    const { lessonPlanId } = req.params;
    console.log(`📥 [Download Lesson Plan] Téléchargement: ${lessonPlanId}`);
    
    const db = await connectToDatabase();
    const lessonPlan = await db.collection('lessonPlans').findOne({ _id: lessonPlanId });
    
    if (!lessonPlan) {
      return res.status(404).json({ message: 'Plan de leçon introuvable.' });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${lessonPlan.filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(lessonPlan.fileBuffer.buffer);
    
    console.log(`✅ [Download Lesson Plan] Envoyé: ${lessonPlan.filename}`);
    
  } catch (error) {
    console.error('❌ Erreur téléchargement plan de leçon:', error);
    res.status(500).json({ message: 'Erreur lors du téléchargement du plan de leçon.' });
  }
});

// Obtenir la liste des plans de leçon pour une semaine spécifique
app.get('/api/lesson-plans/:week', async (req, res) => {
  try {
    const week = parseInt(req.params.week, 10);
    if (isNaN(week)) {
      return res.status(400).json({ message: 'Numéro de semaine invalide.' });
    }
    
    console.log(`📋 [Lesson Plans List] Récupération pour semaine ${week}`);
    
    const db = await connectToDatabase();
    const lessonPlans = await db.collection('lessonPlans')
      .find({ week }, { projection: { fileBuffer: 0 } }) // Exclure le buffer pour économiser la bande passante
      .toArray();
    
    console.log(`✅ [Lesson Plans List] ${lessonPlans.length} plan(s) trouvé(s)`);
    res.status(200).json(lessonPlans);
    
  } catch (error) {
    console.error('❌ Erreur récupération liste plans de leçon:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des plans de leçon.' });
  }
});

// --------------------- Système de Notifications Push ---------------------

// Stocker les abonnements push (en production, utiliser une vraie DB)
const pushSubscriptions = new Map();

// Sauvegarder un abonnement push
app.post('/api/subscribe-push', async (req, res) => {
  try {
    const { username, subscription } = req.body;
    if (!username || !subscription) {
      return res.status(400).json({ message: 'Username et subscription requis.' });
    }

    // Sauvegarder dans MongoDB
    const db = await connectToDatabase();
    await db.collection('pushSubscriptions').updateOne(
      { username: username },
      { $set: { subscription: subscription, updatedAt: new Date() } },
      { upsert: true }
    );

    // Cache local
    pushSubscriptions.set(username, subscription);
    
    console.log(`✅ Abonnement push sauvegardé pour ${username}`);
    res.status(200).json({ message: 'Abonnement enregistré avec succès.' });
  } catch (error) {
    console.error('Erreur /subscribe-push:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Désabonner des notifications
app.post('/api/unsubscribe-push', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'Username requis.' });
    }

    const db = await connectToDatabase();
    await db.collection('pushSubscriptions').deleteOne({ username: username });
    pushSubscriptions.delete(username);
    
    console.log(`✅ Désabonnement push pour ${username}`);
    res.status(200).json({ message: 'Désabonnement réussi.' });
  } catch (error) {
    console.error('Erreur /unsubscribe-push:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Messages multilingues pour les notifications
const notificationMessages = {
  fr: {
    title: '⚠️ Plan Hebdomadaire Incomplet',
    body: (teacher, week, classes) => `Bonjour ${teacher}, votre plan pour la semaine ${week} est incomplet pour: ${classes}. Veuillez le compléter.`,
    reminderTitle: '📋 Rappel: Finaliser le Plan Hebdomadaire',
    reminderBody: (teacher, week) => `Bonjour ${teacher}, n'oubliez pas de finaliser votre plan pour la semaine ${week}.`
  },
  ar: {
    title: '⚠️ الخطة الأسبوعية غير مكتملة',
    body: (teacher, week, classes) => `مرحباً ${teacher}، خطتك للأسبوع ${week} غير مكتملة للفصول: ${classes}. يرجى إكمالها.`,
    reminderTitle: '📋 تذكير: أكمل الخطة الأسبوعية',
    reminderBody: (teacher, week) => `مرحباً ${teacher}، لا تنسى إكمال خطتك للأسبوع ${week}.`
  },
  en: {
    title: '⚠️ Incomplete Weekly Plan',
    body: (teacher, week, classes) => `Hello ${teacher}, your plan for week ${week} is incomplete for: ${classes}. Please complete it.`,
    reminderTitle: '📋 Reminder: Finalize Weekly Plan',
    reminderBody: (teacher, week) => `Hello ${teacher}, don't forget to finalize your plan for week ${week}.`
  }
};

// Déterminer la langue d'un enseignant
function getTeacherLanguage(teacher) {
  if (arabicTeachers.includes(teacher)) return 'ar';
  if (englishTeachers.includes(teacher)) return 'en';
  return 'fr';
}

// Vérifier les enseignants incomplets et envoyer des notifications
// Cette route sera appelée par un CRON job chaque LUNDI (3 fois par jour)
app.post('/api/check-incomplete-and-notify', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    // Sécurité basique avec clé API
    if (apiKey !== process.env.CRON_API_KEY) {
      return res.status(401).json({ message: 'Non autorisé.' });
    }

    // Déterminer la semaine actuelle
    const currentDate = new Date();
    let currentWeek = null;
    
    // Trouver la semaine actuelle
    for (const [week, dates] of Object.entries(specificWeekDateRangesNode)) {
      const startDate = new Date(dates.start + 'T00:00:00Z');
      const endDate = new Date(dates.end + 'T23:59:59Z');
      
      if (currentDate >= startDate && currentDate <= endDate) {
        currentWeek = parseInt(week, 10);
        break;
      }
    }

    if (!currentWeek) {
      return res.status(200).json({ message: 'Aucune semaine active actuellement.' });
    }

    console.log(`📅 Vérification des plans incomplets pour la semaine ${currentWeek}`);

    // Récupérer les données de la semaine
    const db = await connectToDatabase();
    const planDocument = await db.collection('plans').findOne({ week: currentWeek });
    
    if (!planDocument || !planDocument.data || planDocument.data.length === 0) {
      return res.status(200).json({ message: `Aucune donnée pour la semaine ${currentWeek}.` });
    }

    // Trouver les enseignants avec des travaux incomplets
    const incompleteTeachers = {};
    const planData = planDocument.data;
    
    planData.forEach(item => {
      const teacher = item[findKey(item, 'Enseignant')];
      const taskVal = item[findKey(item, 'Travaux de classe')];
      const className = item[findKey(item, 'Classe')];
      
      if (teacher && className && (taskVal == null || String(taskVal).trim() === '')) {
        if (!incompleteTeachers[teacher]) {
          incompleteTeachers[teacher] = new Set();
        }
        incompleteTeachers[teacher].add(className);
      }
    });

    const teachersToNotify = Object.keys(incompleteTeachers);
    console.log(`📊 ${teachersToNotify.length} enseignants avec plans incomplets:`, teachersToNotify);

    // Récupérer les abonnements push depuis MongoDB
    const subscriptions = await db.collection('pushSubscriptions').find({}).toArray();
    
    let notificationsSent = 0;
    const notificationResults = [];

    // Envoyer des notifications à chaque enseignant incomplet avec leur langue
    for (const teacher of teachersToNotify) {
      const subscription = subscriptions.find(sub => sub.username === teacher);
      
      if (subscription && subscription.subscription) {
        const classes = [...incompleteTeachers[teacher]].sort().join(', ');
        const lang = getTeacherLanguage(teacher);
        const msgs = notificationMessages[lang];
        
        const message = {
          title: msgs.title,
          body: msgs.body(teacher, currentWeek, classes),
          icon: 'https://cdn.glitch.global/1c613b14-019c-488a-a856-d55d64d174d0/al-kawthar-international-schools-jeddah-saudi-arabia-modified.png?v=1739565146299',
          badge: 'https://cdn.glitch.global/1c613b14-019c-488a-a856-d55d64d174d0/al-kawthar-international-schools-jeddah-saudi-arabia-modified.png?v=1739565146299',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          tag: `plan-reminder-${currentWeek}`,
          data: {
            url: 'https://plan-hebdomadaire-2026-boys.vercel.app',
            week: currentWeek,
            teacher: teacher,
            classes: classes,
            lang: lang,
            playSound: true
          }
        };

        try {
          // Envoyer la notification push via web-push
          const payload = JSON.stringify(message);
          
          await webpush.sendNotification(subscription.subscription, payload);
          
          notificationResults.push({
            teacher: teacher,
            classes: classes,
            language: lang,
            status: 'sent',
            message: message
          });
          
          notificationsSent++;
          console.log(`✅ Notification envoyée à ${teacher} (${lang}) pour ${classes}`);
        } catch (error) {
          console.error(`❌ Erreur notification pour ${teacher}:`, error);
          notificationResults.push({
            teacher: teacher,
            status: 'error',
            error: error.message
          });
          
          // Si l'abonnement est invalide (410 Gone), le supprimer
          if (error.statusCode === 410) {
            console.log(`🗑️ Suppression de l'abonnement invalide pour ${teacher}`);
            await db.collection('pushSubscriptions').deleteOne({ username: teacher });
          }
        }
      } else {
        console.log(`ℹ️ ${teacher} n'a pas d'abonnement push`);
        notificationResults.push({
          teacher: teacher,
          status: 'no_subscription'
        });
      }
    }

    res.status(200).json({
      message: `Vérification terminée pour la semaine ${currentWeek}.`,
      week: currentWeek,
      incompleteCount: teachersToNotify.length,
      notificationsSent: notificationsSent,
      results: notificationResults
    });

  } catch (error) {
    console.error('❌ Erreur /check-incomplete-and-notify:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Endpoint pour tester les notifications manuellement
app.post('/api/test-notification', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ message: 'Username requis.' });
    }

    const db = await connectToDatabase();
    const subscription = await db.collection('pushSubscriptions').findOne({ username: username });
    
    if (!subscription) {
      return res.status(404).json({ message: `Aucun abonnement trouvé pour ${username}.` });
    }

    console.log(`🧪 Test de notification pour ${username}`);
    
    // Envoyer une notification de test
    const testMessage = {
      title: '🧪 Test de Notification',
      body: `Bonjour ${username}, ceci est un test de notification push. Si vous voyez ce message, les notifications fonctionnent correctement !`,
      icon: 'https://cdn.glitch.global/1c613b14-019c-488a-a856-d55d64d174d0/al-kawthar-international-schools-jeddah-saudi-arabia-modified.png?v=1739565146299',
      data: {
        url: 'https://plan-hebdomadaire-2026-boys.vercel.app',
        teacher: username
      }
    };

    try {
      const payload = JSON.stringify(testMessage);
      await webpush.sendNotification(subscription.subscription, payload);
      
      res.status(200).json({ 
        message: 'Notification de test envoyée avec succès.',
        username: username,
        hasSubscription: true
      });
    } catch (pushError) {
      console.error('❌ Erreur envoi notification test:', pushError);
      
      // Si l'abonnement est invalide (410 Gone), le supprimer
      if (pushError.statusCode === 410) {
        console.log(`🗑️ Suppression de l'abonnement invalide pour ${username}`);
        await db.collection('pushSubscriptions').deleteOne({ username: username });
      }
      
      throw new Error(`Échec d'envoi: ${pushError.message}`);
    }

  } catch (error) {
    console.error('❌ Erreur /test-notification:', error);
    res.status(500).json({ 
      message: 'Erreur serveur.',
      error: error.message 
    });
  }
});

// Endpoint pour obtenir la clé publique VAPID (nécessaire pour le frontend)
app.get('/api/vapid-public-key', (req, res) => {
  res.status(200).json({ publicKey: VAPID_PUBLIC_KEY });
});

// ✅ FONCTIONNALITÉ 3: Système d'alertes automatiques hebdomadaires
// Route pour vérifier et envoyer des alertes TOUTES LES 3 HEURES depuis le LUNDI
// Cette route doit être appelée par un CRON job externe (GitHub Actions, cron-job.org, etc.)
app.post('/api/send-weekly-reminders', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    // Sécurité basique avec clé API
    const CRON_API_KEY = process.env.CRON_API_KEY || 'default-cron-key-change-me';
    if (apiKey !== CRON_API_KEY) {
      return res.status(401).json({ message: 'Non autorisé. Clé API invalide.' });
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
    const hourOfDay = now.getHours();

    console.log(`📅 [Weekly Reminders] Vérification: ${now.toISOString()} - Jour: ${dayOfWeek}, Heure: ${hourOfDay}`);

    // ⚠️ IMPORTANT: N'envoyer des alertes QUE le LUNDI (jour 1)
    // Le CRON doit tourner toutes les 3 heures uniquement le lundi
    if (dayOfWeek !== 1) {
      return res.status(200).json({ 
        message: 'Pas lundi aujourd\'hui. Aucune alerte envoyée.',
        day: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][dayOfWeek],
        timestamp: now.toISOString()
      });
    }

    // Déterminer la semaine actuelle
    let currentWeek = null;
    
    for (const [week, dates] of Object.entries(specificWeekDateRangesNode)) {
      const startDate = new Date(dates.start + 'T00:00:00Z');
      const endDate = new Date(dates.end + 'T23:59:59Z');
      
      if (now >= startDate && now <= endDate) {
        currentWeek = parseInt(week, 10);
        break;
      }
    }

    if (!currentWeek) {
      return res.status(200).json({ message: 'Aucune semaine active actuellement.' });
    }

    console.log(`📅 [Weekly Reminders] Semaine active: ${currentWeek}`);

    // Récupérer les données de la semaine
    const db = await connectToDatabase();
    const planDocument = await db.collection('plans').findOne({ week: currentWeek });
    
    if (!planDocument || !planDocument.data || planDocument.data.length === 0) {
      return res.status(200).json({ 
        message: `Aucune donnée pour la semaine ${currentWeek}.`,
        week: currentWeek
      });
    }

    // Trouver les enseignants avec des travaux incomplets
    const incompleteTeachers = {};
    const planData = planDocument.data;
    
    planData.forEach(item => {
      const teacher = item[findKey(item, 'Enseignant')];
      const taskVal = item[findKey(item, 'Travaux de classe')];
      const className = item[findKey(item, 'Classe')];
      
      // Un enseignant est incomplet si au moins un "Travaux de classe" est vide
      if (teacher && className && (taskVal == null || String(taskVal).trim() === '')) {
        if (!incompleteTeachers[teacher]) {
          incompleteTeachers[teacher] = new Set();
        }
        incompleteTeachers[teacher].add(className);
      }
    });

    const teachersToNotify = Object.keys(incompleteTeachers);
    console.log(`📊 [Weekly Reminders] ${teachersToNotify.length} enseignants incomplets:`, teachersToNotify);

    if (teachersToNotify.length === 0) {
      return res.status(200).json({ 
        message: 'Tous les enseignants ont complété leurs plans.',
        week: currentWeek,
        timestamp: now.toISOString()
      });
    }

    // Récupérer les abonnements push depuis MongoDB
    const subscriptions = await db.collection('pushSubscriptions').find({}).toArray();
    
    let notificationsSent = 0;
    const notificationResults = [];

    // Envoyer des notifications à chaque enseignant incomplet
    for (const teacher of teachersToNotify) {
      const subscription = subscriptions.find(sub => sub.username === teacher);
      
      if (subscription && subscription.subscription) {
        const classes = [...incompleteTeachers[teacher]].sort().join(', ');
        const lang = getTeacherLanguage(teacher);
        const msgs = notificationMessages[lang];
        
        // Message de rappel avec urgence
        const message = {
          title: msgs.reminderTitle,
          body: msgs.reminderBody(teacher, currentWeek),
          icon: 'https://cdn.glitch.global/1c613b14-019c-488a-a856-d55d64d174d0/al-kawthar-international-schools-jeddah-saudi-arabia-modified.png?v=1739565146299',
          badge: 'https://cdn.glitch.global/1c613b14-019c-488a-a856-d55d64d174d0/al-kawthar-international-schools-jeddah-saudi-arabia-modified.png?v=1739565146299',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          tag: `plan-reminder-${currentWeek}-${Date.now()}`, // Tag unique pour chaque rappel
          renotify: true, // Force la réaffichage même si tag similaire
          data: {
            url: 'https://plan-hebdomadaire-2026-boys.vercel.app',
            week: currentWeek,
            teacher: teacher,
            classes: classes,
            lang: lang,
            playSound: true,
            timestamp: now.toISOString()
          }
        };

        try {
          const payload = JSON.stringify(message);
          await webpush.sendNotification(subscription.subscription, payload);
          
          notificationResults.push({
            teacher: teacher,
            classes: classes,
            language: lang,
            status: 'sent',
            timestamp: now.toISOString()
          });
          
          notificationsSent++;
          console.log(`✅ [Weekly Reminders] Notification envoyée à ${teacher} (${lang})`);
        } catch (error) {
          console.error(`❌ [Weekly Reminders] Erreur notification pour ${teacher}:`, error);
          notificationResults.push({
            teacher: teacher,
            status: 'error',
            error: error.message
          });
          
          // Si l'abonnement est invalide (410 Gone), le supprimer
          if (error.statusCode === 410) {
            console.log(`🗑️ Suppression de l'abonnement invalide pour ${teacher}`);
            await db.collection('pushSubscriptions').deleteOne({ username: teacher });
          }
        }
      } else {
        console.log(`ℹ️ [Weekly Reminders] ${teacher} n'a pas d'abonnement push`);
        notificationResults.push({
          teacher: teacher,
          status: 'no_subscription'
        });
      }
    }

    res.status(200).json({
      message: `Rappels hebdomadaires envoyés pour la semaine ${currentWeek}.`,
      week: currentWeek,
      day: 'Lundi',
      hour: hourOfDay,
      incompleteCount: teachersToNotify.length,
      notificationsSent: notificationsSent,
      timestamp: now.toISOString(),
      results: notificationResults
    });

  } catch (error) {
    console.error('❌ [Weekly Reminders] Erreur:', error);
    res.status(500).json({ 
      message: 'Erreur serveur.',
      error: error.message 
    });
  }
});

module.exports = app;
