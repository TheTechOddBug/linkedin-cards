import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ACTION_PATH = path.join(__dirname, '..');

/**
 * Load translations from JSON files in lang/ directory
 * @returns {Object} Object with language codes as keys and translation objects as values
 */
export function loadTranslations() {
    const langDir = path.join(ACTION_PATH, 'lang');
    const translations = {};
    
    if (fs.existsSync(langDir)) {
        const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
        files.forEach(file => {
            const lang = path.basename(file, '.json');
            const content = fs.readFileSync(path.join(langDir, file), 'utf8');
            translations[lang] = JSON.parse(content);
        });
    }
    
    return translations;
}

/**
 * Translate relative time from English to specified language
 * @param {string} englishTime - Time string in English (e.g., "2 hours ago")
 * @param {string} language - Target language code (e.g., "es", "fr")
 * @param {Object} translations - Translations object
 * @returns {string} Translated time string
 */
export function translateRelativeTime(englishTime, language = 'en', translations = {}) {
    if (language === 'en' || !translations[language]) {
        return englishTime;
    }
    
    let translated = englishTime.toLowerCase();
    const trans = translations[language];
    
    Object.keys(trans).forEach(key => {
        if (key === 'invertOrder') return;
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        translated = translated.replace(regex, trans[key]);
    });
    
    if (trans.invertOrder) {
        const parts = translated.trim().split(' ');
        if (parts.length >= 2) {
            const agoWord = trans.ago || 'ago';
            const agoIndex = parts.findIndex(p => p.toLowerCase().includes(agoWord.toLowerCase()));
            if (agoIndex !== -1) {
                parts.splice(agoIndex, 1);
                translated = `${agoWord} ${parts.join(' ')}`;
            }
        }
    }
    
    return translated;
}

/**
 * Get localized string for simple repost label
 * @param {string} language - language code
 * @param {Object} translations - translations object
 * @returns {string} localized reposts label
 */
export function translateRepostLabel(language = 'en', translations = {}) {
    return translations[language]?.reposts
        || translations['en']?.reposts
}
