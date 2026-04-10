const contactPageShell = document.querySelector("#contact-page-shell");
const contactMenuButton = document.querySelector("#menu-button");
const contactSiteMenu = document.querySelector("#site-menu");
const contactThemeToggle = document.querySelector("#theme-toggle");
const contactHeaderLogoImage = document.querySelector("#header-logo-image");
const THEME_STORAGE_KEY = "parti-theme";

function toggleContactMenu(forceOpen) {
  const shouldOpen =
    typeof forceOpen === "boolean" ? forceOpen : !contactSiteMenu?.classList.contains("is-open");

  contactSiteMenu?.classList.toggle("is-open", shouldOpen);
  contactMenuButton?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

function setContactTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";

  contactPageShell?.setAttribute("data-theme", nextTheme);

  if (contactThemeToggle) {
    contactThemeToggle.textContent = nextTheme === "dark" ? "Light" : "Dark";
  }

  if (contactHeaderLogoImage) {
    contactHeaderLogoImage.src = nextTheme === "dark" ? "assets/parti-logo-main.png" : "assets/parti-logo-purple.png";
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function getPreferredTheme(defaultTheme = "dark") {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : defaultTheme;
}

contactMenuButton?.addEventListener("click", () => {
  toggleContactMenu();
});

contactSiteMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    toggleContactMenu(false);
  });
});

contactThemeToggle?.addEventListener("click", () => {
  const nextTheme = contactPageShell?.getAttribute("data-theme") === "dark" ? "light" : "dark";
  setContactTheme(nextTheme);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleContactMenu(false);
  }
});

setContactTheme(getPreferredTheme(contactPageShell?.getAttribute("data-theme") || "dark"));
