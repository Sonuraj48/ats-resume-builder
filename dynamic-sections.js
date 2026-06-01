/**
 * dynamic-sections.js — Add/remove repeatable entry cards for resume sections.
 */

const bulletsToLines = (text) =>
  (text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

const linesToBullets = (lines) => (Array.isArray(lines) ? lines.join("\n") : lines || "");

function field(label, name, value, placeholder, type = "text") {
  const id = `${name}-${Math.random().toString(36).slice(2, 9)}`;
  if (type === "textarea") {
    return `
      <label for="${id}">${label}</label>
      <textarea id="${id}" data-field="${name}" rows="${name === "intro" || name === "bullets" ? 5 : 3}" placeholder="${placeholder}">${escapeAttr(value)}</textarea>
    `;
  }
  return `
    <label for="${id}">${label}</label>
    <input type="${type}" id="${id}" data-field="${name}" value="${escapeAttr(value)}" placeholder="${placeholder}" />
  `;
}

function escapeAttr(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function readCard(card) {
  const data = {};
  card.querySelectorAll("[data-field]").forEach((el) => {
    data[el.dataset.field] = el.value.trim();
  });
  return data;
}

function updateRemoveButtons(container) {
  const cards = container.querySelectorAll(".entry-card");
  cards.forEach((card) => {
    const btn = card.querySelector(".btn-remove-entry");
    if (btn) btn.disabled = cards.length <= 1;
  });
}

function createCard(type, data, index, onChange) {
  const card = document.createElement("div");
  card.className = "entry-card";
  card.dataset.entryType = type;
  card.dataset.entryIndex = String(index);

  let inner = `<div class="entry-card-head"><span class="entry-card-label">#${index + 1}</span>`;
  inner += `<button type="button" class="btn-remove-entry btn btn-outline btn-sm" aria-label="Remove entry">Remove</button></div>`;
  inner += '<div class="entry-card-body">';

  switch (type) {
    case "education":
      inner += field("Degree / Course", "degree", data.degree, "e.g. Bachelor of Technology in CSE");
      inner += field(
        "School / College / University",
        "school",
        data.school,
        "e.g. Vivekananda Global University"
      );
      inner += field(
        "Grade / GPA / Percentage",
        "grade",
        data.grade,
        "e.g. GPA: 8.2 or percentage: 86.6%"
      );
      inner += `<div class="entry-row-2">${field("Date", "dates", data.dates, "Sep '22 — Present")}${field("Location", "location", data.location, "Jaipur, India")}</div>`;
      break;
    case "experience":
      inner += field("Job Title", "title", data.title, "Intern");
      inner += `<div class="entry-row-2">${field("Dates", "dates", data.dates, "Jun '25 — Aug '25")}${field("Location", "location", data.location, "City, Country")}</div>`;
      inner += field("Company / Organization", "company", data.company, "Company Name");
      inner += field("Description", "intro", data.intro, "Short paragraph about your role", "textarea");
      inner += field("Achievements (one per line)", "bullets", data.bullets, "Achievement bullet point", "textarea");
      break;
    case "certification":
      inner += `<div class="entry-row-2">${field("Certification Name", "name", data.name, "Get Started with Python")}${field("Provider", "provider", data.provider, "Google")}</div>`;
      break;
    case "project":
      inner += `<div class="entry-row-2">${field("Project Title", "title", data.title, "Project Name")}${field("Project URL", "url", data.url, "https://...", "url")}</div>`;
      inner += field("Details (one per line)", "bullets", data.bullets, "What you built or achieved", "textarea");
      break;
    case "skill":
      inner += `<div class="entry-row-2">${field("Category", "category", data.category, "Programming Languages")}${field("Skills", "items", data.items, "Python, Java, SQL")}</div>`;
      break;
    default:
      break;
  }

  inner += "</div>";
  card.innerHTML = inner;

  card.querySelector(".btn-remove-entry")?.addEventListener("click", () => {
    const container = card.parentElement;
    card.remove();
    reindexCards(container);
    updateRemoveButtons(container);
    onChange();
  });

  card.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", onChange);
  });

  return card;
}

