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
    
