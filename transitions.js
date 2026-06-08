(() => {
  const TRANSITIONING_CLASS = "is-page-transitioning";
  const PREPARING_CLASS = "is-page-preparing";
  const TRANSITION_STORAGE_KEY = "parti-page-transition";
  const TRANSITION_DELAY = 120;
  const ENTER_DELAY = 220;
  let revealObserver = null;

  function isModifiedClick(event) {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
  }

  function isInternalPageLink(link) {
    if (!link || link.target === "_blank" || link.hasAttribute("download")) {
      return false;
    }

    const href = link.getAttribute("href") || "";

    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      return false;
    }

    let url;

    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return false;
    }

    if (url.origin !== window.location.origin) {
      return false;
    }

    const currentPath = `${window.location.pathname}${window.location.search}`;
    const nextPath = `${url.pathname}${url.search}`;

    return currentPath !== nextPath;
  }

  function navigateWithTransition(url) {
    window.sessionStorage.setItem(TRANSITION_STORAGE_KEY, "incoming");
    document.body.classList.add(TRANSITIONING_CLASS);
    window.setTimeout(() => {
      window.location.href = url;
    }, TRANSITION_DELAY);
  }

  function clearIncomingTransition() {
    if (!document.documentElement.classList.contains(PREPARING_CLASS)) {
      window.sessionStorage.removeItem(TRANSITION_STORAGE_KEY);
      return;
    }

    window.setTimeout(() => {
      document.documentElement.classList.remove(PREPARING_CLASS);
      window.sessionStorage.removeItem(TRANSITION_STORAGE_KEY);
    }, ENTER_DELAY);
  }

  function initializeRevealObserver() {
    revealObserver?.disconnect();

    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px",
      }
    );
  }

  function registerPageReveals() {
    initializeRevealObserver();

    const targets = [
      document.querySelector(".site-header"),
      document.querySelector(".project-hero-card"),
      document.querySelector(".project-list"),
      ...Array.from(document.querySelectorAll(".project-block")),
      ...Array.from(document.querySelectorAll(".project-gallery figure")),
      ...Array.from(document.querySelectorAll(".about-columns > *")),
      ...Array.from(document.querySelectorAll(".contact-columns > *")),
      ...Array.from(document.querySelectorAll(".admin-panel")),
      document.querySelector(".admin-login-card"),
      document.querySelector(".info-strip"),
      document.querySelector(".site-footer"),
    ].filter(Boolean);

    targets.forEach((target, index) => {
      if (!target.classList.contains("reveal-item")) {
        target.classList.add("reveal-item");
      }

      if (!target.style.getPropertyValue("--reveal-delay")) {
        target.style.setProperty("--reveal-delay", `${Math.min(index, 8) * 70}ms`);
      }

      revealObserver?.observe(target);
    });
  }

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const link = event.target.closest("a[href]");

    if (!link || isModifiedClick(event) || !isInternalPageLink(link)) {
      return;
    }

    event.preventDefault();
    navigateWithTransition(link.href);
  });

  window.addEventListener("pageshow", () => {
    document.body.classList.remove(TRANSITIONING_CLASS);
    window.requestAnimationFrame(clearIncomingTransition);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registerPageReveals, { once: true });
  } else {
    registerPageReveals();
  }
})();
