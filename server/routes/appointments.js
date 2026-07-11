const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();

// @route   POST /api/appointments
// @desc    Create a new appointment
// @access  Protected
router.post('/', verifyToken, async (req, res) => {
  const { patientId, doctorId, date, notes } = req.body;

  if (!patientId || !doctorId || !date) {
    return res.status(400).json({ error: 'patientId, doctorId, and date are required' });
  }

  // Validate the creator is involved in the appointment
  if (req.user.uid !== patientId && req.user.uid !== doctorId) {
    return res.status(403).json({ error: 'Forbidden: You must be involved in this appointment' });
  }

  try {
    const appointmentData = {
      patientId,
      doctorId,
      date,
      notes: notes || '',
      createdAt: FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
    };

    const docRef = await db.collection('appointments').add(appointmentData);
    
    // Fetch the added document to return
    const doc = await docRef.get();
    const savedAppointment = { id: doc.id, ...doc.data() };
    
    // Emit via Socket.io to the doctor's room or all doctors
    if (req.app.locals.io) {
      req.app.locals.io.to('doctors').emit('new-appointment', savedAppointment);
    }
    
    res.status(201).json(savedAppointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// @route   GET /api/appointments
// @desc    Get all appointments for the current user
// @access  Protected
router.get('/', verifyToken, async (req, res) => {
  try {
    let querySnapshot;
    
    // Filter based on user's role
    if (req.user.role === 'patient') {
      querySnapshot = await db.collection('appointments')
        .where('patientId', '==', req.user.uid)
        .get();
    } else if (req.user.role === 'doctor') {
      querySnapshot = await db.collection('appointments')
        .where('doctorId', '==', req.user.uid)
        .get();
    } else {
      return res.status(403).json({ error: 'Forbidden: Invalid role' });
    }

    const appointments = [];
    querySnapshot.forEach(doc => {
      appointments.push({ id: doc.id, ...doc.data() });
    });

    appointments.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.toMillis() : Date.now();
      const timeB = b.createdAt ? b.createdAt.toMillis() : Date.now();
      return timeB - timeA;
    });

    res.status(200).json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Delete an appointment
// @access  Protected
router.delete('/:id', verifyToken, async (req, res) => { console.log("HITTING DELETE ROUTE", req.params); 
  try {
    console.log(`[DELETE APPOINTMENT] Requested ID: ${req.params.id} by User: ${req.user.uid}`);
    const docRef = db.collection('appointments').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.log(`[DELETE APPOINTMENT] 404 - Document ${req.params.id} not found in Firestore`);
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const data = doc.data();
    
    // Only patient or doctor involved can delete
    if (req.user.uid !== data.patientId && req.user.uid !== data.doctorId) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete this appointment' });
    }

    await docRef.delete();
    
    // Emit via Socket.io to the doctor's room and the patient's room
    if (req.app.locals.io) {
      req.app.locals.io.to('doctors').emit('delete-appointment', req.params.id);
      req.app.locals.io.to(`user:${data.patientId}`).emit('delete-appointment', req.params.id);
    }
    
    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

module.exports = router;
