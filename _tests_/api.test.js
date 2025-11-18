// _tests_/api.test.js (ESM-safe mocking)
import { jest } from '@jest/globals';
import request from 'supertest';

// ---- ESM-friendly manual mocks ----
const inMemoryStore = new Map();

function makeDocRef(collection, id) {
  return {
    async get() {
      const key = `${collection}/${id}`;
      const data = inMemoryStore.get(key);
      return { exists: !!data, data: () => data };
    },
    async set(payload /*, opts */) {
      const key = `${collection}/${id}`;
      inMemoryStore.set(key, payload);
    },
    async update(patch) {
      const key = `${collection}/${id}`;
      const cur = inMemoryStore.get(key) || {};
      inMemoryStore.set(key, { ...cur, ...patch });
    },
  };
}
const mockDb = {
  collection(name) {
    return {
      doc(id) {
        return makeDocRef(name, id);
      },
    };
  },
};

// Tell Jest to replace modules BEFORE importing the app
jest.unstable_mockModule('../firebase.js', () => ({
  db: mockDb,
}));
jest.unstable_mockModule('../auth.js', () => ({
  optionalAuth: (req, _res, next) => { req.user = null; next(); },
  requireAuth: (req, _res, next) => { req.user = { uid: 'test-user' }; next(); },
}));
jest.unstable_mockModule('../wordsApi.js', () => ({
  fetchRandomFiveLetterWord: async () => 'CRANE',
  fetchBestDefinitionForWord: async (w) => ({
    partOfSpeech: 'noun',
    definition: `A mock definition for ${String(w).toLowerCase()}`,
    example: null,
  }),
  fetchBestSynonymForWord: async () => 'BIRD',
  isRealWord: async () => true,
}));

// Now import the app AFTER mocks are registered
const { default: app } = await import('../index.js');

describe('API smoke tests', () => {
  test('GET /health returns ok:true', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.ts).toBe('string');
  });

  test('POST /api/v1/word/validate validates a legal guess', async () => {
    await request(app).get('/api/v1/word/today?lang=en-ZA'); // seed
    const res = await request(app)
      .post('/api/v1/word/validate')
      .send({ guess: 'CRANE', lang: 'en-ZA' });
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(5);
    expect(Array.isArray(res.body.feedback)).toBe(true);
    expect(res.body.feedback).toHaveLength(5);
  });

  test('POST /api/v1/word/submit stores result once (idempotent)', async () => {
    await request(app).get('/api/v1/word/today?lang=en-ZA'); // seed

    const payload = {
      lang: 'en-ZA',
      guesses: ['CRANE'],
      won: false,
      durationSec: 12,
      clientId: 'jest',
    };

    let res = await request(app).post('/api/v1/word/submit').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.answer).toBe('string');

    res = await request(app).post('/api/v1/word/submit').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.deduped).toBe(true);
  });
});
