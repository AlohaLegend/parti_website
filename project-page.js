const projectPageShell = document.querySelector("#project-page-shell");
const projectMenuButton = document.querySelector("#menu-button");
const projectSiteMenu = document.querySelector("#site-menu");
const projectThemeToggle = document.querySelector("#theme-toggle");
const projectHeaderLogoImage = document.querySelector("#header-logo-image");

const projectTitleNode = document.querySelector("#project-page-title");
const projectKickerNode = document.querySelector("#project-page-kicker");
const projectMetaNode = document.querySelector("#project-page-meta");
const projectLeadNode = document.querySelector("#project-page-lead");
const projectBodyNode = document.querySelector("#project-page-body");
const projectSupportNode = document.querySelector("#project-page-support");
const projectHeroSlides = document.querySelector("#project-hero-slides");
const projectHeroDots = document.querySelector("#project-hero-dots");
const projectHeroCopy = document.querySelector("#project-hero-copy");
const projectLiveLink = document.querySelector("#project-live-link");
const projectList = document.querySelector("#project-list");
const projectGallery = document.querySelector("#project-gallery");

const THEME_STORAGE_KEY = "parti-theme";
const currentProjectId =
  new URLSearchParams(window.location.search).get("slug") ||
  document.body.dataset.project;
const fallbackProjectId = "marshalls-cbs";
let projectLibrary = window.PARTI_PROJECT_STORE?.getMergedProjects() || window.PARTI_PROJECTS || {};
const HERO_SLIDESHOW_DELAY = 3600;
let heroSlideTimer = null;
let heroSlides = [];
let heroDots = [];
let currentHeroSlideIndex = 0;

function toggleProjectMenu(forceOpen) {
  const shouldOpen =
    typeof forceOpen === "boolean" ? forceOpen : !projectSiteMenu?.classList.contains("is-open");

  projectSiteMenu?.classList.toggle("is-open", shouldOpen);
  projectMenuButton?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

function setProjectTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";

  projectPageShell?.setAttribute("data-theme", nextTheme);
  if (projectThemeToggle) {
    projectThemeToggle.textContent = nextTheme === "dark" ? "Light" : "Dark";
  }

  if (projectHeaderLogoImage) {
    projectHeaderLogoImage.src = "assets/parti-logo-purple.png";
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function getPreferredTheme(defaultTheme = "dark") {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : defaultTheme;
}

function stopHeroSlideshow() {
  if (heroSlideTimer) {
    window.clearInterval(heroSlideTimer);
    heroSlideTimer = null;
  }
}

function setActiveHeroSlide(index) {
  if (!heroSlides.length) {
    return;
  }

  currentHeroSlideIndex = index;

  heroSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === currentHeroSlideIndex);
  });

  heroDots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === currentHeroSlideIndex;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-pressed", String(isActive));
  });
}

function startHeroSlideshow() {
  stopHeroSlideshow();

  if (heroSlides.length < 2) {
    return;
  }

  heroSlideTimer = window.setInterval(() => {
    const nextIndex = (currentHeroSlideIndex + 1) % heroSlides.length;
    setActiveHeroSlide(nextIndex);
  }, HERO_SLIDESHOW_DELAY);
}

function renderHeroSlideshow(project) {
  if (!projectHeroSlides || !projectHeroDots) {
    return;
  }

  stopHeroSlideshow();

  const slides = project.gallery?.length
    ? project.gallery
    : [{ src: project.image, alt: project.imageAlt || project.title }];

  projectHeroSlides.innerHTML = slides
    .map((item, index) => {
      const activeClass = index === 0 ? " is-active" : "";
      return `
        <figure class="project-hero-slide${activeClass}">
          <img src="${item.src}" alt="${item.alt}">
        </figure>
      `;
    })
    .join("");

  projectHeroDots.innerHTML = slides
    .map((item, index) => {
      const activeClass = index === 0 ? " is-active" : "";
      const pressed = index === 0 ? "true" : "false";
      return `
        <button
          class="project-hero-dot${activeClass}"
          type="button"
          aria-label="View slide ${index + 1}"
          aria-pressed="${pressed}"
          data-slide-index="${index}"
        ></button>
      `;
    })
    .join("");

  heroSlides = Array.from(projectHeroSlides.querySelectorAll(".project-hero-slide"));
  heroDots = Array.from(projectHeroDots.querySelectorAll(".project-hero-dot"));
  currentHeroSlideIndex = 0;

  heroDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const nextIndex = Number(dot.dataset.slideIndex || "0");
      setActiveHeroSlide(nextIndex);
      startHeroSlideshow();
    });
  });

  setActiveHeroSlide(0);
  startHeroSlideshow();
}

function renderProject(project) {
  if (!project) {
    return;
  }

  document.title = `PARTI | ${project.title}`;

  if (projectTitleNode) {
    projectTitleNode.textContent = project.title;
  }

  if (projectKickerNode) {
    projectKickerNode.textContent = project.detailTitle;
  }

  if (projectMetaNode) {
    projectMetaNode.textContent = project.meta;
  }

  if (projectLeadNode) {
    projectLeadNode.textContent = project.detailLead;
  }

  if (projectBodyNode) {
    projectBodyNode.textContent = project.detailBody;
  }

  if (projectSupportNode) {
    projectSupportNode.textContent = project.detailSupport;
  }

  if (projectHeroCopy) {
    projectHeroCopy.textContent = project.copy;
  }

  renderHeroSlideshow(project);

  if (projectLiveLink) {
    projectLiveLink.href = project.liveUrl;
  }

  if (projectGallery) {
    const galleryItems = (project.gallery || [])
      .map((item) => {
        return `
          <figure>
            <img src="${item.src}" alt="${item.alt}">
          </figure>
        `;
      })
      .join("");

    projectGallery.innerHTML = galleryItems;
  }

  if (projectList) {
    const items = Object.values(projectLibrary)
      .filter((entry) => entry.slug === project.slug || entry.isHidden !== true)
      .map((entry) => {
        const activeClass = entry.slug === project.slug ? "is-active" : "";
        return `
          <a class="${activeClass}" href="${entry.pageUrl}">
            <span>${entry.navLabel}</span>
            <span>${entry.yearLabel}</span>
          </a>
        `;
      })
      .join("");

    projectList.innerHTML = items;
  }
}

projectMenuButton?.addEventListener("click", () => {
  toggleProjectMenu();
});

projectSiteMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    toggleProjectMenu(false);
  });
});

projectThemeToggle?.addEventListener("click", () => {
  const nextTheme = projectPageShell?.getAttribute("data-theme") === "dark" ? "light" : "dark";
  setProjectTheme(nextTheme);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleProjectMenu(false);
  }
});

window.addEventListener("beforeunload", stopHeroSlideshow);

function initializeProjectPage() {
  projectLibrary = window.PARTI_PROJECT_STORE?.getMergedProjects() || window.PARTI_PROJECTS || {};
  const currentProject = projectLibrary[currentProjectId] || projectLibrary[fallbackProjectId];
  renderProject(currentProject);
  setProjectTheme(getPreferredTheme(projectPageShell?.getAttribute("data-theme") || "dark"));
}

if (window.PARTI_PROJECT_STORE?.ready?.then) {
  window.PARTI_PROJECT_STORE.ready.finally(initializeProjectPage);
} else {
  initializeProjectPage();
}
