
import express from 'express';
import cors from 'cors';
import { db } from './firebase.js';

import {
  todayStr,
  dailyDocId,
  isAlphaWord,
  computeFeedback,
  genId,
  computeRemaining
} from './lib/helpers.js';

import {
  fetchRandomFiveLetterWord,
  fetchBestDefinitionForWord,
  fetchBestSynonymForWord,
  isRealWord
} from './wordsApi.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ------------------ DAILY ROUTES ------------------

// GET /api/v1/word/today
app.get('/api/v1/word/today', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en-ZA').toString();
    const date = todayStr();
    const mode = 'daily';
    const id = dailyDocId(date, lang, mode);
    const ref = db.collection('puzzles').doc(id);

    // Try Firestore
    const snap = await ref.get();
    if (snap.exists) {
      const data = snap.data();
      const { answer, definition, synonym, ...publicMeta } = data;
      return res.json({
        ...publicMeta,
        hasDefinition: !!definition,
        hasSynonym: !!synonym
      });
    }

    // Seed if missing
    let word = null;
    let bestDef = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      word = await fetchRandomFiveLetterWord();
      bestDef = await fetchBestDefinitionForWord(word);
      console.log(`Attempt ${attempt}: "${word}" - has definition? ${!!bestDef}`);
      if (bestDef) break;
    }

    let bestSyn = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      bestSyn = await fetchBestSynonymForWord(word);
      console.log(`Synonym attempt ${attempt} for "${word}" - has synonym? ${!!bestSyn}`);
      if (bestSyn) break;
    }

    const payload = {
      date,
      lang,
      length: 5,
      mode,
      answer: word,        
      definition: bestDef, 
      synonym: bestSyn,    
      source: 'wordsapi',
      createdAt: new Date().toISOString()
    };
    await ref.set(payload, { merge: false });

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

