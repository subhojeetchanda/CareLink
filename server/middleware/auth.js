const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Fetch user document from Firestore to attach role and name
    const userDoc = await getFirestore().collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({ error: 'Unauthorized: User profile not found in Firestore' });
    }

    const userData = userDoc.data();
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: userData.name,
      role: userData.role
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = verifyToken;
