const aboutPageShell = document.querySelector("#about-page-shell");
const aboutMenuButton = document.querySelector("#menu-button");
const aboutSiteMenu = document.querySelector("#site-menu");
const aboutThemeToggle = document.querySelector("#theme-toggle");
const aboutHeaderLogoImage = document.querySelector("#header-logo-image");
const THEME_STORAGE_KEY = "parti-theme";

function toggleAboutMenu(forceOpen) {
  const shouldOpen =
    typeof forceOpen === "boolean" ? forceOpen : !aboutSiteMenu?.classList.contains("is-open");

  aboutSiteMenu?.classList.toggle("is-open", shouldOpen);
  aboutMenuButton?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

function setAboutTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";

  aboutPageShell?.setAttribute("data-theme", nextTheme);

  if (aboutThemeToggle) {
    aboutThemeToggle.textContent = nextTheme === "dark" ? "Light" : "Dark";
  }

  if (aboutHeaderLogoImage) {
    aboutHeaderLogoImage.src = nextTheme === "dark" ? "assets/parti-logo-main.png" : "assets/parti-logo-purple.png";
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function getPreferredTheme(defaultTheme = "dark") {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : defaultTheme;
}

aboutMenuButton?.addEventListener("click", () => {
  toggleAboutMenu();
});

aboutSiteMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    toggleAboutMenu(false);
  });
});

aboutThemeToggle?.addEventListener("click", () => {
  const nextTheme = aboutPageShell?.getAttribute("data-theme") === "dark" ? "light" : "dark";
  setAboutTheme(nextTheme);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleAboutMenu(false);
  }
});

setAboutTheme(getPreferredTheme(aboutPageShell?.getAttribute("data-theme") || "dark"));
