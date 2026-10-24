import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { cellsMaterial, pointsMaterial, makePoints } from './materials.js';
import { envelope, rng, gauss } from './timeline.js';

// Tumour microenvironment in local units (x ∈ [-5, 5], y ∈ [-5.5, 5.5]).
const COL = {
    coral: new THREE.Color('#ff7f6e'),
    magenta: new THREE.Color('#e0609a'),
    orange: new THREE.Color('#ff9457'),
    cyan: new THREE.Color('#3fd0ff'),
    blue: new THREE.Color('#3d7bff'),
    synapse: new THREE.Color('#d8f6ff'),
};

// Tumour clusters in different molecular states. `mhc` is MHC class I surface display:
// cluster 0 responds to interferon signalling by raising it (and is seen by a CD8+
// T cell); cluster 1 has lost it (immune escape) and draws an NK cell instead.
const CLUSTERS = [
    { c: [-1.4, 1.9, 0.3], n: 7, color: COL.coral, shift: COL.magenta, at: 8.1, mhc: [0.25, 1.0, 7.9], label: 'Tumor cells · MHC-I high', tag: [-1.6, 5.2, 0.3] },
    { c: [2.2, -1.2, -1.2], n: 6, color: COL.magenta, shift: COL.orange, at: 8.8, mhc: [0.04, 0.04, 0], label: 'MHC-I low · immune escape', tag: [2.6, -4.0, -1.2] },
    { c: [-0.9, -3.3, 1.4], n: 5, color: COL.orange, shift: COL.coral, at: 9.5, mhc: [0.2, 0.6, 8.4] },
    { c: [3.4, 3.6, -4.5], n: 5, color: COL.coral, shift: COL.orange, at: 9.0, mhc: [0.3, 0.3, 0] },   // deep, out of focus
];
const mhcLevel = (cl, t) => cl.mhc[0] + (cl.mhc[1] - cl.mhc[0]) * envelope(t, cl.mhc[2], 1.0, 3.6, 2.0);

