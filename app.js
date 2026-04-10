const splashScreen = document.querySelector("#splash-screen");
const skipIntroButton = document.querySelector("#skip-intro");
const menuButton = document.querySelector("#menu-button");
const siteMenu = document.querySelector("#site-menu");
const themeToggle = document.querySelector("#theme-toggle");
const siteShell = document.querySelector("#site-shell");
const imageField = document.querySelector("#image-field");
const worksPanel = document.querySelector(".works-panel");
const splashLogoImage = document.querySelector("#splash-logo-image");
const headerLogoImage = document.querySelector("#header-logo-image");
const worksList = document.querySelector("#works-list");

const THEME_STORAGE_KEY = "parti-theme";
let projectContent = window.PARTI_PROJECT_STORE?.getMergedProjects() || window.PARTI_PROJECTS || {};
let defaultProjectId = "marshalls-cbs";
const rowEntries = new Map();
const HOVER_INTENT_DELAY = 210;
const CARD_SCROLL_DELAY = 180;
const CARD_SCROLL_DURATION = 680;
const COLLAGE_BLUEPRINTS = [
  { shape: "landscape" },
  { shape: "square" },
  { shape: "portrait" },
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
let rows = [];
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

function getOrderedProjects() {
  return Object.values(projectContent);
}

function renderWorksList() {
  if (!worksList) {
    return;
  }

  const orderedProjects = getOrderedProjects();
  worksList.innerHTML = orderedProjects
    .map((project) => {
      return `
        <a class="work-row" href="${project.pageUrl}" data-project="${project.slug}">
          <span>${project.navLabel}</span>
          <span>${project.yearLabel}</span>
        </a>
      `;
    })
    .join("");

  rows = Array.from(worksList.querySelectorAll(".work-row"));
}

function renderImageField() {
  if (!imageField) {
    return;
  }

  const orderedProjectIds = rows
    .map((row) => row.dataset.project)
    .filter((projectId) => projectContent[projectId]?.showInCollage !== false);

  imageField.innerHTML = "";

  orderedProjectIds.forEach((projectId, index) => {
    const card = createImageCard(projectId, index);

    if (!card) {
      return;
    }

    imageField.appendChild(card);
  });

  cards = Array.from(imageField.querySelectorAll(".image-card"));
}

function decorateWorkRows() {
  rowEntries.clear();

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
}

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
  const nextTheme = theme === "light" ? "light" : "dark";

  siteShell?.setAttribute("data-theme", nextTheme);
  if (themeToggle) {
    themeToggle.textContent = nextTheme === "dark" ? "Light" : "Dark";
  }

  const logoSource = nextTheme === "dark" ? "assets/parti-logo-main.png" : "assets/parti-logo-purple.png";

  if (splashLogoImage) {
    splashLogoImage.src = logoSource;
  }

  if (headerLogoImage) {
    headerLogoImage.src = logoSource;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function getPreferredTheme(defaultTheme = "dark") {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : defaultTheme;
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

function scrollWorkEntryIntoView(entry) {
  if (!entry) {
    return;
  }

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const entryRect = entry.getBoundingClientRect();
  const topThreshold = 120;
  const bottomThreshold = viewportHeight - 120;
  const isVisible = entryRect.top >= topThreshold && entryRect.bottom <= bottomThreshold;

  if (isVisible) {
    return;
  }

  const absoluteTop = window.scrollY + entryRect.top;
  const targetTop = absoluteTop - (viewportHeight / 2) + (entryRect.height / 2);

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
}

function activateProject(projectId, source = "right") {
  const activeId = projectContent[projectId] ? projectId : defaultProjectId;
  const hasChanged = activeId !== activeProjectId;

  if (hasChanged) {
    activeProjectId = activeId;

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

  const activeCard = cards.find((card) => card.dataset.project === activeId);
  const activeEntry = rowEntries.get(activeId);

  if (source === "right") {
    if (activeCard) {
      scheduleCardScroll(activeCard);
    }
    return;
  }

  clearCardScrollIntent();

  if (activeEntry) {
    scrollWorkEntryIntoView(activeEntry);
  }
}

function clearHoverIntent() {
  if (hoverIntentTimer) {
    window.clearTimeout(hoverIntentTimer);
    hoverIntentTimer = null;
  }
}

function scheduleProjectActivation(projectId, source = "right") {
  clearHoverIntent();
  hoverIntentTimer = window.setTimeout(() => {
    activateProject(projectId, source);
    hoverIntentTimer = null;
  }, HOVER_INTENT_DELAY);
}

function bindPortfolioInteractions() {
  rows.forEach((row) => {
    row.addEventListener("mouseenter", () => scheduleProjectActivation(row.dataset.project, "right"));
    row.addEventListener("mouseleave", clearHoverIntent);
    row.addEventListener("focus", () => {
      clearHoverIntent();
      activateProject(row.dataset.project, "right");
    });
    row.addEventListener("click", (event) => {
      clearHoverIntent();

      if (!row.classList.contains("is-active")) {
        event.preventDefault();
      }

      activateProject(row.dataset.project, "right");
    });
  });

  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => scheduleProjectActivation(card.dataset.project, "left"));
    card.addEventListener("mouseleave", clearHoverIntent);
    card.addEventListener("focus", () => {
      clearHoverIntent();
      activateProject(card.dataset.project, "left");
    });
  });
}

function initializePortfolio() {
  projectContent = window.PARTI_PROJECT_STORE?.getMergedProjects() || window.PARTI_PROJECTS || {};

  const orderedProjects = getOrderedProjects();
  defaultProjectId = orderedProjects[0]?.slug || "marshalls-cbs";

  renderWorksList();
  renderImageField();
  decorateWorkRows();
  bindPortfolioInteractions();

  activateProject(defaultProjectId, "right");
  setTheme(getPreferredTheme(siteShell?.getAttribute("data-theme") || "dark"));
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleMenu(false);
    dismissSplash();
  }
});

if (window.PARTI_PROJECT_STORE?.ready?.then) {
  window.PARTI_PROJECT_STORE.ready.finally(initializePortfolio);
} else {
  initializePortfolio();
}
