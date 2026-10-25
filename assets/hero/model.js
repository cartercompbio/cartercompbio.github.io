import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { pointsMaterial, linesMaterial, makePoints } from './materials.js';
import { envelope, rng } from './timeline.js';

// A machine-learning model drawn as a flat, layered neural network beneath the biology.
// Its input layer is split into three groups, one under each scale; during each phase,
// data packets drop from that scale into its group. Then the model predicts (a forward
// pass, carried by particles) and explains itself: attribution flows back from the
// output, bars rise over the inputs that mattered most, and gold particles return to the
// biology those inputs came from.
const FORWARD = [12.1, 12.6, 13.1];   // when hidden layer 1, hidden layer 2 and the output fire
const BACKWARD = [13.6, 14.0, 14.4];  // attribution reaches hidden layer 2, hidden layer 1, inputs
const REST = 13.0;                     // inputs hold until the forward pass has read them
const EXPLAIN = 14.6;                  // attribution bars and the return to biology

const COL = {
    groups: ['#4fe3ff', '#b3a8ff', '#ff8a78'].map((c) => new THREE.Color(c)),
    hidden: ['#7aa2ff', '#c08bff'].map((c) => new THREE.Color(c)),
    output: new THREE.Color('#fff0c2'),
    hot: new THREE.Color('#ffffff'),
    gold: new THREE.Color('#ffc857'),
};

