require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Store io in app locals so routes can access it
app.locals.io = io;

// Socket.io Authentication Middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    socket.user = { uid: decodedToken.uid };
    
    // Fetch user profile to get role
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists) {
      socket.user.role = userDoc.data().role;
    } else {
      socket.user.role = 'patient'; // Default fallback
    }
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.user.uid})`);
  
  if (socket.user.role === 'doctor') {
    socket.join('doctors');
    console.log(`User ${socket.user.uid} joined doctors room`);
  } else {
    socket.join(`user:${socket.user.uid}`);
    console.log(`User ${socket.user.uid} joined personal room`);
  }

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const reportRoutes = require('./routes/reports');
const imageRoutes = require('./routes/images');
const alertRoutes = require('./routes/alerts');
const moodRoutes = require('./routes/moods');

app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/moods', moodRoutes);

// Test Route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running properly.' });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = { db };
