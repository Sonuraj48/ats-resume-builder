/**
 * resume-template.js — Render professional CV layout from structured data.
 */

import { bulletsToLines } from "./dynamic-sections.js";

const SEP = " ◇ ";

const WORK_PREF_LABELS = {
  remote: "Open to Remote",
  onsite: "Open to On-site",
  hybrid: "Open to Hybrid",
};

/** Format work prefs for resume header (array or legacy string) */
export function formatWorkPrefsDisplay(workPrefs) {
  if (!workPrefs) return "";
  if (Array.isArray(workPrefs)) {
    return workPrefs
      .map((id) => WORK_PREF_LABELS[id] || id)
      .filter(Boolean)
      .join(" · ");
  }
  return String(workPrefs).trim();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function telHref(phone) {
  const digits = String(phone).replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

/** Absolute URL so PDF viewers and print engines recognize links */
function normalizeExternalUrl(url) {
  const s = String(url ?? "").trim();
  if (!s) return "";
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  return `https://${s.replace(/^\/\//, "")}`;
}

/** Contact line with clickable phone (tel) and email (mailto) */
function buildContactLine(n) {
  const items = [];

  if (n.phone) {
    const href = telHref(n.phone);
    items.push(
      href
        ? `<a href="${escapeHtml(href)}">${escapeHtml(n.phone)}</a>`
        : `<span>${escapeHtml(n.phone)}</span>`
    );
  }
  if (n.email) {
    items.push(
      `<a href="mailto:${encodeURIComponent(n.email)}">${escapeHtml(n.email)}</a>`
    );
  }
  if (n.location) items.push(`<span>${escapeHtml(n.location)}</span>`);
  const workPrefsText = formatWorkPrefsDisplay(n.workPrefs);
  if (workPrefsText) items.push(`<span>${escapeHtml(workPrefsText)}</span>`);

  return items.join(`<span class="cv-sep">${SEP.trim()}</span>`);
}

function formatInlineBold(text) {
  if (!text) return "";
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

/** Migrate legacy string fields to arrays */
function splitPipe(line) {
  const parts = (line || "").split("|").map((s) => s.trim());
  return { left: parts[0] || "", right: parts[1] || "" };
}

function parseLegacyExperience(text) {
  return (text || "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const row1 = splitPipe(lines[0] || "");
      const row2 = splitPipe(lines[1] || "");
      const rest = lines.slice(2);
      const introLines = [];
      const bullets = [];
      rest.forEach((line) => {
        if (line.startsWith("-")) bullets.push(line.replace(/^-\s*/, ""));
        else introLines.push(line);
      });
      return {
        title: row1.left,
        dates: row1.right,
        company: row2.left,
        location: row2.right,
        intro: introLines.join(" "),
        bullets,
      };
    });
}

function parseLegacyEducation(text) {
  return (text || "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const row1 = splitPipe(lines[0] || "");
      return { degree: row1.left, dates: row1.right, location: lines[1] || "" };
    });
}

function parseLegacyProjects(text) {
  return (text || "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const row1 = splitPipe(lines[0] || "");
      const bullets = lines.slice(1).filter((l) => l.startsWith("-")).map((l) => l.replace(/^-\s*/, ""));
      return { title: row1.left, url: row1.right, bullets };
    });
}

function parseLegacyCerts(text) {
  return (text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(",");
      if (idx === -1) return { name: line, provider: "" };
      return { name: line.slice(0, idx).trim(), provider: line.slice(idx + 1).trim() };
    });
}

function parseLegacySkills(text) {
  return (text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return { category: "", items: line };
      return { category: line.slice(0, idx).trim(), items: line.slice(idx + 1).trim() };
    });
}

