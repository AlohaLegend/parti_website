# PARTI Content Flow

This site is still a static GitHub Pages build, so browser edits do not publish on their own.

The new shared content layer is designed so project data can move toward a real saved workflow:

1. Edit projects in `admin.html`.
2. Export the full project library as JSON.
3. Replace the repo source of truth with that JSON in a future CMS/Git-backed flow.
4. Commit and deploy the updated content.

Current source files:

- `project-data.js`: published project library used by the live site today
- `project-store.js`: shared store that merges published data with local admin overrides

Recommended next step for real publishing:

- move the exported JSON into a committed `content/projects.json`
- update the site to read directly from that file
- wire the admin to create a commit or open a pull request when changes are approved
