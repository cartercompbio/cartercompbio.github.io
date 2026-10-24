import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Shared uniforms: one object, referenced by every material, updated once per frame.
// Pure additive colour (alpha left untouched); everything glows over the backdrop.
const additive = {
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
};

export const shared = {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uViewHeight: { value: 800 },
    uFocus: { value: 30 },      // camera distance to the focal plane
    uDof: { value: 0.045 },     // circle-of-confusion growth per unit of defocus
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
    varying vec3 vColor;
    varying float vSoft;
    void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r2 = dot(d, d) * 4.0;
        if (r2 > 1.0) discard;
        float core = exp(-r2 * mix(18.0, 4.0, vSoft));
        float halo = exp(-r2 * 3.5) * 0.35;
        gl_FragColor = vec4(vColor * (core + halo), 1.0);
    }
`;

export function pointsMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { ...shared, uScale: { value: 1 } },
        vertexShader: pointVert,
        fragmentShader: pointFrag,
        ...additive,
    });
}

export function linesMaterial() {
    return new THREE.LineBasicMaterial({ vertexColors: true, ...additive });
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

// Translucent cells drawn procedurally on camera-facing quads: a deforming membrane
// rim, faint cytoplasm with granular texture, and an off-centre nucleus.
// Cheaper and softer than meshing every cell.
const cellVert = /* glsl */`
    uniform float uTime, uFocus, uDof, uScale;
    attribute vec3 aCenter;
    attribute vec3 aMove;
    attribute float aRadius;
    attribute float aSeed;
    attribute float aKind;      // 0 tumor, 1 immune
    attribute vec3 aColor;
    attribute float aState;     // 0 rest .. 1 fully engaged
    varying vec2 vUv;
    varying vec3 vColor;
    varying float vSeed, vKind, vState, vBlur;
    void main() {
        float breath = 1.0 + 0.025 * sin(uTime * 0.6 + aSeed * 40.0);
        vec4 mv = modelViewMatrix * vec4(aCenter + aMove, 1.0);
        mv.xy += position.xy * aRadius * 2.6 * breath * uScale;
        float coc = abs(-mv.z - uFocus) * uDof;
        vBlur = clamp(coc * 0.9, 0.0, 1.0);
        vUv = position.xy * 2.6;     // cell radius maps to |vUv| = 1
        vColor = aColor;
        vSeed = aSeed; vKind = aKind; vState = aState;
        gl_Position = projectionMatrix * mv;
    }
`;
const cellFrag = /* glsl */`
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vColor;
    varying float vSeed, vKind, vState, vBlur;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }

    void main() {
        float r = length(vUv);
        float a = atan(vUv.y, vUv.x);
        float s = vSeed * 31.0;
        float t = uTime;
        // membrane outline: gentle lobes for tumor cells, small pseudopod-like bulges for immune cells
        float R = 1.0
            + mix(0.035, 0.05, vKind) * sin(mix(3.0, 2.0, vKind) * a + t * 0.35 + s)
            + 0.025 * sin(5.0 * a - t * 0.27 + s * 1.3)
            + vKind * 0.012 * sin(7.0 * a + t * 0.5 + s * 0.7);
        float d = r - R;
        float w = mix(0.035, 0.22, vBlur);
        float rim = exp(-(d * d) / (w * w));
        float inside = 1.0 - smoothstep(-w, w, d);
        float glow = exp(-max(d, 0.0) * 5.0) * 0.18 * (1.0 - inside);

        // cytoplasm: brighter toward the membrane (translucent shell), granular texture
        float shell = pow(clamp(r / R, 0.0, 1.0), 3.0);
        float gran = noise(vUv * 7.0 + s) * noise(vUv * 15.0 - s + t * 0.05);
        float cyto = inside * (0.05 + 0.16 * shell + 0.12 * gran * (1.0 - vBlur));

        // nucleus, offset and slightly lobed; larger in tumor cells
        vec2 nc = vUv - vec2(sin(s) * 0.12, cos(s) * 0.12);
        float nr = length(nc);
        float na = atan(nc.y, nc.x);
        float NR = mix(0.48, 0.55, vKind) * (1.0 + 0.06 * sin(3.0 * na + s + t * 0.2));
        float nd = nr - NR;
        float nw = mix(0.04, 0.2, vBlur);
        float nucRim = exp(-(nd * nd) / (nw * nw)) * 0.45;
        float nucFill = (1.0 - smoothstep(-nw, nw, nd)) * (0.10 + 0.10 * noise(nc * 9.0 + s));

        float energy = 0.42 + 0.3 * vKind + 0.6 * vState;
        vec3 rimCol = mix(vColor, vec3(1.0, 0.95, 0.9), 0.18 * vState);
        vec3 col = rimCol * (rim * 0.85 + glow) + vColor * (cyto + nucRim + nucFill) * 0.85;
        col *= energy * (1.0 - 0.45 * vBlur);
        gl_FragColor = vec4(col, 1.0);
    }
`;

export function cellsMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { ...shared, uScale: { value: 1 } },
        vertexShader: cellVert,
        fragmentShader: cellFrag,
        ...additive,
    });
}
