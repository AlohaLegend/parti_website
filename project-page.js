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
const projectHeroImage = document.querySelector("#project-hero-image");
const projectHeroCopy = document.querySelector("#project-hero-copy");
const projectLiveLink = document.querySelector("#project-live-link");
const projectList = document.querySelector("#project-list");
const projectGallery = document.querySelector("#project-gallery");

const projectLibrary = window.PARTI_PROJECTS || {};
const currentProjectId =
  new URLSearchParams(window.location.search).get("slug") ||
  document.body.dataset.project;
const fallbackProjectId = "marshalls-cbs";
const currentProject = projectLibrary[currentProjectId] || projectLibrary[fallbackProjectId];

function toggleProjectMenu(forceOpen) {
  const shouldOpen =
    typeof forceOpen === "boolean" ? forceOpen : !projectSiteMenu?.classList.contains("is-open");

  projectSiteMenu?.classList.toggle("is-open", shouldOpen);
  projectMenuButton?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

function setProjectTheme(theme) {
  projectPageShell?.setAttribute("data-theme", theme);
  if (projectThemeToggle) {
    projectThemeToggle.textContent = theme === "dark" ? "Light" : "Dark";
  }

  if (projectHeaderLogoImage) {
    projectHeaderLogoImage.src = theme === "dark" ? "assets/parti-logo-main.png" : "assets/parti-logo-purple.png";
  }
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

  if (projectHeroImage) {
    projectHeroImage.src = project.image;
    projectHeroImage.alt = project.imageAlt;
  }

  if (projectHeroCopy) {
    projectHeroCopy.textContent = project.copy;
  }

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

renderProject(currentProject);
setProjectTheme(projectPageShell?.getAttribute("data-theme") || "dark");
