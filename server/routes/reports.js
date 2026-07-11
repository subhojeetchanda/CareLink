const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const FormData = require('form-data');

const db = getFirestore();

// @route   POST /api/reports
// @desc    Patient creates a report with original text
// @access  Protected (Patient only)
router.post('/', verifyToken, upload.single('reportImage'), async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Forbidden: Only patients can create reports' });
  }

  let originalText = req.body.originalText;

  if (req.file) {
    try {
      const form = new FormData();
      form.append('image', req.file.buffer, { filename: 'report.jpg' });
      
      const pythonUrl = process.env.PYTHON_REPORT_URL || 'http://localhost:7001';
      const ocrRes = await axios.post(`${pythonUrl}/ocr`, form, {
        headers: form.getHeaders()
      });
      
      originalText = ocrRes.data.text;
      if (!originalText) {
        return res.status(400).json({ error: 'No text could be extracted from the image' });
      }
    } catch (ocrError) {
      console.error('OCR Error:', ocrError);
      return res.status(500).json({ error: 'Failed to process image' });
    }
  }

  if (!originalText) {
    return res.status(400).json({ error: 'originalText or reportImage is required' });
  }

  try {
    // 1. Call the Python Report Microservice
    const pythonUrl = process.env.PYTHON_REPORT_URL || 'http://localhost:7001';
    
    const aiResponse = await axios.post(`${pythonUrl}/simplify`, {
      text: originalText
    });
    
    const demystifiedText = aiResponse.data.simplified;

    // 2. Save both original and simplified text to Firestore
    const reportData = {
      patientId: req.user.uid,
      originalText,
      demystifiedText,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('reports').add(reportData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// @route   GET /api/reports
// @desc    Patient gets their own reports
// @access  Protected (Patient only)
router.get('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Forbidden: Only patients can view their reports' });
  }

  try {
    const querySnapshot = await db.collection('reports')
      .where('patientId', '==', req.user.uid)
      .get();

    const reports = [];
    querySnapshot.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    reports.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.toMillis() : Date.now();
      const timeB = b.createdAt ? b.createdAt.toMillis() : Date.now();
      return timeB - timeA;
    });

    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// @route   GET /api/reports/conversations
// @desc    Get patient's health buddy conversation history
// @access  Protected (Patient only)
router.get('/conversations', verifyToken, async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Forbidden: Only patients can view conversations' });
  }

  try {
    const querySnapshot = await db.collection('conversations')
      .where('patientId', '==', req.user.uid)
      .get();

    const conversations = [];
    querySnapshot.forEach(doc => {
      conversations.push({ id: doc.id, ...doc.data() });
    });

    // Sort in-memory to avoid needing a composite index
    conversations.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
      return timeA - timeB;
    });

    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// @route   GET /api/reports/trend
// @desc    Analyze trend over last 5 reports
// @access  Protected (Patient only)
router.get('/trend', verifyToken, async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Forbidden: Only patients can view trends' });
  }

  try {
    const querySnapshot = await db.collection('reports')
      .where('patientId', '==', req.user.uid)
      .get();

    const reports = [];
    querySnapshot.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort ascending by createdAt in memory to avoid missing index
    reports.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
      return timeA - timeB;
    });

    if (reports.length < 2) {
      return res.status(200).json({ trend_summary: "Not enough reports to show a trend. Please upload at least two reports." });
    }

    // Only take the last 5
    const last5Reports = reports.slice(-5);

    const formattedReports = last5Reports.map(r => ({
      date: r.createdAt ? new Date(r.createdAt.toMillis()).toISOString().split('T')[0] : 'Unknown',
      summary: r.demystifiedText || r.originalText
    }));

    const pythonUrl = process.env.PYTHON_REPORT_URL || 'http://localhost:7001';
    
    const aiResponse = await axios.post(`${pythonUrl}/analyze_trend`, {
      reports: formattedReports
    });

    res.status(200).json({ trend_summary: aiResponse.data.trend_summary });
  } catch (error) {
    console.error('Error fetching trend:', error);
    res.status(503).json({ error: 'Failed to analyze trend. Service may be down.' });
  }
});

// @route   GET /api/reports/:id
// @desc    Get a single report by ID
// @access  Protected (Patient must own it)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const docRef = db.collection('reports').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const reportData = doc.data();

    // Check ownership
    if (req.user.role === 'patient' && reportData.patientId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: You do not own this report' });
    }

    res.status(200).json({ id: doc.id, ...reportData });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// @route   DELETE /api/reports/conversations/:id
// @desc    Delete a specific conversation
// @access  Protected (Patient only)
router.delete('/conversations/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Forbidden: Only patients can delete conversations' });
  }

  try {
    const docRef = db.collection('conversations').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (doc.data().patientId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: You do not own this conversation' });
    }

    await docRef.delete();
    res.status(200).json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete a report by ID
// @access  Protected (Patient must own it)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const docRef = db.collection('reports').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const reportData = doc.data();

    // Check ownership
    if (req.user.role === 'patient' && reportData.patientId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: You do not own this report' });
    }

    await docRef.delete();
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// @route   POST /api/reports/ask
// @desc    Patient asks a question about their latest report
// @access  Protected (Patient only)
router.post('/ask', verifyToken, async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Forbidden: Only patients can ask questions' });
  }

  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'question is required' });
  }

  try {
    // Fetch the patient's most recent report
    const querySnapshot = await db.collection('reports')
      .where('patientId', '==', req.user.uid)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'No reports found to answer questions about.' });
    }

    const latestReport = querySnapshot.docs[0].data();
    
    // Call the Python Report Microservice /ask_rag endpoint
    const pythonUrl = process.env.PYTHON_REPORT_URL || 'http://localhost:7001';
    
    const aiResponse = await axios.post(`${pythonUrl}/ask_rag`, {
      question: question,
      patient_context: latestReport.demystifiedText || latestReport.originalText
    });
    
    const answer = aiResponse.data.answer;
    const sources = aiResponse.data.sources || [];

    // Save conversation to Firestore
    const conversationData = {
      patientId: req.user.uid,
      question,
      answer,
      sources,
      createdAt: FieldValue.serverTimestamp(),
    };
    
    const docRef = await db.collection('conversations').add(conversationData);

    res.status(200).json({ id: docRef.id, answer, sources });
  } catch (error) {
    console.error('Error in /ask route:', error);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

module.exports = router;
