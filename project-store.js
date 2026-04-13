(function () {
  const STORAGE_KEY = window.PARTI_ADMIN_STORAGE_KEY || "parti-admin-projects";
  const supabaseClient = window.PARTI_SUPABASE?.client;
  const supabaseConfig = window.PARTI_SUPABASE?.config || {};
  let publishedProjects = clone(window.PARTI_PROJECTS || {});

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeProject(project) {
    if (!project || typeof project !== "object" || !project.slug) {
      return null;
    }

    if (project.__deleted) {
      return {
        slug: project.slug,
        __deleted: true,
      };
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

      if (normalized?.__deleted) {
        delete merged[slug];
      } else if (normalized) {
        merged[normalized.slug] = normalized;
      }
    });

    return merged;
  }

  async function loadPublishedProjects() {
    try {
      let parsed = null;

      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from(supabaseConfig.contentTable || "site_content")
          .select("value")
          .eq("key", supabaseConfig.contentKey || "projects")
          .single();

        if (!error && data?.value && typeof data.value === "object") {
          parsed = data.value;
        }
      }

      if (!parsed) {
        const response = await window.fetch("content/projects.json", {
          cache: "no-store",
        });

        if (!response.ok) {
          return clone(publishedProjects);
        }

        parsed = await response.json();
      }

      if (!parsed || typeof parsed !== "object") {
        return clone(publishedProjects);
      }

      const normalizedProjects = clone(window.PARTI_PROJECTS || {});

      Object.entries(parsed).forEach(([slug, project]) => {
        const normalized = normalizeProject({
          ...(normalizedProjects[project?.slug || slug] || {}),
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

  async function savePublishedProjects(projects) {
    if (!supabaseClient) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabaseClient
      .from(supabaseConfig.contentTable || "site_content")
      .upsert(
        {
          key: supabaseConfig.contentKey || "projects",
          value: projects,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "key",
        }
      );

    if (error) {
      throw error;
    }

    publishedProjects = clone(projects);
    return clone(publishedProjects);
  }

  async function uploadProjectImage(file, slug) {
    if (!supabaseClient) {
      throw new Error("Supabase is not configured.");
    }

    const safeSlug = (slug || "draft")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "draft";
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/-+/g, "-");
    const path = `${safeSlug}/${Date.now()}-${safeName}`;
    const bucket = supabaseConfig.storageBucket || "project-images";

    const { error } = await supabaseClient.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || "";
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

    if (publishedProjects[slug]) {
      overrides[slug] = {
        slug,
        __deleted: true,
      };
    } else {
      delete overrides[slug];
    }

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
    savePublishedProjects,
    uploadProjectImage,
    storageKey: STORAGE_KEY,
    ready: loadPublishedProjects(),
  };
})();
