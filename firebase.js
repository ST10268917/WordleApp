// firebase.js
import 'dotenv/config';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

let app;

if (!admin.apps.length) {
  // Load service account JSON from the path in the env var
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!saPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not set');
  }
  const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'));

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
  });
} else {
  app = admin.app();
}

export const db = admin.firestore();
