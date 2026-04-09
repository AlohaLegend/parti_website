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

const projectKicker = document.querySelector("#project-kicker");
const projectTitle = document.querySelector("#project-title");
const projectMeta = document.querySelector("#project-meta");
const projectCopy = document.querySelector("#project-copy");
const projectCopySecondary = document.querySelector("#project-copy-secondary");

const projectContent = window.PARTI_PROJECTS || {};

const DEFAULT_PROJECT = "marshalls-cbs";

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
  const nextProject = projectContent[projectId] || projectContent[DEFAULT_PROJECT];
  const activeId = projectContent[projectId] ? projectId : DEFAULT_PROJECT;

  rows.forEach((row) => {
    row.classList.toggle("is-active", row.dataset.project === activeId);
  });

  cards.forEach((card) => {
    card.classList.toggle("is-active", card.dataset.project === activeId);
  });

  if (projectKicker) {
    projectKicker.textContent = nextProject.kicker;
  }

  if (projectTitle) {
    projectTitle.textContent = nextProject.title;
  }

  if (projectMeta) {
    projectMeta.textContent = nextProject.meta;
  }

  if (projectCopy) {
    projectCopy.textContent = nextProject.copy;
  }

  if (projectCopySecondary) {
    projectCopySecondary.textContent = nextProject.secondary;
  }
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
  row.addEventListener("click", () => activateProject(row.dataset.project));
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
