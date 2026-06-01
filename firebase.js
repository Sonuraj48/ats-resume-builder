/**
 * firebase.js — Initialize Firebase app, Auth, and Firestore.
 * Import this module from auth.js, resume.js, and admin.js.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Project configuration (provided by user)
const firebaseConfig = {
  apiKey: "AIzaSyB71orgk9e_dp8RR93uD39nsFzGG0HA2VY",
  authDomain: "ai-resume-builder-81549.firebaseapp.com",
  projectId: "ai-resume-builder-81549",
  storageBucket: "ai-resume-builder-81549.firebasestorage.app",
  messagingSenderId: "40517163834",
  appId: "1:40517163834:web:23ad6104ef1ff0e8cb4e03",
  measurementId: "G-ZG97H6KJGR",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
