// api/index.js — Version REST (fetch) corrigée

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const XLSX = require('xlsx');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');

// ========================================================================
// ========= FONCTION D'AIDE POUR LA GÉNÉRATION WORD (VERSION FINALE) =====
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
  const { color, italic } = options;
  const runPropertiesParts = [];
  runPropertiesParts.push('<w:sz w:val="22"/><w:szCs w:val="22"/>');
  if (color) runPropertiesParts.push(`<w:color w:val="${color}"/>`);
  if (italic) runPropertiesParts.push('<w:i/><w:iCs w:val="true"/>');

  let paragraphProperties = '';
  if (containsArabic(text)) {
    // Police Arial 12pt, orientation RTL, centré
    paragraphProperties = '<w:pPr><w:jc w:val="center"/><w:bidi w:val="1"/><w:textDirection w:val="rl"/></w:pPr>';
    runPropertiesParts[0] = '<w:sz w:val="24"/><w:szCs w:val="24"/>'; // 12pt = 24 half-points
    runPropertiesParts.push('<w:rtl w:val="1"/>');
    runPropertiesParts.push('<w:cs/>'); // Complex script pour l'arabe
    runPropertiesParts.push('<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>');
  }

  const runProperties = `<w:rPr>${runPropertiesParts.join('')}</w:rPr>`;
  const lines = text.split(/\r\n|\n|\r/);
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

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, '../public')));

const MONGO_URL = process.env.MONGO_URL;
const WORD_TEMPLATE_URL = process.env.WORD_TEMPLATE_URL || 'https://docs.google.com/document/d/1E4JZY34Mbk7cE4E8Yu3dzG8zJIiraGDJ/export?format=docx';
const LESSON_TEMPLATE_URL = process.env.LESSON_TEMPLATE_URL;

const arabicTeachers = ['Majed', 'Jaber', 'Imad', 'Saeed'];
const englishTeachers = ['Kamel'];

// School week date ranges: Sunday (Dimanche) to Thursday (Jeudi) - 5 days per week
// Start date MUST be Sunday, End date MUST be Thursday
// Format: YYYY-MM-DD (ISO 8601)
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
  
  // Validate: School week is Sunday to Thursday only (no Friday/Saturday)
  if (date.getUTCDay() === 5 || date.getUTCDay() === 6) {
    console.warn(`⚠️ Invalid school day detected: ${dayName}`);
    return "Date invalide (jour non scolaire)";
  }
  
  const dayNum = String(date.getUTCDate()).padStart(2, '0');
  const monthName = months[date.getUTCMonth()];
  const yearNum = date.getUTCFullYear();
  return `${dayName} ${dayNum} ${monthName} ${yearNum}`;
}
function getDateForDayNameNode(weekStartDate, dayName) {
  if (!weekStartDate || isNaN(weekStartDate.getTime())) return null;
  
  // School week: Sunday (Dimanche) to Thursday (Jeudi) only - 5 days
  const dayOrder = { "Dimanche": 0, "Lundi": 1, "Mardi": 2, "Mercredi": 3, "Jeudi": 4 };
  const offset = dayOrder[dayName];
  
  if (offset === undefined) {
    console.warn(`⚠️ Invalid day name: ${dayName}. Only Dimanche-Jeudi are valid.`);
    return null;
  }
  
  const specificDate = new Date(Date.UTC(
    weekStartDate.getUTCFullYear(),
    weekStartDate.getUTCMonth(),
    weekStartDate.getUTCDate()
  ));
  specificDate.setUTCDate(specificDate.getUTCDate() + offset);
  
  // Double-check: ensure we don't accidentally generate Friday or Saturday
  if (specificDate.getUTCDay() === 5 || specificDate.getUTCDay() === 6) {
    console.error(`❌ ERROR: Generated invalid school day (${specificDate.getUTCDay()})`);
    return null;
  }
  
  return specificDate;
}

