const {
  fetchRandomFiveLetterWord,
  fetchBestDefinitionForWord,
  fetchBestSynonymForWord,
  getWordOfTheDayWithRetry,
  isRealWord,
} = require('./wordsApi'); // Using require() for stability

// Use require and set up the mock correctly for external libraries
const axios = require('axios');
jest.mock('axios');

// Constants for testing
const MOCK_FALLBACK_WORDS = ['PLANE', 'CRANE', 'SNAKE', 'BREAD', 'GRASS', 'WATER', 'PHONE', 'CHAIR', 'TABLE', 'SMILE'];

// Ensure wordsApi.js uses module.exports if you encounter "is not a function" error
// If wordsApi.js uses 'export', the require statement above might need modification in some environments.
// However, the test file MUST use require for stable mocking.

describe('Words API Functions', () => {

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Test 1: fetchRandomFiveLetterWord (Fallback Mode) ---
  test('fetchRandomFiveLetterWord uses fallback word when API key is missing', async () => {
    // Temporarily set the key to be undefined to force fallback
    const originalKey = process.env.WORDSAPI_KEY;
    process.env.WORDSAPI_KEY = '';

    const word = await fetchRandomFiveLetterWord();

    // The word should be one of the fallback words and not rely on axios
    expect(MOCK_FALLBACK_WORDS).toContain(word);
    expect(axios.get).not.toHaveBeenCalled();

    // Restore original environment
    process.env.WORDSAPI_KEY = originalKey;
  });

  // --- Test 2: fetchRandomFiveLetterWord (Success) ---
  test('fetchRandomFiveLetterWord returns word from API on success', async () => {
    // Mock the successful API response
    axios.get.mockResolvedValueOnce({
      data: {
        word: 'TESTY'
      }
    });

    const word = await fetchRandomFiveLetterWord();

    expect(word).toBe('TESTY');
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('wordsapiv1.p.rapidapi.com/words/'),
      expect.any(Object)
    );
  });


  // --- Test 3: isRealWord (Success) ---
  test('isRealWord returns true for a word with definitions', async () => {
    // Mock successful response with definitions
    axios.get.mockResolvedValueOnce({
      data: {
        definitions: [{ definition: 'A small test word.' }]
      }
    });

    const result = await isRealWord('testy');
    expect(result).toBe(true);
  });

  // --- Test 4: isRealWord (404/Not Real Word) ---
  test('isRealWord returns false if API returns 404 (word not found)', async () => {
    // Mock 404 error response structure
    axios.get.mockRejectedValueOnce({
      response: {
        status: 404
      }
    });

    const result = await isRealWord('zzzzz');
    expect(result).toBe(false);
  });

  // --- Test 5: getWordOfTheDayWithRetry (Success on 1st attempt) ---
  test('getWordOfTheDayWithRetry succeeds on the first try if definition is found', async () => {
    // 1. Mock word fetch success
    axios.get.mockResolvedValueOnce({ data: { word: 'FIRST' } });
    // 2. Mock definition fetch success
    axios.get.mockResolvedValueOnce({ data: { definitions: [{ definition: 'Defined.' }] } });

    const result = await getWordOfTheDayWithRetry(3);

    expect(result.word).toBe('FIRST');
    expect(result.definition).not.toBeNull();
    // Two total API calls (one for word, one for definition)
    expect(axios.get).toHaveBeenCalledTimes(2);
  });
});

