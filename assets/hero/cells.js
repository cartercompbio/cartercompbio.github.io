import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { cell3dMaterial, pointsMaterial, makePoints } from './materials.js';
import { envelope, rng, gauss } from './timeline.js';

// Cancer and immune cells in local units (x ∈ [-5, 5], y ∈ [-5.5, 5.5]), drawn as
// translucent 3D spheres (membrane + nucleus) that slowly sway so their depth reads.
const COL = {
    coral: new THREE.Color('#ff7f6e'),
    magenta: new THREE.Color('#e0609a'),
    orange: new THREE.Color('#ff9457'),
    cyan: new THREE.Color('#3fd0ff'),
    blue: new THREE.Color('#3d7bff'),
    synapse: new THREE.Color('#d8f6ff'),
    mhc: new THREE.Color('#ffdc8c'),
    cytokine: new THREE.Color('#9ff5e0'),
    contact: new THREE.Color('#ffc2b5'),
};

// Tumour nests in different molecular states. `mhc` is MHC class I surface display:
// nest 0 raises it after interferon signalling and is attacked by a CD8+ T cell;
// nest 1 has lost it (immune escape) and draws an NK cell instead.
const CLUSTERS = [
    { c: [-1.4, 1.9, 0.3], n: 7, color: COL.coral, shift: COL.magenta, at: 8.1, mhc: [0.25, 1.0, 7.9] },
    { c: [2.2, -1.2, -1.2], n: 6, color: COL.magenta, shift: COL.orange, at: 8.6, mhc: [0.04, 0.04, 0] },
    { c: [-0.9, -3.3, 1.4], n: 5, color: COL.orange, shift: COL.coral, at: 9.2, mhc: [0.2, 0.6, 8.4] },
    { c: [3.4, 3.6, -4.5], n: 5, color: COL.coral, shift: COL.orange, at: 9.0, mhc: [0.3, 0.3, 0] },   // deep
];
const mhcLevel = (cl, t) => cl.mhc[0] + (cl.mhc[1] - cl.mhc[0]) * envelope(t, cl.mhc[2], 1.0, 3.6, 2.0);

// evenly spread directions on a sphere, for MHC-I puncta on each membrane
const fib = (n) => Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
});