function reindexCards(container) {
  container.querySelectorAll(".entry-card").forEach((card, i) => {
    card.dataset.entryIndex = String(i);
    const label = card.querySelector(".entry-card-label");
    if (label) label.textContent = `#${i + 1}`;
  });
}

const EMPTY = {
  education: { degree: "", school: "", grade: "", dates: "", location: "" },
  experience: { title: "", dates: "", company: "", location: "", intro: "", bullets: "" },
  certification: { name: "", provider: "" },
  project: { title: "", url: "", bullets: "" },
  skill: { category: "", items: "" },
};

const SECTION_MAP = {
  education: { containerId: "education-entries", type: "education", listKey: "education" },
  experience: { containerId: "experience-entries", type: "experience", listKey: "experience" },
  certification: { containerId: "certification-entries", type: "certification", listKey: "certifications" },
  project: { containerId: "project-entries", type: "project", listKey: "projects" },
  skill: { containerId: "skill-entries", type: "skill", listKey: "skills" },
};

/**
 * Initialize all dynamic sections with add buttons and one default card each.
 */
export function initDynamicSections(onChange) {
  Object.values(SECTION_MAP).forEach((cfg) => {
    const container = document.getElementById(cfg.containerId);
    const addBtn = document.getElementById(`add-${cfg.type}-btn`);
    if (!container || !addBtn) return;

    addBtn.addEventListener("click", () => {
      const index = container.querySelectorAll(".entry-card").length;
      container.appendChild(createCard(cfg.type, { ...EMPTY[cfg.type] }, index, onChange));
      updateRemoveButtons(container);
      onChange();
    });
  });
}

export function renderSectionEntries(sectionKey, items, onChange) {
  const cfg = Object.values(SECTION_MAP).find((s) => s.listKey === sectionKey);
  if (!cfg) return;

  const container = document.getElementById(cfg.containerId);
  if (!container) return;

  container.innerHTML = "";
  const list = items?.length ? items : [{ ...EMPTY[cfg.type] }];

  list.forEach((item, index) => {
    const normalized = normalizeEntry(cfg.type, item);
    container.appendChild(createCard(cfg.type, normalized, index, onChange));
  });

  updateRemoveButtons(container);
}

function normalizeEntry(type, item) {
  if (type === "experience") {
    return {
      title: item.title || "",
      dates: item.dates || "",
      company: item.company || item.subtitle || "",
      location: item.location || "",
      intro: item.intro || "",
      bullets: typeof item.bullets === "string" ? item.bullets : linesToBullets(item.bullets),
    };
  }
  if (type === "project") {
    return {
      title: item.title || "",
      url: item.url || "",
      bullets: typeof item.bullets === "string" ? item.bullets : linesToBullets(item.bullets),
    };
  }
  if (type === "education") {
    return {
      degree: item.degree || "",
      school: item.school || item.institution || item.university || "",
      grade: item.grade || item.gpa || "",
      dates: item.dates || "",
      location: item.location || "",
    };
  }
  if (type === "certification") {
    return { name: item.name || "", provider: item.provider || "" };
  }
  if (type === "skill") {
    return { category: item.category || "", items: item.items || "" };
  }
  return item;
}

export function collectSectionEntries(sectionKey) {
  const cfg = Object.values(SECTION_MAP).find((s) => s.listKey === sectionKey);
  if (!cfg) return [];

  const container = document.getElementById(cfg.containerId);
  if (!container) return [];

  return Array.from(container.querySelectorAll(".entry-card")).map((card) => {
    const raw = readCard(card);
    if (cfg.type === "experience" || cfg.type === "project") {
      return { ...raw, bullets: raw.bullets };
    }
    return raw;
  });
}

export function collectAllDynamicSections() {
  return {
    education: collectSectionEntries("education"),
    experience: collectSectionEntries("experience"),
    certifications: collectSectionEntries("certifications"),
    projects: collectSectionEntries("projects"),
    skills: collectSectionEntries("skills"),
  };
}

export function populateAllDynamicSections(data, onChange) {
  renderSectionEntries("education", data.education, onChange);
  renderSectionEntries("experience", data.experience, onChange);
  renderSectionEntries("certifications", data.certifications, onChange);
  renderSectionEntries("projects", data.projects, onChange);
  renderSectionEntries("skills", data.skills, onChange);
}

export { bulletsToLines };
