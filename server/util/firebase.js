import * as admin from 'firebase-admin';
import { FIRESTORE_TX_ROOT } from '../config/config';
import serviceAccount from '../config/serviceAccountKey.json';

let database;
if (!process.env.CI) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  database = admin.firestore();
}
export const db = database;

const getCollectionIfDefined = (root) => (root ? database.collection(root) : null);

export const txCollection = getCollectionIfDefined(FIRESTORE_TX_ROOT);

export { admin };
export const { FieldValue } = admin.firestore;
