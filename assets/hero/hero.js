// Hero animation: "From Genome to Cancer Ecosystem".
// Genetic variation (helix) -> regulatory network -> tumour/immune microenvironment,
// choreographed on a 16 s loop (see timeline.js). Illustrative, not a causal model.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { shared, pointsMaterial, makePoints } from './materials.js';
import { LOOP, envelope, rng } from './timeline.js';
import { createDNA } from './dna.js';
import { createNetwork } from './network.js';
import { createCells } from './cells.js';

const FOV = 35;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

const hero = document.querySelector('.hero');
const canvas = hero && hero.querySelector('.hero__canvas');
const copy = hero && hero.querySelector('.hero__content');
if (hero && canvas) init();

function init() {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
        return;   // no WebGL: the static fallback image stays in place
    }
    const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // ?hero-t=9.5 freezes the loop at that second (handy for reviewing a single beat).
    const frozenParam = new URLSearchParams(location.search).get('hero-t');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200);

    const dna = createDNA({ mobile });
    const network = createNetwork({ mobile });
    const cells = createCells({ mobile });
    scene.add(dna.group, network.group, cells.group);
    dna.group.rotation.set(0.2, 0, -0.36);

    const ambient = createAmbient(mobile);
    scene.add(ambient.points);
    const bridges = createBridges();
    scene.add(bridges.points);

    // --- Layout: fit the three scales into the space right of (or below) the heading.
    let distance = 30, halfW = 1, halfH = 1;
    const setScale = (obj, materials, s) => {
        obj.scale.setScalar(s);
        materials.forEach((m) => { m.uniforms.uScale.value = s; });
    };
    function layout() {
        const w = hero.clientWidth, h = hero.clientHeight;
        const aspect = w / h;
        renderer.setSize(w, h, false);
        camera.aspect = aspect;
        const portrait = aspect < 1.1;
        distance = portrait ? 13 / (TAN * aspect) : 30;
        halfH = distance * TAN;
        halfW = halfH * aspect;
        camera.updateProjectionMatrix();
        shared.uFocus.value = distance;
        shared.uViewHeight.value = h / (2 * TAN);
        shared.uPixelRatio.value = renderer.getPixelRatio();

        const heroRect = hero.getBoundingClientRect();
        const r = copy.getBoundingClientRect();
        if (!portrait) {
            const left = ((r.right - heroRect.left) / w * 2 - 1) * halfW + 0.8;
            const right = halfW - 0.6;
            const span = right - left;
            const sDna = (halfH * 2 * 0.78) / dna.length;
            dna.group.position.set(left + span * 0.08, -0.4, 0);
            setScale(dna.group, dna.materials, sDna);
            const sNet = Math.min((span * 0.72) / 20, (halfH * 2 * 0.62) / 10);
            network.group.position.set(left + span * 0.45, 0.3, -0.5);
            setScale(network.group, network.materials, sNet);
            const sCells = Math.min((halfH * 2 * 0.86) / 12, (span * 0.42) / 11);
            cells.group.position.set(right - 5.0 * sCells, 0, 0);
            setScale(cells.group, cells.materials, sCells);
        } else {
            const bottom = (1 - (r.bottom - heroRect.top) / h * 2) * halfH;   // world y of text bottom
            const top = bottom - 0.4, floor = -halfH + 0.3;
            const band = top - floor, cy = (top + floor) / 2;
            setScale(dna.group, dna.materials, (band * 0.62) / dna.length);
            dna.group.position.set(-halfW * 0.6, cy, 0);
            setScale(network.group, network.materials, Math.min((halfW * 2 * 0.62) / 20, band * 0.75 / 10));
            network.group.position.set(-halfW * 0.05, cy, -0.5);
            const sCells = Math.min(band * 0.9 / 12, (halfW * 2 * 0.4) / 11);
            setScale(cells.group, cells.materials, sCells);
            cells.group.position.set(halfW - 5.0 * sCells, cy, 0);
        }
        placeCamera(true);
    }

    // --- Parallax ---------------------------------------------------------------------
    const pointer = { x: 0, y: 0, px: -1e4, py: -1e4, inside: false };
    const offset = new THREE.Vector2();
    function placeCamera(snap) {
        const k = snap ? 1 : 0.035;
        const tx = staticMode() ? 0 : pointer.x * 0.9, ty = staticMode() ? 0 : -pointer.y * 0.55;
        offset.x += (tx - offset.x) * k;
        offset.y += (ty - offset.y) * k;
        camera.position.set(offset.x, offset.y, distance);
        camera.lookAt(0, 0, 0);
    }

    // --- Hover: nearest network hub within reach of the pointer ------------------------
    let hovered = -1;
    const hv = new THREE.Vector3();
    function pickHub() {
        let best = -1, bestD = (mobile ? 28 : 36) ** 2;
        if (pointer.inside) {
            const w = hero.clientWidth, h = hero.clientHeight;
            for (const i of network.hubs) {
                network.nodeWorld(i, hv).project(camera);
                const dx = (hv.x * 0.5 + 0.5) * w - pointer.px, dy = (0.5 - hv.y * 0.5) * h - pointer.py;
                const d = dx * dx + dy * dy;
                if (d < bestD) { bestD = d; best = i; }
            }
        }
        if (best !== hovered) { hovered = best; network.setHover(best); }
    }
    hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        pointer.px = e.clientX - r.left;
        pointer.py = e.clientY - r.top;
        pointer.x = pointer.px / r.width * 2 - 1;
        pointer.y = pointer.py / r.height * 2 - 1;
        pointer.inside = true;
        if (staticMode()) { pickHub(); renderStatic(); }
    });
    hero.addEventListener('pointerleave', () => {
        pointer.inside = false;
        pointer.x = pointer.y = 0;
        if (staticMode()) { pickHub(); renderStatic(); }
    });

    // --- Frame ------------------------------------------------------------------------
    let elapsed = 0;
    function draw(t, time, instant) {
        shared.uTime.value = time;
        dna.update(t, time);
        network.update(t, time, instant);
        cells.update(t, time);
        bridges.update(t, dna, network, cells);
        renderer.render(scene, camera);
    }

    const staticMode = () => frozenParam !== null || reducedMq.matches;
    function renderStatic() {
        const t = frozenParam !== null ? Number(frozenParam) % LOOP : 9.4;   // network afterglow + engaged cells
        placeCamera(true);
        draw(t, t, true);
    }

    let raf = 0, last = 0, visible = true;
    function frame(now) {
        raf = requestAnimationFrame(frame);
        elapsed += Math.min(0.1, (now - last) / 1000);
        last = now;
        placeCamera(false);
        pickHub();
        draw(elapsed % LOOP, elapsed, false);
    }
    function start() {
        if (raf || staticMode() || !visible || document.hidden) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
    }
    function stop() {
        cancelAnimationFrame(raf);
        raf = 0;
    }
    function refresh() {
        stop();
        if (staticMode()) renderStatic(); else start();
    }

    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start(); else stop();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    reducedMq.addEventListener('change', refresh);
    new ResizeObserver(() => { layout(); if (staticMode()) renderStatic(); }).observe(hero);
    canvas.addEventListener('webglcontextlost', () => { stop(); hero.classList.remove('is-live'); });

    layout();
    refresh();
    hero.classList.add('is-live');
}

