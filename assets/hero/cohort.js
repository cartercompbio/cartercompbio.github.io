import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { envelope, rng, smoothstep } from './timeline.js';

// Patients and therapeutics, drawn as SVG icons in an overlay and placed from world
// coordinates each frame. The model's prediction stratifies a uniform cohort into three
// colour-coded groups (16–20 s); a therapy then reaches each group (20–23 s) before the
// cohort merges back into one row.
const NEUTRAL = new THREE.Color('#cdd6ff');
const GROUPS = ['#2ec4b6', '#b3a8ff', '#ff8a78'].map((c) => new THREE.Color(c));
const SCAN = 16.3, SPLIT = [17.2, 18.6], MERGE = [22.6, 23.7];
const DOSE = 20.0;   // syringes set off, one group after another

const PERSON = '<svg viewBox="0 0 20 24" aria-hidden="true"><circle cx="10" cy="5.5" r="4.3"/><path d="M2 23.5C2 15.8 5.6 11.8 10 11.8s8 4 8 11.7z"/></svg>';
const SYRINGE = '<svg viewBox="0 0 14 44" aria-hidden="true"><rect x="5" y="0" width="4" height="2.4" rx="1"/><rect x="6.2" y="2" width="1.6" height="8"/>' +
    '<rect x="2" y="9.5" width="10" height="2" rx="1"/><rect x="3.5" y="11" width="7" height="20" rx="1.6" fill-opacity="0.35" stroke="currentColor" stroke-width="1.2"/>' +
    '<rect x="3.5" y="21" width="7" height="10" rx="1"/><rect x="6.3" y="31" width="1.4" height="12"/></svg>';

export function createCohort({ mobile, layer }) {
    const rand = rng(41);
    const n = mobile ? 12 : 24;
    const make = (cls, html) => {
        const el = document.createElement('div');
        el.className = cls;
        el.innerHTML = html;
        layer.append(el);
        return el;
    };
    const patients = Array.from({ length: n }, (_, i) => ({ el: make('hero__patient', PERSON), group: 0, slot: 0, i }));
    // deterministic, interleaved group assignment so every group draws from the whole row
    const order = patients.map((p, i) => i).sort(() => rand() - 0.5);
    order.forEach((idx, k) => { patients[idx].group = k % 3; });
    const counts = [0, 0, 0];
    patients.forEach((p) => { p.slot = counts[p.group]++; });

    const syringes = GROUPS.map(() => make('hero__syringe', SYRINGE));
    const rings = GROUPS.map(() => make('hero__ring', ''));
    const title = make('hero__cohort-title', '');
    title.textContent = 'Patients';
    const tag = make('hero__therapy-tag', '');
    tag.textContent = 'Therapeutics';

    // world-space layout
    let row = [], home = [], groupCenter = [];
    const from = new THREE.Vector3(), rowLeft = new THREE.Vector3();
    function layout({ centerX, y, width, rowGap, source }) {
        const cols = mobile ? 2 : 4;
        const sx = width * (mobile ? 0.07 : 0.045), sy = rowGap;
        row = patients.map((p, i) => new THREE.Vector3(centerX - width / 2 + (width * i) / (n - 1), y, 0));
        groupCenter = [-1, 0, 1].map((k) => new THREE.Vector3(centerX + k * width * 0.33, y - sy * 0.5, 0));
        home = patients.map((p) => {
            const g = groupCenter[p.group], rows = Math.ceil(counts[p.group] / cols);
            const c = p.slot % cols, r = Math.floor(p.slot / cols);
            return new THREE.Vector3(g.x + (c - (cols - 1) / 2) * sx, g.y + ((rows - 1) / 2 - r) * sy, 0);
        });
        from.copy(source);
        rowLeft.set(centerX - width / 2, y + rowGap * 1.1, 0);
    }

    const v = new THREE.Vector3(), s = { x: 0, y: 0 }, tmp = new THREE.Color();
    const place = (el, x, y, extra = '') => { el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)${extra}`; };
    const css = (c) => `rgb(${(c.r * 255) | 0}, ${(c.g * 255) | 0}, ${(c.b * 255) | 0})`;

    // project: (worldVector, out {x, y}) → screen pixels
    function update(t, project) {
        const split = smoothstep(SPLIT[0], SPLIT[1], t) * (1 - smoothstep(MERGE[0], MERGE[1], t));
        const tint = smoothstep(SPLIT[0] + 0.2, SPLIT[1] - 0.2, t) * (1 - smoothstep(MERGE[0], MERGE[1] - 0.1, t));
        patients.forEach((p, i) => {
            v.copy(row[i]).lerp(home[i], split);
            project(v, s);
            const scan = envelope(t, SCAN + i * (0.9 / n), 0.15, 0.15, 0.5);
            const dose = envelope(t, DOSE + 1.5 + p.group * 0.35, 0.3, 0.6, 0.9);
            tmp.copy(NEUTRAL).lerp(GROUPS[p.group], tint).lerp(NEUTRAL, scan * 0.6);
            p.el.style.color = css(tmp);
            p.el.style.opacity = (0.55 + 0.45 * Math.max(scan, tint * 0.8, dose)).toFixed(3);
            place(p.el, s.x, s.y, ` scale(${(1 + 0.25 * scan + 0.18 * dose).toFixed(3)})`);
        });

        // syringes travel from the model's prediction to above each group, then dip in
        syringes.forEach((el, g) => {
            const start = DOSE + g * 0.35;
            const travel = smoothstep(start, start + 1.3, t);
            const dip = envelope(t, start + 1.3, 0.25, 0.3, 0.4);
            const vis = envelope(t, start, 0.3, 1.9, 0.6);
            v.copy(from).lerp(groupCenter[g], travel);
            project(v, s);
            el.style.color = css(GROUPS[g]);
            el.style.opacity = vis.toFixed(3);
            place(el, s.x, s.y - 46 + dip * 14);   // hover above the group, dip to inject
            const pulse = Math.max(0, Math.min(1, (t - start - 1.45) / 1.1));
            project(groupCenter[g], s);
            rings[g].style.borderColor = css(GROUPS[g]);
            rings[g].style.opacity = (pulse > 0 && pulse < 1 ? (1 - pulse) * 0.9 : 0).toFixed(3);
            place(rings[g], s.x, s.y, ` scale(${(0.4 + pulse * 2.2).toFixed(3)})`);
        });

        project(rowLeft, s);
        title.style.transform = `translate(${Math.max(16, s.x).toFixed(1)}px, ${s.y.toFixed(1)}px) translateY(-100%)`;
        const tagLevel = envelope(t, DOSE + 0.3, 0.5, 2.2, 0.6);
        tag.style.opacity = tagLevel.toFixed(3);
        project(v.copy(from).lerp(groupCenter[1], 0.55), s);
        place(tag, s.x + 70, s.y);
    }

    const center = (out) => out.copy(groupCenter[1]);
    return { layout, update, center };
}
