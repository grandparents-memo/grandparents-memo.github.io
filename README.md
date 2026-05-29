# Grandparents' Mementos

A simple 3D gallery to preserve and share mementos — each object is displayed as an interactive GLB model with a written memory.

## Local preview

Serve the folder with any static file server (required for loading GLB models):

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Adding a memento

1. Place your source `.glb` file in Downloads or project root
2. Create the desktop/detail model (half mesh, 256px textures):

```bash
npx @gltf-transform/cli optimize source.glb assets/original/your-model.glb \
  --simplify-ratio 0.5 --texture-size 256
```

3. Create a mobile-optimized copy (128px textures):

```bash
npx @gltf-transform/cli optimize source.glb assets/mobile/your-model.glb \
  --compress draco --texture-compress webp --texture-size 128 --simplify-ratio 0.4
```

4. Add an entry to `js/mementos.js` with `title`, `model`, `modelMobile`, `poster`, and `memory`
5. Generate a gallery poster image:

```bash
npm install puppeteer
node scripts/generate-posters.mjs
```

## Deploy

This site is deployed via [GitHub Pages](https://grandparents-memo.github.io/).
