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
const projectCompanyLinks = document.querySelector("#project-company-links");
const projectList = document.querySelector("#project-list");
const projectGallery = document.querySelector("#project-gallery");

const THEME_STORAGE_KEY = "parti-theme";
const currentProjectId =
  new URLSearchParams(window.location.search).get("slug") ||
  document.body.dataset.project;
const fallbackProjectId = "marshalls-cbs";
let projectLibrary = window.PARTI_PROJECTS || {};
const HERO_SLIDESHOW_DELAY = 3600;
let heroSlideTimer = null;
let heroSlides = [];
let heroDots = [];
let currentHeroSlideIndex = 0;

function getOptimizedAssetPath(src, folder = "optimized") {
  if (typeof src !== "string" || !src.startsWith("assets/")) {
    return src;
  }

  const fileName = src.split("/").pop() || "";
  const stem = fileName.replace(/\.[^.]+$/, "");
  return `assets/${folder}/${stem}.webp`;
}

function bindImageFallbacks(root) {
  root?.querySelectorAll("img[data-original-src]").forEach((image) => {
    image.addEventListener("error", () => {
      if (image.dataset.originalSrc && image.src !== image.dataset.originalSrc) {
        image.src = image.dataset.originalSrc;
      }
    }, { once: true });
  });
}

function toggleProjectMenu(forceOpen) {
  const shouldOpen =
    typeof forceOpen === "boolean" ? forceOpen : !projectSiteMenu?.classList.contains("is-open");

  projectSiteMenu?.classList.toggle("is-open", shouldOpen);
  projectMenuButton?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

function setProjectTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", nextTheme);
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

function getCurrentTheme(defaultTheme = "dark") {
  const activeTheme =
    document.documentElement.getAttribute("data-theme") ||
    projectPageShell?.getAttribute("data-theme") ||
    defaultTheme;

  return activeTheme === "light" || activeTheme === "dark" ? activeTheme : defaultTheme;
}

function normalizeCompanyUrls(project) {
  if (Array.isArray(project.companyUrls) && project.companyUrls.length) {
    return project.companyUrls.filter(Boolean);
  }

  if (project.companyUrl) {
    return [project.companyUrl];
  }

  return [];
}

function getProjectTimestamp(project) {
  const datePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i;
  const candidateFields = [
    typeof project?.date === "string" ? project.date : "",
    typeof project?.meta === "string" ? project.meta : "",
    typeof project?.detailBody === "string" ? project.detailBody : "",
    typeof project?.detailLead === "string" ? project.detailLead : "",
    typeof project?.detailSupport === "string" ? project.detailSupport : "",
  ];

  for (const field of candidateFields) {
    if (!field) {
      continue;
    }

    const matchedDate = field.match(datePattern)?.[0] || field;
    const parsedDate = Date.parse(matchedDate);

    if (!Number.isNaN(parsedDate)) {
      return parsedDate;
    }
  }

  return null;
}

function getOrderedProjects() {
  return Object.values(projectLibrary)
    .filter((entry) => entry && entry.isHidden !== true)
    .sort((a, b) => {
      const timeA = getProjectTimestamp(a);
      const timeB = getProjectTimestamp(b);

      if (timeA !== null && timeB !== null && timeA !== timeB) {
        return timeB - timeA;
      }

      if (timeA !== null && timeB === null) {
        return -1;
      }

      if (timeA === null && timeB !== null) {
        return 1;
      }

      const yearA = Number.parseInt(a.yearLabel, 10);
      const yearB = Number.parseInt(b.yearLabel, 10);

      if (!Number.isNaN(yearA) && !Number.isNaN(yearB) && yearA !== yearB) {
        return yearB - yearA;
      }

      return (a.navLabel || a.title || a.slug).localeCompare(b.navLabel || b.title || b.slug);
    });
}

function setTextOrHide(node, value) {
  if (!node) {
    return;
  }

  const nextValue = typeof value === "string" ? value.trim() : "";
  node.textContent = nextValue;
  node.hidden = !nextValue;
}

function getCompanyLinkLabel(url, index) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return `Visit ${hostname}`;
  } catch {
    return `Visit Company Website${index > 0 ? ` ${index + 1}` : ""}`;
  }
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
      const optimizedSrc = getOptimizedAssetPath(item.src, "optimized");
      return `
        <figure class="project-hero-slide${activeClass}">
          <img src="${optimizedSrc}" data-original-src="${item.src}" alt="${item.alt}" decoding="async" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
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
  bindImageFallbacks(projectHeroSlides);

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
    projectKickerNode.textContent = project.detailTitle || project.kicker || "Project";
  }

  if (projectMetaNode) {
    projectMetaNode.textContent = project.meta || project.client || "";
  }

  setTextOrHide(projectLeadNode, project.detailLead || project.copy);
  setTextOrHide(projectBodyNode, project.detailBody || project.secondary);
  setTextOrHide(projectSupportNode, project.detailSupport);

  if (projectHeroCopy) {
    projectHeroCopy.textContent = project.copy || project.detailLead || project.title;
  }

  renderHeroSlideshow(project);

  if (projectLiveLink) {
    if (project.liveUrl) {
      projectLiveLink.href = project.liveUrl;
      projectLiveLink.hidden = false;
    } else {
      projectLiveLink.removeAttribute("href");
      projectLiveLink.hidden = true;
    }
  }

  if (projectCompanyLinks) {
    const companyUrls = normalizeCompanyUrls(project);

    if (companyUrls.length) {
      projectCompanyLinks.innerHTML = companyUrls
        .map(
          (url, index) => `
            <a class="project-link" href="${url}" target="_blank" rel="noreferrer">
              ${getCompanyLinkLabel(url, index)}
            </a>
          `
        )
        .join("");
      projectCompanyLinks.hidden = false;
    } else {
      projectCompanyLinks.innerHTML = "";
      projectCompanyLinks.hidden = true;
    }
  }

  if (projectGallery) {
    const galleryItems = (project.gallery || [])
      .map((item) => {
        const optimizedSrc = getOptimizedAssetPath(item.src, "optimized");
        return `
          <figure>
            <img src="${optimizedSrc}" data-original-src="${item.src}" alt="${item.alt}" loading="lazy" decoding="async">
          </figure>
        `;
      })
      .join("");

    projectGallery.innerHTML = galleryItems;
    bindImageFallbacks(projectGallery);
  }

  if (projectList) {
    const items = getOrderedProjects()
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
  const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
  setProjectTheme(nextTheme);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleProjectMenu(false);
  }
});

window.addEventListener("beforeunload", stopHeroSlideshow);

async function initializeProjectPage() {
  if (window.PARTI_PROJECT_STORE?.ready?.then) {
    await window.PARTI_PROJECT_STORE.ready;
  }

  projectLibrary = window.PARTI_PROJECT_STORE?.getMergedProjects?.() || window.PARTI_PROJECTS || {};
  const currentProject = projectLibrary[currentProjectId] || projectLibrary[fallbackProjectId];
  renderProject(currentProject);
  setProjectTheme(getPreferredTheme(getCurrentTheme()));
}

initializeProjectPage();
