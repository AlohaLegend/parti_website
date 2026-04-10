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
const HOVER_INTENT_DELAY = 210;
const CARD_SCROLL_DELAY = 180;
const CARD_SCROLL_DURATION = 680;
const COLLAGE_BLUEPRINTS = [
  { shape: "tall" },
  { shape: "landscape" },
  { shape: "square" },
  { shape: "landscape" },
  { shape: "square" },
  { shape: "portrait" },
  { shape: "landscape" },
  { shape: "square" }
];
let hoverIntentTimer = null;
let cardScrollTimer = null;
let cardScrollAnimationFrame = null;
let cards = [];
let activeProjectId = null;

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

const orderedProjectIds = rows
  .map((row) => row.dataset.project)
  .filter((projectId) => projectContent[projectId]?.showInCollage !== false);

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

function clearCardScrollAnimation() {
  if (cardScrollAnimationFrame) {
    window.cancelAnimationFrame(cardScrollAnimationFrame);
    cardScrollAnimationFrame = null;
  }
}

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function scrollCardIntoView(card) {
  if (!card || !imageField) {
    return;
  }

  const fieldRect = imageField.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const currentTop = imageField.scrollTop;
  const visibleHeight = imageField.clientHeight;
  const cardOffsetTop = cardRect.top - fieldRect.top + currentTop;
  const centeredTop = cardOffsetTop - (visibleHeight / 2) + (cardRect.height / 2);
  const maxScrollTop = Math.max(0, imageField.scrollHeight - visibleHeight);
  const targetTop = Math.min(Math.max(0, centeredTop), maxScrollTop);

  if (Math.abs(targetTop - currentTop) < 6) {
    return;
  }

  clearCardScrollAnimation();

  const startTop = currentTop;
  const startTime = performance.now();

  const animate = (timestamp) => {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / CARD_SCROLL_DURATION, 1);
    const easedProgress = easeInOutCubic(progress);
    const nextTop = startTop + (targetTop - startTop) * easedProgress;

    imageField.scrollTop = nextTop;

    if (progress < 1) {
      cardScrollAnimationFrame = window.requestAnimationFrame(animate);
    } else {
      cardScrollAnimationFrame = null;
    }
  };

  cardScrollAnimationFrame = window.requestAnimationFrame(animate);
}

function clearCardScrollIntent() {
  if (cardScrollTimer) {
    window.clearTimeout(cardScrollTimer);
    cardScrollTimer = null;
  }

  clearCardScrollAnimation();
}

function scheduleCardScroll(card) {
  clearCardScrollIntent();
  cardScrollTimer = window.setTimeout(() => {
    scrollCardIntoView(card);
    cardScrollTimer = null;
  }, CARD_SCROLL_DELAY);
}

function activateProject(projectId) {
  const activeId = projectContent[projectId] ? projectId : DEFAULT_PROJECT;

  if (activeId === activeProjectId) {
    return;
  }

  activeProjectId = activeId;

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
      scheduleCardScroll(card);
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
