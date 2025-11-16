import express from 'express';
import cors from 'cors';
import { db } from './firebase.js';
import { optionalAuth, requireAuth } from './auth.js';

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
app.use(optionalAuth);

const PORT = process.env.PORT || 4000;

// health endpoint
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

/* ------------------ DAILY ROUTES ------------------ */

// GET /api/v1/word/today
app.get('/api/v1/word/today', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en-ZA').toString();
    const date = todayStr();
    const mode = 'daily';
    const id = dailyDocId(date, lang, mode);
    const ref = db.collection('puzzles').doc(id);

    // has this authenticated user already played?
    let played = false;
    if (req.user?.uid) {
      const playedDocId = `${date}_${lang}_${req.user.uid}`;
      const playedSnap = await db.collection('results').doc(playedDocId).get();
      played = playedSnap.exists;
    }

    // Try Firestore
    const snap = await ref.get();
    if (snap.exists) {
      const data = snap.data();
      const { definition, synonym, ...publicMeta } = data;  // Keep answer, remove only definition/synonym
      return res.json({
        ...publicMeta,
        hasDefinition: !!definition,
        hasSynonym: !!synonym,
        played
      });
    }

    // Seed if missing (retry to get a word with a definition)
    let word = null;
    let bestDef = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      word = await fetchRandomFiveLetterWord();
      bestDef = await fetchBestDefinitionForWord(word);
      console.log(`Attempt ${attempt}: "${word}" - has definition? ${!!bestDef}`);
      if (bestDef) break;
    }

    // Synonym — try up to 5 times for the SAME word
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

    const { definition: _def, synonym: _syn, ...publicMeta } = payload;  // Keep answer
    return res.json({
      ...publicMeta,
      hasDefinition: !!_def,
      hasSynonym: !!_syn,
      played
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to load today's word" });
  }
});

// GET /api/v1/word/definition
app.get('/api/v1/word/definition', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en-ZA').toString();
    const date = (req.query.date || todayStr()).toString();
    const id = dailyDocId(date, lang, 'daily');

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
    const id = dailyDocId(date, lang, 'daily');

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
app.post('/api/v1/word/validate', requireAuth, async (req, res) => {
  try {
    const lang = (req.body?.lang || 'en-ZA').toString();
    const date = (req.body?.date || todayStr()).toString();
    const id = dailyDocId(date, lang, 'daily');

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

// POST /api/v1/word/submit
app.post('/api/v1/word/submit', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const lang = (req.body?.lang || 'en-ZA').toString();
    const date = (req.body?.date || todayStr()).toString();
    const guesses = Array.isArray(req.body?.guesses) ? req.body.guesses.map(String) : [];
    const won = !!req.body?.won;
    const durationSec = Number(req.body?.durationSec ?? 0);
    const clientId = (req.body?.clientId || '').toString();

    if (guesses.length === 0 || guesses.some(g => g.length !== 5)) {
      return res.status(400).json({ error: 'Invalid guesses array' });
    }

    // Load puzzle to compute feedback + answer
    const puzzleId = dailyDocId(date, lang, 'daily');
    const pSnap = await db.collection('puzzles').doc(puzzleId).get();
    if (!pSnap.exists) return res.status(404).json({ error: 'No puzzle found' });
    const puzzle = pSnap.data();
    const answer = (puzzle.answer || '').toUpperCase();

    const feedbackRows = guesses.map(g => computeFeedback(g.toUpperCase(), answer));
    const docId = `${date}_${lang}_${uid}`;
    const payload = {
      uid, date, lang, mode: 'daily',
      guesses, feedbackRows, won,
      guessCount: guesses.length,
      durationSec,
      clientId: clientId || null,
      submittedAt: new Date().toISOString()
    };

    const ref = db.collection('results').doc(docId);
    const existing = await ref.get();
    if (existing.exists) {
      // Already recorded → still return the answer so the client can display it
      return res.json({ status: 'ok', deduped: true, answer });
    }

    await ref.set(payload, { merge: false });
    res.json({ status: 'ok', answer });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to submit result' });
  }
});


// GET /api/v1/word/myresult
app.get('/api/v1/word/myresult', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid;
    const date = (req.query.date || todayStr()).toString();
    const lang = (req.query.lang || 'en-ZA').toString();
    const docId = `${date}_${lang}_${uid}`;

    const snap = await db.collection('results').doc(docId).get();
    if (!snap.exists) return res.status(404).json({ error: 'No result yet' });
    const r = snap.data();

    // load answer from puzzle doc
    const puzzleId = dailyDocId(date, lang, 'daily');
    const pSnap = await db.collection('puzzles').doc(puzzleId).get();
    const answer = pSnap.exists ? (pSnap.data().answer || null) : null;

    res.json({
      date: r.date,
      lang: r.lang,
      mode: 'daily',
      guesses: r.guesses || [],
      feedbackRows: r.feedbackRows || [],
      won: !!r.won,
      guessCount: r.guessCount || (r.guesses?.length ?? 0),
      durationSec: r.durationSec ?? 0,
      submittedAt: r.submittedAt || null,
      answer  
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load result' });
  }
});


/* ------------------ SPEEDLE ROUTES ------------------ */

app.post('/api/v1/speedle/start', async (req, res) => {
  try {
    const lang = (req.body?.lang || 'en-ZA').toString();
    const durationSec = Number(req.body?.durationSec ?? 60);
    if (![60, 90, 120].includes(durationSec)) {
      return res.status(400).json({ error: 'durationSec must be 60, 90, or 120' });
    }

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
      date: todayStr(),
      guessesUsed: 0,
      hintUsed: false,
      hintPenaltySec: 0,
      finishedAt: null,
      endReason: null,
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
      hintPenaltySec: (s.hintPenaltySec || 0) + 10
    };
    await ref.update(updated);

    const remainingSec = computeRemaining({ ...s, ...updated });
    res.json({ definition, remainingSec });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Hint failed' });
  }
});

app.get('/api/v1/speedle/leaderboard', async (req, res) => {
  try {
    const date = (req.query.date || todayStr()).toString();
    const durationSec = Number(req.query.duration || 90);
    const limit = Math.min(200, Number(req.query.limit || 100));

    let q = db.collection('speedle_sessions')
      .where('date', '==', date)
      .where('durationSec', '==', durationSec)
      .where('won', '==', true)
      .orderBy('score', 'desc')
      .orderBy('finishedAt', 'asc')
      .orderBy('guessesUsed', 'asc')
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
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// POST /api/v1/speedle/finish
app.post('/api/v1/speedle/finish', async (req, res) => {
  try {
    const sessionId   = (req.body?.sessionId || '').toString();
    const endReason   = (req.body?.endReason || '').toString(); // "won" | "timeout" | "attempts"
    const displayName = (req.body?.displayName || '').toString();

    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
    if (!['won', 'timeout', 'attempts'].includes(endReason)) {
      return res.status(400).json({ error: 'Invalid endReason' });
    }

    const ref  = db.collection('speedle_sessions').doc(sessionId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Session not found' });

    const s = snap.data();

    const remainingSec = computeRemaining(s);
    const won          = endReason === 'won';
    const guessesUsed  = s.guessesUsed || 0;
    const score        = won ? Math.max(0, (remainingSec * 1000) - (guessesUsed * 10)) : 0;

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
      synonym:   synObj || null,
      answer:    (s.answer || null) 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Finish failed' });
  }
});

// Only start the server when not running tests
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

export default app;
