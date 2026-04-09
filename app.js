const splashScreen = document.querySelector("#splash-screen");
const skipIntroButton = document.querySelector("#skip-intro");
const menuButton = document.querySelector("#menu-button");
const siteMenu = document.querySelector("#site-menu");
const themeToggle = document.querySelector("#theme-toggle");
const siteShell = document.querySelector("#site-shell");
const splashLogoImage = document.querySelector("#splash-logo-image");
const headerLogoImage = document.querySelector("#header-logo-image");
const rows = Array.from(document.querySelectorAll(".work-row"));
const cards = Array.from(document.querySelectorAll(".image-card"));

const projectContent = window.PARTI_PROJECTS || {};
const DEFAULT_PROJECT = "marshalls-cbs";
const rowEntries = new Map();

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
    card.classList.toggle("is-active", card.dataset.project === activeId);
  });
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
  row.addEventListener("mouseenter", () => activateProject(row.dataset.project));
  row.addEventListener("focus", () => activateProject(row.dataset.project));
  row.addEventListener("click", (event) => {
    if (!row.classList.contains("is-active")) {
      event.preventDefault();
    }

    activateProject(row.dataset.project);
  });
});

cards.forEach((card) => {
  card.addEventListener("mouseenter", () => activateProject(card.dataset.project));
  card.addEventListener("focus", () => activateProject(card.dataset.project));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleMenu(false);
    dismissSplash();
  }
});

activateProject(DEFAULT_PROJECT);
setTheme(siteShell?.getAttribute("data-theme") || "dark");
