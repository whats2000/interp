import React from 'react';
import { Link } from 'react-router-dom';
import FormulaBlock from '../components/FormulaBlock';
import styles from './HomePage.module.css';

const CARDS = [
  {
    path: '/so2',
    group: 'SO(2)',
    dim: '2D',
    rep: '2×2 Rotation Matrix',
    method: 'SLERP — De Moivre',

    color: 'var(--accent-blue)',
  },
  {
    path: '/so3-matrix',
    group: 'SO(3)',
    dim: '3D',
    rep: '3×3 Rotation Matrix',
    method: 'SLERP — Rodrigues',

    color: 'var(--accent-purple)',
  },
  {
    path: '/so3-quaternion',
    group: 'SO(3)',
    dim: '3D',
    rep: 'Unit Quaternion (S³)',
    method: 'SLERP — Quaternion',

    color: 'var(--accent-yellow)',
  },
  {
    path: '/so3-nlerp',
    group: 'SO(3)',
    dim: '3D',
    rep: 'Unit Quaternion (S³)',
    method: 'NLERP vs SLERP',

    color: 'var(--accent-purple)',
  },
  {
    path: '/se3-sclerp',
    group: 'SE(3)',
    dim: '3D',
    rep: '4×4 Homogeneous Matrix',
    method: 'ScLERP — Matrix',

    color: 'var(--accent-green)',
  },
  {
    path: '/se3-dual-quat',
    group: 'SE(3)',
    dim: '3D',
    rep: 'Dual Quaternion (TS³)',
    method: 'ScLERP — Dual Quaternion',

    color: 'var(--accent-red)',
  },
  {
    path: '/se3-decoupled',
    group: 'SE(3)',
    dim: '3D',
    rep: 'Quaternion + Vector3',
    method: 'Decoupled LERP + SLERP',

    color: 'var(--accent-yellow)',
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>

      {/* Background explanation */}
      <section className={styles.explainer}>
        <h2>General exponential map formula</h2>
        <div className={styles.formulaSection}>
          <FormulaBlock latex={String.raw`g(s) = g_0 \cdot \exp\!\left(s \cdot \log(g_0^{-1} g_1)\right)`} />
        </div>
      </section>

      {/* Cards */}
      <section className={styles.cardSection}>
        <div className={styles.cards}>
          {CARDS.map(({ path, group, dim, rep, method, color }) => (
            <Link to={path} key={path} className={styles.card} style={{ '--card-color': color } as React.CSSProperties}>
              <div className={styles.cardHeader}>
                <span className={styles.cardGroup} style={{ color }}>{group}</span>
                <span className={styles.cardDim}>{dim}</span>
              </div>
              <div className={styles.cardRep}>{rep}</div>
              <div className={styles.cardMethod}>{method}</div>

              <div className={styles.cardArrow}>Explore →</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
