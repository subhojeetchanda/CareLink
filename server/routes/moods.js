const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();

// @route   POST /api/moods
// @desc    Add a mood entry
// @access  Protected (Patient only)
router.post('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Forbidden: Only patients can post moods' });
  }

  const { mood, notes } = req.body;

  if (!mood) {
    return res.status(400).json({ error: 'Mood is required' });
  }

  try {
    const moodData = {
      patientId: req.user.uid,
      mood,
      notes: notes || '',
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('moods').add(moodData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error creating mood:', error);
    res.status(500).json({ error: 'Failed to save mood' });
  }
});

// @route   GET /api/moods
// @desc    Get patient's mood history
// @access  Protected (Patient only)
router.get('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Forbidden: Only patients can view their moods' });
  }

  try {
    const querySnapshot = await db.collection('moods')
      .where('patientId', '==', req.user.uid)
      .get();

    const moods = [];
    querySnapshot.forEach(doc => {
      moods.push({ id: doc.id, ...doc.data() });
    });

    // Sort in memory to avoid needing a composite index
    moods.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.toMillis() : Date.now();
      const timeB = b.createdAt ? b.createdAt.toMillis() : Date.now();
      return timeB - timeA;
    });

    // Limit to 30
    const limitedMoods = moods.slice(0, 30);

    res.status(200).json(limitedMoods);
  } catch (error) {
    console.error('Error fetching moods:', error);
    res.status(500).json({ error: 'Failed to fetch moods' });
  }
});

module.exports = router;