export function normalizeResumeData(data) {
  const d = { ...data };

  d.experience = Array.isArray(d.experience)
    ? d.experience.map((e) => ({
        title: e.title || "",
        dates: e.dates || "",
        company: e.company || e.subtitle || "",
        location: e.location || "",
        intro: e.intro || "",
        bullets: Array.isArray(e.bullets) ? e.bullets : bulletsToLines(e.bullets),
      }))
    : parseLegacyExperience(d.experience);

  d.education = Array.isArray(d.education)
    ? d.education.map((e) => ({
        degree: e.degree || "",
        school: e.school || e.institution || e.university || "",
        grade: e.grade || e.gpa || "",
        dates: e.dates || "",
        location: e.location || "",
      }))
    : parseLegacyEducation(d.education);

  d.projects = Array.isArray(d.projects)
    ? d.projects.map((p) => ({
        title: p.title || "",
        url: p.url || "",
        bullets: Array.isArray(p.bullets) ? p.bullets : bulletsToLines(p.bullets),
      }))
    : parseLegacyProjects(d.projects);

  d.certifications = Array.isArray(d.certifications)
    ? d.certifications
    : parseLegacyCerts(d.certifications);

  d.skills = Array.isArray(d.skills) ? d.skills : parseLegacySkills(d.skills);

  return d;
}

export function renderResume(container, data) {
  if (!container) return;

  const n = normalizeResumeData(data);
  const { experience, education, projects, certifications, skills } = n;

  const linkParts = [
    n.linkedin && { href: normalizeExternalUrl(n.linkedin), label: "LinkedIn" },
    n.github && { href: normalizeExternalUrl(n.github), label: "GitHub" },
    n.portfolio && { href: normalizeExternalUrl(n.portfolio), label: "Portfolio" },
  ].filter((l) => l.href);

  const hasExperience = experience.some((e) => e.title || e.company || e.intro || e.bullets?.length);
  const hasEducation = education.some(
    (e) => e.degree || e.school || e.grade || e.dates || e.location
  );
  const hasCerts = certifications.some((c) => c.name || c.provider);
  const hasProjects = projects.some((p) => p.title || p.url || p.bullets?.length);
  const hasSkills = skills.some((s) => s.category || s.items);

  container.innerHTML = `
    <header class="cv-header">
      <h1 class="cv-name">${escapeHtml(n.name || "Your Name")}</h1>
      ${
        n.phone || n.email || n.location || formatWorkPrefsDisplay(n.workPrefs)
          ? `<p class="cv-contact-line">${buildContactLine(n)}</p>`
          : ""
      }
      ${
        linkParts.length
          ? `<p class="cv-links-line">${linkParts
              .map(
                (l, i) =>
                  `${i ? `<span class="cv-sep">${SEP.trim()}</span>` : ""}<a href="${escapeHtml(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`
              )
              .join("")}</p>`
          : ""
      }
    </header>

    ${section(
      "Summary",
      n.summary
        ? `<p class="cv-summary">${formatInlineBold(n.summary)}</p>`
        : `<p class="cv-placeholder">Add your professional summary.</p>`
    )}

    ${section(
      "Experience",
      hasExperience
        ? experience.map(entryHtml).join("")
        : `<p class="cv-placeholder">Add experience entries using the form.</p>`
    )}

    ${section(
      "Education",
      hasEducation
        ? education.map(eduHtml).join("")
        : `<p class="cv-placeholder">Add education entries.</p>`
    )}

    ${section(
      "Certifications",
      hasCerts
        ? `<ul class="cv-cert-list">${certifications.map((c) => `<li><strong>${escapeHtml(c.name)}</strong>${c.provider ? `, ${escapeHtml(c.provider)}` : ""}</li>`).join("")}</ul>`
        : `<p class="cv-placeholder">Add certifications.</p>`
    )}

    ${section(
      "Projects",
      hasProjects
        ? projects.map(projectHtml).join("")
        : `<p class="cv-placeholder">Add projects.</p>`
    )}

    ${section(
      "Skills",
      hasSkills
        ? `<div class="cv-skills">${skills.map((s) => `<p class="cv-skill-row"><strong>${escapeHtml(s.category)}</strong>${s.items ? `: ${escapeHtml(s.items)}` : ""}</p>`).join("")}</div>`
        : `<p class="cv-placeholder">Add skill categories.</p>`
    )}
  `;
}

