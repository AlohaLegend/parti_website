# PARTI Content Flow

This site now supports a Supabase-backed content path for real saved edits.

How it works:

1. The public site loads projects from Supabase when configured.
2. If Supabase is not configured or does not have content yet, the site falls back to `content/projects.json`.
3. If that file is empty, the site falls back again to the baked-in library in `project-data.js`.

Files:

- `project-data.js`: hardcoded fallback library
- `content/projects.json`: file fallback library
- `project-store.js`: shared loader/store
- `supabase/parti_setup.sql`: database + storage setup
- `supabase-config.js`: project URL and anon key placeholder

Setup checklist:

1. Create a Supabase project.
2. Run `supabase/parti_setup.sql`.
3. Add your project URL and anon key to `supabase-config.js`.
4. Enable Google auth in Supabase and use your `letsparti.co` Google Workspace.
5. Log into `admin.html` and save changes normally.
