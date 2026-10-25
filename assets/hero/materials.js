import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Theme, set by hero.js before any material is made. Dark: pure additive light over a
// navy backdrop. Light: ordinary alpha blending over white, colours turned to ink.
export const theme = { light: false };
const additive = {
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
};
const blending = () => (theme.light ? { transparent: true, depthWrite: false, blending: THREE.NormalBlending } : additive);

// Every fragment shader ends in inkOut(): in the dark theme the colour is added as light;
// in the light theme its hue is deepened (near-whites become navy) and its brightness
// becomes opacity, so the same scene reads as ink on paper.
const INK = /* glsl */`
    uniform float uLight;
    vec4 inkOut(vec3 c) {
        if (uLight < 0.5) return vec4(c, 1.0);
        float I = max(max(c.r, c.g), c.b);
        vec3 hue = c / max(I, 1e-4);
        vec3 ink = pow(hue, vec3(1.35)) * 0.82;
        ink = mix(ink, vec3(0.07, 0.13, 0.28), smoothstep(0.55, 0.9, min(min(hue.r, hue.g), hue.b)));
        return vec4(ink, clamp(I * 1.15, 0.0, 1.0));
    }
`;

// Shared uniforms: one object, referenced by every material, updated once per frame.
export const shared = {
    uLight: { value: 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uViewHeight: { value: 800 },
    uFocus: { value: 30 },      // camera distance to the focal plane
    uDof: { value: 0.045 },     // circle-of-confusion growth per unit of defocus
    uGain: { value: 1.45 },     // overall exposure
};

// Soft glowing point sprites with fake depth of field: points away from the focal
// plane grow, soften and dim, which reads as lens blur without a post-process pass.
// Attributes: color (vec3, premultiplied brightness), size (world units), drift (amplitude), seed.
const pointVert = /* glsl */`
    uniform float uTime, uPixelRatio, uViewHeight, uFocus, uDof, uScale;
    attribute vec3 color;
    attribute float size;
    attribute float drift;
    attribute float seed;
    varying vec3 vColor;
    varying float vSoft;
    void main() {
        vec3 p = position;
        if (drift > 0.0) {
            float s = seed * 6.2831;
            p += drift * vec3(sin(uTime * 0.11 + s), cos(uTime * 0.09 + s * 1.7), sin(uTime * 0.07 + s * 2.3));
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float coc = abs(-mv.z - uFocus) * uDof;
        float px = size * uScale * uViewHeight * 0.8 / -mv.z;
        gl_PointSize = clamp(px * (1.0 + coc * 1.6), 1.0, 220.0) * uPixelRatio;
        vColor = color / (1.0 + coc * coc * 2.5);
        vSoft = clamp(coc, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
    }
`;
const pointFrag = /* glsl */`
    uniform float uGain;
    ${INK}
    varying vec3 vColor;
    varying float vSoft;
    void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r2 = dot(d, d) * 4.0;
        if (r2 > 1.0) discard;
        float core = exp(-r2 * mix(18.0, 4.0, vSoft));
        float halo = exp(-r2 * 3.5) * 0.35;
        gl_FragColor = inkOut(vColor * (core + halo) * uGain);
    }
`;

export function pointsMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { ...shared, uScale: { value: 1 } },
        vertexShader: pointVert,
        fragmentShader: pointFrag,
        ...blending(),
    });
}

// Line segments with per-vertex colour (brightness baked in); thin lines get more weight on white.
export function linesMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { ...shared },
        vertexShader: /* glsl */`
            attribute vec3 color;
            varying vec3 vColor;
            void main() { vColor = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
            ${INK}
            varying vec3 vColor;
            void main() { gl_FragColor = inkOut(vColor * (uLight > 0.5 ? 2.4 : 1.0)); }`,
        ...blending(),
    });
}

// Build a Points object from plain arrays. Returns the object plus the typed arrays
// so callers can animate colors in place.
export function makePoints(count, material) {
    const g = new THREE.BufferGeometry();
    const position = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const drift = new Float32Array(count);
    const seed = new Float32Array(count);
    g.setAttribute('position', new THREE.BufferAttribute(position, 3));
    g.setAttribute('color', new THREE.BufferAttribute(color, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    g.setAttribute('drift', new THREE.BufferAttribute(drift, 1));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const points = new THREE.Points(g, material);
    points.frustumCulled = false;
    return { points, position, color, size, drift, seed };
}

// Cells as translucent 3D spheres: the surface is displaced by slow noise (membrane
// ruffling, breathing, blebbing when a cell dies) and shaded with a bright rim, a soft
// key light and a faint texture, so membranes read as glassy shells with a nucleus inside.
const cellVert = /* glsl */`
    uniform float uTime;
    attribute vec3 aCenter, aMove, aColor;
    attribute float aRadius, aSeed, aKind, aState, aShrink, aBleb;
    varying vec3 vN, vV, vObj, vColor;
    varying float vKind, vState, vShrink;
    float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float noise3(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
    }
    void main() {
        vec3 n = normalize(position);
        float s = aSeed * 40.0;
        float amp = aKind > 1.5 ? 0.06 : (aKind > 0.5 ? 0.13 : 0.08);
        float d = (noise3(n * 1.7 + s + uTime * 0.12) - 0.5) * 2.0 * amp
                + (noise3(n * 4.5 + s) - 0.5) * aBleb * 0.35;
        float breath = 1.0 + 0.03 * sin(uTime * 0.6 + s);
        vec3 p = aCenter + aMove + n * aRadius * (1.0 + d) * breath * aShrink;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * n);
        vV = normalize(-mv.xyz);
        vObj = n + s;
        vColor = aColor; vKind = aKind; vState = aState; vShrink = aShrink;
        gl_Position = projectionMatrix * mv;
    }
`;
const cellFrag = /* glsl */`
    uniform float uGain;
    ${INK}
    varying vec3 vN, vV, vObj, vColor;
    varying float vKind, vState, vShrink;
    float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float noise3(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
    }
    void main() {
        vec3 N = normalize(vN), V = normalize(vV);
        float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2);
        vec3 L = normalize(vec3(-0.4, 0.7, 0.6));
        float diff = max(dot(N, L), 0.0);
        float spec = pow(max(dot(reflect(-L, N), V), 0.0), 28.0);
        float tex = 0.8 + 0.4 * noise3(vObj * 6.0);
        vec3 col;
        if (vKind > 1.5) {          // nucleus: a dim inner shell
            col = vColor * (0.05 + 0.45 * fres) * tex * 0.8;
        } else {
            float energy = (0.6 + 0.6 * vState) * (0.5 + 0.5 * vShrink);
            col = vColor * (0.08 + 0.2 * diff + 1.15 * fres) * tex * energy + vec3(1.0) * spec * 0.22 * (1.0 - uLight);
        }
        gl_FragColor = inkOut(col * uGain);
    }
`;

export function cell3dMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { ...shared },
        vertexShader: cellVert,
        fragmentShader: cellFrag,
        ...blending(),
    });
}
