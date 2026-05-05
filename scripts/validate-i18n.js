#!/usr/bin/env node
// Validates that all data-i18n keys exist in i18n JSON files

const fs = require('fs');
const path = require('path');

// Extract keys from HTML
const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const i18nKeys = [...htmlContent.matchAll(/data-i18n="([^"]+)"/g)]
  .map(match => match[1]);

// Load JSON translation files
const enPath = path.join(__dirname, '..', 'i18n', 'en.json');
const zhPath = path.join(__dirname, '..', 'i18n', 'zh.json');

if (!fs.existsSync(enPath) || !fs.existsSync(zhPath)) {
  console.error('❌ Translation files not found');
  process.exit(1);
}

const enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const zhTranslations = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

const enKeys = Object.keys(enTranslations);
const zhKeys = Object.keys(zhTranslations);

// Check missing keys (HTML references not in JSON)
const missingEn = i18nKeys.filter(key => !enKeys.includes(key));
const missingZh = i18nKeys.filter(key => !zhKeys.includes(key));

// Check inconsistent keys (EN has but ZH doesn't, or vice versa)
const inconsistent = enKeys.filter(key => !zhKeys.includes(key))
  .concat(zhKeys.filter(key => !enKeys.includes(key)));

if (missingEn.length || missingZh.length || inconsistent.length) {
  console.error('❌ i18n validation failed:');
  if (missingEn.length) console.error('Missing EN keys:', missingEn);
  if (missingZh.length) console.error('Missing ZH keys:', missingZh);
  if (inconsistent.length) console.error('Inconsistent keys:', inconsistent);
  process.exit(1);
}

console.log('✅ i18n validation passed');
console.log(`   - ${i18nKeys.length} keys used in HTML`);
console.log(`   - ${enKeys.length} keys in en.json`);
console.log(`   - ${zhKeys.length} keys in zh.json`);
