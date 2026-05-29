# Grandparents' Mementos

A simple 3D gallery to preserve and share mementos — each object is displayed as an interactive GLB model with a written memory.

## Local preview

Serve the folder with any static file server (required for loading GLB models):

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Adding a memento

1. Place your original `.glb` file in `assets/original/`
2. Halve texture resolution if needed (4096→2048):

```bash
npx @gltf-transform/cli resize assets/original/your-model.glb /tmp/your-model.glb --width 2048 --height 2048
mv /tmp/your-model.glb assets/original/your-model.glb
```

3. Create a desktop gallery copy (fast loading, ~3–5 MB):

```bash
npx @gltf-transform/cli optimize assets/original/your-model.glb assets/desktop/your-model.glb \
  --compress draco --texture-compress webp --texture-size 2048 --simplify-ratio 0.65
```

4. Create a mobile-optimized copy:

```bash
npx @gltf-transform/cli optimize assets/original/your-model.glb assets/mobile/your-model.glb \
  --compress draco --texture-compress webp --texture-size 512 --simplify-ratio 0.4
```

3. Add an entry to `js/mementos.js` with `title`, `model` (detail), `modelGallery`, `modelMobile`, `poster`, and `memory`
4. Generate a gallery poster image:

```bash
npm install puppeteer
node scripts/generate-posters.mjs
```

## Deploy

This site is deployed via [GitHub Pages](https://grandparents-memo.github.io/).
