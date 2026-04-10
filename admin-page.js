const adminPageShell = document.querySelector("#admin-page-shell");
const adminMenuButton = document.querySelector("#menu-button");
const adminSiteMenu = document.querySelector("#site-menu");
const adminThemeToggle = document.querySelector("#theme-toggle");
const adminHeaderLogoImage = document.querySelector("#header-logo-image");
const adminProjectList = document.querySelector("#admin-project-list");
const adminForm = document.querySelector("#admin-form");
const adminStatus = document.querySelector("#admin-status");
const adminNewProjectButton = document.querySelector("#admin-new-project");
const adminExportProjectsButton = document.querySelector("#admin-export-projects");
const adminResetProjectsButton = document.querySelector("#admin-reset-projects");
const adminPreviewProjectButton = document.querySelector("#admin-preview-project");
const adminRevertProjectButton = document.querySelector("#admin-revert-project");
const adminGalleryList = document.querySelector("#admin-gallery-list");
const adminGalleryUploadInput = document.querySelector("#admin-gallery-upload");
const adminAuthForm = document.querySelector("#admin-auth-form");
const adminLoginButton = document.querySelector("#admin-login");
const adminLogoutButton = document.querySelector("#admin-logout");
const adminAuthStatus = document.querySelector("#admin-auth-status");

const THEME_STORAGE_KEY = "parti-theme";
const ADMIN_EMAIL_DOMAIN = "@letsparti.co";
const projectStore = window.PARTI_PROJECT_STORE;
const supabaseClient = window.PARTI_SUPABASE?.client;
const isSupabaseConfigured = Boolean(window.PARTI_SUPABASE?.isConfigured && supabaseClient);
const baseProjects = projectStore?.getBaseProjects() || window.PARTI_BASE_PROJECTS || {};

let workingProjects = projectStore?.getMergedProjects() || JSON.parse(JSON.stringify(window.PARTI_PROJECTS || {}));
let selectedProjectSlug = "";
let currentGalleryItems = [];
let draggedGalleryIndex = null;
let currentSession = null;

const adminFields = {
  slug: document.querySelector("#admin-slug"),
  title: document.querySelector("#admin-title"),
  navLabel: document.querySelector("#admin-nav-label"),
  yearLabel: document.querySelector("#admin-year-label"),
  kicker: document.querySelector("#admin-kicker"),
  client: document.querySelector("#admin-client"),
  meta: document.querySelector("#admin-meta"),
  image: document.querySelector("#admin-image"),
  imageAlt: document.querySelector("#admin-image-alt"),
  liveUrl: document.querySelector("#admin-live-url"),
  showInCollage: document.querySelector("#admin-show-in-collage"),
  copy: document.querySelector("#admin-copy"),
  secondary: document.querySelector("#admin-secondary"),
  detailTitle: document.querySelector("#admin-detail-title"),
  detailLead: document.querySelector("#admin-detail-lead"),
  detailBody: document.querySelector("#admin-detail-body"),
  detailSupport: document.querySelector("#admin-detail-support")
};