// Layered background dust and a few defocused foreground motes for depth.
function createAmbient(mobile) {
    const rand = rng(5);
    const far = mobile ? 160 : 450, near = mobile ? 6 : 18;
    const p = makePoints(far + near, pointsMaterial());
    const palette = ['#4f5bd5', '#4fe3ff', '#8b7cff', '#2ec4b6'].map((c) => new THREE.Color(c));
    const c = new THREE.Color();
    for (let i = 0; i < far + near; i++) {
        const isNear = i >= far;
        const z = isNear ? 6 + rand() * 10 : -30 + rand() * 24;
        const spread = isNear ? 1 : 1 + (-z) / 30;
        p.position.set([(rand() - 0.5) * 44 * spread, (rand() - 0.5) * 24 * spread, z], i * 3);
        c.copy(palette[Math.floor(rand() * palette.length)]).multiplyScalar(isNear ? 0.05 + rand() * 0.05 : 0.08 + rand() * 0.22);
        p.color.set([c.r, c.g, c.b], i * 3);
        p.size[i] = isNear ? 0.25 + rand() * 0.35 : 0.05 + rand() * 0.12;
        p.drift[i] = isNear ? 0.6 : 0.4 + rand() * 0.8;
        p.seed[i] = rand();
    }
    return p;
}

// Two travelling signals that tie the scales together: helix -> network entry hub
// (end of the variant phase) and network exit hub -> engaging immune cell.
function createBridges() {
    const TRAIL = 6;
    const p = makePoints(2 * TRAIL, pointsMaterial());
    const col = new THREE.Color('#d8fbff');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), q = new THREE.Vector3();
    const legs = [
        { from: (o, s) => s.dna.signalOrigin(o), to: (o, s) => s.network.nodeWorld(s.network.entry, o), start: 3.35, dur: 0.8 },
        { from: (o, s) => s.network.nodeWorld(s.network.exit, o), to: (o, s) => s.cells.signalTarget(o), start: 7.3, dur: 0.85 },
    ];
    function update(t, dna, network, cells) {
        const s = { dna, network, cells };
        legs.forEach((leg, li) => {
            leg.from(a, s);
            leg.to(b, s);
            c.copy(a).add(b).multiplyScalar(0.5).add(q.set(0, 1.2, 1.5));
            const u = (t - leg.start) / leg.dur;
            const fade = envelope(t, leg.start, 0.1, leg.dur - 0.2, 0.3);
            for (let j = 0; j < TRAIL; j++) {
                const o = li * TRAIL + j, uj = Math.min(1, Math.max(0, u - j * 0.035)), iu = 1 - uj;
                p.position.set([
                    iu * iu * a.x + 2 * iu * uj * c.x + uj * uj * b.x,
                    iu * iu * a.y + 2 * iu * uj * c.y + uj * uj * b.y,
                    iu * iu * a.z + 2 * iu * uj * c.z + uj * uj * b.z], o * 3);
                const k = fade * (1 - j / TRAIL) * 0.9;
                p.color.set([col.r * k, col.g * k, col.b * k], o * 3);
                p.size[o] = 0.22 * (1 - j * 0.1);
            }
        });
        const g = p.points.geometry;
        g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true;
    }
    return { points: p.points, update };
}
