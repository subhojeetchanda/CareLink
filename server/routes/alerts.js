const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore();

// @route   POST /api/alerts/sos
// @desc    Trigger an SOS alert (Patient)
// @access  Protected
router.post('/sos', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can trigger SOS alerts' });
    }

    const { location } = req.body || {};
    
    const alertData = {
      userId: req.user.uid,
      patientName: req.user.name,
      type: 'SOS',
      status: 'active',
      timestamp: FieldValue.serverTimestamp(),
      location: location || null
    };

    const docRef = await db.collection('alerts').add(alertData);
    const savedAlert = { id: docRef.id, ...alertData };

    // Emit via Socket.io to all doctors
    if (req.app.locals.io) {
      req.app.locals.io.to('doctors').emit('new-alert', savedAlert);
    }

    res.status(201).json(savedAlert);
  } catch (error) {
    console.error('Error creating SOS alert:', error);
    res.status(500).json({ error: 'Failed to trigger SOS alert' });
  }
});

// @route   POST /api/alerts/fall
// @desc    Trigger a Fall Detection alert (Patient)
// @access  Protected
router.post('/fall', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can trigger fall alerts' });
    }

    const { location, motionData } = req.body;
    
    const alertData = {
      userId: req.user.uid,
      patientName: req.user.name,
      type: 'FALL',
      status: 'active',
      timestamp: FieldValue.serverTimestamp(),
      location: location || null,
      motionData: motionData || null
    };

    const docRef = await db.collection('alerts').add(alertData);
    const savedAlert = { id: docRef.id, ...alertData };

    // Emit via Socket.io to all doctors
    if (req.app.locals.io) {
      req.app.locals.io.to('doctors').emit('new-alert', savedAlert);
    }

    res.status(201).json(savedAlert);
  } catch (error) {
    console.error('Error creating Fall alert:', error);
    res.status(500).json({ error: 'Failed to trigger fall alert' });
  }
});

// @route   GET /api/alerts
// @desc    Get active alerts (Doctor)
// @access  Protected
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can view alerts' });
    }

    // Fetch recent alerts, ordered by timestamp descending, and filter in memory to avoid needing a composite index
    const alertsSnapshot = await db.collection('alerts')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
      
    const alerts = alertsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(alert => alert.status === 'active');

    res.status(200).json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// @route   PUT /api/alerts/:id/resolve
// @desc    Mark an alert as resolved (Doctor)
// @access  Protected
router.put('/:id/resolve', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can resolve alerts' });
    }

    const docRef = db.collection('alerts').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await docRef.update({
      status: 'resolved',
      resolvedAt: FieldValue.serverTimestamp(),
      resolvedBy: req.user.uid
    });

    res.status(200).json({ message: 'Alert resolved successfully' });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

module.exports = router;
