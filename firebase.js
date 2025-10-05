// firebase.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  // This uses the path in GOOGLE_APPLICATION_CREDENTIALS
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

export const db = admin.firestore();
