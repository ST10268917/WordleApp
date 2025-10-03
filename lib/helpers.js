// lib/helpers.js (ESM)

export function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
export function dailyDocId(dateStr, lang = 'en-ZA', mode = 'daily') {
  return `${dateStr}_${lang}_${mode}`;
}
export function isAlphaWord(s) {
  return typeof s === 'string' && /^[A-Za-z]+$/.test(s);
}
export function computeFeedback(guessUpper, answerUpper) {
  const n = answerUpper.length;
  const res = new Array(n).fill('B');
  const rem = {};
  for (let i = 0; i < n; i++) {
    if (guessUpper[i] === answerUpper[i]) {
      res[i] = 'G';
    } else {
      const ch = answerUpper[i];
      rem[ch] = (rem[ch] || 0) + 1;
    }
  }
  for (let i = 0; i < n; i++) {
    if (res[i] === 'G') continue;
    const ch = guessUpper[i];
    if (rem[ch] > 0) {
      res[i] = 'Y';
      rem[ch] -= 1;
    }
  }
  return res;
}

// ----- Speedle helpers -----
export function genId(prefix = 'sp') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
export function secsBetween(isoStart, isoEnd) {
  return Math.max(0, Math.floor((new Date(isoEnd) - new Date(isoStart)) / 1000));
}
export function computeRemaining(session) {
  const nowIso = new Date().toISOString();
  const elapsed = secsBetween(session.startedAt, nowIso);
  const penalty = session.hintPenaltySec || 0;
  const left = session.durationSec - elapsed - penalty;
  return Math.max(0, left);
}
