require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { // initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
// initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const reportRoutes = require('./routes/reports');
const imageRoutes = require('./routes/images');

app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/images', imageRoutes);

// Test Route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running properly.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = { db };
