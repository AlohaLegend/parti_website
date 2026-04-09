const splashScreen = document.querySelector("#splash-screen");
const skipIntroButton = document.querySelector("#skip-intro");
const menuButton = document.querySelector("#menu-button");
const siteMenu = document.querySelector("#site-menu");
const themeToggle = document.querySelector("#theme-toggle");
const siteShell = document.querySelector("#site-shell");
const imageField = document.querySelector("#image-field");
const splashLogoImage = document.querySelector("#splash-logo-image");
const headerLogoImage = document.querySelector("#header-logo-image");
const rows = Array.from(document.querySelectorAll(".work-row"));

const projectContent = window.PARTI_PROJECTS || {};
const DEFAULT_PROJECT = "marshalls-cbs";
const rowEntries = new Map();
const HOVER_INTENT_DELAY = 120;
const COLLAGE_BLUEPRINTS = [
  { x: 4, y: 4, rotate: -5, shape: "portrait" },
  { x: 34, y: 2, rotate: 3, shape: "landscape" },
  { x: 61, y: 6, rotate: -3, shape: "square" },
  { x: 16, y: 18, rotate: 4, shape: "landscape" },
  { x: 49, y: 20, rotate: -4, shape: "portrait" },
  { x: 72, y: 22, rotate: 3, shape: "landscape" },
  { x: 5, y: 38, rotate: 2, shape: "square" },
  { x: 28, y: 42, rotate: -3, shape: "portrait" },
  { x: 57, y: 42, rotate: 5, shape: "landscape" },
  { x: 76, y: 44, rotate: -2, shape: "portrait" },
  { x: 10, y: 61, rotate: -4, shape: "landscape" },
  { x: 39, y: 62, rotate: 3, shape: "square" },
  { x: 66, y: 66, rotate: -5, shape: "portrait" },
  { x: 22, y: 79, rotate: 2, shape: "landscape" },
  { x: 52, y: 82, rotate: -2, shape: "landscape" },
  { x: 75, y: 80, rotate: 4, shape: "square" }
];
let hoverIntentTimer = null;
let cards = [];

function createDropdown(project) {
  const dropdown = document.createElement("div");
  dropdown.className = "work-dropdown";

  const inner = document.createElement("div");
  inner.className = "work-dropdown-inner";

  const kicker = document.createElement("p");
  kicker.className = "detail-kicker";
  kicker.textContent = project.kicker;
  inner.appendChild(kicker);

  const meta = document.createElement("p");
  meta.className = "detail-meta";
  meta.textContent = project.meta;
  inner.appendChild(meta);

  const copy = document.createElement("p");
  copy.className = "detail-copy";
  copy.textContent = project.copy;
  inner.appendChild(copy);

  if (project.secondary) {
    const secondary = document.createElement("p");
    secondary.className = "detail-copy";
    secondary.textContent = project.secondary;
    inner.appendChild(secondary);
  }

  dropdown.appendChild(inner);
  return dropdown;
}

function createImageCard(projectId, index) {
  const project = projectContent[projectId];

  if (!project) {
    return null;
  }

  const blueprint = COLLAGE_BLUEPRINTS[index % COLLAGE_BLUEPRINTS.length];
  const card = document.createElement("a");
  card.className = `image-card ${blueprint.shape}`;
  card.dataset.project = projectId;
  card.href = project.pageUrl;
  card.setAttribute("aria-label", `Open ${project.title} project`);
  card.style.setProperty("--card-left", `${blueprint.x}%`);
  card.style.setProperty("--card-top", `${blueprint.y}%`);
  card.style.setProperty("--card-rotate", `${blueprint.rotate}deg`);
  card.style.setProperty("--stack-order", String(index + 1));

  const fill = document.createElement("div");
  fill.className = "image-fill";

  const image = document.createElement("img");
  image.className = "image-fill-media";
  image.src = project.image;
  image.alt = project.imageAlt || `${project.title} project image`;
  fill.appendChild(image);

  card.appendChild(fill);

  return card;
}

