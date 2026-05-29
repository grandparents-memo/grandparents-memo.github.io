# Grandparents' Mementos

A simple 3D gallery to preserve and share mementos — each object is displayed as an interactive GLB model with a written memory.

## Local preview

Serve the folder with any static file server (required for loading GLB models):

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Adding a memento

1. Place your source `.glb` file in `assets/original/` (or use Downloads as source)
2. Create the detail model (half mesh, 2048px textures):

```bash
npx @gltf-transform/cli optimize source.glb assets/original/your-model.glb \
  --simplify-ratio 0.5 --texture-size 2048
```

3. Create the desktop gallery copy (half mesh, 2048px, Draco):

```bash
npx @gltf-transform/cli optimize source.glb assets/desktop/your-model.glb \
  --compress draco --texture-compress webp --texture-size 2048 --simplify-ratio 0.5
```

4. Create a mobile-optimized copy:

```bash
npx @gltf-transform/cli optimize assets/original/your-model.glb assets/mobile/your-model.glb \
  --compress draco --texture-compress webp --texture-size 512 --simplify-ratio 0.4
```

5. Add an entry to `js/mementos.js` with `title`, `model` (detail), `modelGallery`, `modelMobile`, `poster`, and `memory`
6. Generate a gallery poster image:

```bash
npm install puppeteer
node scripts/generate-posters.mjs
```

## Deploy

This site is deployed via [GitHub Pages](https://grandparents-memo.github.io/).
