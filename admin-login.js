const adminLoginShell = document.querySelector("#admin-login-shell");
const loginMenuButton = document.querySelector("#menu-button");
const loginSiteMenu = document.querySelector("#site-menu");
const loginThemeToggle = document.querySelector("#theme-toggle");
const loginHeaderLogoImage = document.querySelector("#header-logo-image");
const adminLoginButton = document.querySelector("#admin-login");
const adminEmailForm = document.querySelector("#admin-email-form");
const adminEmailInput = document.querySelector("#admin-email");
const adminEmailSubmit = document.querySelector("#admin-email-submit");
const adminAuthStatus = document.querySelector("#admin-auth-status");

const THEME_STORAGE_KEY = "parti-theme";
const AUTH_PENDING_STORAGE_KEY = "parti-auth-pending-until";
const CLEAN_LOGIN_URL = `${window.location.origin}${window.location.pathname}`;
const ALLOWED_ADMIN_DESTINATIONS = new Set([
  "admin.html",
  "operations-inquiries.html",
  "operations-workback.html",
  "operations-roles.html",
]);
const requestedDestination = new URLSearchParams(window.location.search).get("next")?.split("/").pop() || "admin.html";
const safeDestination = ALLOWED_ADMIN_DESTINATIONS.has(requestedDestination) ? requestedDestination : "admin.html";
const ADMIN_EDITOR_URL = `${window.location.origin}${window.location.pathname.replace("admin-login.html", safeDestination)}`;
const supabaseClient = window.PARTI_SUPABASE?.client;
const supabaseConfig = window.PARTI_SUPABASE?.config || window.PARTI_SUPABASE_CONFIG || {};
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

function getPreferredTheme(defaultTheme = "light") {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : defaultTheme;
}

function renderAuthStatus(message) {
  if (adminAuthStatus) {
    adminAuthStatus.textContent = message;
  }
}

function getSupabaseHost() {
  try {
    return new URL(supabaseConfig.url || "").host;
  } catch (_error) {
    return supabaseConfig.url || "the configured Supabase project";
  }
}

function renderLoginError(error) {
  const message = error?.message || String(error || "");

  if (/failed to fetch|network/i.test(message)) {
    renderAuthStatus(`Cannot reach ${getSupabaseHost()}. Check the Supabase Project URL and anon public key in supabase-config.js.`);
    return;
  }

  renderAuthStatus(message || "Login failed. Check the Supabase auth settings and try again.");
}

function renderLoginReason() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("reason") !== "not_admin") {
    return false;
  }

  const email = params.get("email") || "That email";
  renderAuthStatus(`${email} is signed in with Google, but is not on the PARTI admin allowlist yet.`);
  window.history.replaceState({}, document.title, CLEAN_LOGIN_URL);
  return true;
}

async function isApprovedAdmin() {
  if (!supabaseClient) {
    return false;
  }

  const { data, error } = await supabaseClient.rpc("is_parti_admin");

  if (error) {
    renderAuthStatus("Admin access check failed. Make sure the Supabase admin setup SQL has been run.");
    return false;
  }

  return data === true;
}

async function enforceAdminAccess(session) {
  const user = session?.user || null;

  if (!user) {
    return false;
  }

  if (await isApprovedAdmin()) {
    return true;
  }

  renderAuthStatus(`${user.email || "This email"} is not on the PARTI admin allowlist.`);
  await supabaseClient?.auth.signOut();
  return false;
}

async function startEmailLogin(event) {
  event.preventDefault();

  if (!isSupabaseConfigured || !supabaseClient) {
    renderAuthStatus("Supabase login is not configured yet.");
    return;
  }

  const email = adminEmailInput?.value.trim().toLowerCase() || "";

  if (!email) {
    renderAuthStatus("Enter an admin email address.");
    return;
  }

  if (adminEmailSubmit) {
    adminEmailSubmit.disabled = true;
    adminEmailSubmit.textContent = "Sending...";
  }

  window.sessionStorage.setItem(AUTH_PENDING_STORAGE_KEY, String(Date.now() + 60000));

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: ADMIN_EDITOR_URL,
      shouldCreateUser: true,
    },
  });

  if (adminEmailSubmit) {
    adminEmailSubmit.disabled = false;
    adminEmailSubmit.textContent = "Send Magic Link";
  }

  if (error) {
    renderLoginError(error);
    return;
  }

  renderAuthStatus("Check your email for the admin login link.");
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

  window.sessionStorage.setItem(AUTH_PENDING_STORAGE_KEY, String(Date.now() + 60000));

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: ADMIN_EDITOR_URL,
    },
  });

  if (adminLoginButton) {
    adminLoginButton.disabled = false;
    adminLoginButton.textContent = "Continue with Google";
  }

  if (error) {
    renderLoginError(error);
  }
}

async function initializeLoginPage() {
  setTheme(getPreferredTheme(adminLoginShell?.getAttribute("data-theme") || "light"));

  if (!isSupabaseConfigured || !supabaseClient) {
    renderAuthStatus("Supabase login is not configured yet. Add your project URL and anon key in supabase-config.js.");
    if (adminLoginButton) {
      adminLoginButton.disabled = true;
    }
    if (adminEmailSubmit) {
      adminEmailSubmit.disabled = true;
    }
    return;
  }

  const showedLoginReason = renderLoginReason();

  if (!showedLoginReason) {
    renderAuthStatus("Sign in with an approved admin email.");
  }

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    renderLoginError(error);
  }

  const session = data.session || null;
  const isAllowed = await enforceAdminAccess(session);

  if (isAllowed) {
    window.location.replace(ADMIN_EDITOR_URL);
    return;
  }

  if (!showedLoginReason && (window.location.search || window.location.hash)) {
    window.history.replaceState({}, document.title, CLEAN_LOGIN_URL);
  }

  supabaseClient.auth.onAuthStateChange(async (_event, nextSession) => {
    const allowed = await enforceAdminAccess(nextSession || null);

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
adminEmailForm?.addEventListener("submit", startEmailLogin);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleMenu(false);
  }
});

initializeLoginPage();
