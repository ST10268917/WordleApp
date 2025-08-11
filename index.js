import 'dotenv/config';
import { db } from './firebase.js';
import express from 'express';
import cors from 'cors';
import { fetchRandomFiveLetterWord, fetchBestDefinitionForWord, fetchBestSynonymForWord } from './wordsApi.js';


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



app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
