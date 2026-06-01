/**
 * resume.js — Form binding, live preview, Firestore save/load, print-to-PDF export.
 */

import { auth, db } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { renderResume, normalizeResumeData } from "./resume-template.js";
import {
  initDynamicSections,
  populateAllDynamicSections,
  collectAllDynamicSections,
} from "./dynamic-sections.js";
import { exportResumeToPdf } from "./pdf-export.js";

const headerFields = {
  name: document.getElementById("resume-name"),
  phone: document.getElementById("resume-phone"),
  email: document.getElementById("resume-email"),
  location: document.getElementById("resume-location"),
  linkedin: document.getElementById("resume-linkedin"),
  github: document.getElementById("resume-github"),
  portfolio: document.getElementById("resume-portfolio"),
  summary: document.getElementById("resume-summary"),
};

const resumePreviewEl = document.getElementById("resume-preview");
const saveBtn = document.getElementById("save-resume-btn");
const loadBtn = document.getElementById("load-resume-btn");
const exportPdfBtn = document.getElementById("export-pdf-btn");
const saveStatus = document.getElementById("save-status");
const workPrefInputs = document.querySelectorAll("[data-work-pref]");

/** Parse saved work prefs (array or legacy text) into checkbox values */
function parseWorkPrefs(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  const s = String(value).toLowerCase();
  const ids = [];
  if (s.includes("remote")) ids.push("remote");
  if (s.includes("on-site") || s.includes("onsite")) ids.push("onsite");
  if (s.includes("hybrid")) ids.push("hybrid");
  return ids;
}

function getSelectedWorkPrefs() {
  return Array.from(workPrefInputs)
    .filter((el) => el.checked)
    .map((el) => el.value);
}

function setWorkPrefs(value) {
  const selected = parseWorkPrefs(value);
  workPrefInputs.forEach((el) => {
    el.checked = selected.includes(el.value);
  });
}

/** Empty starting state (no sample data loaded in UI) */
const EMPTY_RESUME = {
  name: "",
  phone: "",
  email: "",
  location: "",
  workPrefs: [],
  linkedin: "",
  github: "",
  portfolio: "",
  summary: "",
  experience: [],
  education: [],
  certifications: [],
  projects: [],
  skills: [],
};

function getFormData() {
  return {
    ...Object.fromEntries(
      Object.entries(headerFields).map(([key, el]) => [key, el?.value.trim() || ""])
    ),
    workPrefs: getSelectedWorkPrefs(),
    ...collectAllDynamicSections(),
  };
}

function setFormData(data) {
  if (!data) return;

  Object.entries(headerFields).forEach(([key, el]) => {
    if (el) el.value = data[key] ?? "";
  });
  setWorkPrefs(data.workPrefs);

  populateAllDynamicSections(normalizeResumeData(data), updatePreview);
  updatePreview();
}

function updatePreview() {
  renderResume(resumePreviewEl, getFormData());
}

function userResumeRef(uid) {
  return doc(db, "users", uid);
}

async function saveResume() {
  const user = auth.currentUser;
  if (!user) {
    saveStatus.textContent = "Please log in to save your resume.";
    return;
  }

  saveStatus.textContent = "Saving…";
  try {
    await setDoc(
      userResumeRef(user.uid),
      {
        email: user.email,
        resume: getFormData(),
        resumeUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    saveStatus.textContent = "Saved — your resume is secure in the cloud.";
  } catch (err) {
    saveStatus.textContent = "Save failed: " + (err.message || "Unknown error");
  }
}

async function loadResume() {
  const user = auth.currentUser;
  if (!user) {
    saveStatus.textContent = "Please log in to load your resume.";
    return;
  }

  saveStatus.textContent = "Loading…";
  try {
    const snap = await getDoc(userResumeRef(user.uid));
    if (snap.exists() && snap.data().resume) {
      setFormData(snap.data().resume);
      saveStatus.textContent = "Resume loaded.";
    } else {
      saveStatus.textContent = "No saved resume yet—start filling in your details.";
    }
  } catch (err) {
    saveStatus.textContent = "Load failed: " + (err.message || "Unknown error");
  }
}

async function exportToPdf() {
  updatePreview();

  if (!resumePreviewEl?.innerHTML.trim()) {
    saveStatus.textContent = "Nothing to export. Fill in your resume first.";
    return;
  }

  const filename = `${(headerFields.name?.value.trim() || "resume").replace(/\s+/g, "_").toLowerCase()}.pdf`;
  exportPdfBtn.disabled = true;
  try {
    await exportResumeToPdf(resumePreviewEl, {
      filename,
      onStatus: (msg) => {
        saveStatus.textContent = msg;
      },
    });
  } finally {
    exportPdfBtn.disabled = false;
  }
}

Object.values(headerFields).forEach((el) => {
  el?.addEventListener("input", updatePreview);
});

workPrefInputs.forEach((el) => {
  el.addEventListener("change", updatePreview);
});

initDynamicSections(updatePreview);
populateAllDynamicSections(EMPTY_RESUME, updatePreview);

saveBtn?.addEventListener("click", saveResume);
loadBtn?.addEventListener("click", loadResume);
exportPdfBtn?.addEventListener("click", exportToPdf);

document.addEventListener("user-authenticated", () => {
  loadResume();
});
