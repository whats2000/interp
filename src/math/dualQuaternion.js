// Dual Quaternion ScLERP on TS³
// Format: [wr, xr, yr, zr, wd, xd, yd, zd]
// Real part (rotation quat) + dual part (translation-encoding quat)

import { EPSILON, clamp } from './utils.js';
import { quaternionNormalize } from './quaternion.js';

// --- Basic quaternion helpers (no Three.js) ---

function quatMul(a, b) {
  const [aw, ax, ay, az] = a;
  const [bw, bx, by, bz] = b;
  return [
    aw*bw - ax*bx - ay*by - az*bz,
    aw*bx + ax*bw + ay*bz - az*by,
    aw*by - ax*bz + ay*bw + az*bx,
    aw*bz + ax*by - ay*bx + az*bw,
  ];
}

function quatConjugate(q) {
  return [q[0], -q[1], -q[2], -q[3]];
}

function quatDot(a, b) {
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3];
}

function quatScale(q, s) {
  return [q[0]*s, q[1]*s, q[2]*s, q[3]*s];
}

function quatAdd(a, b) {
  return [a[0]+b[0], a[1]+b[1], a[2]+b[2], a[3]+b[3]];
}

function quatNorm(q) {
  return Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
}

// --- Dual quaternion operations ---

/**
 * Multiply two dual quaternions â = a_r + ε·a_d and b̂ = b_r + ε·b_d.
 * Result: (a_r·b_r) + ε·(a_r·b_d + a_d·b_r)
 */
export function dualQuatMultiply(a, b) {
  const ar = a.slice(0, 4);
  const ad = a.slice(4, 8);
  const br = b.slice(0, 4);
  const bd = b.slice(4, 8);

  const realPart = quatMul(ar, br);
  const dualPart = quatAdd(quatMul(ar, bd), quatMul(ad, br));

  return [...realPart, ...dualPart];
}

/**
 * Conjugate of a dual quaternion: conjugate both real and dual parts.
 * q̂* = q_r* + ε·q_d*
 */
export function dualQuatConjugate(dq) {
  return [
    ...quatConjugate(dq.slice(0, 4)),
    ...quatConjugate(dq.slice(4, 8)),
  ];
}

/**
 * Normalize a unit dual quaternion.
 * For a unit DQ: |q_r| = 1 and q_r · q_d = 0.
 */
export function dualQuatNormalize(dq) {
  const qr = dq.slice(0, 4);
  const qd = dq.slice(4, 8);
  const norm = quatNorm(qr);
  if (norm < EPSILON) return [1,0,0,0, 0,0,0,0];
  const qrN = qr.map(v => v / norm);
  const qrDot = quatDot(qrN, qd) / norm;
  // Remove component of qd along qr to satisfy unit constraint
  const qdN = qd.map((v, i) => (v - qrDot * qr[i]) / norm);
  return [...qrN, ...qdN];
}

/**
 * Logarithm of a unit dual quaternion.
 * For q̂ = q_r + ε·q_d where q_r = cos(θ/2) + sin(θ/2)·ω̂
 * log(q̂) = θ/2·ω̂ + ε·(d/2·ω̂ + moment)
 *
 * Actually for ScLERP we compute:
 * log(q̂) = (1/2)·(θ·ω̂ + ε·(d·ω̂ + θ×moment))
 * using the twist representation.
 */
export function dualQuatLog(dq) {
  const qr = dq.slice(0, 4);
  const qd = dq.slice(4, 8);

  // q_r = [cos(θ/2), sin(θ/2)·ω̂]
  const w = clamp(qr[0], -1, 1);
  const halfTheta = Math.acos(w);
  const sinHalfTheta = Math.sin(halfTheta);

  let omega, d, moment;

  if (sinHalfTheta < EPSILON) {
    // Near identity rotation — log ≈ [0, 0; translation/2, 0]
    // Translation is 2 * q_r* · q_d
    const tVec = quatMul(quatConjugate(qr), qd);
    omega = [0, 0, 0];
    // pure translation log: [0 + ε·t]
    return [0, 0, 0, 0, 0, tVec[1], tVec[2], tVec[3]];
  }

  omega = [qr[1]/sinHalfTheta, qr[2]/sinHalfTheta, qr[3]/sinHalfTheta];

  // d = -2 * q_d[0] / sin(θ/2) ... from dual quat theory
  // moment = (q_d_vec - d/2 * sin(θ/2) * omega) / sin(θ/2)
  //   where q_d_vec = [qd[1], qd[2], qd[3]]
  d = -2 * qd[0] / sinHalfTheta;
  const qdVec = [qd[1], qd[2], qd[3]];
  const omDotQd = omega[0]*qdVec[0] + omega[1]*qdVec[1] + omega[2]*qdVec[2];
  moment = [
    (qdVec[0] - omega[0] * omDotQd + d/2 * sinHalfTheta * omega[0]) / sinHalfTheta,
    (qdVec[1] - omega[1] * omDotQd + d/2 * sinHalfTheta * omega[1]) / sinHalfTheta,
    (qdVec[2] - omega[2] * omDotQd + d/2 * sinHalfTheta * omega[2]) / sinHalfTheta,
  ];

  // log result as a "pure dual quaternion" (twist): [0, halfθ·ω̂, 0, d/2·ω̂ + moment]
  // Storing as real-part = [0, halfTheta*omega] and dual = [0, d/2*omega + moment]
  return [
    0,
    halfTheta * omega[0],
    halfTheta * omega[1],
    halfTheta * omega[2],
    0,
    d/2 * omega[0] + moment[0],
    d/2 * omega[1] + moment[1],
    d/2 * omega[2] + moment[2],
  ];
}

