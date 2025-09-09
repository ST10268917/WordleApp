// wordsApi.js
import axios from 'axios';

const WORDSAPI_HOST = process.env.WORDSAPI_HOST || 'wordsapiv1.p.rapidapi.com';
const WORDSAPI_KEY = process.env.WORDSAPI_KEY;

const FALLBACK_WORDS = ['PLANE','CRANE','SNAKE','BREAD','GRASS','WATER','PHONE','CHAIR','TABLE','SMILE'];

/** Random 5-letter word (UPPERCASE). Falls back to a local list if key missing/error. */
export async function fetchRandomFiveLetterWord() {
  if (!WORDSAPI_KEY) return pickFallback();
  try {
    const res = await axios.get(`https://${WORDSAPI_HOST}/words/`, {
      params: { random: true, letters: 5 },
      headers: {
        'X-RapidAPI-Key': WORDSAPI_KEY,
        'X-RapidAPI-Host': WORDSAPI_HOST
      },
      timeout: 8000
    });
    const word =
      res.data?.word ??
      res.data?.results?.word ??
      (Array.isArray(res.data?.words) ? res.data.words[0] : undefined);

    return (typeof word === 'string' && word.length === 5)
      ? word.toUpperCase()
      : pickFallback();
  } catch {
    return pickFallback();
  }
}

/** Best definition by rule: first noun; else first definition. Returns {partOfSpeech, definition, example|null} or null. */
export async function fetchBestDefinitionForWord(wordUpper) {
  const wordLower = (wordUpper || '').toLowerCase();
  if (!WORDSAPI_KEY) return null;

  try {
    const url = `https://${WORDSAPI_HOST}/words/${encodeURIComponent(wordLower)}/definitions`;
    const res = await axios.get(url, {
      headers: {
        'X-RapidAPI-Key': WORDSAPI_KEY,
        'X-RapidAPI-Host': WORDSAPI_HOST
      },
      timeout: 8000
    });

    const defsArr = Array.isArray(res.data?.definitions) ? res.data.definitions : [];
    if (!defsArr.length) return null;

    const normalized = defsArr
      .map(d => ({
        partOfSpeech: typeof d.partOfSpeech === 'string' ? d.partOfSpeech.toLowerCase() : null,
        definition: typeof d.definition === 'string' ? d.definition.trim() : null,
        example: null // this endpoint usually doesn't include examples
      }))
      .filter(d => d.definition);

    if (!normalized.length) return null;

    const noun = normalized.find(d => d.partOfSpeech === 'noun');
    return noun ?? normalized[0];
  } catch (e) {
    // optional: console.error('WordsAPI /definitions error:', e?.response?.status, e?.response?.data || e.message);
    return null;
  }
}

/** Try up to maxRetries to get a word that has a definition. */
export async function getWordOfTheDayWithRetry(maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const word = await fetchRandomFiveLetterWord();
    const bestDef = await fetchBestDefinitionForWord(word);
    // console.log(`Attempt ${attempt}: "${word}" - has definition? ${!!bestDef}`);
    if (bestDef) return { word, definition: bestDef };
  }
  // last resort: return a random word without definition
  const word = await fetchRandomFiveLetterWord();
  return { word, definition: null };
}

// wordsApi.js (add below your other exports)
export async function fetchBestSynonymForWord(wordUpper) {
  const wordLower = (wordUpper || '').toLowerCase();
  if (!WORDSAPI_KEY) return null;

  try {
    const url = `https://${WORDSAPI_HOST}/words/${encodeURIComponent(wordLower)}/synonyms`;
    const res = await axios.get(url, {
      headers: {
        'X-RapidAPI-Key': WORDSAPI_KEY,
        'X-RapidAPI-Host': WORDSAPI_HOST
      },
      timeout: 8000
    });

    const arr = Array.isArray(res.data?.synonyms) ? res.data.synonyms : [];
    if (!arr.length) return null;

    // Simple selection rule:
    // 1) Prefer single-word synonyms (avoid phrases like "cover girl")
    // 2) Not identical to the original word
    // 3) Take the first that matches; else fall back to the first item
    const cleaned = arr
      .map(s => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean);

    const singleWord = cleaned.find(s => /^\w+$/.test(s) && s.toLowerCase() !== wordLower);
    return (singleWord || cleaned[0]) || null;
  } catch (e) {
    // optional: console.error('WordsAPI /synonyms error:', e?.response?.status, e?.response?.data || e.message);
    return null;
  }
}


function pickFallback() {
  return FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
}

// Check if a word is valid by asking WordsAPI for its definitions
export async function isRealWord(word) {
  if (!WORDSAPI_KEY) return false; // fail safe if no key
  try {
    const res = await axios.get(`https://${WORDSAPI_HOST}/words/${word.toLowerCase()}/definitions`, {
      headers: {
        'X-RapidAPI-Key': WORDSAPI_KEY,
        'X-RapidAPI-Host': WORDSAPI_HOST
      },
      timeout: 8000
    });

    // If the API returns at least one definition, it’s a real word
    return Array.isArray(res.data.definitions) && res.data.definitions.length > 0;
  } catch (e) {
    // 404 from WordsAPI means "not a real word"
    if (e.response && e.response.status === 404) {
      return false;
    }
    console.error(`Error checking word validity for "${word}":`, e.message);
    return false;
  }
}
