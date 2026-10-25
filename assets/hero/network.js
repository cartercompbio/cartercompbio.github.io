import * as THREE from 'three';
import { pointsMaterial, linesMaterial, makePoints } from './materials.js';
import { envelope, rng, gauss, LOOP } from './timeline.js';

// Gene regulatory network in local units (x ∈ [-10, 10]), modelled loosely on the
// interferon-γ antigen-presentation axis: STAT1 induces IRF1, and IRF1 induces the
// MHC class I transactivator NLRC5 and the class II transactivator CIITA, which drive
// HLA genes. Each program is a TF hub, a secondary regulator, target genes, and
// regulatory elements (the TF's binding sites) wired to a nearby gene. Two unlabelled
// programs stand for the rest of the regulatory landscape. Illustrative wiring.
const PROGRAMS = [
    { tf: 'STAT1', site: 'GAS', targets: ['CXCL9', 'CXCL10', 'GBP1'], c: [-8.0, 0.6, 0.8], at: 4.15 },
    { tf: 'IRF1', site: 'ISRE', targets: ['TAP1', 'PSMB9'], c: [-3.6, -1.6, -1.2], at: 4.85, from: 0 },
    { tf: 'NLRC5', site: 'SXY', targets: ['HLA-A', 'HLA-B', 'HLA-C', 'B2M'], c: [1.4, 2.4, 1.0], at: 5.6, from: 1 },
    { tf: 'CIITA', site: 'SXY', targets: ['HLA-DRA', 'CD74'], c: [2.6, -2.8, -1.0], at: 6.05, from: 1 },
    { tf: null, targets: [], c: [7.0, 1.2, -1.6], at: 6.6, from: 2 },
    { tf: null, targets: [], c: [8.2, -1.8, 1.6], at: 7.05, from: 3 },
];

const COL = {
    hub: new THREE.Color('#c4bbff'),
    hub2: new THREE.Color('#8b7cff'),
    gene: new THREE.Color('#4fe3ff'),
    gene2: new THREE.Color('#2ec4b6'),
    element: new THREE.Color('#6f7bff'),
    pulse: new THREE.Color('#d8fbff'),
};

