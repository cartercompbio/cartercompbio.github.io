import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { pointsMaterial, linesMaterial, makePoints } from './materials.js';
import { envelope, rng } from './timeline.js';

// A machine-learning model drawn as a flat, layered neural network beneath the biology.
// Its input layer is split into three groups, one under each scale; during each phase,
// data packets drop from that scale into its group. In the last phase the model runs a
// forward pass (hidden layers, then a single prediction) and everything fades to rest.
const FORWARD = [12.1, 12.7, 13.3];   // when hidden layer 1, hidden layer 2 and the output fire
const REST = 13.1;                     // inputs hold until the forward pass has read them

const COL = {
    node: new THREE.Color('#cdd6ff'),
    edge: new THREE.Color('#6b78e0'),
    hot: new THREE.Color('#effcff'),
};

// sources: one list per input group of { at, from(out) → world position, color }.
export function createModel({ mobile, sources }) {
    const group = new THREE.Group();
    const perGroup = mobile ? 6 : 10;
    const layers = [perGroup * 3, mobile ? 10 : 16, mobile ? 6 : 8, 1];
    const offsets = [];
    let total = 0;
    layers.forEach((n) => { offsets.push(total); total += n; });

    // sparse connections: each node feeds a few nodes of the next layer, nearest first
    const rand = rng(31);
    const edges = [];
    for (let L = 0; L < layers.length - 1; L++) {
        const n = layers[L], m = layers[L + 1], fan = Math.min(m, 3);
        for (let i = 0; i < n; i++) {
            const near = Math.round((i / Math.max(1, n - 1)) * (m - 1));
            const picks = new Set([near]);
            while (picks.size < fan) picks.add(Math.min(m - 1, Math.max(0, near + Math.round((rand() - 0.5) * m * 0.6))));
            picks.forEach((j) => edges.push([L, offsets[L] + i, offsets[L + 1] + j]));
        }
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
    const pos = (i) => new THREE.Vector3(nodes.position[i * 3], nodes.position[i * 3 + 1], nodes.position[i * 3 + 2]);

    // Each emission becomes a packet aimed at one input node of its group.
    const packets = [];
    sources.forEach((list, g) => list.forEach((s, k) => {
        packets.push({ ...s, node: g * perGroup + (k % perGroup), dur: 0.9 });
    }));
    const inputArrive = new Float32Array(perGroup * 3).fill(Infinity);
    packets.forEach((p) => { inputArrive[p.node] = Math.min(inputArrive[p.node], p.at + p.dur); });
    const TRAIL = 3;
    const packetPts = makePoints(packets.length * TRAIL, pointsMaterial());
    group.add(packetPts.points);

    let unit = 1;
    // Place the layers: inputs under each scale (groupX), hidden layers narrowing to the centre.
    function layout({ groupX, groupW, centerX, top, gap, width }) {
        unit = width / 30;
        const row = (L, cx, w) => {
            for (let i = 0; i < layers[L]; i++) {
                const x = layers[L] === 1 ? cx : cx - w / 2 + (w * i) / (layers[L] - 1);
                nodes.position.set([x, top - gap * L, 0], (offsets[L] + i) * 3);
            }
        };
        for (let g = 0; g < 3; g++) {
            for (let i = 0; i < perGroup; i++) {
                const x = groupX[g] - groupW / 2 + (groupW * i) / (perGroup - 1);
                nodes.position.set([x, top, 0], (g * perGroup + i) * 3);
            }
        }
        row(1, centerX, width * 0.42);
        row(2, centerX, width * 0.22);
        row(3, centerX, 0);
        edges.forEach(([, a, b], e) => {
            linePos.set([nodes.position[a * 3], nodes.position[a * 3 + 1], 0, nodes.position[b * 3], nodes.position[b * 3 + 1], 0], e * 6);
        });
        lineGeom.attributes.position.needsUpdate = true;
        nodes.points.geometry.attributes.position.needsUpdate = true;
        nodes.points.material.uniforms.uScale.value = unit;
        packetPts.points.material.uniforms.uScale.value = unit;
    }

    const level = new Float32Array(total);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const tmp = new THREE.Color();

    function update(t) {
        for (let i = 0; i < total; i++) {
            let L = 0;
            while (L < layers.length - 1 && i >= offsets[L + 1]) L++;
            if (L === 0) {
                const arr = inputArrive[i];
                level[i] = arr < Infinity ? envelope(t, arr, 0.2, Math.max(0, REST - arr - 0.2), 1.8) : 0;
            } else {
                const at = FORWARD[L - 1];
                level[i] = envelope(t, at, 0.3, L === 3 ? 1.3 : 0.7, 1.5);
            }
            const size = L === 3 ? 0.55 : L === 0 ? 0.2 : 0.24;
            const I = 0.4 + level[i] * (L === 3 ? 1.6 : 1.0);
            tmp.copy(COL.node).lerp(COL.hot, level[i]);
            nodes.color.set([tmp.r * I, tmp.g * I, tmp.b * I], i * 3);
            nodes.size[i] = size * (1 + 0.5 * level[i]);
        }
        edges.forEach(([L, i, j], e) => {
            const pass = envelope(t, FORWARD[L] - 0.45, 0.3, 0.5, 1.2) * Math.max(level[i], 0.25);
            const I = 0.06 + pass * 0.55;
            tmp.copy(COL.edge).lerp(COL.hot, pass);
            lineCol.set([tmp.r * I, tmp.g * I, tmp.b * I, tmp.r * I, tmp.g * I, tmp.b * I], e * 6);
        });

        packets.forEach((p, k) => {
            const u = (t - p.at) / p.dur;
            p.from(a);
            b.copy(pos(p.node));
            c.copy(a).add(b).multiplyScalar(0.5);
            c.x = a.x * 0.8 + b.x * 0.2;   // fall mostly straight down, then curve into the node
            for (let j = 0; j < TRAIL; j++) {
                const o = k * TRAIL + j, uj = Math.min(1, Math.max(0, u - j * 0.05)), iu = 1 - uj;
                packetPts.position.set([
                    iu * iu * a.x + 2 * iu * uj * c.x + uj * uj * b.x,
                    iu * iu * a.y + 2 * iu * uj * c.y + uj * uj * b.y,
                    iu * iu * a.z + 2 * iu * uj * c.z + uj * uj * b.z], o * 3);
                const on = u - j * 0.05 >= 0 && u - j * 0.05 <= 1;
                const k2 = on ? (1 - j / TRAIL) * Math.sqrt(Math.sin(Math.PI * uj)) : 0;
                packetPts.color.set([p.color.r * k2, p.color.g * k2, p.color.b * k2], o * 3);
                packetPts.size[o] = 0.2 * (1 - j * 0.2);
            }
        });

        lineGeom.attributes.color.needsUpdate = true;
        for (const pts of [nodes, packetPts]) {
            const g = pts.points.geometry;
            g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true;
        }
        packetPts.points.geometry.attributes.position.needsUpdate = true;
    }

    const outputWorld = (out) => out.copy(pos(total - 1));
    const inputWorld = (out) => out.copy(pos(0));
    const outputLevel = () => level[total - 1];

    return { group, layout, update, outputWorld, inputWorld, outputLevel };
}
