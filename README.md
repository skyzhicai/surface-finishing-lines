# Surface Finishing Lines Website

This is a static commercial website for the `/surface-finishing-lines/` pillar page.

## Pages

- `/` - commercial homepage and lead-generation entry point
- `/surface-finishing-lines/` - full technical pillar page
- `/shot-blasting-machines/`
- `/vibratory-finishing-equipment/`
- `/tumbling-machine-guide/`
- `/blasting-cabinet-systems/`
- `/surface-roughness-measurement/`
- `/abrasive-quality-control/`

## Build

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generate-assets.ps1
node .\scripts\build-site.js
```

## Preview

```powershell
python -m http.server 4173
```

Then open:

```text
http://localhost:4173/
http://localhost:4173/surface-finishing-lines/
```

## Notes

- The pillar article source remains in `surface-finishing-lines/index.md`.
- The HTML pages are generated from `scripts/build-site.js`.
- Update `SITE_URL` in `scripts/build-site.js` before production deployment so canonical URLs and the sitemap use the real domain.