/**
 * Exponential of a "pure" dual quaternion (twist).
 * Input: [0, θ/2·ω̂, 0, d/2·ω̂ + moment]
 */
export function dualQuatExp(dq) {
  const rVec = [dq[1], dq[2], dq[3]];
  const dVec = [dq[5], dq[6], dq[7]];

  const halfTheta = Math.sqrt(rVec[0]*rVec[0] + rVec[1]*rVec[1] + rVec[2]*rVec[2]);

  if (halfTheta < EPSILON) {
    // Pure translation
    return [1, 0, 0, 0, 0, dVec[0], dVec[1], dVec[2]];
  }

  const cosHT = Math.cos(halfTheta);
  const sinHT = Math.sin(halfTheta);
  const omegaHat = [rVec[0]/halfTheta, rVec[1]/halfTheta, rVec[2]/halfTheta];

  const omDotD = omegaHat[0]*dVec[0] + omegaHat[1]*dVec[1] + omegaHat[2]*dVec[2];

  // Real part of exp: cos(θ/2) + sin(θ/2)·ω̂
  const qr = [cosHT, sinHT*omegaHat[0], sinHT*omegaHat[1], sinHT*omegaHat[2]];

  // Dual part: q_d = [-sin(θ/2)·(ω̂·s), sin(θ/2)·s_perp + cos(θ/2)·s_par]
  // where s_par = (ω̂·s)·ω̂ and s_perp = s - s_par
  const qd = [
    -sinHT * omDotD,
    sinHT * (dVec[0] - omDotD*omegaHat[0]) + cosHT * omDotD * omegaHat[0],
    sinHT * (dVec[1] - omDotD*omegaHat[1]) + cosHT * omDotD * omegaHat[1],
    sinHT * (dVec[2] - omDotD*omegaHat[2]) + cosHT * omDotD * omegaHat[2],
  ];

  return [...qr, ...qd];
}

/**
 * Convert a pose (unit quaternion q + translation t) to a unit dual quaternion.
 * q̂ = q_r + ε · (1/2 · t · q_r)
 *
 * @param {number[]} q - Unit quaternion [w, x, y, z]
 * @param {number[]} t - Translation vector [x, y, z]
 * @returns {number[]} 8-element dual quaternion
 */
export function poseToUnitDualQuat(q, t) {
  const qr = q;
  // q_d = (1/2) · [0, t] · q_r
  const tQuat = [0, t[0], t[1], t[2]];
  const qd = quatScale(quatMul(tQuat, qr), 0.5);
  return [...qr, ...qd];
}

/**
 * Convert a unit dual quaternion to pose (quaternion + translation).
 * @param {number[]} dq - 8-element dual quaternion
 * @returns {{ quaternion: number[], translation: number[] }}
 */
export function unitDualQuatToPose(dq) {
  const qr = dq.slice(0, 4);
  const qd = dq.slice(4, 8);

  // Translation: t = 2 · q_d · q_r*
  const tQuat = quatScale(quatMul(qd, quatConjugate(qr)), 2);

  return {
    quaternion: quaternionNormalize(qr),
    translation: [tQuat[1], tQuat[2], tQuat[3]],
  };
}

/**
 * Dual Quaternion ScLERP on TS³.
 *
 * q̂(s) = q̂₀ · exp(s · log(q̂₀* · q̂₁))
 *
 * @param {number[]} dq0 - Start dual quaternion
 * @param {number[]} dq1 - End dual quaternion
 * @param {number} s
 * @returns {number[]} Interpolated dual quaternion
 */
export function dualQuatScLERP(dq0, dq1in, s) {
  let dq1 = dq1in.slice();

  // Ensure shortest path on S³ for the rotation component
  const dot = quatDot(dq0.slice(0, 4), dq1.slice(0, 4));
  if (dot < 0) {
    dq1 = dq1.map(v => -v);
  }

  // Δq̂ = q̂₀* · q̂₁
  const deltaQ = dualQuatMultiply(dualQuatConjugate(dq0), dq1);

  // log(Δq̂)
  const logDelta = dualQuatLog(deltaQ);

  // s · log(Δq̂)
  const scaledLog = logDelta.map(v => v * s);

  // exp(s · log(Δq̂))
  const expScaled = dualQuatExp(scaledLog);

  // q̂(s) = q̂₀ · exp(s · log(Δq̂))
  const result = dualQuatMultiply(dq0, expScaled);

  return dualQuatNormalize(result);
}
