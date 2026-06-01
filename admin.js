/**
 * admin.js — Hardcoded admin login and Firestore dashboard stats.
 * After hardcoded check, signs into Firebase so Firestore reads are allowed.
 */

import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Hardcoded admin credentials (change in production / use Firebase Admin SDK server-side)
const ADMIN_EMAIL = "admin@aireumebuilder.com";
const ADMIN_PASSWORD = "Admin@2024!";

const adminLoginSection = document.getElementById("admin-login-section");
const adminDashboard = document.getElementById("admin-dashboard");
const adminLoginForm = document.getElementById("admin-login-form");
const adminEmailInput = document.getElementById("admin-email");
const adminPasswordInput = document.getElementById("admin-password");
const adminLoginError = document.getElementById("admin-login-error");
const adminLogoutBtn = document.getElementById("admin-logout-btn");

const statTotalUsers = document.getElementById("stat-total-users");
const statTotalResumes = document.getElementById("stat-total-resumes");
const userEmailsList = document.getElementById("user-emails-list");
const refreshBtn = document.getElementById("refresh-stats-btn");

const SESSION_KEY = "aiResumeBuilderAdmin";

function showDashboard() {
  adminLoginSection?.classList.add("hidden");
  adminDashboard?.classList.remove("hidden");
  sessionStorage.setItem(SESSION_KEY, "true");
  fetchDashboardData();
}

function showLogin() {
  adminLoginSection?.classList.remove("hidden");
  adminDashboard?.classList.add("hidden");
  sessionStorage.removeItem(SESSION_KEY);
}

adminLoginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  adminLoginError.textContent = "";

  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value;

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    adminLoginError.textContent = "Invalid admin email or password.";
    return;
  }

  try {
    // Sign in with same credentials (create this user once in Firebase Auth)
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    showDashboard();
  } catch (err) {
    adminLoginError.textContent =
      "Admin verified locally but Firebase sign-in failed. Create admin user in Firebase Auth: " +
      (err.message || "");
  }
});

adminLogoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
  }
  showLogin();
  adminEmailInput.value = "";
  adminPasswordInput.value = "";
});

refreshBtn?.addEventListener("click", fetchDashboardData);

/**
 * Read all documents from `users` collection and compute stats.
 */
async function fetchDashboardData() {
  statTotalUsers.textContent = "…";
  statTotalResumes.textContent = "…";
  userEmailsList.innerHTML = "<li>Loading…</li>";

  try {
    const snapshot = await getDocs(collection(db, "users"));
    const docs = snapshot.docs;

    let resumeCount = 0;
    const emails = [];

    docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.email) emails.push(data.email);
      if (data.resume && Object.keys(data.resume).length > 0) {
        resumeCount += 1;
      }
    });

    statTotalUsers.textContent = String(docs.length);
    statTotalResumes.textContent = String(resumeCount);

    userEmailsList.innerHTML = "";
    if (emails.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No users registered yet.";
      userEmailsList.appendChild(li);
    } else {
      emails.sort().forEach((email) => {
        const li = document.createElement("li");
        li.textContent = email;
        userEmailsList.appendChild(li);
      });
    }
  } catch (err) {
    statTotalUsers.textContent = "—";
    statTotalResumes.textContent = "—";
    userEmailsList.innerHTML = `<li class="error">Failed to load: ${err.message || "Check Firestore rules."}</li>`;
  }
}

// Restore session on page load
if (sessionStorage.getItem(SESSION_KEY) === "true") {
  showDashboard();
}
