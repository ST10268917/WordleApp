// __mocks__/wordsApi.js
export async function fetchRandomFiveLetterWord() { return 'CRANE'; }
export async function fetchBestDefinitionForWord() {
  return { partOfSpeech: 'noun', definition: 'A lifting machine.', example: null };
}
export async function fetchBestSynonymForWord() { return 'LIFT'; }
export async function isRealWord(word) {
  return /^[A-Z]{5}$/.test(word.toUpperCase());
}
