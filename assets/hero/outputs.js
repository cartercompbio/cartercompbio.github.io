import { rng, smoothstep } from './timeline.js';
import { PALETTE } from './cohort.js';

// What the model outputs, shown in sequence beside its output node (SVG overlay):
//   1. a molecular profile: a small heatmap (genes × patients) that fills in, then
//      re-sorts into three clusters marked with the patient-group colours;
//   2. three-class probability bars in those colours;
//   3. small survival curves (Kaplan–Meier style), one per group.
// All three fade out together before the therapy step.
const ROWS = 5, COLS = 9;
const T = {
    fill: 13.2, sort: [14.6, 15.4], bar: 15.3,   // molecular profile
    probs: [15.6, 16.4],                          // probability bars grow
    curves: [16.4, 17.8],                         // survival curves draw in
    hide: [19.0, 19.7],                           // everything fades before therapy
};
const PROBS = [0.64, 0.25, 0.11];
const HAZARD = [0.35, 0.9, 1.9];   // per group: lower hazard, higher survival
// diverging scale for the heatmap: low → mid → high
const SCALE = ['#3b6fd8', '#eef1f6', '#d6453d'];
const NS = 'http://www.w3.org/2000/svg';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, f) => a.map((x, i) => Math.round(x + (b[i] - x) * f));
const el = (name, attrs, parent) => {
    const e = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.append(e);
    return e;
};

export function createOutputs({ mobile, layer }) {
    const rand = rng(53);
    const [lo, mid, hi] = SCALE.map(hex);
    const groups = PALETTE.groups;
    const cell = mobile ? 7 : 11, gap = 1, barH = mobile ? 3 : 4;
    const H = ROWS * (cell + gap) + barH + 3;          // shared panel height
    const panels = [];
    const panel = (width, label) => {
        const svg = el('svg', { class: 'hero__output', width, height: H, 'aria-hidden': 'true' });
        layer.append(svg);
        const tag = document.createElement('div');
        tag.className = 'hero__output-tag';
        tag.textContent = label;
        layer.append(tag);
        const p = { svg, tag, width };
        panels.push(p);
        return p;
    };

    // 1. Molecular profile: each column (patient) belongs to a cluster with its own pattern
    const PATTERN = [[1, 0.8, -0.6, -0.8, 0], [-0.8, 0.2, 1, 0.6, -0.6], [-0.4, -0.9, -0.2, 0.4, 1]];
    const cols = Array.from({ length: COLS }, (_, c) => ({ group: c % 3, order: 0 }));
    cols.sort(() => rand() - 0.5);
    [...cols].sort((a, b) => a.group - b.group).forEach((col, k) => { col.order = k; });
    const heat = panel(COLS * (cell + gap), 'Molecular profile');
    cols.forEach((col) => {
        col.g = el('g', {}, heat.svg);
        col.bar = el('rect', { width: cell, height: barH, fill: groups[col.group] }, col.g);
        PATTERN[col.group].forEach((p, r) => {
            const val = Math.max(-1, Math.min(1, p * 0.8 + (rand() - 0.5) * 0.6));
            const rgb = val < 0 ? mix(mid, lo, -val) : mix(mid, hi, val);
            el('rect', { y: barH + 3 + r * (cell + gap), width: cell, height: cell, rx: 1.5, fill: `rgb(${rgb.join(',')})` }, col.g);
        });
    });

    // 2. Three-class probability bars on a baseline
    const bw = mobile ? 9 : 13, bgap = mobile ? 5 : 7;
    const probs = panel(3 * bw + 2 * bgap, 'Class probability');
    el('line', { x1: 0, x2: probs.width, y1: H - 0.5, y2: H - 0.5, class: 'hero__output-axis' }, probs.svg);
    const bars = PROBS.map((p, g) => el('rect', { x: g * (bw + bgap), width: bw, rx: 1.5, fill: groups[g] }, probs.svg));

    // 3. Survival curves: stepped exp(-hazard·t) per group, drawn left to right
    const cw = mobile ? 70 : 104;
    const surv = panel(cw, 'Survival');
    el('path', { d: `M0.5 0 V${H - 0.5} H${cw}`, class: 'hero__output-axis', fill: 'none' }, surv.svg);
    const curves = HAZARD.map((k, g) => {
        let d = 'M1 2';
        for (let i = 1; i <= 10; i++) {
            const x = 1 + ((cw - 4) * i) / 10;
            const s = Math.exp(-k * (i / 10) * 1.6);
            d += ` H${x.toFixed(1)} V${(2 + (H - 6) * (1 - s)).toFixed(1)}`;
        }
        const path = el('path', { d, fill: 'none', stroke: groups[g], 'stroke-width': 2, 'stroke-linejoin': 'round' }, surv.svg);
        path.len = path.getTotalLength ? path.getTotalLength() : 300;
        path.style.strokeDasharray = path.len;
        return path;
    });

    const s = { x: 0, y: 0 };
    const sp = mobile ? 10 : 22;   // space between panels
    // project: (worldVector, out {x, y}) → screen pixels; anchor: the model's output node
    function update(t, project, anchor) {
        project(anchor, s);
        const show = 1 - smoothstep(T.hide[0], T.hide[1], t);
        // a row to the right of the output node (desktop) or centred under it (phones)
        const total = panels.reduce((a, p) => a + Math.max(p.width, p.tag.offsetWidth), 0) + sp * (panels.length - 1);
        let x = mobile ? s.x - total / 2 : s.x + 26;
        const y = mobile ? s.y + 18 : s.y - H / 2;
        const appear = [T.fill, T.probs[0], T.curves[0]];
        panels.forEach((p, i) => {
            const vis = smoothstep(appear[i], appear[i] + 0.4, t) * show;
            p.svg.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            p.svg.style.opacity = vis.toFixed(3);
            p.tag.style.transform = `translate(${x.toFixed(1)}px, ${(y + H + 4).toFixed(1)}px)`;
            p.tag.style.opacity = vis.toFixed(3);
            x += Math.max(p.width, p.tag.offsetWidth) + sp;   // leave room for the wider of chart and label
        });

        const sort = smoothstep(T.sort[0], T.sort[1], t);
        cols.forEach((col, c) => {
            col.g.setAttribute('transform', `translate(${((c + (col.order - c) * sort) * (cell + gap)).toFixed(1)} 0)`);
            col.g.style.opacity = smoothstep(T.fill + c * 0.12, T.fill + c * 0.12 + 0.3, t).toFixed(3);
            col.bar.style.opacity = smoothstep(T.bar + col.order * 0.05, T.bar + col.order * 0.05 + 0.3, t).toFixed(3);
        });
        const grow = smoothstep(T.probs[0], T.probs[1], t);
        bars.forEach((b, g) => {
            const h = PROBS[g] * (H - 2) * grow;
            b.setAttribute('y', (H - 1 - h).toFixed(1));
            b.setAttribute('height', h.toFixed(1));
        });
        curves.forEach((path, g) => {
            const draw = smoothstep(T.curves[0] + g * 0.15, T.curves[1] + g * 0.15, t);
            path.style.strokeDashoffset = (path.len * (1 - draw)).toFixed(1);
        });
    }

    return { update };
}
