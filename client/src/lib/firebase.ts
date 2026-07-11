import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAH-0NPraOKLql82xNwRc4SJZ5j8gb6nms",
  authDomain: "carelink-dbe0c.firebaseapp.com",
  projectId: "carelink-dbe0c",
  storageBucket: "carelink-dbe0c.firebasestorage.app",
  messagingSenderId: "449947810359",
  appId: "1:449947810359:web:e9c77b274d0073e6d2ddb2",
  measurementId: "G-N9G0EVS0YN"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
