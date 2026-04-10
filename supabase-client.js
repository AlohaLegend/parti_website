(function () {
  const config = window.PARTI_SUPABASE_CONFIG || {};
  const hasCredentials = Boolean(config.url && config.anonKey);
  const hasLibrary = Boolean(window.supabase?.createClient);

  if (!hasCredentials || !hasLibrary) {
    window.PARTI_SUPABASE = {
      client: null,
      config,
      isConfigured: false,
    };
    return;
  }

  const client = window.supabase.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  window.PARTI_SUPABASE = {
    client,
    config,
    isConfigured: true,
  };
})();
