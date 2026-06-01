/**
 * resume.js — Form binding, live preview, Firestore save/load, PDF export.
 */

import { auth, db } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { renderResume, normalizeResumeData } from "./resume-template.js";
import {
  initDynamicSections,
  populateAllDynamicSections,
  collectAllDynamicSections,
} from "./dynamic-sections.js";

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

/** Load html2canvas + jsPDF on demand (works with ES modules, no global script tags) */
let pdfModulesPromise = null;

async function loadPdfLibraries() {
  if (window.html2canvas && (window.jspdf?.jsPDF || window.jsPDF)) {
    return {
      html2canvas: window.html2canvas,
      jsPDF: window.jspdf?.jsPDF || window.jsPDF,
    };
  }

  if (!pdfModulesPromise) {
    pdfModulesPromise = (async () => {
      try {
        await loadPdfScriptsFromCdn();
        const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
        if (window.html2canvas && jsPDF) {
          return { html2canvas: window.html2canvas, jsPDF };
        }
      } catch {
        /* try ESM from CDN next */
      }

      const [html2canvasMod, jspdfMod] = await Promise.all([
        import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm"),
        import("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm"),
      ]);
      return {
        html2canvas: html2canvasMod.default,
        jsPDF: jspdfMod.jsPDF,
      };
    })();
  }

  try {
    const libs = await pdfModulesPromise;
    if (!libs.html2canvas || !libs.jsPDF) {
      throw new Error("PDF libraries unavailable");
    }
    return libs;
  } catch (err) {
    pdfModulesPromise = null;
    throw err;
  }
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-pdf-src="${src}"]`);
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.dataset.pdfSrc = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadPdfScriptsFromCdn() {
  const local = [
    "vendor/html2canvas.min.js",
    "vendor/jspdf.umd.min.js",
  ];
  const remote = [
    "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
    "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
  ];

  for (let i = 0; i < 2; i++) {
    try {
      await loadScriptOnce(local[i]);
    } catch {
      await loadScriptOnce(remote[i]);
    }
  }
}

/** Build off-screen clone matching live preview width */
function buildExportClone(source) {
  const clone = source.cloneNode(true);
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  clone.classList.add("cv-export-clone");

  const sandbox = document.createElement("div");
  sandbox.className = "pdf-export-sandbox";
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  const previewWidth = Math.max(Math.round(source.getBoundingClientRect().width), 320);
  clone.style.width = `${previewWidth}px`;
  clone.style.maxWidth = `${previewWidth}px`;

  return { clone, sandbox, previewWidth };
}

function pdfLinkHref(href) {
  if (/^(mailto:|tel:)/i.test(href)) return href;
  if (/^https?:\/\//i.test(href)) return href;
  return `https://${href.replace(/^\/\//, "")}`;
}

/** Collect anchor positions relative to export root (same px space as the PDF page) */
function collectExportLinks(rootEl) {
  const rootRect = rootEl.getBoundingClientRect();
  const links = [];

  rootEl.querySelectorAll("a[href]").forEach((anchor) => {
    const raw = anchor.getAttribute("href")?.trim();
    if (!raw || raw === "#") return;
    const href = pdfLinkHref(raw);

    const rect = anchor.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    links.push({
      href,
      x: rect.left - rootRect.left,
      y: rect.top - rootRect.top,
      w: rect.width,
      h: rect.height,
    });
  });

  return links;
}

/**
 * Invisible click areas over the rasterized resume.
 * Positions are in the same unit as the PDF page (mm when exporting print-sized).
 */
function addPdfLinkAnnotations(pdf, links, mapRect, padMm) {
  for (const { href, x, y, w, h } of links) {
    const r = mapRect(x, y, w, h);
    try {
      pdf.link(
        Math.max(0, r.x - padMm),
        Math.max(0, r.y - padMm),
        r.w + padMm * 2,
        r.h + padMm * 2,
        { url: href }
      );
    } catch (err) {
      console.warn("PDF link skipped:", href, err);
    }
  }
}

/** Highest html2canvas scale that stays within browser canvas limits (~200 DPI print) */
function getExportScale(contentWidth, contentHeight) {
  const maxSide = 16384;
  const preferred = 4;
  const longest = Math.max(contentWidth, contentHeight, 1);
  let scale = Math.min(preferred, Math.floor(maxSide / longest));
  scale = Math.max(2, scale);
  return scale;
}

async function exportToPdf() {
  saveStatus.textContent = "Loading PDF tools…";

  let html2canvas;
  let JsPDF;
  try {
    ({ html2canvas, jsPDF: JsPDF } = await loadPdfLibraries());
  } catch (err) {
    console.error(err);
    saveStatus.textContent =
      "Cannot load PDF tools. Connect to the internet, then refresh (Ctrl+F5).";
    return;
  }

  saveStatus.textContent = "Preparing PDF…";
  updatePreview();
  const source = resumePreviewEl;
  if (!source?.innerHTML.trim()) {
    saveStatus.textContent = "Nothing to export. Fill in your resume first.";
    return;
  }

  const filename = `${(headerFields.name?.value.trim() || "resume").replace(/\s+/g, "_").toLowerCase()}.pdf`;
  const { clone, sandbox } = buildExportClone(source);

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  const contentWidth = clone.offsetWidth;
  const contentHeight = clone.scrollHeight;

  if (contentWidth < 50 || contentHeight < 50) {
    sandbox.remove();
    saveStatus.textContent = "Preview is empty or too small to export.";
    return;
  }

  const scale = getExportScale(contentWidth, contentHeight);

  saveStatus.textContent = "Generating PDF…";

  const exportLinks = collectExportLinks(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: contentWidth,
      height: contentHeight,
      windowWidth: contentWidth,
      windowHeight: contentHeight,
      scrollX: 0,
      scrollY: 0,
      letterRendering: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pageWidthMm = 215.9;
    const pageHeightMm = (contentHeight / contentWidth) * pageWidthMm;

    const pdf = new JsPDF({
      unit: "mm",
      format: [pageWidthMm, pageHeightMm],
      orientation: "portrait",
      compress: false,
    });

    pdf.addImage(imgData, "PNG", 0, 0, pageWidthMm, pageHeightMm, undefined, "NONE");

    const mapRect = (x, y, w = 0, h = 0) => ({
      x: (x / contentWidth) * pageWidthMm,
      y: (y / contentHeight) * pageHeightMm,
      w: w ? (w / contentWidth) * pageWidthMm : 0,
      h: h ? (h / contentHeight) * pageHeightMm : 0,
    });
    const linkPadMm = Math.max(0.4, (2 / contentWidth) * pageWidthMm);
    addPdfLinkAnnotations(pdf, exportLinks, mapRect, linkPadMm);
    pdf.save(filename);
    saveStatus.textContent = "PDF ready — good luck with your application!";
  } catch (err) {
    console.error("PDF export error:", err);
    saveStatus.textContent =
      "PDF export failed. Try a shorter resume or refresh the page.";
  } finally {
    sandbox.remove();
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
