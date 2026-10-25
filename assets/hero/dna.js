import * as THREE from 'three';
import { pointsMaterial, linesMaterial, makePoints } from './materials.js';
import { envelope, rng, smoothstep } from './timeline.js';

const LENGTH = 13;
const RADIUS = 1.0;
const RISE = 0.34;                 // B-DNA: 0.34 nm per bp, ~10.5 bp per turn
const BP_PER_TURN = 10.5;
const GROOVE = Math.PI * 0.72;     // strand offset -> distinct major and minor grooves

const C = {
    teal: new THREE.Color('#2ec4b6'),
    cyan: new THREE.Color('#4fe3ff'),
    violet: new THREE.Color('#8b7cff'),
    indigo: new THREE.Color('#4f5bd5'),
    gold: new THREE.Color('#ffc857'),
};
const BASE_COLORS = [C.teal, C.cyan, C.violet, C.indigo];

// Variant base pairs and when (seconds into the loop) each one lights up.
// Gold: inherited (germline) variants. Cyan: somatic mutations acquired in the tumour.
const VARIANTS = [
    { bp: 8, at: 0.5, kind: 'germline', change: 'A>G' },
    { bp: 15, at: 1.2, kind: 'somatic', change: 'C>T' },
    { bp: 21, at: 1.9, kind: 'germline', change: 'G>A' },
    { bp: 27, at: 2.6, kind: 'somatic', change: 'C>A' },
    { bp: 32, at: 3.15, kind: 'somatic', change: 'C>T' },
].map((v) => ({ ...v, color: v.kind === 'germline' ? C.gold : C.cyan }));
const variantEnvelope = (t, v) => envelope(t, v.at, 0.35, 0.9, 3.6);

const endFade = (y) => smoothstep(LENGTH / 2, LENGTH / 2 - 2.8, Math.abs(y));