// Fonction robuste pour parser les dates dans tous les formats (côté serveur)
function parseDateFromJourValue(jourValue, weekStartDate) {
  if (!jourValue) return null;
  
  const trimmed = String(jourValue).trim();
  
  // Format 1: Juste le nom du jour (ex: "Dimanche", "Lundi")
  // School week: Sunday to Thursday only (5 days)
  const dayMapFr = {"Dimanche":0, "Lundi":1, "Mardi":2, "Mercredi":3, "Jeudi":4};
  if (dayMapFr.hasOwnProperty(trimmed)) {
    const date = getDateForDayNameNode(weekStartDate, trimmed);
    if (!date) {
      console.warn(`⚠️ Failed to generate date for day: ${trimmed}`);
      return null;
    }
    return { dayName: trimmed, date: date };
  }
  
  // Reject Friday and Saturday explicitly
  if (trimmed === "Vendredi" || trimmed === "Samedi") {
    console.warn(`⚠️ Invalid school day rejected: ${trimmed}`);
    return null;
  }
  
  // Format 2: Date complète française (ex: "Dimanche 30 Novembre 2025")
  // School week: Only Dimanche (Sunday) to Jeudi (Thursday)
  const frenchDateRegex = /^(Dimanche|Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi)\s+(\d{1,2})\s+(Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)\s+(\d{4})$/i;
  const frenchMatch = trimmed.match(frenchDateRegex);
  if (frenchMatch) {
    const dayName = frenchMatch[1];
    
    // Reject non-school days
    if (dayName === "Vendredi" || dayName === "Samedi") {
      console.warn(`⚠️ Invalid school day in date string: ${dayName}`);
      return null;
    }
    
    const day = parseInt(frenchMatch[2], 10);
    const monthNames = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const month = monthNames.findIndex(m => m.toLowerCase() === frenchMatch[3].toLowerCase());
    const year = parseInt(frenchMatch[4], 10);
    if (month !== -1) {
      const date = new Date(Date.UTC(year, month, day));
      // Verify the day of week matches
      const actualDayOfWeek = date.getUTCDay();
      const expectedDayMap = {"Dimanche":0, "Lundi":1, "Mardi":2, "Mercredi":3, "Jeudi":4};
      if (expectedDayMap[dayName] !== actualDayOfWeek) {
        console.error(`❌ Day name mismatch: ${dayName} doesn't match ${date.toISOString()} (day ${actualDayOfWeek})`);
        return null;
      }
      return { dayName: dayName, date: date };
    }
  }
  
  // Format 3: Date ISO (ex: "2025-11-30")
  const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoMatch = trimmed.match(isoRegex);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const date = new Date(Date.UTC(year, month, day));
    const dayOfWeek = date.getUTCDay();
    
    // Validate: School days only (Sunday=0 to Thursday=4)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      console.warn(`⚠️ Invalid school day in ISO date: ${trimmed} is ${dayOfWeek === 5 ? 'Friday' : 'Saturday'}`);
      return null;
    }
    
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"];
    return { dayName: dayNames[dayOfWeek], date: date };
  }
  
  // Format 4: Date DD/MM/YYYY ou DD-MM-YYYY
  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const dmyMatch = trimmed.match(dmyRegex);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const date = new Date(Date.UTC(year, month, day));
    const dayOfWeek = date.getUTCDay();
    
    // Validate: School days only (Sunday=0 to Thursday=4)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      console.warn(`⚠️ Invalid school day in DMY date: ${trimmed} is ${dayOfWeek === 5 ? 'Friday' : 'Saturday'}`);
      return null;
    }
    
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"];
    return { dayName: dayNames[dayOfWeek], date: date };
  }
  
  return null;
}
const findKey = (obj, target) => obj ? Object.keys(obj).find(k => k.trim().toLowerCase() === target.toLowerCase()) : undefined;

// Validate week date ranges on startup
function validateWeekDateRanges() {
  console.log('🔍 Validating week date ranges...');
  let errors = 0;
  
  for (const [week, dates] of Object.entries(specificWeekDateRangesNode)) {
    const startDate = new Date(dates.start + 'T00:00:00Z');
    const endDate = new Date(dates.end + 'T00:00:00Z');
    
    // Check if start is Sunday (0)
    if (startDate.getUTCDay() !== 0) {
      console.error(`❌ Week ${week}: Start date ${dates.start} is not Sunday (day ${startDate.getUTCDay()})`);
      errors++;
    }
    
    // Check if end is Thursday (4)
    if (endDate.getUTCDay() !== 4) {
      console.error(`❌ Week ${week}: End date ${dates.end} is not Thursday (day ${endDate.getUTCDay()})`);
      errors++;
    }
    
    // Check if the range is exactly 4 days (Sunday to Thursday = 4 days difference)
    const daysDiff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff !== 4) {
      console.error(`❌ Week ${week}: Date range is ${daysDiff} days instead of 4 days`);
      errors++;
    }
  }
  
  if (errors === 0) {
    console.log('✅ All week date ranges are valid (Sunday to Thursday)');
  } else {
    console.error(`❌ Found ${errors} validation error(s) in week date ranges`);
  }
  
  return errors === 0;
}

// ------------------------- Correction automatique des dates -------------------------

/**
 * Corrige automatiquement les dates dans les données pour qu'elles correspondent
 * à la semaine scolaire (Dimanche → Jeudi uniquement)
 */