const orderedProjectIds = rows.map((row) => row.dataset.project);

orderedProjectIds.forEach((projectId, index) => {
  const card = createImageCard(projectId, index);

  if (!card || !imageField) {
    return;
  }

  imageField.appendChild(card);
});

cards = Array.from(document.querySelectorAll(".image-card"));

rows.forEach((row) => {
  const project = projectContent[row.dataset.project];

  if (!project || !row.parentElement) {
    return;
  }

  const entry = document.createElement("div");
  entry.className = "work-entry";

  row.parentElement.insertBefore(entry, row);
  entry.appendChild(row);
  entry.appendChild(createDropdown(project));

  rowEntries.set(row.dataset.project, entry);
});

function dismissSplash() {
  splashScreen?.classList.add("is-hidden");
}

function toggleMenu(forceOpen) {
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !siteMenu?.classList.contains("is-open");

  siteMenu?.classList.toggle("is-open", shouldOpen);
  menuButton?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

function setTheme(theme) {
  siteShell?.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "Light" : "Dark";

  const logoSource = theme === "dark" ? "assets/parti-logo-main.png" : "assets/parti-logo-purple.png";

  if (splashLogoImage) {
    splashLogoImage.src = logoSource;
  }

  if (headerLogoImage) {
    headerLogoImage.src = logoSource;
  }
}

function activateProject(projectId) {
  const activeId = projectContent[projectId] ? projectId : DEFAULT_PROJECT;

  rows.forEach((row) => {
    row.classList.toggle("is-active", row.dataset.project === activeId);
  });

  rowEntries.forEach((entry, entryProjectId) => {
    entry.classList.toggle("is-open", entryProjectId === activeId);
  });

  cards.forEach((card) => {
    const isActive = card.dataset.project === activeId;

    card.classList.toggle("is-active", isActive);

    if (isActive) {
      card.style.setProperty("--active-stack-order", "99");
    } else {
      card.style.removeProperty("--active-stack-order");
    }
  });
}

function clearHoverIntent() {
  if (hoverIntentTimer) {
    window.clearTimeout(hoverIntentTimer);
    hoverIntentTimer = null;
  }
}

function scheduleProjectActivation(projectId) {
  clearHoverIntent();
  hoverIntentTimer = window.setTimeout(() => {
    activateProject(projectId);
    hoverIntentTimer = null;
  }, HOVER_INTENT_DELAY);
}

skipIntroButton?.addEventListener("click", dismissSplash);
window.setTimeout(dismissSplash, 1800);

menuButton?.addEventListener("click", () => {
  toggleMenu();
});

siteMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    toggleMenu(false);
  });
});

themeToggle?.addEventListener("click", () => {
  const nextTheme = siteShell?.getAttribute("data-theme") === "dark" ? "light" : "dark";
  setTheme(nextTheme);
});

rows.forEach((row) => {
  row.addEventListener("mouseenter", () => scheduleProjectActivation(row.dataset.project));
  row.addEventListener("mouseleave", clearHoverIntent);
  row.addEventListener("focus", () => {
    clearHoverIntent();
    activateProject(row.dataset.project);
  });
  row.addEventListener("click", (event) => {
    clearHoverIntent();

    if (!row.classList.contains("is-active")) {
      event.preventDefault();
    }

    activateProject(row.dataset.project);
  });
});

cards.forEach((card) => {
  card.addEventListener("mouseenter", () => scheduleProjectActivation(card.dataset.project));
  card.addEventListener("mouseleave", clearHoverIntent);
  card.addEventListener("focus", () => {
    clearHoverIntent();
    activateProject(card.dataset.project);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleMenu(false);
    dismissSplash();
  }
});

activateProject(DEFAULT_PROJECT);
setTheme(siteShell?.getAttribute("data-theme") || "dark");
