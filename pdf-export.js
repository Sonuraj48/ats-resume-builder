/**
 * pdf-export.js — A4 PDF with clickable link annotations.
 */

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
/** Match preview padding: 0.5in top/bottom, 0.55in left/right */
const A4_MARGIN = { top: 12.7, right: 13.97, bottom: 12.7, left: 13.97 };

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

  clone.style.width = `${A4_WIDTH_MM}mm`;
  clone.style.maxWidth = `${A4_WIDTH_MM}mm`;

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

function addPdfLinkAnnotationsForPage(pdf, links, pageIndex, layout, padMm) {
  const { margin, usableW, usableH, imgHeightMm, contentWidth, contentHeight } = layout;
  const pageTopMm = pageIndex * usableH;

  for (const { href, x, y, w, h } of links) {
    const linkTopMm = (y / contentHeight) * imgHeightMm;
    const linkBottomMm = ((y + h) / contentHeight) * imgHeightMm;

    if (linkBottomMm <= pageTopMm || linkTopMm >= pageTopMm + usableH) continue;

    const lx = margin.left + (x / contentWidth) * usableW;
    const ly = margin.top + linkTopMm - pageTopMm;
    const lw = (w / contentWidth) * usableW;
    const lh = ((h / contentHeight) * imgHeightMm);

    try {
      pdf.link(
        Math.max(margin.left, lx - padMm),
        Math.max(margin.top, ly - padMm),
        lw + padMm * 2,
        lh + padMm * 2,
        { url: href }
      );
    } catch (err) {
      console.warn("PDF link skipped:", href, err);
    }
  }
}

/** Slice tall canvas across A4 pages */
function addCanvasToA4Pages(pdf, imgData, canvas, layout) {
  const { margin, usableW, usableH, imgHeightMm } = layout;
  let offsetMm = 0;
  let pageIndex = 0;

  while (offsetMm < imgHeightMm - 0.01) {
    if (pageIndex > 0) {
      pdf.addPage("a4", "portrait");
    }
    pdf.addImage(
      imgData,
      "PNG",
      margin.left,
      margin.top - offsetMm,
      usableW,
      imgHeightMm,
      undefined,
      "NONE"
    );
    offsetMm += usableH;
    pageIndex += 1;
  }

  return pageIndex;
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
    const margin = A4_MARGIN;
    const usableW = A4_WIDTH_MM - margin.left - margin.right;
    const usableH = A4_HEIGHT_MM - margin.top - margin.bottom;
    const imgHeightMm = (canvas.height / canvas.width) * usableW;

    const layout = {
      margin,
      usableW,
      usableH,
      imgHeightMm,
      contentWidth,
      contentHeight,
    };

    const pdf = new JsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: false,
    });

    const pageCount = addCanvasToA4Pages(pdf, imgData, canvas, layout);
    const linkPadMm = Math.max(0.4, (2 / contentWidth) * usableW);

    for (let p = 0; p < pageCount; p++) {
      pdf.setPage(p + 1);
      addPdfLinkAnnotationsForPage(pdf, exportLinks, p, layout, linkPadMm);
    }

    pdf.save(filename);
    const pagesNote = pageCount > 1 ? ` (${pageCount} A4 pages)` : "";
    onStatus(`PDF downloaded (A4)${pagesNote} — links are clickable.`);
    return true;
  } catch (err) {
    console.error("PDF export error:", err);
    onStatus("PDF export failed. Try a shorter resume or refresh the page.");
    return false;
  } finally {
    sandbox.remove();
  }
}