export function createDNA({ mobile }) {
    const rand = rng(11);
    const group = new THREE.Group();   // positioned/tilted by the layout
    const helix = new THREE.Group();   // spins slowly about its own axis
    group.add(helix);

    const nbp = Math.floor(LENGTH / RISE);
    const strandAngle = (y) => ((y + LENGTH / 2) / RISE) * (2 * Math.PI / BP_PER_TURN);
    const strandPoint = (y, offset, out) =>
        out.set(RADIUS * Math.cos(strandAngle(y) + offset), y, RADIUS * Math.sin(strandAngle(y) + offset));

    // Backbones: dense, softly jittered points along both strands.
    const perStrand = mobile ? 260 : 520;
    const backbone = makePoints(perStrand * 2, pointsMaterial());
    const v = new THREE.Vector3();
    const tmp = new THREE.Color();
    for (let s = 0; s < 2; s++) {
        for (let i = 0; i < perStrand; i++) {
            const k = s * perStrand + i;
            const y = -LENGTH / 2 + (i / (perStrand - 1)) * LENGTH;
            strandPoint(y, s * GROOVE, v);
            backbone.position.set([v.x + (rand() - 0.5) * 0.05, v.y, v.z + (rand() - 0.5) * 0.05], k * 3);
            tmp.copy(C.teal).lerp(C.indigo, i / perStrand).multiplyScalar(0.8 * endFade(y));
            backbone.color.set([tmp.r, tmp.g, tmp.b], k * 3);
            backbone.size[k] = 0.075 + rand() * 0.05;
        }
    }
    helix.add(backbone.points);

    // Base pairs: a rung between the strands plus two base points per pair.
    const rungPos = new Float32Array(nbp * 6);
    const rungCol = new Float32Array(nbp * 6);
    const bases = makePoints(nbp * 2, pointsMaterial());
    const rungs = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let k = 0; k < nbp; k++) {
        const y = -LENGTH / 2 + (k + 0.5) * RISE;
        strandPoint(y, 0, a);
        strandPoint(y, GROOVE, b);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const p1 = a.clone().lerp(mid, 0.12), p2 = b.clone().lerp(mid, 0.12);
        rungPos.set([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z], k * 6);
        const q1 = a.clone().lerp(b, 0.3), q2 = a.clone().lerp(b, 0.7);
        bases.position.set([q1.x, q1.y, q1.z, q2.x, q2.y, q2.z], k * 6);
        const pair = Math.floor(rand() * 2) * 2;   // A–T or G–C style colour pair
        rungs.push({ mid, fade: endFade(y), c1: BASE_COLORS[pair], c2: BASE_COLORS[pair + 1] });
    }
    const rungGeom = new THREE.BufferGeometry();
    rungGeom.setAttribute('position', new THREE.BufferAttribute(rungPos, 3));
    rungGeom.setAttribute('color', new THREE.BufferAttribute(rungCol, 3));
    helix.add(new THREE.LineSegments(rungGeom, linesMaterial()));
    helix.add(bases.points);

    // A soft halo per variant, sitting on the rung midpoint.
    const halos = makePoints(VARIANTS.length, pointsMaterial());
    VARIANTS.forEach((vt, i) => {
        const m = rungs[vt.bp].mid;
        halos.position.set([m.x, m.y, m.z], i * 3);
        halos.size[i] = 0.9;
    });
    helix.add(halos.points);

    // Particles drifting in a loose sheath around the helix (not spun with it).
    const nDust = mobile ? 90 : 220;
    const dust = makePoints(nDust, pointsMaterial());
    for (let i = 0; i < nDust; i++) {
        const ang = rand() * Math.PI * 2, r = 1.6 + rand() * 2.2, y = (rand() - 0.5) * LENGTH * 1.1;
        dust.position.set([r * Math.cos(ang), y, r * Math.sin(ang)], i * 3);
        tmp.copy(rand() < 0.6 ? C.cyan : C.violet).multiplyScalar((0.12 + rand() * 0.2) * endFade(y * 0.9));
        dust.color.set([tmp.r, tmp.g, tmp.b], i * 3);
        dust.size[i] = 0.04 + rand() * 0.06;
        dust.drift[i] = 0.25 + rand() * 0.45;
        dust.seed[i] = rand();
    }
    group.add(dust.points);

    const materials = [backbone, bases, halos, dust].map((p) => p.points.material);
    const variantLevel = new Float32Array(nbp);
    const variantColor = new Array(nbp).fill(null);

    function update(t, time) {
        helix.rotation.y = time * 0.07;   // ~90 s per revolution

        variantLevel.fill(0);
        VARIANTS.forEach((vt, i) => {
            const e = variantEnvelope(t, vt);
            variantLevel[vt.bp] = e;
            variantColor[vt.bp] = vt.color;
            const h = e * 0.9;
            halos.color.set([vt.color.r * h, vt.color.g * h, vt.color.b * h], i * 3);
        });

        for (let k = 0; k < nbp; k++) {
            const r = rungs[k], e = variantLevel[k], f = r.fade;
            for (let end = 0; end < 2; end++) {
                tmp.copy(end ? r.c2 : r.c1).multiplyScalar(0.4 * f);
                if (e > 0) tmp.lerp(variantColor[k], e).multiplyScalar(1 + e * 2.2);
                rungCol.set([tmp.r, tmp.g, tmp.b], k * 6 + end * 3);
                bases.color.set([tmp.r * 1.6, tmp.g * 1.6, tmp.b * 1.6], k * 6 + end * 3);
                bases.size[k * 2 + end] = 0.13 + 0.22 * e;
            }
        }
        rungGeom.attributes.color.needsUpdate = true;
        bases.points.geometry.attributes.color.needsUpdate = true;
        bases.points.geometry.attributes.size.needsUpdate = true;
        halos.points.geometry.attributes.color.needsUpdate = true;
    }

    // World position of the last variant, where the cross-scale signal departs.
    function signalOrigin(out) {
        return helix.localToWorld(out.copy(rungs[VARIANTS[VARIANTS.length - 1].bp].mid));
    }

    // For on-screen labels: each variant's notation, timing and current world position.
    const variants = VARIANTS.map((v) => ({ text: v.change, kind: v.kind, at: v.at, color: v.color }));
    const levelOf = (i, t) => variantEnvelope(t, VARIANTS[i]);
    const variantWorld = (i, out) => helix.localToWorld(out.copy(rungs[VARIANTS[i].bp].mid));

    return { group, materials, update, signalOrigin, variants, variantLevel: levelOf, variantWorld, length: LENGTH };
}
