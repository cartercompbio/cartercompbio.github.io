import { envelope, rng, smoothstep } from './timeline.js';
import { PALETTES } from './cohort.js';

// The model's output as a molecular profile: a small heatmap (genes × patients) beside
// the output node. It fills in column by column after the forward pass, then the
// columns re-sort into three clusters and a colour bar marks each cluster with its
// patient-group colour, setting up the stratification below.
const ROWS = 5, COLS = 9;
const FILL = 13.2, SORT = [15.0, 15.9], BAR = 15.8, HIDE = [22.4, 23.2];
// diverging scale: low → mid → high
const SCALE = {
    light: ['#3b6fd8', '#eef1f6', '#d6453d'],
    dark: ['#4fa8ff', '#1a2745', '#ff7a6b'],
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, f) => a.map((x, i) => Math.round(x + (b[i] - x) * f));

export function createProfile({ mobile, light, layer }) {
    const rand = rng(53);
    const [lo, mid, hi] = SCALE[light ? 'light' : 'dark'].map(hex);
    const groups = PALETTES[light ? 'light' : 'dark'].groups;
    const cell = mobile ? 7 : 11, gap = 1, barH = mobile ? 3 : 4;

    // each column (patient) belongs to a cluster with its own up/down gene pattern
    const PATTERN = [[1, 0.8, -0.6, -0.8, 0], [-0.8, 0.2, 1, 0.6, -0.6], [-0.4, -0.9, -0.2, 0.4, 1]];
    const cols = Array.from({ length: COLS }, (_, c) => ({ group: c % 3, order: 0 }));
    cols.sort(() => rand() - 0.5);
    [...cols].sort((a, b) => a.group - b.group).forEach((col, k) => { col.order = k; });
    cols.forEach((col) => {
        col.values = PATTERN[col.group].map((p) => Math.max(-1, Math.min(1, p * 0.8 + (rand() - 0.5) * 0.6)));
    });

    const NS = 'http://www.w3.org/2000/svg';
    const w = COLS * (cell + gap), h = ROWS * (cell + gap) + barH + 3;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'hero__profile');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('aria-hidden', 'true');
    const colEls = cols.map((col) => {
        const g = document.createElementNS(NS, 'g');
        const bar = document.createElementNS(NS, 'rect');
        bar.setAttribute('width', cell);
        bar.setAttribute('height', barH);
        bar.setAttribute('fill', groups[col.group]);
        g.append(bar);
        col.values.forEach((val, r) => {
            const rect = document.createElementNS(NS, 'rect');
            rect.setAttribute('y', barH + 3 + r * (cell + gap));
            rect.setAttribute('width', cell);
            rect.setAttribute('height', cell);
            rect.setAttribute('rx', 1.5);
            const rgb = val < 0 ? mix(mid, lo, -val) : mix(mid, hi, val);
            rect.setAttribute('fill', `rgb(${rgb.join(',')})`);
            g.append(rect);
        });
        svg.append(g);
        return { g, bar };
    });
    layer.append(svg);
    const tag = document.createElement('div');
    tag.className = 'hero__profile-tag';
    tag.textContent = 'Molecular profile';
    layer.append(tag);

    const s = { x: 0, y: 0 };
    // project: (worldVector, out {x, y}) → screen pixels; anchor: the model's output node
    function update(t, project, anchor) {
        project(anchor, s);
        const x0 = s.x + 26, y0 = s.y - h / 2;
        const sort = smoothstep(SORT[0], SORT[1], t);
        const show = t < HIDE[0] ? 1 : 1 - smoothstep(HIDE[0], HIDE[1], t);
        cols.forEach((col, c) => {
            const fill = smoothstep(FILL + c * 0.12, FILL + c * 0.12 + 0.3, t) * show;
            const x = (c + (col.order - c) * sort) * (cell + gap);
            colEls[c].g.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
            colEls[c].g.style.opacity = fill.toFixed(3);
            colEls[c].bar.style.opacity = smoothstep(BAR + col.order * 0.05, BAR + col.order * 0.05 + 0.3, t).toFixed(3);
        });
        svg.style.transform = `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px)`;
        tag.style.transform = `translate(${x0.toFixed(1)}px, ${(y0 + h + 4).toFixed(1)}px)`;
        tag.style.opacity = (envelope(t, FILL, 0.5, HIDE[0] - FILL - 0.5, HIDE[1] - HIDE[0])).toFixed(3);
    }

    return { update };
}
