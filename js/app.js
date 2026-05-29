import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mementos } from './mementos.js';

const galleryEl = document.getElementById('gallery');
const detailEl = document.getElementById('detail');
const backBtn = document.getElementById('back-btn');
const viewerContainer = document.getElementById('viewer-container');

const isMobile =
  window.matchMedia('(max-width: 900px)').matches ||
  window.matchMedia('(pointer: coarse)').matches;

let activeViewer = null;
const cardViewers = new Map();
let cardObserver = null;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/libs/draco/gltf/');

function createGltfLoader() {
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  return loader;
}

function createLoadingOverlay(container, message = 'Loading model…') {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-spinner"></div>
    <span class="loading-text">${message}</span>
  `;
  container.appendChild(overlay);
  return overlay;
}

function createViewer(container, { autoRotate = true, enableZoom = false, lowPower = false } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(0, 0.5, 2.5);

  const renderer = new THREE.WebGLRenderer({
    antialias: !lowPower,
    alpha: true,
    powerPreference: lowPower ? 'low-power' : 'high-performance',
  });
  renderer.setPixelRatio(lowPower ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;
  container.appendChild(renderer.domElement);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

  const hemi = new THREE.HemisphereLight(0xffffff, 0xe8e4dc, 1.0);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xfff8f0, 0.85);
  fillLight.position.set(-4, 3, 2);
  scene.add(fillLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
  backLight.position.set(0, 2, -5);
  scene.add(backLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = enableZoom;
  controls.autoRotate = autoRotate;
  controls.autoRotateSpeed = 1.2;
  controls.minDistance = 0.5;
  controls.maxDistance = 8;

  const loader = createGltfLoader();
  let model = null;
  let animId = null;
  let disposed = false;

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function brightenMaterials(object) {
    object.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat) => {
        if (!mat) return;
        mat.envMapIntensity = 1.1;
        if ('metalness' in mat) mat.metalness = Math.min(mat.metalness, 0.9);
        if ('roughness' in mat) mat.roughness = Math.max(mat.roughness * 0.92, 0.2);
      });
    });
  }

  function fitModel(object) {
    brightenMaterials(object);
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.6 / maxDim;

    object.position.sub(center.multiplyScalar(scale));
    object.scale.setScalar(scale);
    scene.add(object);

    controls.target.set(0, 0, 0);
    controls.update();
  }

  function animate() {
    if (disposed) return;
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  async function loadModel(url) {
    const overlay = createLoadingOverlay(container);
    try {
      const gltf = await loader.loadAsync(url);
      if (disposed) return;
      model = gltf.scene;
      fitModel(model);
      overlay.remove();
      resize();
      animate();
    } catch (err) {
      overlay.querySelector('.loading-text').textContent = 'Failed to load model';
      console.error(err);
    }
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);

  return {
    loadModel,
    dispose() {
      disposed = true;
      if (animId) cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      if (model) {
        model.traverse((child) => {
          if (child.isMesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }
      renderer.domElement.remove();
    },
  };
}

function disposeCardViewers() {
  cardViewers.forEach((viewer) => viewer.dispose());
  cardViewers.clear();
  cardObserver?.disconnect();
  cardObserver = null;
}

function loadCardPreview(id, modelUrl) {
  if (cardViewers.has(id)) return;

  const previewEl = document.getElementById(`preview-${id}`);
  if (!previewEl) return;

  previewEl.querySelector('.card-preview-placeholder')?.remove();
  const viewer = createViewer(previewEl, {
    autoRotate: true,
    enableZoom: false,
    lowPower: true,
  });
  cardViewers.set(id, viewer);
  viewer.loadModel(modelUrl);
}

function setupLazyGalleryPreviews() {
  if (isMobile) return;

  cardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.dataset.id;
        const memento = mementos.find((m) => m.id === id);
        if (memento) loadCardPreview(id, memento.model);
        cardObserver.unobserve(entry.target);
      });
    },
    { rootMargin: '120px' }
  );

  galleryEl.querySelectorAll('.card').forEach((card) => {
    cardObserver.observe(card);
  });
}

function renderGallery() {
  disposeCardViewers();

  galleryEl.innerHTML = mementos
    .map(
      (m) => `
    <article class="card" data-id="${m.id}" tabindex="0" role="button" aria-label="View ${m.title}">
      <div class="card-preview" id="preview-${m.id}">
        <span class="card-preview-placeholder">◈</span>
        ${isMobile ? '<span class="card-preview-label">Tap to view in 3D</span>' : ''}
      </div>
      <div class="card-body">
        <h3 class="card-title">${m.title}</h3>
        <p class="card-excerpt">${m.memory}</p>
        <div class="card-action">
          View memento
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </article>
  `
    )
    .join('');

  galleryEl.querySelectorAll('.card').forEach((card) => {
    const open = () => openDetail(card.dataset.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });

  setupLazyGalleryPreviews();
}

function openDetail(id) {
  const memento = mementos.find((m) => m.id === id);
  if (!memento) return;

  document.getElementById('detail-title').textContent = memento.title;
  document.getElementById('detail-memory').textContent = memento.memory;

  galleryEl.classList.add('hidden');
  detailEl.classList.remove('hidden');
  detailEl.setAttribute('aria-hidden', 'false');
  document.querySelector('.site-header').style.display = 'none';
  document.querySelector('.site-footer').style.display = 'none';

  disposeCardViewers();

  if (activeViewer) {
    activeViewer.dispose();
    activeViewer = null;
  }

  viewerContainer.innerHTML = '';
  activeViewer = createViewer(viewerContainer, {
    autoRotate: false,
    enableZoom: true,
    lowPower: isMobile,
  });
  activeViewer.loadModel(memento.model);

  history.pushState({ detail: id }, '', `#${id}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeDetail() {
  detailEl.classList.add('hidden');
  detailEl.setAttribute('aria-hidden', 'true');
  galleryEl.classList.remove('hidden');
  document.querySelector('.site-header').style.display = '';
  document.querySelector('.site-footer').style.display = '';

  if (activeViewer) {
    activeViewer.dispose();
    activeViewer = null;
  }
  viewerContainer.innerHTML = '';

  setupLazyGalleryPreviews();

  history.pushState(null, '', window.location.pathname);
}

backBtn.addEventListener('click', closeDetail);

window.addEventListener('popstate', () => {
  if (detailEl.classList.contains('hidden')) return;
  closeDetail();
});

window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (id && mementos.some((m) => m.id === id)) {
    openDetail(id);
  }
});

renderGallery();

const hashId = location.hash.slice(1);
if (hashId && mementos.some((m) => m.id === hashId)) {
  openDetail(hashId);
}
