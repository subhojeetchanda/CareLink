const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');
const FormData = require('form-data');

const db = getFirestore();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup Multer for disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// @route   POST /api/images
// @desc    Doctor uploads an X-ray image
// @access  Protected (Doctor only)
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Forbidden: Only doctors can upload images' });
  }

  const { patientId } = req.body;
  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Image file is required' });
  }

  // File path accessible via the express static route we set up
  const imageUrl = `/uploads/${req.file.filename}`;

  try {
    // Forward the image file to the Python X-ray service
    const xrayServiceUrl = process.env.PYTHON_XRAY_URL || 'http://localhost:8000';
    
    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path));

    let anomalies = [];
    let explanation = "";
    let uncertainty = null;
    try {
      const aiResponse = await axios.post(`${xrayServiceUrl}/explain`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      anomalies = aiResponse.data.anomalies || [];
      explanation = aiResponse.data.explanation || "";
      uncertainty = aiResponse.data.uncertainty || null;
    } catch (aiError) {
      console.error('Error calling AI service:', aiError.message);
      // Proceed with empty anomalies if AI service fails, or we could throw. 
      // Throwing so it fails the upload if analysis fails.
      throw new Error('AI analysis failed');
    }

    const imageData = {
      patientId,
      doctorId: req.user.uid,
      imageUrl,
      createdAt: FieldValue.serverTimestamp(),
      analysisStatus: 'completed',
      anomalies: anomalies,
      explanation: explanation,
      uncertainty: uncertainty
    };

    const docRef = await db.collection('images').add(imageData);
    const doc = await docRef.get();

    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error saving image record:', error);
    res.status(500).json({ error: 'Failed to upload and analyze image' });
  }
});

// @route   GET /api/images
// @desc    Get images based on role
// @access  Protected
router.get('/', verifyToken, async (req, res) => {
  try {
    let querySnapshot;

    if (req.user.role === 'patient') {
      querySnapshot = await db.collection('images')
        .where('patientId', '==', req.user.uid)
        .get();
    } else if (req.user.role === 'doctor') {
      querySnapshot = await db.collection('images')
        .where('doctorId', '==', req.user.uid)
        .get();
    } else {
      return res.status(403).json({ error: 'Forbidden: Invalid role' });
    }

    const images = [];
    querySnapshot.forEach(doc => {
      images.push({ id: doc.id, ...doc.data() });
    });

    images.sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.toMillis() : Date.now();
      const timeB = b.createdAt ? b.createdAt.toMillis() : Date.now();
      return timeB - timeA;
    });

    res.status(200).json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// @route   DELETE /api/images/:id
// @desc    Delete an image by ID
// @access  Protected (Doctor must own it)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const docRef = db.collection('images').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageData = doc.data();

    // Check ownership
    if (req.user.role === 'doctor' && imageData.doctorId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: You do not own this image' });
    }

    // Optionally delete from local disk
    const filePath = path.join(__dirname, '..', imageData.imageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await docRef.delete();
    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// @route   PUT /api/images/:id
// @desc    Update image explanation
// @access  Protected (Doctor only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Forbidden: Only doctors can update image explanations' });
    }

    const { explanation } = req.body;
    if (explanation === undefined) {
      return res.status(400).json({ error: 'explanation field is required' });
    }

    const docRef = db.collection('images').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageData = doc.data();

    // Check ownership
    if (imageData.doctorId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden: You do not own this image' });
    }

    await docRef.update({ explanation });
    
    // Fetch updated document to return
    const updatedDoc = await docRef.get();
    res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({ error: 'Failed to update image explanation' });
  }
});

module.exports = router;