function correctDatesForWeek(data, weekNumber) {
  if (!Array.isArray(data) || data.length === 0) return data;
  
  // Récupérer les dates de la semaine
  const weekRange = specificWeekDateRangesNode[weekNumber];
  if (!weekRange) {
    console.warn(`⚠️ Aucune plage de dates définie pour la semaine ${weekNumber}`);
    return data;
  }
  
  const startStr = weekRange.start;
  const endStr = weekRange.end;
  const weekStart = new Date(startStr + 'T00:00:00.000Z');
  const weekEnd = new Date(endStr + 'T00:00:00.000Z');
  
  // Valider que la semaine commence bien Dimanche et finit Jeudi
  if (weekStart.getUTCDay() !== 0) {
    console.error(`❌ ERREUR: La semaine ${weekNumber} ne commence pas un Dimanche!`);
    return data;
  }
  if (weekEnd.getUTCDay() !== 4) {
    console.error(`❌ ERREUR: La semaine ${weekNumber} ne finit pas un Jeudi!`);
    return data;
  }
  
  console.log(`🔧 Correction des dates pour semaine ${weekNumber}: ${formatDateFrenchNode(weekStart)} → ${formatDateFrenchNode(weekEnd)}`);
  
  // Créer un mapping période → date
  // 8 périodes par jour, 5 jours (Dimanche → Jeudi)
  const periodeToDayIndex = (periode) => {
    const p = parseInt(periode, 10);
    if (isNaN(p) || p < 1 || p > 40) return null;
    return Math.floor((p - 1) / 8); // 0=Dimanche, 1=Lundi, ..., 4=Jeudi
  };
  
  // Trouver la clé "Jour" et "Période" (insensible à la casse)
  const jourKey = Object.keys(data[0] || {}).find(k => k.toLowerCase().trim() === 'jour');
  const periodeKey = Object.keys(data[0] || {}).find(k => k.toLowerCase().trim() === 'période');
  
  if (!jourKey) {
    console.warn(`⚠️ Colonne "Jour" introuvable, correction impossible`);
    return data;
  }
  
  let correctionCount = 0;
  const correctedData = data.map(row => {
    const periode = row[periodeKey];
    const dayIndex = periodeToDayIndex(periode);
    
    if (dayIndex !== null && dayIndex >= 0 && dayIndex <= 4) {
      // Calculer la date correcte
      const correctDate = new Date(weekStart);
      correctDate.setUTCDate(weekStart.getUTCDate() + dayIndex);
      
      // Formater la date correcte
      const formattedDate = formatDateFrenchNode(correctDate);
      
      // Comparer avec la date actuelle
      const currentJour = row[jourKey];
      if (currentJour !== formattedDate) {
        console.log(`  📝 Correction P${periode}: "${currentJour}" → "${formattedDate}"`);
        correctionCount++;
      }
      
      return {
        ...row,
        [jourKey]: formattedDate
      };
    }
    
    return row;
  });
  
  console.log(`✅ ${correctionCount} dates corrigées sur ${data.length} lignes`);
  
  // Vérifier que tous les jours de la semaine sont présents
  const daysCount = {};
  correctedData.forEach(row => {
    const jourValue = row[jourKey];
    if (jourValue) {
      if (!daysCount[jourValue]) daysCount[jourValue] = 0;
      daysCount[jourValue]++;
    }
  });
  
  console.log('📊 Répartition des jours:');
  const dayOrder = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'];
  dayOrder.forEach((dayName, idx) => {
    const correctDate = new Date(weekStart);
    correctDate.setUTCDate(weekStart.getUTCDate() + idx);
    const formattedDate = formatDateFrenchNode(correctDate);
    const count = daysCount[formattedDate] || 0;
    console.log(`  ${dayName} (${formattedDate}): ${count} lignes ${count === 0 ? '⚠️ MANQUANT' : ''}`);
  });
  
  return correctedData;
}

// ------------------------- Auth & CRUD simples -------------------------

