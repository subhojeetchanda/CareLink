require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  try {
    await db.collection('appointments')
      .where('doctorId', '==', 'test_doctor_id')
      .orderBy('createdAt', 'desc')
      .get();
    console.log("Appointments query succeeded");
  } catch (e) {
    console.error("Appointments query failed:");
    console.error(e.message);
  }

  try {
    await db.collection('images')
      .where('doctorId', '==', 'test_doctor_id')
      .orderBy('uploadedAt', 'desc')
      .get();
    console.log("Images query succeeded");
  } catch (e) {
    console.error("Images query failed:");
    console.error(e.message);
  }
}

run();
