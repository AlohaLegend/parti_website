(() => {
  const TRANSITIONING_CLASS = "is-page-transitioning";
  const TRANSITION_DELAY = 280;
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
    document.body.classList.add(TRANSITIONING_CLASS);
    window.setTimeout(() => {
      window.location.href = url;
    }, TRANSITION_DELAY);
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
    const link = event.target.closest("a[href]");

    if (!link || isModifiedClick(event) || !isInternalPageLink(link)) {
      return;
    }

    event.preventDefault();
    navigateWithTransition(link.href);
  });

  window.addEventListener("pageshow", () => {
    document.body.classList.remove(TRANSITIONING_CLASS);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registerPageReveals, { once: true });
  } else {
    registerPageReveals();
  }
})();
