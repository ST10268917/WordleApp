import 'dotenv/config';
import { db } from './firebase.js';
import express from 'express';
import cors from 'cors';
import { fetchRandomFiveLetterWord, fetchBestDefinitionForWord, fetchBestSynonymForWord, isRealWord  } from './wordsapi.js';


const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

function todayStr() {
  return new Date().toISOString().slice(0,10); // YYYY-MM-DD
}
function dailyDocId(dateStr, lang = 'en-ZA', mode = 'daily') {
  return `${dateStr}_${lang}_${mode}`;
}

function isAlphaWord(s) {
  return typeof s === 'string' && /^[A-Za-z]+$/.test(s);
}

function computeFeedback(guessUpper, answerUpper) {
  const n = answerUpper.length;
  const res = new Array(n).fill('B'); // default grey/blank

  // Track remaining counts of each letter after greens
  const rem = {}; // { char: count }
  for (let i = 0; i < n; i++) {
    if (guessUpper[i] === answerUpper[i]) {
      res[i] = 'G';
    } else {
      const ch = answerUpper[i];
      rem[ch] = (rem[ch] || 0) + 1;
    }
  }

  // Second pass: assign Y where applicable
  for (let i = 0; i < n; i++) {
    if (res[i] === 'G') continue;
    const ch = guessUpper[i];
    if (rem[ch] > 0) {
      res[i] = 'Y';
      rem[ch] -= 1;
    }
  }

  return res; // array like ["B","G","Y","B","B"]
}

//Endpoint to get the daily word 
app.get('/api/v1/word/today', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en-ZA').toString();
    const date = todayStr();
    const mode = 'daily';
    const id = dailyDocId(date, lang, mode);
    const ref = db.collection('puzzles').doc(id);

    // 1) Try Firestore first
    const snap = await ref.get();
    if (snap.exists) {
      const data = snap.data();
      const { answer, definition, synonym, ...publicMeta } = data; // never leak answer/defs/synonym
      return res.json({
        ...publicMeta,
        hasDefinition: !!definition,
        hasSynonym: !!synonym
      });
    }

    // 2) Seed data — retry up to 5 times to find a word that has a definition
    let word = null;
    let bestDef = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      word = await fetchRandomFiveLetterWord();
      bestDef = await fetchBestDefinitionForWord(word);
      console.log(`Attempt ${attempt}: "${word}" - has definition? ${!!bestDef}`);
      if (bestDef) break;
    }

    // 2b) Synonym — try up to 5 times for the SAME word
    let bestSyn = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      bestSyn = await fetchBestSynonymForWord(word);
      console.log(`Synonym attempt ${attempt} for "${word}" - has synonym? ${!!bestSyn}`);
      if (bestSyn) break;
    }

    // 3) Store in Firestore
    const payload = {
      date,
      lang,
      length: 5,
      mode,
      answer: word,        // server-only
      definition: bestDef, // SINGLE object or null
      synonym: bestSyn,    // SINGLE string or null
      source: 'wordsapi',
      createdAt: new Date().toISOString()
    };
    await ref.set(payload, { merge: false });

    // 4) Return public metadata only
    const { answer, definition: _def, synonym: _syn, ...publicMeta } = payload;
    res.json({
      ...publicMeta,
      hasDefinition: !!_def,
      hasSynonym: !!_syn
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load today's word" });
  }
});

// GET the single stored definition for the daily puzzle
app.get('/api/v1/word/definition', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en-ZA').toString();
    const date = (req.query.date || todayStr()).toString();
    const mode = 'daily';
    const id = dailyDocId(date, lang, mode);

    const snap = await db.collection('puzzles').doc(id).get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'No puzzle found for the requested date/language' });
    }

    const data = snap.data();
    // Never return the answer
    return res.json({
      date: data.date,
      lang: data.lang,
      mode: data.mode,
      definition: data.definition || null
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load definition' });
  }
});

// GET the single stored synonym for the daily puzzle
app.get('/api/v1/word/synonym', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en-ZA').toString();
    const date = (req.query.date || todayStr()).toString();
    const mode = 'daily';
    const id = dailyDocId(date, lang, mode);

    const snap = await db.collection('puzzles').doc(id).get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'No puzzle found for the requested date/language' });
    }

    const data = snap.data();
    // Never return the answer
    return res.json({
      date: data.date,
      lang: data.lang,
      mode: data.mode,
      synonym: data.synonym || null
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load synonym' });
  }
});

// Validate a guess against today's puzzle without leaking the answer.
app.post('/api/v1/word/validate', async (req, res) => {
  try {
    const lang = (req.body?.lang || 'en-ZA').toString();
    const date = (req.body?.date || todayStr()).toString();
    const mode = 'daily';
    const id = dailyDocId(date, lang, mode);

    const snap = await db.collection('puzzles').doc(id).get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'No puzzle found for the requested date/language' });
    }

    const data = snap.data();
    const answerUpper = (data.answer || '').toUpperCase();
    const length = data.length || 5;

    const rawGuess = (req.body?.guess || '').toString();
    const guessUpper = rawGuess.toUpperCase();

    // Basic validation 
    if (!isAlphaWord(guessUpper) || guessUpper.length !== length) {
      return res.status(400).json({ error: `Guess must be ${length} letters A–Z` });
    }

    // Dictionary validation
    const real = await isRealWord(guessUpper);
    if (!real) {
      return res.status(400).json({ error: 'Guess is not a valid dictionary word' });
    }

    // Compute Wordle-style feedback
    const feedback = computeFeedback(guessUpper, answerUpper); // ["B","G","Y","B","B"]

    // We collapse per-letter best state: G > Y > B
    const keyboard = {};
    for (let i = 0; i < feedback.length; i++) {
      const ch = guessUpper[i];
      const rank = (c) => (c === 'G' ? 3 : c === 'Y' ? 2 : 1);
      if (!keyboard[ch] || rank(feedback[i]) > rank(keyboard[ch])) {
        keyboard[ch] = feedback[i];
      }
    }

    const won = feedback.every(c => c === 'G');

    return res.json({
      date: data.date,
      lang: data.lang,
      mode: data.mode,
      length,
      guess: guessUpper,
      feedback,         // e.g., ["B","G","Y","B","B"]
      won               // boolean convenience flag
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to validate guess' });
  }
});



app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
