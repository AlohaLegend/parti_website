const adminLoginShell = document.querySelector("#admin-login-shell");
const loginMenuButton = document.querySelector("#menu-button");
const loginSiteMenu = document.querySelector("#site-menu");
const loginThemeToggle = document.querySelector("#theme-toggle");
const loginHeaderLogoImage = document.querySelector("#header-logo-image");
const adminLoginButton = document.querySelector("#admin-login");
const adminPasswordForm = document.querySelector("#admin-password-form");
const adminPasswordInput = document.querySelector("#admin-password");
const adminPasswordSubmit = document.querySelector("#admin-password-submit");
const adminAuthStatus = document.querySelector("#admin-auth-status");

const THEME_STORAGE_KEY = "parti-theme";
const ADMIN_EMAIL_DOMAIN = "@letsparti.co";
const CLEAN_LOGIN_URL = `${window.location.origin}${window.location.pathname}`;
const ADMIN_EDITOR_URL = `${window.location.origin}${window.location.pathname.replace("admin-login.html", "admin.html")}`;
const ADMIN_PASSWORD_CONFIG = window.PARTI_SUPABASE_CONFIG?.adminPassword || {};
const ADMIN_PASSWORD_SESSION_KEY = ADMIN_PASSWORD_CONFIG.sessionKey || "parti-admin-password-session";
const supabaseClient = window.PARTI_SUPABASE?.client;
const isSupabaseConfigured = Boolean(window.PARTI_SUPABASE?.isConfigured && supabaseClient);

function toggleMenu(forceOpen) {
  const shouldOpen =
    typeof forceOpen === "boolean" ? forceOpen : !loginSiteMenu?.classList.contains("is-open");

  loginSiteMenu?.classList.toggle("is-open", shouldOpen);
  loginMenuButton?.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("menu-open", shouldOpen);
}

function setTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", nextTheme);
  adminLoginShell?.setAttribute("data-theme", nextTheme);

  if (loginThemeToggle) {
    loginThemeToggle.textContent = nextTheme === "dark" ? "Light" : "Dark";
  }

  if (loginHeaderLogoImage) {
    loginHeaderLogoImage.src = "assets/parti-logo-purple.png";
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function getPreferredTheme(defaultTheme = "dark") {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : defaultTheme;
}

function renderAuthStatus(message) {
  if (adminAuthStatus) {
    adminAuthStatus.textContent = message;
  }
}

function isAllowedAdminUser(user) {
  const email = user?.email?.toLowerCase() || "";
  return email.endsWith(ADMIN_EMAIL_DOMAIN);
}

function isPasswordLoginEnabled() {
  return Boolean(ADMIN_PASSWORD_CONFIG.enabled && ADMIN_PASSWORD_CONFIG.sha256);
}

function isPasswordAuthenticated() {
  return isPasswordLoginEnabled() && window.localStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) === "true";
}

async function hashPassword(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
  await supabaseClient?.auth.signOut();
  return false;
}

async function startGoogleLogin() {
  if (!isSupabaseConfigured || !supabaseClient) {
    renderAuthStatus("Supabase login is not configured yet. Add your project URL and anon key in supabase-config.js.");
    return;
  }

  if (adminLoginButton) {
    adminLoginButton.disabled = true;
    adminLoginButton.textContent = "Redirecting...";
  }

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: CLEAN_LOGIN_URL,
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
  }
}

async function startPasswordLogin(event) {
  event.preventDefault();

  if (!isPasswordLoginEnabled()) {
    renderAuthStatus("Admin password login is not configured.");
    return;
  }

  const password = adminPasswordInput?.value || "";

  if (!password) {
    renderAuthStatus("Enter the admin password.");
    return;
  }

  if (adminPasswordSubmit) {
    adminPasswordSubmit.disabled = true;
    adminPasswordSubmit.textContent = "Checking...";
  }

  const nextHash = await hashPassword(password);

  if (nextHash === ADMIN_PASSWORD_CONFIG.sha256) {
    window.localStorage.setItem(ADMIN_PASSWORD_SESSION_KEY, "true");
    renderAuthStatus("Password accepted. Opening admin.");
    window.location.replace(ADMIN_EDITOR_URL);
    return;
  }

  if (adminPasswordSubmit) {
    adminPasswordSubmit.disabled = false;
    adminPasswordSubmit.textContent = "Enter Admin";
  }

  renderAuthStatus("That password did not match.");
}

async function initializeLoginPage() {
  if (window.location.search || window.location.hash) {
    window.history.replaceState({}, document.title, CLEAN_LOGIN_URL);
  }

  setTheme(getPreferredTheme(adminLoginShell?.getAttribute("data-theme") || "dark"));

  if (isPasswordAuthenticated()) {
    window.location.replace(ADMIN_EDITOR_URL);
    return;
  }

  if (!isSupabaseConfigured || !supabaseClient) {
    renderAuthStatus(
      isPasswordLoginEnabled()
        ? "Google login is unavailable right now. Use the admin password."
        : "Supabase login is not configured yet. Add your project URL and anon key in supabase-config.js."
    );
    if (adminLoginButton) {
      adminLoginButton.disabled = true;
    }
    return;
  }

  renderAuthStatus(`Sign in with Google using a ${ADMIN_EMAIL_DOMAIN} address, or use the admin password.`);

  const { data } = await supabaseClient.auth.getSession();
  const session = data.session || null;
  const isAllowed = await enforceAdminDomain(session);

  if (isAllowed) {
    window.location.replace(ADMIN_EDITOR_URL);
    return;
  }

  supabaseClient.auth.onAuthStateChange(async (_event, nextSession) => {
    const allowed = await enforceAdminDomain(nextSession || null);

    if (allowed) {
      window.location.replace(ADMIN_EDITOR_URL);
    }
  });
}

loginMenuButton?.addEventListener("click", () => {
  toggleMenu();
});

loginSiteMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    toggleMenu(false);
  });
});

loginThemeToggle?.addEventListener("click", () => {
  const nextTheme = adminLoginShell?.getAttribute("data-theme") === "dark" ? "light" : "dark";
  setTheme(nextTheme);
});

adminLoginButton?.addEventListener("click", startGoogleLogin);
adminPasswordForm?.addEventListener("submit", startPasswordLogin);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleMenu(false);
  }
});

initializeLoginPage();
