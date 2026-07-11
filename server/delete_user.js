const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

async function deleteUserByEmail(email) {
  try {
    const user = await getAuth().getUserByEmail(email);
    await getAuth().deleteUser(user.uid);
    console.log(`Successfully deleted user: ${email}`);
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`User not found: ${email}`);
      process.exit(0);
    } else {
      console.error('Error deleting user:', error);
      process.exit(1);
    }
  }
}

deleteUserByEmail('subhojeet.23bce9173@vitapstudent.ac.in');