export function createCells({ mobile }) {
    const rand = rng(23);
    const group = new THREE.Group();
    const cells = [];   // { p, r, kind, color, cluster?, seed }

    CLUSTERS.forEach((cl, ci) => {
        const n = mobile ? Math.ceil(cl.n * 0.6) : cl.n;
        const start = cells.length;
        for (let i = 0; i < n; i++) {
            const p = new THREE.Vector3(cl.c[0] + gauss(rand) * 0.9, cl.c[1] + gauss(rand) * 0.9, cl.c[2] + gauss(rand) * 0.5);
            cells.push({ p, r: 0.72 + rand() * 0.42, kind: 0, cluster: ci, color: cl.color, seed: rand() });
        }
        // relax so neighbours touch but barely overlap, like a packed tumour nest
        for (let it = 0; it < 40; it++) {
            for (let i = start; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
                const a = cells[i], b = cells[j];
                const d = b.p.clone().sub(a.p), len = d.length() || 1e-3, want = (a.r + b.r) * 0.88;
                if (len < want) {
                    d.multiplyScalar((want - len) / len * 0.5);
                    a.p.sub(d); b.p.add(d);
                }
            }
        }
    });

    // Immune cells patrol the gaps between nests. The first is a CD8+ T cell (cyan),
    // the second an NK cell (electric blue); the rest are a mix.
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

    // Two engagements: the T cell docks on the MHC-I-high nest, the NK cell on the
    // MHC-I-low nest. Each crawls in, holds contact, then withdraws before the loop ends.
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

    // --- Instanced cell quads ------------------------------------------------------
    const n = cells.length;
    const geom = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geom.index = quad.index;
    geom.setAttribute('position', quad.attributes.position);
    const attr = (size, fill) => {
        const a = new THREE.InstancedBufferAttribute(new Float32Array(n * size), size);
        cells.forEach((c, i) => fill(a.array, i, c));
        return a;
    };
    geom.setAttribute('aCenter', attr(3, (arr, i, c) => arr.set([c.p.x, c.p.y, c.p.z], i * 3)));
    geom.setAttribute('aMove', attr(3, () => {}));
    geom.setAttribute('aRadius', attr(1, (arr, i, c) => { arr[i] = c.r; }));
    geom.setAttribute('aSeed', attr(1, (arr, i, c) => { arr[i] = c.seed; }));
    geom.setAttribute('aKind', attr(1, (arr, i, c) => { arr[i] = c.kind; }));
    geom.setAttribute('aColor', attr(3, (arr, i, c) => arr.set([c.color.r, c.color.g, c.color.b], i * 3)));
    geom.setAttribute('aState', attr(1, () => {}));
    geom.setAttribute('aMhc', attr(1, () => {}));
    geom.instanceCount = n;
    const mesh = new THREE.Mesh(geom, cellsMaterial());
    mesh.frustumCulled = false;
    group.add(mesh);

    // Synapse glow + cytotoxic granules (perforin/granzyme) crossing each contact.
    const GRANULES = mobile ? 5 : 10;
    const sparks = makePoints(engagements.length * (1 + GRANULES), pointsMaterial());
    group.add(sparks.points);

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
    group.add(haze.points);

    const move = geom.attributes.aMove.array;
    const color = geom.attributes.aColor.array;
    const state = geom.attributes.aState.array;
    const mhc = geom.attributes.aMhc.array;
    const v = new THREE.Vector3();

    function update(t, time) {
        cells.forEach((c, i) => {
            // slow organic drift; immune cells wander a little more
            const amp = c.kind ? 0.16 : 0.06, s = c.seed * 50;
            move.set([amp * Math.sin(time * 0.21 + s), amp * Math.cos(time * 0.17 + s * 1.3), 0], i * 3);
            let st = 0;
            tmp.copy(c.color);
            if (c.kind === 0) {
                const cl = CLUSTERS[c.cluster];
                const e = envelope(t, cl.at + c.seed * 0.5, 1.2, 1.4, 2.2);
                tmp.lerp(cl.shift, e * 0.7);
                st = e * 0.45;
                mhc[i] = mhcLevel(cl, t);
            }
            color.set([tmp.r, tmp.g, tmp.b], i * 3);
            state[i] = st;
        });

        engagements.forEach((en, k) => {
            const approach = approachOf(en, t);
            const contact = contactOf(en, t);
            const im = cells[en.immune];
            v.copy(en.dock).sub(im.p).multiplyScalar(approach);
            move[en.immune * 3] += v.x;
            move[en.immune * 3 + 1] += v.y;
            move[en.immune * 3 + 2] = v.z;
            state[en.immune] = Math.max(state[en.immune], approach * 0.6 + contact * 0.4);
            state[en.tumor] = Math.max(state[en.tumor], contact * 0.7);

            const base = k * (1 + GRANULES);
            const g = contact * 0.85;
            sparks.position.set([en.contact.x, en.contact.y, en.contact.z + 0.05], base * 3);
            sparks.color.set([COL.synapse.r * g, COL.synapse.g * g, COL.synapse.b * g], base * 3);
            sparks.size[base] = 0.9 + 0.5 * contact;
            const from = v.copy(im.p).add(new THREE.Vector3().copy(en.dock).sub(im.p).multiplyScalar(approach));
            for (let j = 0; j < GRANULES; j++) {
                const u = ((t * 0.7 + j / GRANULES) % 1);
                const o = base + 1 + j;
                const x = from.x + (en.contact.x - from.x) * u, y = from.y + (en.contact.y - from.y) * u;
                const jitter = Math.sin(j * 12.9 + t) * 0.06;
                sparks.position.set([x + jitter, y - jitter, en.contact.z + 0.1], o * 3);
                const b = contact * Math.sin(Math.PI * u) * 0.6;
                sparks.color.set([COL.cyan.r * b, COL.cyan.g * b, COL.cyan.b * b], o * 3);
                sparks.size[o] = 0.07;
            }
        });

        for (const name of ['aMove', 'aColor', 'aState', 'aMhc']) geom.attributes[name].needsUpdate = true;
        const sg = sparks.points.geometry;
        sg.attributes.position.needsUpdate = sg.attributes.color.needsUpdate = sg.attributes.size.needsUpdate = true;
    }

    // Where the network's MHC-I signal lands: the tumour cell the T cell will meet.
    const signalTarget = (out) => group.localToWorld(out.copy(cells[engagements[0].tumor].p));

    // On-screen labels: text, a world-space anchor, and how visible it is at time t.
    const immunePos = (en, t, dy, out) => {
        const im = cells[en.immune], a = approachOf(en, t);
        out.copy(en.dock).sub(im.p).multiplyScalar(a).add(im.p);
        out.y += dy;
        return group.localToWorld(out);
    };
    const labels = [
        ...CLUSTERS.filter((cl) => cl.label).map((cl) => ({
            text: cl.label, kind: 'tumor',
            world: (t, out) => group.localToWorld(out.set(...cl.tag)),
            level: (t) => 0.6 + 0.4 * envelope(t, cl.at - 0.5, 0.6, 3.5, 1.5),
        })),
        { text: 'CD8⁺ T cell', kind: 'immune', world: (t, out) => immunePos(engagements[0], t, -0.95, out),
            level: (t) => 0.6 + 0.4 * approachOf(engagements[0], t) },
        { text: 'NK cell', kind: 'immune', world: (t, out) => immunePos(engagements[1], t, -1.05, out),
            level: (t) => 0.6 + 0.4 * approachOf(engagements[1], t) },
        { text: 'TCR · peptide–MHC-I', kind: 'synapse',
            world: (t, out) => group.localToWorld(out.copy(engagements[0].contact).add(v.set(0.9, 0.6, 0))),
            level: (t) => contactOf(engagements[0], t) },
    ];

    // n cells spread across nests and immune cells, as data sources for the model.
    const samples = (n) => Array.from({ length: n }, (_, k) => {
        const c = cells[Math.floor((k * cells.length) / n)];
        return { from: (out) => group.localToWorld(out.copy(c.p)), color: c.color };
    });

    return { group, materials: [mesh.material, sparks.points.material, haze.points.material], update, signalTarget, labels, samples };
}
