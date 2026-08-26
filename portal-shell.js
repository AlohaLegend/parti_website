(function () {
  const THEME_KEY = "parti-theme";
  const shell = document.querySelector("[data-portal-shell]");
  const toggle = document.querySelector("[data-theme-toggle]");

  function applyTheme(theme) {
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    shell?.setAttribute("data-theme", next);
    if (toggle) toggle.textContent = next === "dark" ? "Light" : "Dark";
    window.localStorage.setItem(THEME_KEY, next);
  }

  applyTheme(window.localStorage.getItem(THEME_KEY) || "light");
  toggle?.addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  const reveals = [...document.querySelectorAll("[data-reveal]")];
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    reveals.forEach((element) => observer.observe(element));
  } else {
    reveals.forEach((element) => element.classList.add("is-visible"));
  }
})();
