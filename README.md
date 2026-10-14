# PARTI Website

New portfolio-style website build for PARTI, based on the mockup deck and expanded with public assets and project content from:

- [letsparti.co](https://www.letsparti.co/)
- [instagram.com/letsparti.co](https://www.instagram.com/letsparti.co/)

## What is included

- Minimal portfolio homepage with floating collage and works table
- Local case-study pages for legacy and recent projects
- Shared project data layer for homepage and project pages
- Publicly sourced logos, project imagery, and copy pulled into the local build
- Unlinked client inquiry and unified people intake workflows with protected internal review desks

## Local structure

- `index.html`: homepage
- `project.html`: reusable recent-project template
- `bytedance.html`, `hwood.html`, `ciroc.html`, `club-renaissance.html`, `artist-lounge.html`, `houseplant.html`: legacy project pages
- `styles.css`: shared styles
- `app.js`: homepage interactions
- `project-page.js`: project-page rendering and interactions
- `project-data.js`: shared project content and gallery data
- `assets/`: local images used by the site
- `contractor-onboarding.html`: independent project branch reached from the unified people intake
- `operations-contractors.html`: authenticated talent review desk
- `CONTRACTOR_ONBOARDING.md`: deployment, privacy, classification, and onboarding notes
- `employee-intake.html`: the single shareable people intake link, with employee and independent project paths
- `operations-employees.html`: authenticated candidate review and role-link builder
- `WORKFORCE_INTAKE.md`: Adam guideline mapping, intentional exceptions, and deployment notes

## Publish

This site is static and can be deployed directly with GitHub Pages.
