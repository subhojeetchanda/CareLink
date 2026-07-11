const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./server/serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function list() {
  const snapshot = await db.collection('appointments').get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}

list();
