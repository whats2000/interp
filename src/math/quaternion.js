// Unit quaternion SLERP on S³
// Convention: [w, x, y, z] (scalar-first)

import { EPSILON, clamp } from './utils.js';

/**
 * Quaternion SLERP on S³.
 *
 * @param {number[]} q0 - Start unit quaternion [w, x, y, z]
 * @param {number[]} q1 - End unit quaternion [w, x, y, z]
 * @param {number} s - Interpolation parameter [0, 1]
 * @returns {number[]} Interpolated unit quaternion [w, x, y, z]
 */
export function quaternionSlerp(q0, q1in, s) {
  // Step 1: dot product cos Ω = q0 · q1
  let q1 = q1in.slice();
  let cosOmega = q0[0]*q1[0] + q0[1]*q1[1] + q0[2]*q1[2] + q0[3]*q1[3];

  // Step 2: ensure shortest path — if dot < 0, negate q1
  if (cosOmega < 0) {
    q1 = q1.map((v) => -v);
    cosOmega = -cosOmega;
  }

  // Step 3: fallback to NLERP if nearly parallel
  if (cosOmega > 1 - EPSILON) {
    // Normalized linear interpolation
    const result = q0.map((v, i) => v + s * (q1[i] - v));
    return quaternionNormalize(result);
  }

  // Step 4: Ω = arccos(cos Ω)
  const Omega = Math.acos(clamp(cosOmega, -1, 1));
  const sinOmega = Math.sin(Omega);

  // Step 5: q(s) = q0 · sin((1-s)Ω)/sin(Ω) + q1 · sin(sΩ)/sin(Ω)
  const scale0 = Math.sin((1 - s) * Omega) / sinOmega;
  const scale1 = Math.sin(s * Omega) / sinOmega;

  const result = q0.map((v, i) => scale0 * v + scale1 * q1[i]);

  // Step 6: normalize result
  return quaternionNormalize(result);
}

/** Normalize a quaternion [w, x, y, z] */
export function quaternionNormalize(q) {
  const n = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
  if (n < EPSILON) return [1, 0, 0, 0];
  return q.map((v) => v / n);
}

/**
 * Convert quaternion [w, x, y, z] to 3×3 rotation matrix (row-major, 9 elements).
 */
export function quaternionToMatrix(q) {
  const [w, x, y, z] = q;
  return [
    1 - 2*(y*y + z*z),   2*(x*y - w*z),       2*(x*z + w*y),
    2*(x*y + w*z),       1 - 2*(x*x + z*z),   2*(y*z - w*x),
    2*(x*z - w*y),       2*(y*z + w*x),       1 - 2*(x*x + y*y),
  ];
}

/**
 * Convert 3×3 rotation matrix (row-major) to quaternion [w, x, y, z].
 * Uses Shepperd's method.
 */
export function matrixToQuaternion(m) {
  const [m00, m01, m02,
         m10, m11, m12,
         m20, m21, m22] = m;

  const traceM = m00 + m11 + m22;
  let w, x, y, z;

  if (traceM > 0) {
    const s = 0.5 / Math.sqrt(traceM + 1);
    w = 0.25 / s;
    x = (m21 - m12) * s;
    y = (m02 - m20) * s;
    z = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    w = (m21 - m12) / s;
    x = 0.25 * s;
    y = (m01 + m10) / s;
    z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    w = (m02 - m20) / s;
    x = (m01 + m10) / s;
    y = 0.25 * s;
    z = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    w = (m10 - m01) / s;
    x = (m02 + m20) / s;
    y = (m12 + m21) / s;
    z = 0.25 * s;
  }

  return quaternionNormalize([w, x, y, z]);
}

/**
 * Quaternion NLERP: linear interpolation then normalize.
 * Faster than SLERP but non-constant angular velocity.
 *
 * @param {number[]} q0 - Start unit quaternion [w, x, y, z]
 * @param {number[]} q1 - End unit quaternion [w, x, y, z]
 * @param {number} s - Interpolation parameter [0, 1]
 * @returns {number[]} Interpolated unit quaternion [w, x, y, z]
 */
export function quaternionNlerp(q0, q1in, s) {
  let q1 = q1in.slice();

  // Ensure shortest path — negate q1 if dot < 0
  const dot = q0[0]*q1[0] + q0[1]*q1[1] + q0[2]*q1[2] + q0[3]*q1[3];
  if (dot < 0) q1 = q1.map(v => -v);

  // Step 1: linear blend  q(s) = (1-s)·q0 + s·q1
  const blended = q0.map((v, i) => (1 - s) * v + s * q1[i]);

  // Step 2: normalize to unit quaternion
  return quaternionNormalize(blended);
}

/**
 * Compute the geodesic angle Ω between two quaternions.
 */
export function quaternionAngle(q0, q1) {
  let cosOmega = q0[0]*q1[0] + q0[1]*q1[1] + q0[2]*q1[2] + q0[3]*q1[3];
  if (cosOmega < 0) cosOmega = -cosOmega;
  return Math.acos(clamp(cosOmega, -1, 1));
}
