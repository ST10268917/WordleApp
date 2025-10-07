import {
  fetchRandomFiveLetterWord,
  fetchBestDefinitionForWord,
  getWordOfTheDayWithRetry,
  fetchBestSynonymForWord,
  isRealWord
} from './wordsApi.js';
import axios from 'axios';

// 1. Mock the entire axios library
jest.mock('axios');

// 2. Mock the environment variable check (usually done in global setup, but here for clarity)
// NOTE: This ensures tests run consistently regardless of local environment variables
const REAL_API_KEY = 'TEST_KEY_123';
process.env.WORDSAPI_KEY = REAL_API_KEY; // Simulate key being present

// Define mock data for various API responses
const mockRandomWordResponse = { data: { word: 'HELLO' } };
const mockDefinitionResponse = {
  data: {
    definitions: [
      { partOfSpeech: 'noun', definition: 'a greeting' },
      { partOfSpeech: 'verb', definition: 'to call out' }
    ]
  }
};
const mockSynonymResponse = {
  data: {
    synonyms: ['greeting', 'salutation', 'hiya']
  }
};
const mockEmptyResponse = { data: {} };
const mock404Error = {
  response: { status: 404 },
  message: 'Word not found'
};


describe('Words API Utility Functions', () => {

  // Reset the mock state before each test
  beforeEach(() => {
    axios.get.mockClear();
    // Re-set the API key for most tests
    process.env.WORDSAPI_KEY = REAL_API_KEY;
  });


  // --- Test Group 1: fetchRandomFiveLetterWord ---
  describe('fetchRandomFiveLetterWord', () => {
    test('should return a random word when API call succeeds', async () => {
      axios.get.mockResolvedValue(mockRandomWordResponse);
      const word = await fetchRandomFiveLetterWord();

      expect(word).toBe('HELLO');
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('should return a fallback word if WORDSAPI_KEY is missing', async () => {
      process.env.WORDSAPI_KEY = ''; // Simulate missing key
      const word = await fetchRandomFiveLetterWord();

      // Check if the result is one of the fallback words
      expect(['PLANE','CRANE','SNAKE','BREAD','GRASS','WATER','PHONE','CHAIR','TABLE','SMILE']).toContain(word);
      expect(axios.get).not.toHaveBeenCalled();
    });

    test('should return a fallback word if API call fails', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));
      const word = await fetchRandomFiveLetterWord();

      expect(['PLANE','CRANE','SNAKE','BREAD','GRASS','WATER','PHONE','CHAIR','TABLE','SMILE']).toContain(word);
    });
  });


  // --- Test Group 2: fetchBestDefinitionForWord ---
  describe('fetchBestDefinitionForWord', () => {
    test('should return the first Noun definition when available', async () => {
      axios.get.mockResolvedValue(mockDefinitionResponse);
      const definition = await fetchBestDefinitionForWord('TEST');

      expect(definition.partOfSpeech).toBe('noun');
      expect(definition.definition).toBe('a greeting');
    });

    test('should return the first definition if no Noun is found', async () => {
      const mockNoNoun = {
        data: { definitions: [{ partOfSpeech: 'adjective', definition: 'nice' }] }
      };
      axios.get.mockResolvedValue(mockNoNoun);
      const definition = await fetchBestDefinitionForWord('TEST');

      expect(definition.partOfSpeech).toBe('adjective');
      expect(definition.definition).toBe('nice');
    });

    test('should return null if API returns no definitions', async () => {
      axios.get.mockResolvedValue(mockEmptyResponse);
      const definition = await fetchBestDefinitionForWord('TEST');

      expect(definition).toBeNull();
    });
  });

  // --- Test Group 3: fetchBestSynonymForWord ---
  describe('fetchBestSynonymForWord', () => {
    test('should return the first synonym found', async () => {
      axios.get.mockResolvedValue(mockSynonymResponse);
      const synonym = await fetchBestSynonymForWord('HELLO');

      expect(synonym).toBe('greeting');
    });

    test('should return null if API returns no synonyms', async () => {
      axios.get.mockResolvedValue(mockEmptyResponse);
      const synonym = await fetchBestSynonymForWord('HELLO');

      expect(synonym).toBeNull();
    });
  });

  // --- Test Group 4: isRealWord ---
  describe('isRealWord', () => {
    test('should return true if API returns definitions', async () => {
      axios.get.mockResolvedValue(mockDefinitionResponse);
      const isReal = await isRealWord('APPLE');

      expect(isReal).toBe(true);
    });

    test('should return false if API returns a 404 error (word not found)', async () => {
      axios.get.mockRejectedValue(mock404Error);
      const isReal = await isRealWord('QWERT');

      expect(isReal).toBe(false);
    });
  });

  // --- Test Group 5: getWordOfTheDayWithRetry (Integration of functions) ---
  describe('getWordOfTheDayWithRetry', () => {
    test('should succeed on the first attempt if word has definition', async () => {
      // 1. Mock the random word fetch to return 'TESTER'
      fetchRandomFiveLetterWord.mockResolvedValue('TESTER');

      // 2. Mock the definition fetch for 'TESTER' to succeed
      fetchBestDefinitionForWord.mockResolvedValue({ partOfSpeech: 'noun', definition: 'A thing that tests.' });

      const result = await getWordOfTheDayWithRetry();

      expect(result.word).toBe('TESTER');
      expect(result.definition).not.toBeNull();
      // Ensure the key functions were called correctly (once for success)
      expect(fetchRandomFiveLetterWord).toHaveBeenCalledTimes(1);
    });

    // Cleanup the mocks after the test
    afterAll(() => {
        fetchRandomFiveLetterWord.mockRestore();
        fetchBestDefinitionForWord.mockRestore();
        process.env.WORDSAPI_KEY = REAL_API_KEY; // Clean up
    });
  });

});