function section(title, body) {
  return `
    <section class="cv-section">
      <h2 class="cv-section-title">${title}</h2>
      ${body}
    </section>
  `;
}

/** Left content + right-aligned date/location column (never clipped by border) */
function entryHeadHtml(mainLines, metaLines) {
  const meta = metaLines.filter((m) => m.text);
  const main = mainLines.filter((m) => m.text);
  if (!main.length && !meta.length) return "";

  if (!meta.length) {
    return `<div class="cv-entry-head cv-entry-head-single">${main.map((m) => `<div class="${m.class || "cv-line-main"}">${m.html}</div>`).join("")}</div>`;
  }

  return `
    <div class="cv-entry-head">
      <div class="cv-entry-main">
        ${main.map((m) => `<div class="${m.class || "cv-line-main"}">${m.html}</div>`).join("")}
      </div>
      <div class="cv-entry-aside">
        ${meta.map((m) => `<div class="cv-meta-line ${m.class || ""}">${m.html}</div>`).join("")}
      </div>
    </div>
  `;
}

function entryHtml(e) {
  const bullets = Array.isArray(e.bullets) ? e.bullets : bulletsToLines(e.bullets);
  if (!e.title && !e.company && !e.intro && !bullets.length) return "";

  const metaLines = [];
  if (e.dates) metaLines.push({ text: e.dates, html: escapeHtml(e.dates) });
  if (e.location) {
    metaLines.push({
      text: e.location,
      html: escapeHtml(e.location),
      class: "cv-upper",
    });
  }

  return `
    <article class="cv-entry">
      ${entryHeadHtml(
        [
          e.title && {
            text: e.title,
            html: `<strong>${escapeHtml(e.title)}</strong>`,
            class: "cv-line-title",
          },
          e.company && {
            text: e.company,
            html: escapeHtml(e.company),
            class: "cv-line-sub",
          },
        ].filter(Boolean),
        metaLines
      )}
      ${e.intro ? `<p class="cv-entry-intro">${formatInlineBold(e.intro)}</p>` : ""}
      ${bullets.length ? `<ul class="cv-bullets">${bullets.map((b) => `<li>${formatInlineBold(b)}</li>`).join("")}</ul>` : ""}
    </article>
  `;
}

/** Preview line: "Degree, School (Grade)" */
function formatEducationLine(e) {
  const chunks = [];
  if (e.degree) chunks.push(e.degree.trim());
  if (e.school) chunks.push(e.school.trim());
  let line = chunks.join(", ");
  if (e.grade) {
    const g = e.grade.trim();
    line += g.startsWith("(") ? ` ${g}` : ` (${g})`;
  }
  return line;
}

function eduHtml(e) {
  const line = formatEducationLine(e);
  if (!line && !e.dates && !e.location) return "";

  const metaLines = [];
  if (e.dates) metaLines.push({ text: e.dates, html: escapeHtml(e.dates) });
  if (e.location) {
    metaLines.push({
      text: e.location,
      html: escapeHtml(e.location),
      class: "cv-upper",
    });
  }

  return `
    <article class="cv-entry">
      ${entryHeadHtml(
        line
          ? [
              {
                text: line,
                html: `<strong>${escapeHtml(line)}</strong>`,
                class: "cv-line-title",
              },
            ]
          : [],
        metaLines
      )}
    </article>
  `;
}

function projectHtml(p) {
  const bullets = Array.isArray(p.bullets) ? p.bullets : bulletsToLines(p.bullets);
  if (!p.title && !p.url && !bullets.length) return "";

  const projectUrl = normalizeExternalUrl(p.url);
  const link = projectUrl
    ? ` <a href="${escapeHtml(projectUrl)}" target="_blank" rel="noopener">Link</a>`
    : "";
  return `
    <article class="cv-entry cv-project">
      <p class="cv-project-title"><strong>${escapeHtml(p.title)}</strong>${link}</p>
      ${bullets.length ? `<ul class="cv-bullets">${bullets.map((b) => `<li>${formatInlineBold(b)}</li>`).join("")}</ul>` : ""}
    </article>
  `;
}