function toggleAdminMenu(forceOpen) {
  const shouldOpen =
    typeof forceOpen === "boolean" ? forceOpen : !adminSiteMenu?.classList.contains("is-open");

  adminSiteMenu?.classList.toggle("is-open", shouldOpen);
  adminMenuButton?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

function setAdminTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";

  adminPageShell?.setAttribute("data-theme", nextTheme);

  if (adminThemeToggle) {
    adminThemeToggle.textContent = nextTheme === "dark" ? "Light" : "Dark";
  }

  if (adminHeaderLogoImage) {
    adminHeaderLogoImage.src = nextTheme === "dark" ? "assets/parti-logo-main.png" : "assets/parti-logo-purple.png";
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function getPreferredTheme(defaultTheme = "dark") {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : defaultTheme;
}

function isAuthenticated() {
  return Boolean(currentSession?.user);
}

function isAllowedAdminUser(user) {
  const email = user?.email?.toLowerCase() || "";
  return email.endsWith(ADMIN_EMAIL_DOMAIN);
}

function syncEditorAccess() {
  const canEdit = isAuthenticated();
  const controlledButtons = [
    adminNewProjectButton,
    adminExportProjectsButton,
    adminResetProjectsButton,
    adminPreviewProjectButton,
    adminRevertProjectButton,
  ];

  controlledButtons.forEach((button) => {
    if (button) {
      button.disabled = !canEdit;
    }
  });

  adminForm?.classList.toggle("is-disabled", !canEdit);
  adminForm?.querySelectorAll("input, textarea, button").forEach((field) => {
    if (field === adminPreviewProjectButton || field === adminRevertProjectButton) {
      field.disabled = !canEdit;
      return;
    }

    if (field.id === "admin-gallery-upload") {
      field.disabled = !canEdit;
      return;
    }

    field.disabled = !canEdit;
  });

  adminProjectList?.closest(".admin-panel")?.classList.toggle("is-disabled", !canEdit);
}

function renderAuthStatus(message) {
  if (adminAuthStatus) {
    adminAuthStatus.textContent = message;
  }
}

function updateAuthUi() {
  if (!isSupabaseConfigured) {
    renderAuthStatus("Supabase login is not configured yet. Add your project URL and anon key in supabase-config.js.");
    if (adminLoginButton) {
      adminLoginButton.disabled = true;
    }
    if (adminLogoutButton) {
      adminLogoutButton.disabled = true;
    }
    syncEditorAccess();
    return;
  }

  if (isAuthenticated()) {
    renderAuthStatus(`Signed in as ${currentSession.user.email}.`);
    if (adminLoginButton) {
      adminLoginButton.disabled = false;
    }
    if (adminLogoutButton) {
      adminLogoutButton.disabled = false;
    }
  } else {
    renderAuthStatus(`Log in with Google using a ${ADMIN_EMAIL_DOMAIN} address to edit and publish site content.`);
    if (adminLoginButton) {
      adminLoginButton.disabled = false;
    }
    if (adminLogoutButton) {
      adminLogoutButton.disabled = true;
    }
  }

  syncEditorAccess();
}

async function enforceAdminDomain(session) {
  const user = session?.user || null;

  if (!user) {
    return false;
  }

  if (isAllowedAdminUser(user)) {
    return true;
  }

  renderAuthStatus(`Access is limited to ${ADMIN_EMAIL_DOMAIN} Google accounts.`);

  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }

  currentSession = null;
  updateAuthUi();
  return false;
}

async function pushWorkingProjectsToSupabase() {
  if (!isAuthenticated() || !projectStore?.savePublishedProjects) {
    return false;
  }

  await projectStore.savePublishedProjects(workingProjects);
  projectStore.resetProjects?.();
  workingProjects = projectStore.getMergedProjects();
  return true;
}

function getStoredAdminProjects() {
  return projectStore?.getStoredOverrides() || {};
}

function saveStoredAdminProjects(projects) {
  window.localStorage.setItem(projectStore?.storageKey || "parti-admin-projects", JSON.stringify(projects, null, 2));
}

function getLocalOnlyProjects() {
  return Object.keys(getStoredAdminProjects()).length;
}

function normalizeGalleryItems(gallery = []) {
  return (gallery || []).map((item) => ({
    src: item?.src || "",
    alt: item?.alt || item?.src || ""
  }));
}

function getImageLabel(src = "", index = 0) {
  if (!src) {
    return `Image ${index + 1}`;
  }

  if (src.startsWith("data:")) {
    return `Upload ${index + 1}`;
  }

  const segments = src.split("/");
  return segments[segments.length - 1] || `Image ${index + 1}`;
}

function syncLeadImageFromGallery() {
  const firstImage = currentGalleryItems.find((item) => item.src);

  if (!adminFields.image.value.trim() || !currentGalleryItems.some((item) => item.src === adminFields.image.value.trim())) {
    adminFields.image.value = firstImage?.src || "";
  }

  if (!adminFields.imageAlt.value.trim() || adminFields.imageAlt.value.trim() === adminFields.image.value.trim()) {
    adminFields.imageAlt.value = firstImage?.alt || adminFields.image.value.trim();
  }
}

function readFilesAsGalleryItems(files) {
  const fileList = Array.from(files || []).filter((file) => file.type.startsWith("image/"));

  return Promise.all(
    fileList.map((file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve({
            src: typeof reader.result === "string" ? reader.result : "",
            alt: file.name.replace(/\.[^.]+$/, "")
          });
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      })
    )
  );
}