app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (validUsers[username] && validUsers[username] === password) {
      res.status(200).json({ success: true, username: username });
    } else {
      res.status(401).json({ success: false, message: 'Identifiants invalides' });
    }
  } catch (error) {
    console.error('CRASH in /api/login:', error);
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
      res.status(200).json({ planData: planDocument.data || [], classNotes: planDocument.classNotes || {} });
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
    // Corriger les dates avant de sauvegarder
    const correctedData = correctDatesForWeek(data, weekNumber);
    
    const db = await connectToDatabase();
    await db.collection('plans').updateOne(
      { week: weekNumber },
      { $set: { data: correctedData } },
      { upsert: true }
    );
    res.status(200).json({ message: `Plan S${weekNumber} enregistré avec ${correctedData.length} lignes.` });
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

app.get('/api/all-classes', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const classes = await db.collection('plans').distinct('data.Classe', { 'data.Classe': { $ne: null, $ne: "" } });
    res.status(200).json(classes.sort());
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

    console.log(`🔍 Génération Word pour S${weekNumber}, classe ${classe}, ${data.length} lignes de données`);
    
    // Debug: Afficher les premières lignes de données
    if (data.length > 0) {
      console.log('📋 Exemple de données reçues:');
      console.log('  Premier élément:', JSON.stringify(data[0], null, 2));
      console.log('  Clés disponibles:', Object.keys(data[0]));
    } else {
      console.log('⚠️ ATTENTION: Aucune donnée reçue !');
      return res.status(400).json({ message: 'Aucune donnée à générer.' });
    }

    // Charger le template Word local (nettoyé)
    let templateBuffer;
    try {
      const templatePath = path.join(__dirname, '../public/plan_template.docx');
      templateBuffer = fs.readFileSync(templatePath);
      console.log('✅ Template Word local chargé:', templatePath);
    } catch (e) {
      console.error("❌ Erreur de lecture du template local:", e);
      // Fallback: essayer de télécharger depuis l'URL
      try {
        const response = await fetch(WORD_TEMPLATE_URL);
        if (!response.ok) throw new Error(`Échec modèle Word (${response.status})`);
        templateBuffer = Buffer.from(await response.arrayBuffer());
        console.log('✅ Template Word téléchargé depuis URL de fallback');
      } catch (e2) {
        console.error("❌ Erreur de récupération du modèle Word:", e2);
        return res.status(500).json({ message: `Erreur récup modèle Word.` });
      }
    }

    // Initialiser Docxtemplater
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
    });

    // School week: Sunday to Thursday only (5 days)
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
    
    console.log('🔑 Clés identifiées:', { jourKey, periodeKey, matiereKey, leconKey, travauxKey, supportKey, devoirsKey });

    // Grouper les données par jour
    let itemsProcessed = 0;
    let itemsSkipped = 0;
    data.forEach((item, index) => {
      const day = item[jourKey];
      if (day) {
        const parsed = parseDateFromJourValue(day, weekStartDateNode);
        if (parsed && parsed.dayName) {
          const dayName = parsed.dayName;
          if (!groupedByDay[dayName]) groupedByDay[dayName] = [];
          groupedByDay[dayName].push(item);
          itemsProcessed++;
        } else {
          itemsSkipped++;
          if (index < 3) {
            console.log(`⚠️ Ligne ${index}: Jour "${day}" non parsé`);
          }
        }
      } else {
        itemsSkipped++;
        if (index < 3) {
          console.log(`⚠️ Ligne ${index}: Pas de jour (jourKey=${jourKey})`);
        }
      }
    });

    console.log(`📊 Traitement: ${itemsProcessed} éléments groupés, ${itemsSkipped} ignorés`);
    console.log('📅 Grouped by day:', Object.keys(groupedByDay).length ? Object.keys(groupedByDay).map(day => `${day}: ${groupedByDay[day].length} items`).join(', ') : 'AUCUN JOUR TROUVÉ!');

    // Créer les données formatées pour chaque jour
    const joursData = dayOrder.map(dayName => {
      if (!groupedByDay[dayName]) return null;

      const parsed = parseDateFromJourValue(dayName, weekStartDateNode);
      const dateOfDay = parsed ? parsed.date : getDateForDayNameNode(weekStartDateNode, dayName);
      const formattedDate = dateOfDay ? formatDateFrenchNode(dateOfDay) : dayName;
      const sortedEntries = groupedByDay[dayName].sort((a, b) => (parseInt(a[periodeKey], 10) || 0) - (parseInt(b[periodeKey], 10) || 0));

      // Les balises avec @ dans le template utilisent formatTextForWord
      const matieres = sortedEntries.map(item => ({
        matiere: item[matiereKey] ?? "",
        Lecon: formatTextForWord(item[leconKey], { color: 'FF0000' }),
        travailDeClasse: formatTextForWord(item[travauxKey]),
        Support: formatTextForWord(item[supportKey], { color: 'FF0000', italic: true }),
        devoirs: formatTextForWord(item[devoirsKey], { color: '0000FF' })
      }));

      return { jourDateComplete: formattedDate, matieres: matieres };
    }).filter(Boolean);

    console.log(`📊 Jours formatés: ${joursData.length} jours avec données`);
    if (joursData.length === 0) {
      console.log('❌ ERREUR: Aucun jour formaté ! Les données ne seront pas affichées dans le Word.');
      console.log('   dayOrder:', dayOrder);
      console.log('   groupedByDay keys:', Object.keys(groupedByDay));
    } else {
      joursData.forEach(j => {
        console.log(`  - ${j.jourDateComplete}: ${j.matieres.length} matières`);
      });
    }

    // Créer la plage de dates
    let plageSemaineText = `Semaine ${weekNumber}`;
    if (datesNode?.start && datesNode?.end) {
      const startD = new Date(datesNode.start + 'T00:00:00Z');
      const endD = new Date(datesNode.end + 'T00:00:00Z');
      if (!isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
        plageSemaineText = `du ${formatDateFrenchNode(startD)} à ${formatDateFrenchNode(endD)}`;
      }
    }

    // Préparer les données pour le template
    const templateData = {
      semaine: weekNumber,
      classe: classe,
      jours: joursData,
      notes: formatTextForWord(notes || ""),
      plageSemaine: plageSemaineText
    };

    console.log('📝 Template data préparée:', {
      semaine: templateData.semaine,
      classe: templateData.classe,
      plageSemaine: templateData.plageSemaine,
      joursCount: templateData.jours.length,
      jours: templateData.jours.map(j => ({
        jourDateComplete: j.jourDateComplete,
        matieresCount: j.matieres.length
      }))
    });

    // Rendre le template
    doc.render(templateData);

    // Générer le document
    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    
    const filename = `Plan_hebdomadaire_S${weekNumber}_${classe.replace(/[^a-z0-9]/gi, '_')}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buf);

    console.log(`✅ Document Word généré avec succès: ${filename}`);

  } catch (error) {
    console.error('❌ Erreur serveur /generate-word:', error);
    console.error('Stack:', error.stack);
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
    
    // Récupérer la date de début de la semaine pour formater les jours
    const datesNode = specificWeekDateRangesNode[weekNumber];
    let weekStartDateNode = null;
    if (datesNode?.start) {
      weekStartDateNode = new Date(datesNode.start + 'T00:00:00Z');
    }
    
    const formattedData = planDocument.data.map(item => {
      const row = {};
      finalHeaders.forEach(header => {
        const itemKey = findKey(item, header);
        let value = itemKey ? item[itemKey] : '';
        
        // Pour la colonne "Jour", convertir en texte français au lieu d'objet Date
        if (header === 'Jour' && value && weekStartDateNode && !isNaN(weekStartDateNode.getTime())) {
          const parsed = parseDateFromJourValue(value, weekStartDateNode);
          if (parsed && parsed.date) {
            // Validate: Only school days (Sunday to Thursday)
            const dayOfWeek = parsed.date.getUTCDay();
            if (dayOfWeek >= 0 && dayOfWeek <= 4) {
              // Convertir en texte français au lieu d'objet Date
              value = formatDateFrenchNode(parsed.date);
            } else {
              console.warn(`⚠️ Invalid school day skipped in Excel: ${value} (day ${dayOfWeek})`);
              value = `[INVALID] ${value}`;
            }
          }
        }
        
        row[header] = value;
      });
      return row;
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(formattedData, { header: finalHeaders });
    
    // Définir les largeurs de colonnes
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
      { wch: 45 }, { wch: 45 }, { wch: 25 }, { wch: 45 }
    ];
    
    // Les dates sont déjà en texte français (formatDateFrenchNode), pas besoin de formater
    console.log(`✅ Excel généré avec ${formattedData.length} lignes (dates en français)`);
    
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

// --------------------- Génération IA (REST, v1beta) --------------------

app.post('/api/generate-ai-lesson-plan', async (req, res) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ message: "Le service IA n'est pas initialisé. Vérifiez la clé API GEMINI du serveur." });
    }

    const lessonTemplateUrl = process.env.LESSON_TEMPLATE_URL;
    if (!lessonTemplateUrl) {
      return res.status(503).json({ message: "L'URL du modèle de leçon Word n'est pas configurée." });
    }

    const { week, rowData } = req.body;
    if (!rowData || typeof rowData !== 'object' || !week) {
      return res.status(400).json({ message: "Les données de la ligne ou de la semaine sont manquantes." });
    }

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

    // Date formatée
    let formattedDate = "";
    const weekNumber = Number(week);
    const datesNode = specificWeekDateRangesNode[weekNumber];
    if (jour && datesNode?.start) {
      const weekStartDateNode = new Date(datesNode.start + 'T00:00:00Z');
      if (!isNaN(weekStartDateNode.getTime())) {
        const dateOfDay = getDateForDayNameNode(weekStartDateNode, jour);
        if (dateOfDay) formattedDate = formatDateFrenchNode(dateOfDay);
      }
    }

    // Prompt + structure JSON
    const jsonStructure = `{"TitreUnite":"un titre d'unité pertinent pour la leçon","Methodes":"liste des méthodes d'enseignement","Outils":"liste des outils de travail","Objectifs":"une liste concise des objectifs d'apprentissage (compétences, connaissances), séparés par des sauts de ligne (\\\\n). Commence chaque objectif par un tiret (-).","etapes":[{"phase":"Introduction","duree":"5 min","activite":"Description de l'activité d'introduction pour l'enseignant et les élèves."},{"phase":"Activité Principale","duree":"25 min","activite":"Description de l'activité principale, en intégrant les 'travaux de classe' et le 'support' si possible."},{"phase":"Synthèse","duree":"10 min","activite":"Description de l'activité de conclusion et de vérification des acquis."},{"phase":"Clôture","duree":"5 min","activite":"Résumé rapide et annonce des devoirs."}],"Ressources":"les ressources spécifiques à utiliser.","Devoirs":"une suggestion de devoirs.","DiffLents":"une suggestion pour aider les apprenants en difficulté.","DiffTresPerf":"une suggestion pour stimuler les apprenants très performants.","DiffTous":"une suggestion de différenciation pour toute la classe."}`;

    let prompt;
    if (englishTeachers.includes(enseignant)) {
      prompt = `As an expert pedagogical assistant, create a detailed 45-minute lesson plan in English. Structure the lesson into timed phases. Intelligently integrate the teacher's existing notes:
