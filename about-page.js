const aboutPageShell = document.querySelector("#about-page-shell");
const aboutMenuButton = document.querySelector("#menu-button");
const aboutSiteMenu = document.querySelector("#site-menu");
const aboutThemeToggle = document.querySelector("#theme-toggle");
const aboutHeaderLogoImage = document.querySelector("#header-logo-image");

function toggleAboutMenu(forceOpen) {
  const shouldOpen =
    typeof forceOpen === "boolean" ? forceOpen : !aboutSiteMenu?.classList.contains("is-open");

  aboutSiteMenu?.classList.toggle("is-open", shouldOpen);
  aboutMenuButton?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

function setAboutTheme(theme) {
  aboutPageShell?.setAttribute("data-theme", theme);

  if (aboutThemeToggle) {
    aboutThemeToggle.textContent = theme === "dark" ? "Light" : "Dark";
  }

  if (aboutHeaderLogoImage) {
    aboutHeaderLogoImage.src = theme === "dark" ? "assets/parti-logo-main.png" : "assets/parti-logo-purple.png";
  }
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

setAboutTheme(aboutPageShell?.getAttribute("data-theme") || "dark");