export function createCells({ mobile }) {
    const rand = rng(23);
    const group = new THREE.Group();   // placed by the layout
    const inner = new THREE.Group();   // sways so the 3D shape reads
    group.add(inner);
    const cells = [];   // { p, r, kind, color, cluster?, seed, order? }

    CLUSTERS.forEach((cl, ci) => {
        const n = mobile ? Math.ceil(cl.n * 0.6) : cl.n;
        const start = cells.length;
        for (let i = 0; i < n; i++) {
            const p = new THREE.Vector3(cl.c[0] + gauss(rand) * 0.9, cl.c[1] + gauss(rand) * 0.9, cl.c[2] + gauss(rand) * 0.7);
            cells.push({ p, r: 0.72 + rand() * 0.42, kind: 0, cluster: ci, color: cl.color, seed: rand() });
        }
        // relax so neighbours touch but barely overlap, like a packed tumour nest
        for (let it = 0; it < 40; it++) {
            for (let i = start; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
                const a = cells[i], b = cells[j];
                const d = b.p.clone().sub(a.p), len = d.length() || 1e-3, want = (a.r + b.r) * 0.92;
                if (len < want) {
                    d.multiplyScalar((want - len) / len * 0.5);
                    a.p.sub(d); b.p.add(d);
                }
            }
        }
        // state changes spread through the nest from its first cell outward
        for (let i = start; i < cells.length; i++) cells[i].order = cells[i].p.distanceTo(cells[start].p);
    });
    const nTumor = cells.length;

    // Immune cells: the first a CD8+ T cell (cyan), the second an NK cell (electric blue).
    const immuneSpots = [[0.6, 0.6, 0.8], [3.6, 0.9, 0.0], [-3.0, -0.6, 0.2], [0.9, -4.6, -0.4], [-2.8, 4.2, -0.8],
        [1.6, 3.4, 0.9], [-3.6, -3.6, -1.6], [4.0, -3.9, 0.5], [-0.2, 4.9, 1.2]];
    const nImmune = mobile ? 5 : immuneSpots.length;
    const immune = [];
    for (let i = 0; i < nImmune; i++) {
        const s = immuneSpots[i];
        immune.push(cells.length);
        cells.push({
            p: new THREE.Vector3(s[0], s[1], s[2]), r: i === 1 ? 0.55 : 0.4 + rand() * 0.14, kind: 1,
            color: i === 0 ? COL.cyan : i === 1 ? COL.blue : (rand() < 0.55 ? COL.cyan : COL.blue), seed: rand(),
        });
    }

    // Engagements: each immune cell crawls to the nearest cell of its nest, holds
    // contact, then withdraws before the loop ends.
    const engagements = [[0, 0], [1, 1]].map(([ii, ci]) => {
        const im = cells[immune[ii]];
        let best = -1, bestD = Infinity;
        cells.forEach((c, k) => {
            if (c.kind === 0 && c.cluster === ci && c.p.distanceTo(im.p) < bestD) { bestD = c.p.distanceTo(im.p); best = k; }
        });
        const tumor = cells[best];
        const dir = im.p.clone().sub(tumor.p).normalize();
        const dock = tumor.p.clone().add(dir.clone().multiplyScalar((tumor.r + im.r) * 0.9));
        const contact = tumor.p.clone().add(dir.multiplyScalar(tumor.r * 0.98));
        return { immune: immune[ii], tumor: best, dock, contact, at: 8.0 + ii * 0.7 };
    });
    const approachOf = (en, t) => envelope(t, en.at, 1.7, 2.1, 3.2);
    const contactOf = (en, t) => envelope(t, en.at + 1.5, 0.5, 1.4, 1.6);
    // the T cell's target blebs and shrinks after the hit, then recovers by the loop's end
    const target = engagements[0].tumor;
    const blebOf = (t) => envelope(t, 10.6, 0.6, 1.6, 2.0);
    const shrinkOf = (t) => 1 - 0.32 * envelope(t, 10.9, 1.0, 1.4, 2.4);

    // Cytokine (IFN-γ) release from the docked T cell toward neighbouring cancer cells.
    const neighbours = cells.map((c, k) => k)
        .filter((k) => cells[k].kind === 0 && cells[k].cluster === 0 && k !== target)
        .sort((a, b) => cells[a].p.distanceTo(cells[target].p) - cells[b].p.distanceTo(cells[target].p))
        .slice(0, mobile ? 2 : 4);
    // Contact signalling between touching cancer cells in nests 1 and 2.
    const pairs = [];
    for (let i = 0; i < nTumor; i++) for (let j = i + 1; j < nTumor; j++) {
        const a = cells[i], b = cells[j];
        if (a.cluster === b.cluster && (a.cluster === 1 || a.cluster === 2) && a.p.distanceTo(b.p) < (a.r + b.r) * 1.05) pairs.push([i, j]);
    }
    pairs.splice(mobile ? 3 : 8);

    // --- Instanced spheres: one membrane and one nucleus per cell -------------------
    const n = cells.length;
    const ico = new THREE.IcosahedronGeometry(1, mobile ? 3 : 4);
    const geom = new THREE.InstancedBufferGeometry();
    geom.setAttribute('position', ico.attributes.position);
    const inst = (size) => new THREE.InstancedBufferAttribute(new Float32Array(n * 2 * size), size);
    const A = {
        aCenter: inst(3), aMove: inst(3), aColor: inst(3),
        aRadius: inst(1), aSeed: inst(1), aKind: inst(1), aState: inst(1), aShrink: inst(1), aBleb: inst(1),
    };
    cells.forEach((c, i) => {
        const off = new THREE.Vector3(gauss(rand), gauss(rand), gauss(rand)).multiplyScalar(c.r * 0.12);
        A.aCenter.array.set([c.p.x, c.p.y, c.p.z], i * 3);
        A.aCenter.array.set([c.p.x + off.x, c.p.y + off.y, c.p.z + off.z], (n + i) * 3);
        A.aRadius.array[i] = c.r;
        A.aRadius.array[n + i] = c.r * (c.kind ? 0.55 : 0.48);
        A.aSeed.array[i] = c.seed;
        A.aSeed.array[n + i] = c.seed + 0.37;
        A.aKind.array[i] = c.kind;
        A.aKind.array[n + i] = 2;    // nucleus
    });
    A.aShrink.array.fill(1);
    for (const [name, attr] of Object.entries(A)) geom.setAttribute(name, attr);
    geom.instanceCount = n * 2;
    const mesh = new THREE.Mesh(geom, cell3dMaterial());
    mesh.frustumCulled = false;
    inner.add(mesh);

    // MHC-I complexes as puncta on cancer-cell membranes.
    const DIRS = fib(mobile ? 10 : 16);
    const mhcPts = makePoints(nTumor * DIRS.length, pointsMaterial());
    inner.add(mhcPts.points);

    // Synapse glows, cytotoxic granules, cytokines and cell-cell signals.
    const GRANULES = mobile ? 5 : 10;
    const PER_SIGNAL = 3;
    const nSparks = engagements.length * (1 + GRANULES) + neighbours.length * PER_SIGNAL + pairs.length * PER_SIGNAL;
    const sparks = makePoints(nSparks, pointsMaterial());
    inner.add(sparks.points);

    // Faint extracellular particles (cytokine-like haze).
    const nHaze = mobile ? 50 : 130;
    const haze = makePoints(nHaze, pointsMaterial());
    const tmp = new THREE.Color();
    for (let i = 0; i < nHaze; i++) {
        haze.position.set([(rand() - 0.5) * 11, (rand() - 0.5) * 12, -3 + rand() * 5], i * 3);
        tmp.copy(rand() < 0.5 ? COL.coral : COL.cyan).multiplyScalar(0.1 + rand() * 0.16);
        haze.color.set([tmp.r, tmp.g, tmp.b], i * 3);
        haze.size[i] = 0.035 + rand() * 0.05;
        haze.drift[i] = 0.3 + rand() * 0.5;
        haze.seed[i] = rand();
    }
    inner.add(haze.points);

    const move = A.aMove.array, color = A.aColor.array, state = A.aState.array;
    const shrink = A.aShrink.array, bleb = A.aBleb.array;
    const cur = cells.map(() => new THREE.Vector3());   // current centres, for particles and labels
    const v = new THREE.Vector3();

    function setSpark(o, p, c, b, size) {
        sparks.position.set([p.x, p.y, p.z], o * 3);
        sparks.color.set([c.r * b, c.g * b, c.b * b], o * 3);
        sparks.size[o] = size;
    }
    // a few particles travelling a → b, spaced along the path, on while `on` > 0
    function stream(o, a, b, c, on, t, speed) {
        for (let j = 0; j < PER_SIGNAL; j++) {
            const u = (t * speed + j / PER_SIGNAL) % 1;
            v.copy(a).lerp(b, u);
            setSpark(o + j, v, c, on * Math.sin(Math.PI * u) * 0.8, 0.09);
        }
        return o + PER_SIGNAL;
    }

    function update(t, time) {
        inner.rotation.y = Math.sin(time * 0.07) * 0.5;
        inner.rotation.x = Math.sin(time * 0.05 + 1) * 0.15;

        cells.forEach((c, i) => {
            // slow organic drift; immune cells wander a little more
            const amp = c.kind ? 0.16 : 0.06, s = c.seed * 50;
            move.set([amp * Math.sin(time * 0.21 + s), amp * Math.cos(time * 0.17 + s * 1.3), 0], i * 3);
            let st = 0;
            tmp.copy(c.color);
            if (c.kind === 0) {
                const cl = CLUSTERS[c.cluster];
                const e = envelope(t, cl.at + c.order * 0.35, 1.0, 1.4, 2.2);
                tmp.lerp(cl.shift, e * 0.7);
                st = e * 0.45;
            }
            color.set([tmp.r, tmp.g, tmp.b], i * 3);
            state[i] = st;
        });

        engagements.forEach((en) => {
            const approach = approachOf(en, t), contact = contactOf(en, t);
            const im = cells[en.immune];
            v.copy(en.dock).sub(im.p).multiplyScalar(approach);
            move[en.immune * 3] += v.x;
            move[en.immune * 3 + 1] += v.y;
            move[en.immune * 3 + 2] = v.z;
            state[en.immune] = Math.max(state[en.immune], approach * 0.6 + contact * 0.4);
            state[en.tumor] = Math.max(state[en.tumor], contact * 0.7);
        });
        shrink.fill(1);
        bleb.fill(0);
        shrink[target] = shrink[n + target] = shrinkOf(t);
        bleb[target] = blebOf(t);

        // nuclei follow their cells
        for (let i = 0; i < n; i++) {
            move.set([move[i * 3], move[i * 3 + 1], move[i * 3 + 2]], (n + i) * 3);
            color.set([color[i * 3], color[i * 3 + 1], color[i * 3 + 2]], (n + i) * 3);
            state[n + i] = state[i];
            cur[i].set(cells[i].p.x + move[i * 3], cells[i].p.y + move[i * 3 + 1], cells[i].p.z + move[i * 3 + 2]);
        }

        // MHC-I puncta
        for (let i = 0; i < nTumor; i++) {
            const b = mhcLevel(CLUSTERS[cells[i].cluster], t) * shrink[i] * 0.9;
            const r = cells[i].r * 1.05 * shrink[i];
            DIRS.forEach((d, k) => {
                const o = i * DIRS.length + k;
                mhcPts.position.set([cur[i].x + d.x * r, cur[i].y + d.y * r, cur[i].z + d.z * r], o * 3);
                mhcPts.color.set([COL.mhc.r * b, COL.mhc.g * b, COL.mhc.b * b], o * 3);
                mhcPts.size[o] = 0.1;
            });
        }

        // synapses and granules
        let o = 0;
        engagements.forEach((en) => {
            const contact = contactOf(en, t);
            setSpark(o++, en.contact, COL.synapse, contact * 0.85, 0.9 + 0.5 * contact);
            for (let j = 0; j < GRANULES; j++) {
                const u = (t * 0.7 + j / GRANULES) % 1;
                v.copy(cur[en.immune]).lerp(en.contact, u);
                v.x += Math.sin(j * 12.9 + t) * 0.06;
                setSpark(o++, v, COL.cyan, contact * Math.sin(Math.PI * u) * 0.6, 0.07);
            }
        });
        // IFN-γ from the docked T cell to its neighbours
        const release = envelope(t, 9.8, 0.4, 1.0, 0.8);
        neighbours.forEach((k) => { o = stream(o, cur[engagements[0].immune], cur[k], COL.cytokine, release, t, 0.9); });
        // contact signalling inside nests 1 and 2, as their state change spreads
        pairs.forEach(([i, j], k) => {
            const on = envelope(t, 8.6 + k * 0.25, 0.4, 1.4, 0.8);
            o = k % 2 ? stream(o, cur[j], cur[i], COL.contact, on, t, 0.7) : stream(o, cur[i], cur[j], COL.contact, on, t, 0.7);
        });

        for (const name of ['aMove', 'aColor', 'aState', 'aShrink', 'aBleb']) geom.attributes[name].needsUpdate = true;
        for (const pts of [mhcPts, sparks]) {
            const g = pts.points.geometry;
            g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true;
        }
    }

    // Where the network's MHC-I signal lands: the cancer cell the T cell will meet.
    const signalTarget = (out) => inner.localToWorld(out.copy(cells[target].p));

    // n cells spread across nests and immune cells, as data sources for the model.
    const samples = (count) => Array.from({ length: count }, (_, k) => {
        const i = Math.floor((k * cells.length) / count);
        return { from: (out) => inner.localToWorld(out.copy(cur[i])), color: cells[i].color };
    });

    // On-screen labels: text, a world-space anchor, and how visible it is at time t.
    const below = (i, dy) => (t, out) => inner.localToWorld(out.copy(cur[i]).add(v.set(0, dy, 0)));
    const labels = [
        { text: 'T cell', kind: 'immune', world: below(engagements[0].immune, -0.95), level: (t) => 0.6 + 0.4 * approachOf(engagements[0], t) },
        { text: 'NK cell', kind: 'immune', world: below(engagements[1].immune, -1.05), level: (t) => 0.6 + 0.4 * approachOf(engagements[1], t) },
    ];

    return { group, materials: [sparks.points.material, haze.points.material, mhcPts.points.material], update, signalTarget, labels, samples };
}
