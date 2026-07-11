const express = require('express');
const router = express.Router();
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const verifyToken = require('../middleware/auth');

const db = getFirestore();

// Note: This endpoint is used immediately after signup. 
// At this stage, the user exists in Firebase Auth but NOT in Firestore yet.
// So we can't use `verifyToken` directly as it expects the Firestore doc to exist.
// We write a specific middleware for this endpoint or handle verification inline.

const verifyTokenWithoutFirestore = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.userAuth = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// @route   POST /api/users/profile
// @desc    Create or update user profile after registration
// @access  Protected (Auth Token required)
router.post('/profile', verifyTokenWithoutFirestore, async (req, res) => {
  const { name, role } = req.body;
  const uid = req.userAuth.uid;
  const email = req.userAuth.email;

  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required' });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const profileData = {
      email,
      name,
      role,
      updatedAt: FieldValue.serverTimestamp()
    };

    const docSnapshot = await userRef.get();
    if (!docSnapshot.exists) {
        profileData.createdAt = FieldValue.serverTimestamp();
    }

    await userRef.set(profileData, { merge: true });

    res.status(200).json({ message: 'Profile updated successfully', profile: profileData });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Protected (verifyToken ensures user exists in Firestore)
router.get('/me', verifyToken, (req, res) => {
  // req.user is attached by the verifyToken middleware
  res.status(200).json(req.user);
});

// @route   GET /api/users/doctors
// @desc    Get a list of all doctors
// @access  Protected
router.get('/doctors', verifyToken, async (req, res) => {
  try {
    const querySnapshot = await db.collection('users').where('role', '==', 'doctor').get();
    const doctors = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      doctors.push({ id: doc.id, name: data.name, email: data.email });
    });
    res.status(200).json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

module.exports = router;