async function addGalleryFiles(files) {
  try {
    const fileList = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    let items = [];

    if (isAuthenticated() && projectStore?.uploadProjectImage) {
      items = await Promise.all(
        fileList.map(async (file) => {
          const src = await projectStore.uploadProjectImage(file, adminFields.slug.value.trim() || "draft");
          return {
            src,
            alt: file.name.replace(/\.[^.]+$/, ""),
          };
        })
      );
    } else {
      items = await readFilesAsGalleryItems(fileList);
    }

    if (!items.length) {
      renderStatus("Only image files can be added to the gallery.");
      return;
    }

    currentGalleryItems.push(...items);
    syncLeadImageFromGallery();
    renderGalleryEditor();
    renderStatus(`Added ${items.length} image${items.length === 1 ? "" : "s"} to the gallery.`);
  } catch (error) {
    console.warn("Unable to read gallery files.", error);
    renderStatus("One or more images could not be added.");
  }
}

function renderGalleryEditor() {
  if (!adminGalleryList) {
    return;
  }

  const galleryTiles = currentGalleryItems
    .map((item, index) => {
      const previewMarkup = item.src
        ? `<img src="${item.src}" alt="${item.alt || `Gallery image ${index + 1}`}">`
        : `<div class="admin-gallery-placeholder">No Image</div>`;

      return `
        <article class="admin-gallery-tile" data-gallery-index="${index}" draggable="true">
          <div class="admin-gallery-preview">
            ${previewMarkup}
            <button class="admin-gallery-delete" type="button" aria-label="Delete image ${index + 1}">×</button>
            <div class="admin-gallery-overlay">
              <p class="admin-gallery-label">${getImageLabel(item.src, index)}</p>
              <label class="admin-gallery-alt-label">
                <span>Alt Text</span>
                <input class="admin-gallery-alt" type="text" value="${item.alt}">
              </label>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  adminGalleryList.innerHTML = `
    <button class="admin-gallery-add-tile" id="admin-gallery-add-tile" type="button">
      <span>Add Photos</span>
      <small>Drop images here or choose from computer</small>
    </button>
    ${galleryTiles}
  `;

  const addTile = document.querySelector("#admin-gallery-add-tile");

  addTile?.addEventListener("click", () => {
    adminGalleryUploadInput?.click();
  });

  addTile?.addEventListener("dragover", (event) => {
    event.preventDefault();
    addTile.classList.add("is-dragging");
  });

  addTile?.addEventListener("dragleave", () => {
    addTile.classList.remove("is-dragging");
  });

  addTile?.addEventListener("drop", (event) => {
    event.preventDefault();
    addTile.classList.remove("is-dragging");
    addGalleryFiles(event.dataTransfer?.files);
  });

  adminGalleryList.querySelectorAll(".admin-gallery-tile").forEach((itemNode) => {
    const index = Number(itemNode.dataset.galleryIndex || "0");
    const altInput = itemNode.querySelector(".admin-gallery-alt");
    const deleteButton = itemNode.querySelector(".admin-gallery-delete");
    const previewImage = itemNode.querySelector("img");

    itemNode.addEventListener("dragstart", (event) => {
      draggedGalleryIndex = index;
      itemNode.classList.add("is-dragging");

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
      }
    });

    itemNode.addEventListener("dragover", (event) => {
      event.preventDefault();

      if (draggedGalleryIndex === null || draggedGalleryIndex === index) {
        return;
      }

      itemNode.classList.add("is-drop-target");

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    });

    itemNode.addEventListener("dragleave", (event) => {
      const nextTarget = event.relatedTarget;

      if (!(nextTarget instanceof Node) || !itemNode.contains(nextTarget)) {
        itemNode.classList.remove("is-drop-target");
      }
    });

    itemNode.addEventListener("drop", (event) => {
      event.preventDefault();
      itemNode.classList.remove("is-drop-target");

      if (draggedGalleryIndex === null || draggedGalleryIndex === index) {
        return;
      }

      const [movedItem] = currentGalleryItems.splice(draggedGalleryIndex, 1);
      currentGalleryItems.splice(index, 0, movedItem);
      draggedGalleryIndex = null;
      syncLeadImageFromGallery();
      renderGalleryEditor();
      renderStatus("Reordered gallery images.");
    });

    itemNode.addEventListener("dragend", () => {
      draggedGalleryIndex = null;
      adminGalleryList
        .querySelectorAll(".admin-gallery-tile")
        .forEach((tile) => tile.classList.remove("is-dragging", "is-drop-target"));
    });

    altInput?.addEventListener("input", () => {
      currentGalleryItems[index].alt = altInput.value.trim();
      syncLeadImageFromGallery();

      if (previewImage) {
        previewImage.alt = currentGalleryItems[index].alt || `Gallery image ${index + 1}`;
      }
    });

    deleteButton?.addEventListener("click", () => {
      currentGalleryItems.splice(index, 1);
      syncLeadImageFromGallery();
      renderGalleryEditor();
    });
  });
}

function createBlankProject() {
  return {
    slug: "",
    title: "",
    navLabel: "",
    yearLabel: "",
    kicker: "completed project",
    client: "",
    meta: "",
    copy: "",
    secondary: "",
    detailTitle: "",
    detailLead: "",
    detailBody: "",
    detailSupport: "",
    image: "",
    imageAlt: "",
    liveUrl: "",
    gallery: [],
    showInCollage: true,
    pageUrl: ""
  };
}

function renderStatus(message) {
  if (adminStatus) {
    adminStatus.textContent = message;
  }
}

function renderProjectList() {
  if (!adminProjectList) {
    return;
  }

  adminProjectList.innerHTML = Object.values(workingProjects)
    .sort((a, b) => (b.yearLabel || "").localeCompare(a.yearLabel || "") || a.navLabel.localeCompare(b.navLabel))
    .map((project) => {
      const isActive = project.slug === selectedProjectSlug ? "is-active" : "";
      const isLocal = !baseProjects[project.slug] ? "admin-project-item-local" : "";
      return `
        <button class="admin-project-item ${isActive} ${isLocal}" type="button" data-project-slug="${project.slug}">
          <span>${project.navLabel || project.title || project.slug}</span>
          <span>${project.yearLabel || "draft"}</span>
        </button>
      `;
    })
    .join("");

  adminProjectList.querySelectorAll("[data-project-slug]").forEach((button) => {
    button.addEventListener("click", () => {
      selectProject(button.dataset.projectSlug);
    });
  });
}

function populateForm(project) {
  const nextProject = project || createBlankProject();

  adminFields.slug.value = nextProject.slug || "";
  adminFields.title.value = nextProject.title || "";
  adminFields.navLabel.value = nextProject.navLabel || "";
  adminFields.yearLabel.value = nextProject.yearLabel || "";
  adminFields.kicker.value = nextProject.kicker || "";
  adminFields.client.value = nextProject.client || "";
  adminFields.meta.value = nextProject.meta || "";
  adminFields.image.value = nextProject.image || "";
  adminFields.imageAlt.value = nextProject.imageAlt || "";
  adminFields.liveUrl.value = nextProject.liveUrl || "";
  adminFields.showInCollage.checked = nextProject.showInCollage !== false;
  adminFields.copy.value = nextProject.copy || "";
  adminFields.secondary.value = nextProject.secondary || "";
  adminFields.detailTitle.value = nextProject.detailTitle || "";
  adminFields.detailLead.value = nextProject.detailLead || "";
  adminFields.detailBody.value = nextProject.detailBody || "";
  adminFields.detailSupport.value = nextProject.detailSupport || "";
  currentGalleryItems = normalizeGalleryItems(nextProject.gallery || []);
  syncLeadImageFromGallery();
  renderGalleryEditor();
}

function selectProject(slug) {
  selectedProjectSlug = slug;
  populateForm(workingProjects[slug]);
  renderProjectList();
  renderStatus(`Editing ${slug}. Logged-in changes save into the live content store.`);
}

function collectFormProject() {
  const slug = adminFields.slug.value.trim();
  const image = adminFields.image.value.trim();
  const gallery = currentGalleryItems
    .map((item) => ({
      src: (item.src || "").trim(),
      alt: (item.alt || item.src || "").trim()
    }))
    .filter((item) => item.src);

  return {
    slug,
    title: adminFields.title.value.trim(),
    navLabel: adminFields.navLabel.value.trim(),
    yearLabel: adminFields.yearLabel.value.trim(),
    kicker: adminFields.kicker.value.trim(),
    client: adminFields.client.value.trim(),
    meta: adminFields.meta.value.trim(),
    image,
    imageAlt: adminFields.imageAlt.value.trim(),
    liveUrl: adminFields.liveUrl.value.trim(),
    showInCollage: adminFields.showInCollage.checked,
    copy: adminFields.copy.value.trim(),
    secondary: adminFields.secondary.value.trim(),
    detailTitle: adminFields.detailTitle.value.trim(),
    detailLead: adminFields.detailLead.value.trim(),
    detailBody: adminFields.detailBody.value.trim(),
    detailSupport: adminFields.detailSupport.value.trim(),
    gallery: gallery.length ? gallery : (image ? [{ src: image, alt: adminFields.imageAlt.value.trim() || image }] : []),
    pageUrl: slug ? `project.html?slug=${slug}` : ""
  };
}

async function saveProject(project) {
  const normalizedProject = projectStore?.saveProject(project) || project;
  workingProjects[normalizedProject.slug] = normalizedProject;

  try {
    if (await pushWorkingProjectsToSupabase()) {
      renderProjectList();
    }
  } catch (error) {
    console.warn("Unable to save project to Supabase.", error);
    renderStatus(`Saved locally, but the shared content update failed: ${error.message}`);
  }

  return normalizedProject;
}

function revertProject(slug) {
  if (projectStore?.removeProject) {
    projectStore.removeProject(slug);
  } else {
    const storedProjects = getStoredAdminProjects();
    delete storedProjects[slug];
    saveStoredAdminProjects(storedProjects);
  }

  if (baseProjects[slug]) {
    workingProjects[slug] = JSON.parse(JSON.stringify(baseProjects[slug]));
    selectProject(slug);
    renderStatus(`Reverted ${slug} back to the published project data.`);
    return;
  }

  delete workingProjects[slug];
  const nextSlug = Object.keys(workingProjects)[0] || "";
  selectedProjectSlug = nextSlug;
  populateForm(nextSlug ? workingProjects[nextSlug] : createBlankProject());
  renderProjectList();
  renderStatus(`Removed local-only project ${slug}.`);
}

function exportProjects() {
  const payload = projectStore?.exportProjectsJson() || JSON.stringify(getStoredAdminProjects(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "parti-admin-projects.json";
  link.click();
  URL.revokeObjectURL(url);
  renderStatus("Exported the full site project library as JSON.");
}

adminMenuButton?.addEventListener("click", () => {
  toggleAdminMenu();
});

adminSiteMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    toggleAdminMenu(false);
  });
});

adminThemeToggle?.addEventListener("click", () => {
  const nextTheme = adminPageShell?.getAttribute("data-theme") === "dark" ? "light" : "dark";
  setAdminTheme(nextTheme);
});

adminNewProjectButton?.addEventListener("click", () => {
  selectedProjectSlug = "";
  populateForm(createBlankProject());
  renderProjectList();
  renderStatus("Started a new draft project. Add a unique slug before saving.");
});

adminExportProjectsButton?.addEventListener("click", exportProjects);

adminGalleryUploadInput?.addEventListener("change", async () => {
  await addGalleryFiles(adminGalleryUploadInput.files);
  adminGalleryUploadInput.value = "";
});

adminResetProjectsButton?.addEventListener("click", () => {
  if (projectStore?.resetProjects) {
    projectStore.resetProjects();
  } else {
    window.localStorage.removeItem(projectStore?.storageKey || "parti-admin-projects");
  }
  workingProjects = projectStore?.getMergedProjects() || JSON.parse(JSON.stringify(baseProjects));
  const firstSlug = Object.keys(workingProjects)[0] || "";
  selectedProjectSlug = firstSlug;
  populateForm(firstSlug ? workingProjects[firstSlug] : createBlankProject());
  renderProjectList();
  renderStatus("Cleared local draft edits and restored the published project library.");
});

adminPreviewProjectButton?.addEventListener("click", async () => {
  const project = collectFormProject();

  if (!project.slug) {
    renderStatus("Add a slug before previewing the project page.");
    return;
  }

  await saveProject(project);
  window.open(`project.html?slug=${project.slug}`, "_blank", "noopener");
  selectProject(project.slug);
  renderStatus(`Opened preview for ${project.slug}.`);
});

adminRevertProjectButton?.addEventListener("click", () => {
  const slug = adminFields.slug.value.trim();

  if (!slug) {
    renderStatus("No project selected to revert.");
    return;
  }

  revertProject(slug);
});

adminForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const project = collectFormProject();

  if (!project.slug || !project.title || !project.navLabel) {
    renderStatus("Slug, title, and manifest label are required before saving.");
    return;
  }

  const savedProject = await saveProject(project);
  selectedProjectSlug = savedProject.slug;
  renderProjectList();
  renderStatus(
    isAuthenticated()
      ? `Saved ${savedProject.slug} into the live content store.`
      : `Saved ${savedProject.slug} into the local project store. Log in to publish changes for everyone.`
  );
});

adminLoginButton?.addEventListener("click", async () => {
  if (!isSupabaseConfigured || !supabaseClient) {
    renderAuthStatus("Supabase login is not configured yet.");
    return;
  }

  if (adminLoginButton) {
    adminLoginButton.disabled = true;
    adminLoginButton.textContent = "Redirecting...";
  }

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.href,
      queryParams: {
        hd: "letsparti.co",
      },
    },
  });

  if (adminLoginButton) {
    adminLoginButton.disabled = false;
    adminLoginButton.textContent = "Continue with Google";
  }

  if (error) {
    renderAuthStatus(error.message);
    return;
  }
});

adminLogoutButton?.addEventListener("click", async () => {
  if (!supabaseClient) {
    return;
  }

  await supabaseClient.auth.signOut();
  currentSession = null;
  updateAuthUi();
  renderStatus("Logged out. The editor is now read-only until you sign back in.");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleAdminMenu(false);
  }
});

function initializeAdminPage() {
  workingProjects = projectStore?.getMergedProjects() || JSON.parse(JSON.stringify(window.PARTI_PROJECTS || {}));

  const initialSlug = Object.keys(workingProjects)[0] || "";
  selectedProjectSlug = initialSlug;
  populateForm(initialSlug ? workingProjects[initialSlug] : createBlankProject());
  renderProjectList();
  renderStatus(
    getLocalOnlyProjects()
      ? `Loaded ${getLocalOnlyProjects()} local project override${getLocalOnlyProjects() === 1 ? "" : "s"} from the shared admin store.`
      : "No local overrides yet. Sign in to save edits into the shared content system."
  );

  if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data }) => {
      currentSession = data.session || null;
      enforceAdminDomain(currentSession).then((isAllowed) => {
        if (isAllowed || !currentSession) {
          updateAuthUi();
        }
      });
    });

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      currentSession = session || null;
      const isAllowed = await enforceAdminDomain(currentSession);

      if (isAllowed) {
        renderStatus("Logged in. Admin edits will now save into the live content store.");
      }

      if (isAllowed || !currentSession) {
        updateAuthUi();
      }
    });
  } else {
    updateAuthUi();
  }

  setAdminTheme(getPreferredTheme(adminPageShell?.getAttribute("data-theme") || "dark"));
}

if (projectStore?.ready?.then) {
  projectStore.ready.finally(initializeAdminPage);
} else {
  initializeAdminPage();
}