// GET /api/v1/word/definition
app.get('/api/v1/word/definition', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en-ZA').toString();
    const date = (req.query.date || todayStr()).toString();
    const mode = 'daily';
    const id = dailyDocId(date, lang, mode);

    const snap = await db.collection('puzzles').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'No puzzle found' });

    const data = snap.data();
    res.json({
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

// GET /api/v1/word/synonym
app.get('/api/v1/word/synonym', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en-ZA').toString();
    const date = (req.query.date || todayStr()).toString();
    const mode = 'daily';
    const id = dailyDocId(date, lang, mode);

    const snap = await db.collection('puzzles').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'No puzzle found' });

    const data = snap.data();
    res.json({
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

// POST /api/v1/word/validate
app.post('/api/v1/word/validate', async (req, res) => {
  try {
    const lang = (req.body?.lang || 'en-ZA').toString();
    const date = (req.body?.date || todayStr()).toString();
    const mode = 'daily';
    const id = dailyDocId(date, lang, mode);

    const snap = await db.collection('puzzles').doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: 'No puzzle found' });

    const data = snap.data();
    const answerUpper = (data.answer || '').toUpperCase();
    const length = data.length || 5;

    const rawGuess = (req.body?.guess || '').toString();
    const guessUpper = rawGuess.toUpperCase();

    if (!isAlphaWord(guessUpper) || guessUpper.length !== length) {
      return res.status(400).json({ error: `Guess must be ${length} letters A–Z` });
    }

    const real = await isRealWord(guessUpper);
    if (!real) {
      return res.status(400).json({ error: 'Guess is not a valid dictionary word' });
    }

    const feedback = computeFeedback(guessUpper, answerUpper);
    const won = feedback.every(c => c === 'G');

    res.json({
      date: data.date,
      lang: data.lang,
      mode: data.mode,
      length,
      guess: guessUpper,
      feedback,
      won
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to validate guess' });
  }
});

// ------------------ SPEEDLE ROUTES  ------------------

// POST /api/v1/speedle/start
app.post('/api/v1/speedle/start', async (req, res) => {
  try {
    const lang = (req.body?.lang || 'en-ZA').toString();
    const durationSec = Number(req.body?.durationSec ?? 60);
    if (![60, 90, 120].includes(durationSec)) {
      return res.status(400).json({ error: 'durationSec must be 60, 90, or 120' });
    }

    // avoid duplicating daily answer
    const dailyId = dailyDocId(todayStr(), lang, 'daily');
    const dailySnap = await db.collection('puzzles').doc(dailyId).get();
    const dailyAnswer = dailySnap.exists ? (dailySnap.data().answer || '').toUpperCase() : null;

    let word;
    for (let tries = 0; tries < 10; tries++) {
      word = await fetchRandomFiveLetterWord();
      if (word && word !== dailyAnswer) break;
    }
    if (!word) return res.status(500).json({ error: 'Failed to pick a word' });

    const sessionId = genId('sp');
    const startedAt = new Date().toISOString();

    const sessionDoc = {
      sessionId,
      wordId: genId('w'),
      answer: word, 
      length: 5,
      lang,
      durationSec,
      startedAt,
      date: today,
      guessesUsed: 0,
      hintUsed: false,
      hintPenaltySec: 0,
      finishedAt: null,
      endReason: null, // 'won' | 'timeout' | 'attempts'
      won: false,
      score: null,  
      source: 'speedle'
    };

    await db.collection('speedle_sessions').doc(sessionId).set(sessionDoc);

    res.json({
      sessionId,
      wordId: sessionDoc.wordId,
      length: 5,
      lang,
      durationSec,
      startedAt
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to start speedle' });
  }
});

// POST /api/v1/speedle/validate
app.post('/api/v1/speedle/validate', async (req, res) => {
  try {
    const sessionId = (req.body?.sessionId || '').toString();
    const guess = (req.body?.guess || '').toString().toUpperCase();
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    const ref = db.collection('speedle_sessions').doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Session not found' });
    const s = snap.data();

    if (s.finishedAt) return res.status(400).json({ error: 'Session finished' });

    const remaining = computeRemaining(s);
    if (remaining <= 0) {
      await ref.update({ finishedAt: new Date().toISOString(), endReason: 'timeout', won: false });
      return res.status(400).json({ error: 'Time expired' });
    }

    if (!isAlphaWord(guess) || guess.length !== s.length) {
      return res.status(400).json({ error: `Guess must be ${s.length} letters` });
    }
    const real = await isRealWord(guess);
    if (!real) return res.status(400).json({ error: 'Not a valid dictionary word' });

    if (s.guessesUsed >= 6) {
      await ref.update({ finishedAt: new Date().toISOString(), endReason: 'attempts', won: false });
      return res.status(400).json({ error: 'No attempts left' });
    }

    const feedback = computeFeedback(guess, (s.answer || '').toUpperCase());
    const won = feedback.every(c => c === 'G');

    const updates = { guessesUsed: s.guessesUsed + 1 };
    if (won) {
      updates.finishedAt = new Date().toISOString();
      updates.endReason = 'won';
      updates.won = true;
    }
    await ref.update(updates);

    const remainingSec = computeRemaining({ ...s, ...updates });

    res.json({
      feedback,
      won,
      guessesUsed: updates.guessesUsed,
      remainingSec
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Validate failed' });
  }
});

// POST /api/v1/speedle/hint
app.post('/api/v1/speedle/hint', async (req, res) => {
  try {
    const sessionId = (req.body?.sessionId || '').toString();
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    const ref = db.collection('speedle_sessions').doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Session not found' });
    const s = snap.data();

    if (s.finishedAt) return res.status(400).json({ error: 'Session finished' });
    if (s.hintUsed) return res.status(400).json({ error: 'Hint already used' });

    const remaining = computeRemaining(s);
    if (remaining <= 0) return res.status(400).json({ error: 'Time expired' });
    if (remaining <= 10) return res.status(400).json({ error: 'Insufficient time' });

    const defObj = await fetchBestDefinitionForWord(s.answer);
    const definition = defObj?.definition || null;

    const updated = {
      hintUsed: true,
      hintPenaltySec: (s.hintPenaltySec || 0) + 10 // -10s
    };
    await ref.update(updated);

    const remainingSec = computeRemaining({ ...s, ...updated });
    res.json({ definition, remainingSec });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Hint failed' });
  }
});

// POST /api/v1/speedle/finish
app.post('/api/v1/speedle/finish', async (req, res) => {
  try {
    const sessionId = (req.body?.sessionId || '').toString();
    const endReason = (req.body?.endReason || '').toString(); // 'won' | 'timeout' | 'attempts'
    const displayName = (req.body?.displayName || '').toString();
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
    if (!['won', 'timeout', 'attempts'].includes(endReason)) {
      return res.status(400).json({ error: 'Invalid endReason' });
    }

    const ref = db.collection('speedle_sessions').doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Session not found' });
    const s = snap.data();

    const remainingSec = computeRemaining(s);
    const won = endReason === 'won';

    const guessesUsed = s.guessesUsed || 0;
    const score = won ? Math.max(0, (remainingSec * 1000) - (guessesUsed * 10)) : 0;

    await ref.update({
      finishedAt: new Date().toISOString(),
      endReason,
      won,
      score,
      timeRemainingSec: remainingSec,
      guessesUsed,
      ...(displayName ? { displayName } : {}),
    });

    const defObj = await fetchBestDefinitionForWord(s.answer);
    const synObj = await fetchBestSynonymForWord(s.answer);

   res.json({
      won,
      timeRemainingSec: remainingSec,
      guessesUsed,
      score,
      leaderboardPosition: null,
      definition: defObj?.definition || null,
      synonym: synObj || null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Finish failed' });
  }
});

// GET /api/v1/speedle/leaderboard?date=YYYY-MM-DD&duration=90&limit=100
app.get('/api/v1/speedle/leaderboard', async (req, res) => {
  try {
    const date = (req.query.date || todayStr()).toString();
    const durationSec = Number(req.query.duration || 90);
    const limit = Math.min(200, Number(req.query.limit || 100));

    // won only, same date & duration
    let q = db.collection('speedle_sessions')
      .where('date', '==', date)
      .where('durationSec', '==', durationSec)
      .where('won', '==', true)
      .orderBy('score', 'desc')
      .orderBy('finishedAt', 'asc')   // tie-break: earlier finish
      .orderBy('guessesUsed', 'asc')  // tie-break: fewer guesses
      .limit(limit);

    const snap = await q.get();
    const rows = [];
    let rank = 1;
    snap.forEach(doc => {
      const d = doc.data();
      rows.push({
        rank: rank++,
        displayName: d.displayName || 'Player',
        score: d.score ?? 0,
        guessesUsed: d.guessesUsed ?? 0,
        timeRemainingSec: d.timeRemainingSec ?? 0,
        finishedAt: d.finishedAt ?? null,
      });
    });

    res.json(rows);
  } catch (e) {
    console.error(e);
    // Firestore needs a composite index the first time you run this query:
    // follow the console link error once, create index, then it works.
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// ------------------ START SERVER ------------------
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