- Subject: ${matiere}, Class: ${classe}, Lesson Topic: ${lecon}
- Planned Classwork: ${travaux}
- Mentioned Support/Materials: ${support}
- Planned Homework: ${devoirsPrevus}
Generate a response in valid JSON format only. Use the following JSON structure with professional and concrete values in English: ${jsonStructure}`;
    } else if (arabicTeachers.includes(enseignant)) {
      prompt = `بصفتك مساعدًا تربويًا خبيرًا، قم بإنشاء خطة درس مفصلة باللغة العربية مدتها 45 دقيقة. قم ببناء الدرس في مراحل محددة بوقت. ادمج بذكاء ملاحظات المعلم الحالية:
- المادة: ${matiere}, الفصل: ${classe}, موضوع الدرس: ${lecon}
- عمل الفصل المخطط له: ${travaux}
- الدعم / المواد المذكورة: ${support}
- الواجبات المخطط لها: ${devoirsPrevus}
قم بإنشاء استجابة بتنسيق JSON صالح فقط. يجب استعمال البنية التالية بقيم مهنية وملموسة (المفاتيح بالإنجليزية): ${jsonStructure}`;
    } else {
      prompt = `En tant qu'assistant pédagogique expert, crée un plan de leçon détaillé de 45 minutes en français. Structure la leçon en phases chronométrées. Intègre intelligemment les notes existantes de l'enseignant :
