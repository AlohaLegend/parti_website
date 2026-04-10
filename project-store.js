(function () {
  const STORAGE_KEY = window.PARTI_ADMIN_STORAGE_KEY || "parti-admin-projects";
  let publishedProjects = clone(window.PARTI_PROJECTS || {});

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeProject(project) {
    if (!project || typeof project !== "object" || !project.slug) {
      return null;
    }

    const normalized = {
      ...project,
      pageUrl: `project.html?slug=${project.slug}`,
    };

    if (!Array.isArray(normalized.gallery) || !normalized.gallery.length) {
      if (normalized.image) {
        normalized.gallery = [
          {
            src: normalized.image,
            alt: normalized.imageAlt || `${normalized.title || normalized.slug} image`,
          },
        ];
      } else {
        normalized.gallery = [];
      }
    }

    return normalized;
  }

  function getBaseProjects() {
    return clone(publishedProjects);
  }

  function readStoredOverrides() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.warn("Unable to read PARTI admin overrides.", error);
      return {};
    }
  }

  function writeStoredOverrides(overrides) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides, null, 2));
  }

  function getMergedProjects() {
    const merged = getBaseProjects();
    const overrides = readStoredOverrides();

    Object.entries(overrides).forEach(([slug, project]) => {
      const normalized = normalizeProject({
        ...project,
        slug: project?.slug || slug,
      });

      if (normalized) {
        merged[normalized.slug] = normalized;
      }
    });

    return merged;
  }

  async function loadPublishedProjects() {
    try {
      const response = await window.fetch("content/projects.json", {
        cache: "no-store",
      });

      if (!response.ok) {
        return clone(publishedProjects);
      }

      const parsed = await response.json();

      if (!parsed || typeof parsed !== "object") {
        return clone(publishedProjects);
      }

      const normalizedProjects = {};

      Object.entries(parsed).forEach(([slug, project]) => {
        const normalized = normalizeProject({
          ...project,
          slug: project?.slug || slug,
        });

        if (normalized) {
          normalizedProjects[normalized.slug] = normalized;
        }
      });

      if (Object.keys(normalizedProjects).length) {
        publishedProjects = normalizedProjects;
      }
    } catch (error) {
      console.warn("Unable to load published PARTI content JSON.", error);
    }

    return clone(publishedProjects);
  }

  function saveProject(project) {
    const normalized = normalizeProject(project);

    if (!normalized) {
      return null;
    }

    const overrides = readStoredOverrides();
    overrides[normalized.slug] = normalized;
    writeStoredOverrides(overrides);

    return normalized;
  }

  function removeProject(slug) {
    const overrides = readStoredOverrides();
    delete overrides[slug];
    writeStoredOverrides(overrides);
  }

  function resetProjects() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function exportProjectsJson() {
    return JSON.stringify(getMergedProjects(), null, 2);
  }

  function importProjectsJson(raw, options = {}) {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid project payload.");
    }

    const nextOverrides = options.replace ? {} : readStoredOverrides();

    Object.entries(parsed).forEach(([slug, project]) => {
      const normalized = normalizeProject({
        ...project,
        slug: project?.slug || slug,
      });

      if (normalized) {
        nextOverrides[normalized.slug] = normalized;
      }
    });

    writeStoredOverrides(nextOverrides);
    return getMergedProjects();
  }

  window.PARTI_PROJECT_STORE = {
    clone,
    normalizeProject,
    getBaseProjects,
    getPublishedProjects: getBaseProjects,
    getStoredOverrides: readStoredOverrides,
    getMergedProjects,
    saveProject,
    removeProject,
    resetProjects,
    exportProjectsJson,
    importProjectsJson,
    storageKey: STORAGE_KEY,
    ready: loadPublishedProjects(),
  };
})();