export function createNetwork({ mobile }) {
    const rand = rng(7);
    const group = new THREE.Group();
    const inner = new THREE.Group();
    group.add(inner);

    const perModule = mobile ? { genes: 12, elements: 5 } : { genes: 26, elements: 11 };
    const nodes = [];   // { p, kind, module, color, size, base, act }
    const edges = [];   // { a, b, p0, c, p1, base, ctx }
    const hubs = [];
    const modules = [];
    const labels = [];  // { text, node, kind }

    const addNode = (p, kind, module) => {
        const color = kind === 'hub' ? COL.hub : kind === 'hub2' ? COL.hub2 : kind === 'element' ? COL.element
            : (rand() < 0.65 ? COL.gene : COL.gene2);
        const size = { hub: 0.4, hub2: 0.28, gene: 0.2 + rand() * 0.1, element: 0.13 + rand() * 0.05 }[kind];
        const base = { hub: 0.95, hub2: 0.7, gene: 0.55, element: 0.45 }[kind];
        nodes.push({ p, kind, module, color, size, base, act: Infinity, seed: rand() });
        return nodes.length - 1;
    };
    const addEdge = (a, b, base, bend = 0.18) => {
        const p0 = nodes[a].p, p1 = nodes[b].p;
        const dir = p1.clone().sub(p0);
        let perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1));
        if (perp.lengthSq() < 1e-6) perp.set(1, 0, 0);
        perp.normalize().multiplyScalar(dir.length() * bend * (rand() < 0.5 ? -1 : 1) * (0.5 + rand()));
        const c = p0.clone().add(p1).multiplyScalar(0.5).add(perp);
        const ctx = rand() < 0.2 ? { n: rand() < 0.5 ? 1 : 2, phase: rand() * Math.PI * 2 } : null;
        edges.push({ a, b, p0, c, p1, base, ctx, len: dir.length() });
        return edges.length - 1;
    };

    PROGRAMS.forEach((P, m) => {
        const center = new THREE.Vector3(...P.c);
        const jitter = (sx, sy, sz) => new THREE.Vector3(gauss(rand) * sx, gauss(rand) * sy, gauss(rand) * sz);
        const hub = addNode(center.clone().add(jitter(0.3, 0.3, 0.3)), 'hub', m);
        const hub2 = addNode(center.clone().add(jitter(0.9, 0.7, 0.7)), 'hub2', m);
        hubs.push(hub, hub2);
        if (P.tf) labels.push({ text: P.tf, node: hub, kind: 'tf' });
        const genes = [];
        for (let i = 0; i < perModule.genes; i++) genes.push(addNode(center.clone().add(jitter(1.35, 1.25, 1.1)), 'gene', m));
        const named = genes.slice(0, P.targets.length);
        named.forEach((g, i) => labels.push({ text: P.targets[i], node: g, kind: 'gene' }));
        modules.push({ hub, hub2, genes, named });

        addEdge(hub, hub2, 0.2);
        genes.forEach((g) => {
            if (named.includes(g) || rand() < 0.68) addEdge(hub, g, 0.12);
            else if (rand() < 0.6) addEdge(hub2, g, 0.1);
        });
        for (let i = 0; i < perModule.elements; i++) {
            const g = genes[Math.floor(rand() * genes.length)];
            const e = addNode(nodes[g].p.clone().add(jitter(0.45, 0.45, 0.45)), 'element', m);
            addEdge(e, g, 0.11, 0.1);
        }
    });
    // Program-to-program regulation plus a few weaker long-range links.
    const upstream = PROGRAMS.map((P, m) => (P.from === undefined ? -1 : addEdge(modules[P.from].hub, modules[m].hub, 0.2, 0.12)));
    modules.forEach((mod, m) => {
        const other = modules[(m + 1 + Math.floor(rand() * (modules.length - 1))) % modules.length];
        addEdge(mod.hub, other.genes[Math.floor(rand() * other.genes.length)], 0.09, 0.22);
        if (rand() < 0.6) addEdge(mod.hub2, other.hub2, 0.08, 0.25);
    });

    const adjacentEdges = nodes.map(() => []);
    edges.forEach((e, i) => { adjacentEdges[e.a].push(i); adjacentEdges[e.b].push(i); });

    // Cascade: each program's hub fires when the signal from its upstream TF arrives;
    // pulses then carry activity to its named targets and a subset of the others.
    const pulses = [];
    const edgeAct = edges.map(() => []);
    const schedulePulse = (ei, start, dur) => {
        pulses.push({ edge: ei, start, dur });
        edgeAct[ei].push([start, start + dur]);
        const target = edges[ei].b;
        nodes[target].act = Math.min(nodes[target].act, start + dur);
    };
    PROGRAMS.forEach((P, m) => {
        const mod = modules[m];
        nodes[mod.hub].act = Math.min(nodes[mod.hub].act, P.at);
        if (upstream[m] >= 0) {
            const t0 = PROGRAMS[P.from].at + 0.05;
            schedulePulse(upstream[m], t0, P.at - t0);
        }
        adjacentEdges[mod.hub].forEach((ei) => {
            const e = edges[ei];
            if (e.a !== mod.hub || nodes[e.b].module !== m) return;
            if (mod.named.includes(e.b) || rand() < (mobile ? 0.5 : 0.38)) schedulePulse(ei, P.at + rand() * 0.3, 0.5 + e.len * 0.08);
        });
    });
    edges.forEach((e) => {
        if (nodes[e.a].kind === 'element' && nodes[e.b].act < Infinity) nodes[e.a].act = nodes[e.b].act + 0.15;
    });

    // --- Geometry -------------------------------------------------------------------
    const SEG = mobile ? 6 : 10;
    const linePos = new Float32Array(edges.length * SEG * 6);
    const lineCol = new Float32Array(edges.length * SEG * 6);
    const lineBase = new Float32Array(edges.length * SEG * 6);
    const q = new THREE.Vector3(), q2 = new THREE.Vector3(), col = new THREE.Color();
    const bezier = (e, u, out) => {
        const iu = 1 - u;
        return out.set(
            iu * iu * e.p0.x + 2 * iu * u * e.c.x + u * u * e.p1.x,
            iu * iu * e.p0.y + 2 * iu * u * e.c.y + u * u * e.p1.y,
            iu * iu * e.p0.z + 2 * iu * u * e.c.z + u * u * e.p1.z);
    };
    edges.forEach((e, i) => {
        for (let s = 0; s < SEG; s++) {
            const o = (i * SEG + s) * 6;
            bezier(e, s / SEG, q);
            bezier(e, (s + 1) / SEG, q2);
            linePos.set([q.x, q.y, q.z, q2.x, q2.y, q2.z], o);
            col.copy(nodes[e.a].color).lerp(nodes[e.b].color, s / SEG);
            lineBase.set([col.r, col.g, col.b], o);
            col.copy(nodes[e.a].color).lerp(nodes[e.b].color, (s + 1) / SEG);
            lineBase.set([col.r, col.g, col.b], o + 3);
        }
    });
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    lineGeom.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));
    const lines = new THREE.LineSegments(lineGeom, linesMaterial());
    lines.frustumCulled = false;
    inner.add(lines);

    const nodePts = makePoints(nodes.length, pointsMaterial());
    nodes.forEach((n, i) => nodePts.position.set([n.p.x, n.p.y, n.p.z], i * 3));
    inner.add(nodePts.points);

    const halos = makePoints(hubs.length, pointsMaterial());
    hubs.forEach((h, i) => { halos.position.set([nodes[h].p.x, nodes[h].p.y, nodes[h].p.z], i * 3); });
    inner.add(halos.points);

    const TRAIL = 4;
    const pulsePts = makePoints(pulses.length * TRAIL, pointsMaterial());
    inner.add(pulsePts.points);

    // --- Hover ----------------------------------------------------------------------
    const hlNode = new Float32Array(nodes.length);
    const hlEdge = new Float32Array(edges.length);
    const hlNodeTarget = new Float32Array(nodes.length);
    const hlEdgeTarget = new Float32Array(edges.length);
    let hoverAmt = 0, hoverTarget = 0;

    function setHover(nodeIndex) {
        hlNodeTarget.fill(0);
        hlEdgeTarget.fill(0);
        hoverTarget = nodeIndex >= 0 ? 1 : 0;
        if (nodeIndex < 0) return;
        hlNodeTarget[nodeIndex] = 1;
        adjacentEdges[nodeIndex].forEach((ei) => {
            hlEdgeTarget[ei] = 1;
            hlNodeTarget[edges[ei].a] = 1;
            hlNodeTarget[edges[ei].b] = 1;
        });
    }

    // --- Per-frame update -----------------------------------------------------------
    const materials = [nodePts.points.material, halos.points.material, pulsePts.points.material];
    const nodeLevel = new Float32Array(nodes.length);

    function update(t, time, instant = false) {
        // slow 3D turn about the network's long axis, with a gentle sway
        inner.rotation.x = time * 0.13;
        inner.rotation.y = Math.sin(time * 0.05) * 0.12;
        const k = instant ? 1 : 0.12;
        hoverAmt += (hoverTarget - hoverAmt) * k;
        for (let i = 0; i < nodes.length; i++) hlNode[i] += (hlNodeTarget[i] - hlNode[i]) * k;
        for (let i = 0; i < edges.length; i++) hlEdge[i] += (hlEdgeTarget[i] - hlEdge[i]) * k;

        nodes.forEach((n, i) => {
            const hold = n.kind === 'hub' ? 1.6 : 0.8;
            const act = n.act < Infinity ? envelope(t, n.act, 0.25, hold, 2.8) : 0;
            nodeLevel[i] = act;
            const dim = 1 - 0.5 * hoverAmt * (1 - hlNode[i]);
            const breathe = n.kind === 'hub' || n.kind === 'hub2' ? 1 + 0.18 * Math.sin(time * 1.2 + n.seed * 9) : 1;
            const I = n.base * breathe * dim + act * 1.1 + hlNode[i] * 0.8;
            nodePts.color.set([n.color.r * I, n.color.g * I, n.color.b * I], i * 3);
            nodePts.size[i] = n.size * (1 + 0.55 * act + 0.35 * hlNode[i]);
        });
        hubs.forEach((h, i) => {
            const n = nodes[h];
            const I = (0.14 + 0.06 * Math.sin(time * 1.2 + n.seed * 9)) * (1 - 0.4 * hoverAmt * (1 - hlNode[h]))
                + nodeLevel[h] * 0.5 + hlNode[h] * 0.3;
            halos.color.set([n.color.r * I, n.color.g * I, n.color.b * I], i * 3);
            halos.size[i] = (n.kind === 'hub' ? 1.5 : 1.0) * (1 + 0.4 * nodeLevel[h]);
        });

        edges.forEach((e, i) => {
            let act = 0;
            for (const [s, f] of edgeAct[i]) act = Math.max(act, envelope(t, s, 0.12, f - s, 1.8));
            const ctx = e.ctx ? 0.15 + 0.85 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t / LOOP) * e.ctx.n + e.ctx.phase)) : 1;
            const dim = 1 - 0.6 * hoverAmt * (1 - hlEdge[i]);
            const I = e.base * ctx * dim + act * 0.6 + hlEdge[i] * 0.45;
            const glow = act * 0.25;
            for (let v = (i * SEG) * 6, end = v + SEG * 6; v < end; v += 3) {
                lineCol[v] = lineBase[v] * I + COL.pulse.r * glow;
                lineCol[v + 1] = lineBase[v + 1] * I + COL.pulse.g * glow;
                lineCol[v + 2] = lineBase[v + 2] * I + COL.pulse.b * glow;
            }
        });

        pulses.forEach((p, i) => {
            const u = (t - p.start) / p.dur;
            const e = edges[p.edge];
            for (let j = 0; j < TRAIL; j++) {
                const o = i * TRAIL + j;
                const uj = u - j * 0.06;
                const on = uj >= 0 && uj <= 1;
                bezier(e, Math.min(1, Math.max(0, uj)), q);
                pulsePts.position.set([q.x, q.y, q.z], o * 3);
                const b = on ? (1 - j / TRAIL) * Math.sqrt(Math.sin(Math.PI * uj)) * 0.9 : 0;
                pulsePts.color.set([COL.pulse.r * b, COL.pulse.g * b, COL.pulse.b * b], o * 3);
                pulsePts.size[o] = 0.22 * (1 - j * 0.18);
            }
        });

        lineGeom.attributes.color.needsUpdate = true;
        for (const pts of [nodePts, halos, pulsePts]) {
            const g = pts.points.geometry;
            g.attributes.color.needsUpdate = true;
            g.attributes.size.needsUpdate = true;
        }
        pulsePts.points.geometry.attributes.position.needsUpdate = true;
    }

    const nodeWorld = (i, out) => inner.localToWorld(out.copy(nodes[i].p));

    return {
        group, materials, update, setHover, hubs, nodeWorld, labels, nodeLevel, hlNode,
        nodeAct: (i) => nodes[i].act,
        entry: modules[0].hub,   // STAT1
        exit: modules[2].hub,    // NLRC5: MHC class I
    };
}
