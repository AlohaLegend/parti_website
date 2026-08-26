(function () {
  const supabaseClient = window.PARTI_SUPABASE?.client;
  const status = document.querySelector("[data-auth-status]");
  const content = document.querySelector("[data-operations-content]");
  const logout = document.querySelector("[data-operations-logout]");
  const loginUrl = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "admin-login.html")}`;

  function showStatus(message, tone = "") {
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  async function initialize() {
    if (!supabaseClient) {
      showStatus("The PARTI data connection is unavailable.", "error");
      return null;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data.session?.user) {
      window.location.replace(`${loginUrl}?next=${encodeURIComponent(window.location.pathname)}`);
      return null;
    }

    const { data: allowed, error: accessError } = await supabaseClient.rpc("is_parti_admin");
    if (accessError || !allowed) {
      await supabaseClient.auth.signOut();
      window.location.replace(`${loginUrl}?reason=not_admin`);
      return null;
    }

    showStatus(`Signed in as ${data.session.user.email}.`, "success");
    content?.removeAttribute("hidden");
    window.dispatchEvent(new CustomEvent("parti:operations-ready", {
      detail: { client: supabaseClient, session: data.session }
    }));
    return data.session;
  }

  logout?.addEventListener("click", async () => {
    await supabaseClient?.auth.signOut();
    window.location.replace(loginUrl);
  });

  window.PARTI_OPERATIONS = { client: supabaseClient, initialize, showStatus };
  initialize();
})();