// sources: one list per input group of { at, from(out) → world position, color }.
export function createModel({ mobile, sources }) {
    const rand = rng(31);
    const group = new THREE.Group();
    const perGroup = mobile ? 6 : 10;
    const layers = [perGroup * 3, mobile ? 10 : 16, mobile ? 6 : 8, 1];
    const offsets = [];
    let total = 0;
    layers.forEach((n) => { offsets.push(total); total += n; });
    const layerOf = (i) => { let L = 0; while (L < layers.length - 1 && i >= offsets[L + 1]) L++; return L; };
    const nodeColor = (i) => {
        const L = layerOf(i);
        return L === 0 ? COL.groups[Math.floor(i / perGroup)] : L === 3 ? COL.output : COL.hidden[L - 1];
    };

    // sparse connections: each node feeds a few nodes of the next layer, nearest first
    const edges = [];   // [layer, from, to, seed]
    for (let L = 0; L < layers.length - 1; L++) {
        const n = layers[L], m = layers[L + 1], fan = Math.min(m, 3);
        for (let i = 0; i < n; i++) {
            const near = Math.round((i / Math.max(1, n - 1)) * (m - 1));
            const picks = new Set([near]);
            while (picks.size < fan) picks.add(Math.min(m - 1, Math.max(0, near + Math.round((rand() - 0.5) * m * 0.6))));
            picks.forEach((j) => edges.push([L, offsets[L] + i, offsets[L + 1] + j, rand()]));
        }
    }

    // Attribution: how much each node contributed to the prediction. A few inputs per
    // group dominate; hidden nodes inherit importance from the inputs that feed them.
    const importance = new Float32Array(total);
    for (let g = 0; g < 3; g++) {
        const top = [Math.floor(rand() * perGroup), Math.floor(rand() * perGroup)];
        for (let i = 0; i < perGroup; i++) importance[g * perGroup + i] = top.includes(i) ? 0.8 + rand() * 0.2 : 0.1 + rand() * 0.3;
    }
    for (let L = 1; L < layers.length; L++) {
        edges.forEach(([l, a, b]) => { if (l === L - 1) importance[b] = Math.max(importance[b], importance[a] * (0.75 + rand() * 0.25)); });
    }

    const linePos = new Float32Array(edges.length * 6);
    const lineCol = new Float32Array(edges.length * 6);
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    lineGeom.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));
    const lines = new THREE.LineSegments(lineGeom, linesMaterial());
    lines.frustumCulled = false;
    group.add(lines);

    const nodes = makePoints(total, pointsMaterial());
    group.add(nodes.points);
    const P = Array.from({ length: total }, () => new THREE.Vector3());   // node positions

    // Data packets: each emission aimed at one input node of its group.
    const packets = [];
    sources.forEach((list, g) => list.forEach((s, k) => {
        packets.push({ ...s, node: g * perGroup + (k % perGroup), dur: 0.9 });
    }));
    const inputArrive = new Float32Array(perGroup * 3).fill(Infinity);
    packets.forEach((p) => { inputArrive[p.node] = Math.min(inputArrive[p.node], p.at + p.dur); });
    // where each input's data came from, for sending attribution back to the biology
    const origin = Array.from({ length: perGroup * 3 }, (_, i) => packets.find((p) => p.node === i));

    // Particles: data packets (trail of 3), forward and backward passes, return to biology.
    const TRAIL = 3;
    const forward = edges.filter(() => rand() < (mobile ? 0.6 : 0.5));
    const backward = edges.filter(([, a]) => importance[a] > 0.55);
    const explainers = [];
    for (let i = 0; i < perGroup * 3; i++) if (importance[i] > 0.75 && origin[i]) explainers.push(i);
    const nParticles = packets.length * TRAIL + forward.length + backward.length + explainers.length * TRAIL;
    const parts = makePoints(nParticles, pointsMaterial());
    group.add(parts.points);

    // Attribution bars: a column of dots over each input, filled by its importance.
    const BAR = 5;
    const bars = makePoints(perGroup * 3 * BAR, pointsMaterial());
    group.add(bars.points);

    let unit = 1, gap = 1;
    const titleAnchor = new THREE.Vector3();
    // Place the layers: inputs under each scale (groupX), hidden layers narrowing to the centre.
    function layout({ groupX, groupW, centerX, top, gap: rowGap, width }) {
        unit = width / 30;
        gap = rowGap;
        const row = (L, cx, w) => {
            for (let i = 0; i < layers[L]; i++) {
                const x = layers[L] === 1 ? cx : cx - w / 2 + (w * i) / (layers[L] - 1);
                P[offsets[L] + i].set(x, top - gap * L, 0);
            }
        };
        for (let g = 0; g < 3; g++) {
            for (let i = 0; i < perGroup; i++) P[g * perGroup + i].set(groupX[g] - groupW / 2 + (groupW * i) / (perGroup - 1), top, 0);
        }
        row(1, centerX, width * 0.42);
        row(2, centerX, width * 0.22);
        row(3, centerX, 0);
        titleAnchor.set(centerX + width * 0.26, top - gap * 1.5, 0);   // right of the hidden layers
        P.forEach((p, i) => nodes.position.set([p.x, p.y, 0], i * 3));
        edges.forEach(([, a, b], e) => linePos.set([P[a].x, P[a].y, 0, P[b].x, P[b].y, 0], e * 6));
        for (let i = 0; i < perGroup * 3; i++) {
            for (let k = 0; k < BAR; k++) bars.position.set([P[i].x, P[i].y + gap * (0.25 + k * 0.15), 0], (i * BAR + k) * 3);
        }
        lineGeom.attributes.position.needsUpdate = true;
        nodes.points.geometry.attributes.position.needsUpdate = true;
        bars.points.geometry.attributes.position.needsUpdate = true;
        for (const m of [nodes, parts, bars]) m.points.material.uniforms.uScale.value = unit;
    }

    const level = new Float32Array(total);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), q = new THREE.Vector3();
    const tmp = new THREE.Color();
    let o = 0;
    const put = (p, col, k, size) => {
        parts.position.set([p.x, p.y, p.z], o * 3);
        parts.color.set([col.r * k, col.g * k, col.b * k], o * 3);
        parts.size[o++] = size;
    };
    // quadratic path from a (via c) to b
    const along = (u) => {
        const iu = 1 - u;
        return q.set(iu * iu * a.x + 2 * iu * u * c.x + u * u * b.x, iu * iu * a.y + 2 * iu * u * c.y + u * u * b.y, iu * iu * a.z + 2 * iu * u * c.z + u * u * b.z);
    };

    function update(t, time) {
        const explain = envelope(t, EXPLAIN, 0.4, 1.3, 1.0);
        for (let i = 0; i < total; i++) {
            const L = layerOf(i);
            if (L === 0) {
                const arr = inputArrive[i];
                level[i] = arr < Infinity ? envelope(t, arr, 0.2, Math.max(0, REST - arr - 0.2), 1.6) : 0;
            } else {
                level[i] = envelope(t, FORWARD[L - 1], 0.3, L === 3 ? 1.6 : 0.7, 1.4);
            }
            const back = L < 3 ? envelope(t, BACKWARD[2 - L], 0.2, 0.5, 1.0) * importance[i] : 0;
            const gold = Math.max(back, L === 0 ? explain * importance[i] : 0);
            const size = L === 3 ? 0.6 : L === 0 ? 0.24 : 0.28;
            const I = 0.6 + level[i] * (L === 3 ? 1.8 : 1.1) + gold * 0.9;
            tmp.copy(nodeColor(i)).lerp(COL.hot, level[i] * 0.5).lerp(COL.gold, gold);
            nodes.color.set([tmp.r * I, tmp.g * I, tmp.b * I], i * 3);
            nodes.size[i] = size * (1 + 0.5 * level[i] + 0.4 * gold);
        }
        edges.forEach(([L, i, j, seed], e) => {
            const pass = envelope(t, FORWARD[L] - 0.45, 0.3, 0.5, 1.2) * Math.max(level[i], 0.3);
            const back = envelope(t, BACKWARD[2 - L] - 0.35, 0.2, 0.5, 1.0) * (importance[i] > 0.55 ? 1 : 0);
            const glint = Math.pow(Math.max(0, Math.sin(time * 1.7 + seed * 40)), 24) * 0.35;   // idle "training" shimmer
            const I = 0.13 + glint + pass * 0.6 + back * 0.5;
            tmp.copy(nodeColor(i)).lerp(nodeColor(j), 0.5).lerp(COL.hot, pass * 0.6).lerp(COL.gold, back);
            lineCol.set([tmp.r * I, tmp.g * I, tmp.b * I, tmp.r * I, tmp.g * I, tmp.b * I], e * 6);
        });

        o = 0;
        // data packets: fall from the biology into their input node
        packets.forEach((p) => {
            const u = (t - p.at) / p.dur;
            p.from(a);
            b.copy(P[p.node]);
            c.set(a.x * 0.8 + b.x * 0.2, (a.y + b.y) / 2, (a.z + b.z) / 2);
            for (let j = 0; j < TRAIL; j++) {
                const uj = u - j * 0.05, on = uj >= 0 && uj <= 1;
                along(Math.min(1, Math.max(0, uj)));
                put(q, p.color, on ? (1 - j / TRAIL) * Math.sqrt(Math.sin(Math.PI * uj)) : 0, 0.22 * (1 - j * 0.2));
            }
        });
        // forward pass: a bright particle per active connection, layer by layer
        forward.forEach(([L, i, j, seed]) => {
            const start = FORWARD[L] - 0.5 + seed * 0.15, u = (t - start) / 0.45;
            const on = u >= 0 && u <= 1;
            q.copy(P[i]).lerp(P[j], Math.min(1, Math.max(0, u)));
            tmp.copy(nodeColor(i)).lerp(COL.hot, 0.5);
            put(q, tmp, on ? Math.sin(Math.PI * u) * 1.1 : 0, 0.2);
        });
        // attribution flows back along the connections that mattered
        backward.forEach(([L, i, j, seed]) => {
            const start = BACKWARD[2 - L] - 0.4 + seed * 0.1, u = (t - start) / 0.4;
            const on = u >= 0 && u <= 1;
            q.copy(P[j]).lerp(P[i], Math.min(1, Math.max(0, u)));
            put(q, COL.gold, on ? Math.sin(Math.PI * u) * 1.1 : 0, 0.2);
        });
        // ...and from the most important inputs back to the biology they describe
        explainers.forEach((i, k) => {
            const start = EXPLAIN + 0.4 + k * 0.06, u = (t - start) / 0.9;
            a.copy(P[i]);
            origin[i].from(b);
            c.set(a.x * 0.2 + b.x * 0.8, (a.y + b.y) / 2, (a.z + b.z) / 2);
            for (let j = 0; j < TRAIL; j++) {
                const uj = u - j * 0.05, on = uj >= 0 && uj <= 1;
                along(Math.min(1, Math.max(0, uj)));
                put(q, COL.gold, on ? (1 - j / TRAIL) * Math.sqrt(Math.sin(Math.PI * uj)) : 0, 0.22 * (1 - j * 0.2));
            }
        });

        // attribution bars
        for (let i = 0; i < perGroup * 3; i++) {
            const lit = importance[i] * BAR * envelope(t, EXPLAIN, 0.5, 1.2, 1.0);
            for (let k = 0; k < BAR; k++) {
                const f = Math.min(1, Math.max(0, lit - k));
                const idx = i * BAR + k;
                tmp.copy(COL.gold).lerp(COL.hot, k / BAR * 0.4);
                bars.color.set([tmp.r * f, tmp.g * f, tmp.b * f], idx * 3);
                bars.size[idx] = 0.24;
            }
        }

        lineGeom.attributes.color.needsUpdate = true;
        for (const pts of [nodes, parts, bars]) {
            const g = pts.points.geometry;
            g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true;
        }
        parts.points.geometry.attributes.position.needsUpdate = true;
    }

    const outputWorld = (out) => out.copy(P[total - 1]);
    const titleWorld = (out) => out.copy(titleAnchor);
    const outputLevel = () => level[total - 1];
    // where the "Feature attribution" label sits: over the network group's bars
    const attributionWorld = (out) => out.copy(P[perGroup]).add(q.set(0, gap * 0.95, 0));
    const attributionLevel = (t) => envelope(t, EXPLAIN, 0.5, 1.2, 1.0);

    return { group, layout, update, outputWorld, outputLevel, attributionWorld, attributionLevel, titleWorld };
}