- Matière: ${matiere}, Classe: ${classe}, Thème de la leçon: ${lecon}
- Travaux de classe prévus : ${travaux}
- Support/Matériel mentionné : ${support}
- Devoirs prévus : ${devoirsPrevus}
Génère une réponse au format JSON valide uniquement selon la structure suivante (valeurs concrètes et professionnelles en français) : ${jsonStructure}`;
    }

    // === CORRECTION : modèle & endpoint ===
    const MODEL_NAME = "gemini-2.5-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
      contents: [{ role: "user", parts: [{ text: prompt }]}],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const aiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.json().catch(() => ({}));
      console.error("Erreur de l'API Google AI:", JSON.stringify(errorBody, null, 2));
      throw new Error(`[${aiResponse.status} ${aiResponse.statusText}] ${errorBody.error?.message || 'Erreur inconnue de l\'API.'}`);
    }

    const aiResult = await aiResponse.json();
    const text = aiResult?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    let aiData;
    try {
      aiData = JSON.parse(text);
    } catch (e) {
      console.error("Erreur de parsing JSON de la réponse de l'IA:", text);
      return res.status(500).json({ message: "L'IA a retourné une réponse mal formée." });
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
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buf);

  } catch (error) {
    console.error('❌ Erreur serveur /generate-ai-lesson-plan:', error);
    if (!res.headersSent) {
      const errorMessage = error.message || "Erreur interne.";
      res.status(500).json({ message: `Erreur interne lors de la génération IA: ${errorMessage}` });
    }
  }
});

// --------------------- Génération IA Hebdomadaire (plans multiples) --------------------

app.post('/api/generate-weekly-lesson-plans', async (req, res) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ message: "Le service IA n'est pas initialisé. Vérifiez la clé API GEMINI du serveur." });
    }

    const lessonTemplateUrl = process.env.LESSON_TEMPLATE_URL;
    if (!lessonTemplateUrl) {
      return res.status(503).json({ message: "L'URL du modèle de leçon Word n'est pas configurée." });
    }

    const { week, data } = req.body;
    if (!data || !Array.isArray(data) || data.length === 0 || !week) {
      return res.status(400).json({ message: "Les données ou la semaine sont manquantes." });
    }

    console.log(`🚀 Génération de ${data.length} plans de leçons IA pour la semaine ${week}`);

    // Charger le modèle Word une seule fois
    let templateBuffer;
    try {
      const response = await fetch(lessonTemplateUrl);
      if (!response.ok) throw new Error(`Échec du téléchargement du modèle Word (${response.status})`);
      templateBuffer = Buffer.from(await response.arrayBuffer());
    } catch (e) {
      console.error("Erreur de récupération du modèle Word:", e);
      return res.status(500).json({ message: "Impossible de récupérer le modèle de leçon depuis l'URL fournie." });
    }

    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Plans_Lecons_Semaine_${week}.zip"`);

    archive.pipe(res);

    // Créer un fichier info
    const infoContent = `Plans de leçons générés pour la semaine ${week}\nNombre total: ${data.length}\nGénéré le: ${new Date().toLocaleString('fr-FR')}\n`;
    archive.append(infoContent, { name: 'INFO.txt' });

    // Générer chaque plan de leçon individuellement
    const MODEL_NAME = "gemini-2.5-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    
    const weekNumber = Number(week);
    const datesNode = specificWeekDateRangesNode[weekNumber];
    
    const jsonStructure = `{"TitreUnite":"un titre d'unité pertinent pour la leçon","Methodes":"liste des méthodes d'enseignement","Outils":"liste des outils de travail","Objectifs":"une liste concise des objectifs d'apprentissage (compétences, connaissances), séparés par des sauts de ligne (\\\\n). Commence chaque objectif par un tiret (-).","etapes":[{"phase":"Introduction","duree":"5 min","activite":"Description de l'activité d'introduction pour l'enseignant et les élèves."},{"phase":"Activité Principale","duree":"25 min","activite":"Description de l'activité principale, en intégrant les 'travaux de classe' et le 'support' si possible."},{"phase":"Synthèse","duree":"10 min","activite":"Description de l'activité de conclusion et de vérification des acquis."},{"phase":"Clôture","duree":"5 min","activite":"Résumé rapide et annonce des devoirs."}],"Ressources":"les ressources spécifiques à utiliser.","Devoirs":"une suggestion de devoirs.","DiffLents":"une suggestion pour aider les apprenants en difficulté.","DiffTresPerf":"une suggestion pour stimuler les apprenants très performants.","DiffTous":"une suggestion de différenciation pour toute la classe."}`;

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i++) {
      try {
        const rowData = data[i];
        console.log(`📝 Génération du plan ${i + 1}/${data.length}...`);

        // Extraire les données
        const enseignant = rowData[findKey(rowData, 'Enseignant')] || '';
        const classe = rowData[findKey(rowData, 'Classe')] || '';
        const matiere = rowData[findKey(rowData, 'Matière')] || '';
        const lecon = rowData[findKey(rowData, 'Leçon')] || '';
        const jour = rowData[findKey(rowData, 'Jour')] || '';
        const seance = rowData[findKey(rowData, 'Période')] || '';
        const support = rowData[findKey(rowData, 'Support')] || 'Non spécifié';
        const travaux = rowData[findKey(rowData, 'Travaux de classe')] || 'Non spécifié';
        const devoirsPrevus = rowData[findKey(rowData, 'Devoirs')] || 'Non spécifié';

        // Date formatée
        let formattedDate = "";
        if (jour && datesNode?.start) {
          const weekStartDateNode = new Date(datesNode.start + 'T00:00:00Z');
          if (!isNaN(weekStartDateNode.getTime())) {
            const dateOfDay = getDateForDayNameNode(weekStartDateNode, jour);
            if (dateOfDay) formattedDate = formatDateFrenchNode(dateOfDay);
          }
        }

        // Créer le prompt selon la langue de l'enseignant
        let prompt;
        if (englishTeachers.includes(enseignant)) {
          prompt = `As an expert pedagogical assistant, create a detailed 45-minute lesson plan in English. Structure the lesson into timed phases. Intelligently integrate the teacher's existing notes:
- Subject: ${matiere}, Class: ${classe}, Lesson Topic: ${lecon}
- Planned Classwork: ${travaux}
- Mentioned Support/Materials: ${support}
- Planned Homework: ${devoirsPrevus}
Generate a response in valid JSON format only. Use the following JSON structure with professional and concrete values in English: ${jsonStructure}`;
        } else if (arabicTeachers.includes(enseignant)) {
          prompt = `بصفتك مساعدًا تربويًا خبيرًا، قم بإنشاء خطة درس مفصلة باللغة العربية مدتها 45 دقيقة. قم ببناء الدرس في مراحل محددة بوقت. ادمج بذكاء ملاحظات المعلم الحالية:
- المادة: ${matiere}, الفصل: ${classe}, موضوع الدرس: ${lecon}
- عمل الفصل المخطط له: ${travaux}
- الدعم / المواد المذكورة: ${support}
- الواجبات المخطط لها: ${devoirsPrevus}
قم بإنشاء استجابة بتنسيق JSON صالح فقط. يجب استعمال البنية التالية بقيم مهنية وملموسة (المفاتيح بالإنجليزية): ${jsonStructure}`;
        } else {
          prompt = `En tant qu'assistant pédagogique expert, crée un plan de leçon détaillé de 45 minutes en français. Structure la leçon en phases chronométrées. Intègre intelligemment les notes existantes de l'enseignant :
- Matière: ${matiere}, Classe: ${classe}, Thème de la leçon: ${lecon}
- Travaux de classe prévus : ${travaux}
- Support/Matériel mentionné : ${support}
- Devoirs prévus : ${devoirsPrevus}
Génère une réponse au format JSON valide uniquement selon la structure suivante (valeurs concrètes et professionnelles en français) : ${jsonStructure}`;
        }

        // Appeler l'API Gemini
        const requestBody = {
          contents: [{ role: "user", parts: [{ text: prompt }]}],
          generationConfig: {
            responseMimeType: "application/json"
          }
        };

        const aiResponse = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!aiResponse.ok) {
          const errorBody = await aiResponse.json().catch(() => ({}));
          console.error(`❌ Erreur API Gemini pour plan ${i + 1}:`, errorBody);
          errorCount++;
          continue; // Passer au suivant
        }

        const aiResult = await aiResponse.json();
        const text = aiResult?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        let aiData;
        try {
          aiData = JSON.parse(text);
        } catch (e) {
          console.error(`❌ Erreur parsing JSON pour plan ${i + 1}:`, text);
          errorCount++;
          continue;
        }

        // Générer le document Word
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

        // Créer un nom de fichier sécurisé
        const sanitizeForFilename = (str) => {
          if (typeof str !== 'string') str = String(str);
          const normalized = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return normalized
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9-]/g, '_')
            .replace(/__+/g, '_');
        };

        const filename = `Plan_${i + 1}_${sanitizeForFilename(classe)}_${sanitizeForFilename(matiere)}_${sanitizeForFilename(seance)}.docx`;
        
        // Ajouter au ZIP
        archive.append(buf, { name: filename });
        successCount++;
        console.log(`✅ Plan ${i + 1}/${data.length} généré: ${filename}`);

      } catch (error) {
        console.error(`❌ Erreur génération plan ${i + 1}:`, error);
        errorCount++;
      }
    }

    // Ajouter un résumé
    const summaryContent = `Résumé de génération
======================
Total demandés: ${data.length}
Succès: ${successCount}
Erreurs: ${errorCount}
Génération terminée le: ${new Date().toLocaleString('fr-FR')}
`;
    archive.append(summaryContent, { name: 'RESUME.txt' });

    await archive.finalize();
    console.log(`✅ Archive ZIP finalisée: ${successCount} plans générés, ${errorCount} erreurs`);
    
  } catch (error) {
    console.error('❌ Erreur serveur /generate-weekly-lesson-plans:', error);
    if (!res.headersSent) {
      const errorMessage = error.message || "Erreur interne.";
      res.status(500).json({ message: `Erreur interne lors de la génération hebdomadaire: ${errorMessage}` });
    }
  }
});

// Démarrer le serveur seulement si ce fichier est exécuté directement
if (require.main === module) {
  // Validate week date ranges on startup
  validateWeekDateRanges();
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur Plans Hebdomadaires démarré sur le port ${PORT}`);
    console.log(`📝 Application accessible à l'adresse : http://localhost:${PORT}`);
  });
}

module.exports = app;
