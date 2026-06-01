/**
 * auth.js — Firebase Email/Password authentication.
 * Handles signup, login, logout, and toggles UI based on auth state.
 */

import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// DOM elements (index.html)
const authSection = document.getElementById("auth-section");
const builderSection = document.getElementById("builder-section");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authModeSignup = document.getElementById("auth-mode-signup");
const authModeLogin = document.getElementById("auth-mode-login");
const authSubmit = document.getElementById("auth-submit");
const authToggleText = document.getElementById("auth-toggle-text");
const authToggleLink = document.getElementById("auth-toggle-link");
const authError = document.getElementById("auth-error");
const userEmailDisplay = document.getElementById("user-email-display");
const logoutBtn = document.getElementById("logout-btn");

let isSignupMode = false;

/**
 * Create or update a Firestore user profile (used by admin dashboard).
 */
async function ensureUserProfile(user) {
  await setDoc(
    doc(db, "users", user.uid),
    {
      email: user.email,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function setAuthMode(signup) {
  isSignupMode = signup;
  authSubmit.textContent = signup ? "Sign Up" : "Log In";
  authToggleText.textContent = signup
    ? "Already have an account?"
    : "Don't have an account?";
  authToggleLink.textContent = signup ? "Log in" : "Sign up";
  authError.textContent = "";
  authModeLogin?.classList.toggle("active", !signup);
  authModeSignup?.classList.toggle("active", signup);
}

authModeLogin?.addEventListener("click", () => setAuthMode(false));
authModeSignup?.addEventListener("click", () => setAuthMode(true));

authToggleLink?.addEventListener("click", (e) => {
  e.preventDefault();
  setAuthMode(!isSignupMode);
});

authForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";
  const email = authEmail.value.trim();
  const password = authPassword.value;

  try {
    if (isSignupMode) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await ensureUserProfile(cred.user);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    authError.textContent = err.message || "Authentication failed.";
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
  }
});

/**
 * Show builder when logged in; show auth form when logged out.
 * Dispatches custom event so resume.js can load saved data.
 */
onAuthStateChanged(auth, (user) => {
  if (user) {
    authSection?.classList.add("hidden");
    builderSection?.classList.remove("hidden");
    logoutBtn?.classList.remove("hidden");
    if (userEmailDisplay) userEmailDisplay.textContent = user.email;
    document.dispatchEvent(
      new CustomEvent("user-authenticated", { detail: { user } })
    );
  } else {
    authSection?.classList.remove("hidden");
    builderSection?.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
    if (userEmailDisplay) userEmailDisplay.textContent = "";
  }
});

export { auth };
