# Grandparents' Mementos

A simple 3D gallery to preserve and share mementos — each object is displayed as an interactive GLB model with a written memory.

## Local preview

Serve the folder with any static file server (required for loading GLB models):

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Adding a memento

1. Place your `.glb` file in `assets/`
2. Add an entry to `js/mementos.js` with `title`, `model` path, and `memory` text

## Deploy

This site is deployed via [GitHub Pages](https://grandparents-memo.github.io/).
