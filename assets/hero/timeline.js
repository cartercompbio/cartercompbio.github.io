// 16-second choreography shared by every layer of the hero.
//   0–4s   genetic variants light up on the helix
//   4–8s   signals propagate through the regulatory network
//   8–12s  tumor/immune cells shift state and interact
//   12–16s everything settles back to the resting configuration
// Every envelope below returns to 0 before the loop wraps, so the loop is seamless.

export const LOOP = 16;

export function smoothstep(a, b, x) {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

// Rise from `start` over `rise` seconds, hold, then decay over `fall` seconds.
export function envelope(t, start, rise, hold, fall) {
    if (t < start || t > start + rise + hold + fall) return 0;
    if (t < start + rise) return smoothstep(start, start + rise, t);
    if (t < start + rise + hold) return 1;
    return 1 - smoothstep(start + rise + hold, start + rise + hold + fall, t);
}

// Deterministic PRNG so the composition is identical on every load.
export function rng(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function gauss(rand) {
    const u = Math.max(rand(), 1e-6);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}
