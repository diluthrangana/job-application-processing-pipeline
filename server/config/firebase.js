// server/config/firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');



admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'job-pipeline-9a417.firebasestorage.app'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };