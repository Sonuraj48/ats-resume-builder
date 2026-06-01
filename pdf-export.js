/**
 * pdf-export.js — High-quality PDF with clickable link annotations.
 * (Browser "Print to PDF" often drops links, especially on Windows.)
 */

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
        /* fall through to ESM */
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
  const sources = [
    ["vendor/html2canvas.min.js", "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"],
    ["vendor/jspdf.umd.min.js", "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js"],
  ];

  for (const [local, remote] of sources) {
    try {
      await loadScriptOnce(local);
    } catch {
      await loadScriptOnce(remote);
    }
  }
}

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

  return { clone, sandbox };
}

function pdfLinkHref(href) {
  if (/^(mailto:|tel:)/i.test(href)) return href;
  if (/^https?:\/\//i.test(href)) return href;
  return `https://${href.replace(/^\/\//, "")}`;
}

function collectExportLinks(rootEl) {
  const rootRect = rootEl.getBoundingClientRect();
  const links = [];

  rootEl.querySelectorAll("a[href]").forEach((anchor) => {
    const raw = anchor.getAttribute("href")?.trim();
    if (!raw || raw === "#") return;

    const rect = anchor.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    links.push({
      href: pdfLinkHref(raw),
      x: rect.left - rootRect.left,
      y: rect.top - rootRect.top,
      w: rect.width,
      h: rect.height,
    });
  });

  return links;
}

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

function getExportScale(contentWidth, contentHeight) {
  const maxSide = 16384;
  const longest = Math.max(contentWidth, contentHeight, 1);
  let scale = Math.min(4, Math.floor(maxSide / longest));
  return Math.max(2, scale);
}

/**
 * @param {HTMLElement} sourceEl — live #resume-preview
 * @param {{ filename: string, onStatus: (msg: string) => void }} options
 */
export async function exportResumeToPdf(sourceEl, { filename, onStatus }) {
  onStatus("Loading PDF tools…");

  let html2canvas;
  let JsPDF;
  try {
    ({ html2canvas, jsPDF: JsPDF } = await loadPdfLibraries());
  } catch (err) {
    console.error(err);
    onStatus("Cannot load PDF tools. Connect to the internet, then refresh (Ctrl+F5).");
    return false;
  }

  onStatus("Preparing PDF…");
  const { clone, sandbox } = buildExportClone(sourceEl);

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  const contentWidth = clone.offsetWidth;
  const contentHeight = clone.scrollHeight;

  if (contentWidth < 50 || contentHeight < 50) {
    sandbox.remove();
    onStatus("Preview is empty or too small to export.");
    return false;
  }

  const scale = getExportScale(contentWidth, contentHeight);
  const exportLinks = collectExportLinks(clone);

  onStatus("Generating PDF…");

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
    onStatus("PDF downloaded — links are clickable in the file.");
    return true;
  } catch (err) {
    console.error("PDF export error:", err);
    onStatus("PDF export failed. Try a shorter resume or refresh the page.");
    return false;
  } finally {
    sandbox.remove();
  }
}
