// Hero animation: "From Genome to Cancer Ecosystem".
// Genetic variation (helix) -> regulatory network -> tumour/immune microenvironment,
// with a machine-learning model beneath that integrates and explains, and patients who are
// stratified and treated, choreographed on a 24 s loop (see timeline.js). Illustrative research themes, not a causal model.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { shared, theme, pointsMaterial, makePoints } from './materials.js';
import { LOOP, envelope, rng } from './timeline.js';
import { createDNA } from './dna.js';
import { createNetwork } from './network.js';
import { createCells } from './cells.js';
import { createModel } from './model.js';
import { createCohort } from './cohort.js';

const FOV = 35;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

const hero = document.querySelector('.hero');
const canvas = hero && hero.querySelector('.hero__canvas');
const copy = hero && hero.querySelector('.hero__content');
if (hero && canvas) init();

function init() {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
        return;   // no WebGL: the static fallback image stays in place
    }
    // light theme unless the page asked for dark (see the script in index.html's head)
    theme.light = !document.documentElement.classList.contains('theme-dark');
    shared.uLight.value = theme.light ? 1 : 0;
    const labelLayer = hero.querySelector('.hero__labels');
    const scaleEls = [...hero.querySelectorAll('.hero__scale')];
    const mlTitle = hero.querySelector('.hero__ml-title');
    const story = hero.querySelector('.hero__story');
    const steps = [...story.children];
    // Title style under review: a story line across the top (default) or ?titles=captions
    const captions = new URLSearchParams(location.search).get('titles') === 'captions';
    hero.classList.add(captions ? 'hero--captions' : 'hero--story');
    const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // ?hero-t=9.5 freezes the loop at that second (handy for reviewing a single beat).
    const frozenParam = new URLSearchParams(location.search).get('hero-t');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    renderer.setClearColor(theme.light ? 0xf8fafc : 0x0c162c, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 200);

    const dna = createDNA({ mobile });
    const network = createNetwork({ mobile });
    const cells = createCells({ mobile });
    scene.add(dna.group, network.group, cells.group);
    dna.group.rotation.set(0.2, 0, -0.36);

    // The model's inputs: data packets from each scale during its phase.
    const perGroup = mobile ? 6 : 10;
    const genes = network.labels.filter((l) => l.kind === 'gene');
    const model = createModel({
        mobile,
        sources: [
            dna.variants.flatMap((v, i) => [0.4, 0.65].map((d) => ({ at: v.at + d, color: v.color, from: (out) => dna.variantWorld(i, out) }))),
            genes.map((l) => ({ at: network.nodeAct(l.node) + 0.3, color: new THREE.Color('#b3a8ff'), from: (out) => network.nodeWorld(l.node, out) })),
            cells.samples(perGroup).map((s, k) => ({ ...s, at: 8.6 + k * (2.4 / perGroup) })),
        ],
    });
    scene.add(model.group);
    const cohort = createCohort({ mobile, light: theme.light, layer: hero.querySelector('.hero__cohort') });

    scene.add(createBackdrop());
    const ambient = createAmbient(mobile);
    scene.add(ambient.points);
    const bridges = createBridges();
    scene.add(bridges.points);

    // --- Layout: biology right of (or below) the heading, the model along the bottom.
    let distance = 30, halfW = 1, halfH = 1;
    let bioTop = 0, bioBottom = 0;   // world y of the biology band's edges, for the titles
    let regionLeft = 0, regionRight = 0;   // world x span of the visualization
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

        // Bands, as fractions of the hero's height from the top: biology, the model's rows,
        // then the patient cohort. Landscape keeps the left side clear for the heading;
        // portrait stacks everything below it.
        const heroRect = hero.getBoundingClientRect();
        const r = copy.getBoundingClientRect();
        const fy = (f) => (1 - 2 * f) * halfH, fh = (f) => f * 2 * halfH;
        let left, right, bioY, bioH, modelTop, modelGap, cohortY, cohortGap;
        if (!portrait) {
            left = ((r.right - heroRect.left) / w * 2 - 1) * halfW + 0.8;
            right = halfW - 1.2;
            bioY = fy(0.26); bioH = fh(0.38);
            modelTop = fy(0.5); modelGap = fh(0.055);
            cohortY = fy(0.8); cohortGap = fh(0.04);
        } else {
            const tb = (r.bottom - heroRect.top) / h;   // heading's bottom, as a fraction
            left = -halfW + 0.6; right = halfW - 0.6;
            bioY = fy(tb + 0.14); bioH = fh(0.19);
            modelTop = fy(tb + 0.28); modelGap = fh(0.045);
            cohortY = fy(tb + 0.51); cohortGap = fh(0.035);
        }
        const span = right - left;
        bioTop = bioY + bioH / 2;
        bioBottom = bioY - bioH / 2;
        regionLeft = left;
        regionRight = right;
        const sDna = Math.min(bioH / dna.length, span * 0.2 / 6);
        dna.group.position.set(left + span * 0.09, bioY, 0);
        setScale(dna.group, dna.materials, sDna);
        const sNet = Math.min((span * 0.6) / 20, (bioH * 0.84) / 10);
        network.group.position.set(left + span * 0.46, bioY, -0.5);
        setScale(network.group, network.materials, sNet);
        const sCells = Math.min((bioH * 1.04) / 12, (span * 0.34) / 11);
        cells.group.position.set(right - 5.0 * sCells, bioY, 0);
        setScale(cells.group, cells.materials, sCells);
        model.layout({
            groupX: [dna.group.position.x, network.group.position.x, cells.group.position.x],
            groupW: span * 0.2, centerX: network.group.position.x,
            top: modelTop, gap: modelGap, width: span,
        });
        cohort.layout({ centerX: (left + right) / 2, y: cohortY, width: span * 0.9, rowGap: cohortGap, source: model.outputWorld(new THREE.Vector3()) });
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

    // --- Labels tied to the 3D scene ------------------------------------------------
    const tracked = [];
    const addLabel = (text, kind, world, level) => {
        const el = document.createElement('div');
        el.className = 'hero__lbl hero__lbl--' + kind;
        el.append(document.createElement('span'));
        el.firstChild.textContent = text;
        labelLayer.append(el);
        tracked.push({ el, kind, world, level });
    };
    dna.variants.forEach((v, i) => addLabel(v.text + ' · ' + v.kind, v.kind,
        (t, out) => dna.variantWorld(i, out), (t) => dna.variantLevel(i, t)));
    network.labels.forEach((l) => addLabel(l.text, l.kind,
        (t, out) => network.nodeWorld(l.node, out),
        (t) => l.kind === 'tf' ? 0.8 + 0.2 * network.nodeLevel[l.node]
            : Math.max(network.nodeLevel[l.node], network.hlNode[l.node])));
    cells.labels.forEach((l) => addLabel(l.text, l.kind, l.world, l.level));
    addLabel('Prediction', 'ml', (t, out) => model.outputWorld(out), () => 0.55 + 0.45 * model.outputLevel());
    addLabel('Feature attribution', 'attr', (t, out) => model.attributionWorld(out), (t) => model.attributionLevel(t));

    const lp = new THREE.Vector3(), lv = new THREE.Vector3(), center = new THREE.Vector3(), pv = new THREE.Vector3();
    const project = (world, out) => {
        pv.copy(world).project(camera);
        out.x = (pv.x * 0.5 + 0.5) * hero.clientWidth;
        out.y = (0.5 - pv.y * 0.5) * hero.clientHeight;
    };
    function placeLabels(t) {
        const w = hero.clientWidth, h = hero.clientHeight;
        network.group.getWorldPosition(center).applyMatrix4(camera.matrixWorldInverse);
        const depthSpan = 4 * network.group.scale.x;
        for (const L of tracked) {
            let a = L.level(t);
            L.world(t, lp);
            if (L.kind === 'tf' || L.kind === 'gene') {
                // labels on the far side of the turning network recede
                lv.copy(lp).applyMatrix4(camera.matrixWorldInverse);
                a *= 0.65 + 0.35 * Math.min(1, Math.max(0, 0.5 + (lv.z - center.z) / depthSpan));
            }
            lp.project(camera);
            L.el.style.transform = `translate(${((lp.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((0.5 - lp.y * 0.5) * h).toFixed(1)}px)`;
            L.el.style.opacity = a.toFixed(3);
        }
        // the model's title sits in the open space to the right of its hidden layers
        model.titleWorld(lp).project(camera);
        mlTitle.style.transform = `translate(${Math.min(w - 16 - mlTitle.offsetWidth, (lp.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((0.5 - lp.y * 0.5) * h).toFixed(1)}px) translateY(-50%)`;
        if (!captions) {
            // story line spanning the visualization, just above the biology band
            const a = { x: 0, y: 0 }, b = { x: 0, y: 0 };
            project(lp.set(regionLeft, bioTop, 0), a);
            project(lp.set(regionRight, bioTop, 0), b);
            story.style.width = `${(b.x - a.x).toFixed(1)}px`;
            story.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) translateY(-100%)`;
            return;
        }
        // captions centred under their component, just below the biology band
        [dna.group, network.group, cells.group].forEach((g, i) => {
            g.getWorldPosition(lp);
            lp.y = bioBottom;
            lp.z = 0;
            lp.project(camera);
            const el = scaleEls[i], bw = el.offsetWidth;
            const x = Math.min(w - 16 - bw, Math.max(16, (lp.x * 0.5 + 0.5) * w - bw / 2));
            el.style.transform = `translate(${x.toFixed(1)}px, ${((0.5 - lp.y * 0.5) * h).toFixed(1)}px)`;
        });
    }

    // --- Frame ------------------------------------------------------------------------
    let elapsed = 0;
    let failed = false;
    let currentStep = -1;
    function draw(t, time, instant) {
        try {
            shared.uTime.value = time;
            dna.update(t, time);
            network.update(t, time, instant);
            cells.update(t, time);
            model.update(t, time);
            bridges.update(t, { dna, network, cells, model, cohort });
            renderer.render(scene, camera);
            placeLabels(t);
            cohort.update(t, project);
            const step = Math.min(4, Math.floor(t / 4));
            if (step !== currentStep) {
                currentStep = step;
                steps.forEach((el, i) => el.classList.toggle('is-on', i === step));
            }
            hero.classList.add('is-live');
        } catch (e) {
            console.error('Hero animation stopped:', e);
            failed = true;
            stop();
            hero.classList.remove('is-live');
        }
    }

    const staticMode = () => frozenParam !== null || reducedMq.matches;
    function renderStatic() {
        const t = frozenParam !== null ? Number(frozenParam) % LOOP : 15.0;   // the model explaining its prediction
        placeCamera(true);
        draw(t, t, true);
    }

    let raf = 0, last = 0, visible = true;
    function frame(now) {
        raf = requestAnimationFrame(frame);
        elapsed += Math.max(0, Math.min(0.1, (now - last) / 1000));
        last = now;
        placeCamera(false);
        pickHub();
        draw(elapsed % LOOP, elapsed, false);
    }
    function start() {
        if (raf || failed || staticMode() || !visible || document.hidden) return;
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
}

// Full-screen backdrop: deep navy with soft pools of light behind each scale, dithered
// to avoid banding. Drawn first, ignoring the camera.
function createBackdrop() {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        vertexShader: /* glsl */`
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        uniforms: { uLight: shared.uLight },
        fragmentShader: /* glsl */`
            uniform float uLight;
            varying vec2 vUv;
            float pool(vec2 c, vec2 r) { return max(0.0, 1.0 - length((vUv - c) / r) / 0.7); }
            void main() {
                float a = pool(vec2(0.18, 0.50), vec2(0.30, 0.60));
                float b = pool(vec2(0.48, 0.50), vec2(0.45, 0.55));
                float c = pool(vec2(0.82, 0.50), vec2(0.32, 0.55));
                vec3 dark = vec3(0.047, 0.086, 0.172) + vec3(0.31, 0.36, 0.84) * 0.20 * a
                    + vec3(0.18, 0.77, 0.71) * 0.14 * b + vec3(1.00, 0.44, 0.38) * 0.15 * c;
                vec3 light = vec3(0.973, 0.98, 0.988) - vec3(0.05, 0.04, 0.0) * a
                    - vec3(0.05, 0.0, 0.015) * b - vec3(0.0, 0.04, 0.045) * c;
                vec3 col = mix(dark, light, uLight);
                col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
                gl_FragColor = vec4(col, 1.0);
            }`,
        depthTest: false,
        depthWrite: false,
    }));
    mesh.frustumCulled = false;
    mesh.renderOrder = -1;
    return mesh;
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
        c.copy(palette[Math.floor(rand() * palette.length)]).multiplyScalar(isNear ? 0.06 + rand() * 0.06 : 0.12 + rand() * 0.26);
        p.color.set([c.r, c.g, c.b], i * 3);
        p.size[i] = isNear ? 0.25 + rand() * 0.35 : 0.05 + rand() * 0.12;
        p.drift[i] = isNear ? 0.6 : 0.4 + rand() * 0.8;
        p.seed[i] = rand();
    }
    return p;
}

// Travelling signals that tie the scales together: helix -> network (end of the variant
// phase), network -> the cancer cell the T cell will meet, prediction -> patients.
function createBridges() {
    const TRAIL = 6;
    const p = makePoints(3 * TRAIL, pointsMaterial());
    const col = new THREE.Color('#d8fbff');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), q = new THREE.Vector3();
    const legs = [
        { from: (o, s) => s.dna.signalOrigin(o), to: (o, s) => s.network.nodeWorld(s.network.entry, o), start: 3.35, dur: 0.8 },
        { from: (o, s) => s.network.nodeWorld(s.network.exit, o), to: (o, s) => s.cells.signalTarget(o), start: 7.3, dur: 0.85 },
        { from: (o, s) => s.model.outputWorld(o), to: (o, s) => s.cohort.center(o), start: 15.6, dur: 0.7 },
    ];
    function update(t, s) {
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
