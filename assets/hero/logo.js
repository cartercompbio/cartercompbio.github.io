import * as THREE from 'three';

// The lab's cat-helix emblem as a slowly spinning 3D relief. The artwork is mapped onto
// a dense plane whose vertices are pushed out by a depth map (the silhouette "inflated"
// into a rounded shape, see assets/images/logo/), mirrored for the back, and lit so it
// reads as a sculpted object. Falls back to the flat image without WebGL.
const ART = 'assets/images/logo/carter_lab_cats.png';
const DEPTH = 'assets/images/logo/carter_lab_cats_depth.png';
const ASPECT = 390 / 768;        // emblem width / height
const THICKNESS = 0.2;           // relief depth, in units of the emblem's height / 2
const TURN = 14;                 // seconds per revolution

const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
});

export async function createLogo(container) {
    const canvas = container.querySelector('canvas');
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (e) {
        return;   // no WebGL: the flat image stays
    }
    const [art, depthImg] = await Promise.all([loadImage(ART), loadImage(DEPTH)]).catch(() => []);
    if (!art) return;

    // depth samples from the depth image
    const dc = document.createElement('canvas');
    dc.width = depthImg.width;
    dc.height = depthImg.height;
    const dctx = dc.getContext('2d', { willReadFrequently: true });
    dctx.drawImage(depthImg, 0, 0);
    const dpx = dctx.getImageData(0, 0, dc.width, dc.height).data;
    // the artwork's alpha, at the same resolution, so both shells close exactly on its outline
    dctx.clearRect(0, 0, dc.width, dc.height);
    dctx.drawImage(art, 0, 0, dc.width, dc.height);
    const apx = dctx.getImageData(0, 0, dc.width, dc.height).data;
    const EDGE = 0.08;   // depth below this is pinched to zero, sealing the seam
    const depthAt = (u, v) => {
        const x = Math.min(dc.width - 1, Math.round(u * (dc.width - 1)));
        const y = Math.min(dc.height - 1, Math.round((1 - v) * (dc.height - 1)));
        const i = (y * dc.width + x) * 4;
        if (apx[i + 3] < 160) return 0;
        return Math.max(0, dpx[i] / 255 - EDGE) / (1 - EDGE);
    };

    // front and back surfaces sharing the silhouette; the back is the front with z negated
    const surface = (sign) => {
        const g = new THREE.PlaneGeometry(2 * ASPECT, 2, 110, 216);
        const pos = g.attributes.position, uv = g.attributes.uv;
        for (let i = 0; i < pos.count; i++) pos.setZ(i, sign * THICKNESS * depthAt(uv.getX(i), uv.getY(i)));
        if (sign < 0) g.index.array.reverse();   // keep faces pointing outward
        g.computeVertexNormals();
        return g;
    };
    const texture = new THREE.Texture(art);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    // diffuse only: a glossy material turns mirror-like on the relief's steep sides (a pale sheen)
    const material = new THREE.MeshLambertMaterial({ map: texture, alphaTest: 0.5 });
    // pixels that pass the cut-out are drawn fully opaque; partial alpha on a transparent
    // canvas would otherwise be lightened against the page (a pale fringe on the edges)
    material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\n\tdiffuseColor.a = 1.0;');
    };
    const emblem = new THREE.Group();
    emblem.add(new THREE.Mesh(surface(1), material), new THREE.Mesh(surface(-1), material));

    const scene = new THREE.Scene();
    scene.add(emblem);
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(1.2, 1.4, 2.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe2c4, 0.35);
    rim.position.set(-2, 0.5, -1.5);
    scene.add(rim);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0, 4.4);

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    function resize() {
        renderer.setSize(container.clientWidth, container.clientHeight, false);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const frozen = new URLSearchParams(location.search).get('hero-t');
    let raf = 0, visible = true;
    const draw = (time) => {
        emblem.rotation.y = (time / TURN) * Math.PI * 2;
        emblem.rotation.x = 0.06 * Math.sin(time * 0.6);
        renderer.render(scene, camera);
    };
    const frame = (now) => {
        raf = requestAnimationFrame(frame);
        draw(now / 1000);
    };
    const still = () => reduced.matches || frozen !== null;
    function refresh() {
        cancelAnimationFrame(raf);
        raf = 0;
        if (still()) draw(TURN * 0.06);   // a slight three-quarter view
        else if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh(); }).observe(container);
    document.addEventListener('visibilitychange', refresh);
    reduced.addEventListener('change', refresh);
    new ResizeObserver(() => { resize(); if (still()) refresh(); }).observe(container);

    resize();
    refresh();
    container.classList.add('is-live');
}
