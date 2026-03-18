import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
  { path: '/', label: 'Home', group: null },
  { path: '/so2', label: 'SO(2) — De Moivre', group: 'SO(2)' },
  { path: '/so3-matrix', label: 'SO(3) — Matrix SLERP', group: 'SO(3)' },
  { path: '/so3-quaternion', label: 'SO(3) — Quaternion SLERP', group: 'SO(3)' },
  { path: '/so3-nlerp', label: 'SO(3) — NLERP vs SLERP', group: 'SO(3)' },
  { path: '/se3-sclerp', label: 'SE(3) — ScLERP Matrix', group: 'SE(3)' },
  { path: '/se3-dual-quat', label: 'SE(3) — Dual Quaternion', group: 'SE(3)' },
  { path: '/se3-decoupled', label: 'SE(3) — Decoupled', group: 'SE(3)' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={styles.hamburger} onClick={() => setOpen(!open)} aria-label="Menu">
        {open ? '✕' : '☰'}
      </button>
      <nav className={`${styles.nav} ${open ? styles.open : ''}`}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>∮</span>
          <span className={styles.logoText}>Lie Groups</span>
        </div>
        <ul className={styles.list}>
          {NAV_ITEMS.map(({ path, label }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={path === '/'}
                className={({ isActive }) =>
                  `${styles.link} ${isActive ? styles.active : ''}`
                }
                onClick={() => setOpen(false)}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}
    </>
  );
}
