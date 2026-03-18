import { useState, useRef, useCallback, useEffect } from 'react';
import PageShell from '../components/PageShell';
import FormulaBlock from '../components/FormulaBlock';
import SliderControl from '../components/SliderControl';
import MatrixDisplay from '../components/MatrixDisplay';
import ResetButton from '../components/ResetButton';
import NumericPanel from '../components/NumericPanel';
import SO3Scene from '../components/SO3Scene';
import { quaternionNlerp, quaternionSlerp, quaternionToMatrix, matrixToQuaternion, quaternionAngle } from '../math/quaternion';
import { identity } from '../math/utils';

// Use 160° rotation so the NLERP–SLERP deviation (~5.5° max) is clearly visible.
// At 90° the max deviation is only ~0.9° — imperceptible.
const DEG160 = 160 * Math.PI / 180;
const DEFAULT_R0 = identity(3);
const DEFAULT_R1 = [
  Math.cos(DEG160), 0, Math.sin(DEG160),
  0,                1, 0,
  -Math.sin(DEG160), 0, Math.cos(DEG160),
];

function fmt4(n: number) { return n.toFixed(4); }

export default function SO3NLERPPage() {
  const [R0, setR0] = useState<number[]>(DEFAULT_R0);
  const [R1, setR1] = useState<number[]>(DEFAULT_R1);
  const [s, setS] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSlerp, setShowSlerp] = useState(true);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const dirRef = useRef(1);

  const q0 = matrixToQuaternion(R0);
  const q1 = matrixToQuaternion(R1);

  // NLERP result (main, green)
  const qNlerp = quaternionNlerp(q0, q1, s);
  const Rs = quaternionToMatrix(qNlerp);

  // SLERP result (overlay, yellow wireframe)
  const qSlerp = quaternionSlerp(q0, q1, s);
  const RsSlerp = quaternionToMatrix(qSlerp);

  const Omega = quaternionAngle(q0, q1);

  const reset = useCallback(() => {
    setR0(DEFAULT_R0);
    setR1(DEFAULT_R1);
    setS(0);
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    dirRef.current = 1;
  }, []);

  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    setS((prev) => {
      const step = (dt / 2000) * dirRef.current;
      let next = prev + step;
      if (next >= 1) { next = 1; dirRef.current = -1; }
      else if (next <= 0) { next = 0; dirRef.current = 1; }
      return next;
    });
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
      setIsPlaying(false);
    } else {
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(animate);
      setIsPlaying(true);
    }
  }, [isPlaying, animate]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const QuatRow = ({ label, q, color }: { label: string; q: number[]; color: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: '0.75rem', color, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
        [{q.map(fmt4).join(', ')}]
      </div>
    </div>
  );

  // Angular speed proxy: compare arc-length of NLERP vs SLERP
  // SLERP has constant angular velocity; NLERP is faster near s=0.5 and slower at ends
  const dotNS = qNlerp[0]*qSlerp[0] + qNlerp[1]*qSlerp[1] + qNlerp[2]*qSlerp[2] + qNlerp[3]*qSlerp[3];
  const angularDiff = Math.acos(Math.min(1, Math.abs(dotNS))) * 180 / Math.PI;

  return (
    <PageShell
      title="SO(3) — Quaternion NLERP vs SLERP"
      badge="S³"
      badgeColor="var(--accent-purple)"
      formulas={
        <>
          <FormulaBlock latex={String.raw`\text{NLERP: } q(s) = \frac{(1-s)\,q_0 + s\,q_1}{\|(1-s)\,q_0 + s\,q_1\|}`} />
          <FormulaBlock latex={String.raw`\text{SLERP: } q(s) = q_0\frac{\sin((1-s)\Omega)}{\sin\Omega} + q_1\frac{\sin(s\Omega)}{\sin\Omega}`} />
          <FormulaBlock latex={String.raw`\text{Key difference: NLERP has non-constant angular velocity}`} />
          <FormulaBlock latex={String.raw`\dot\theta_\text{NLERP}(s) \neq \text{const}, \quad \dot\theta_\text{SLERP}(s) = \Omega`} />
        </>
      }
      visualization={
        <SO3Scene
          R0={R0} R1={R1} Rs={Rs}
          onR0Change={setR0} onR1Change={setR1}
          overlayRs={showSlerp ? RsSlerp : null}
          overlayColor="#ffd43b"
        />
      }
      controls={
        <>
          <SliderControl label="s" value={s} onChange={setS} isPlaying={isPlaying} onTogglePlay={togglePlay} />
          <button
            onClick={() => setShowSlerp(v => !v)}
            className={showSlerp ? 'active' : ''}
            style={{ borderColor: '#ffd43b', color: showSlerp ? '#fff' : '#d97706', background: showSlerp ? '#d97706' : undefined, whiteSpace: 'nowrap' }}
          >
            SLERP overlay
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ResetButton onClick={reset} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Ω = {(Omega * 180 / Math.PI).toFixed(1)}°
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              NLERP vs SLERP: {angularDiff.toFixed(2)}°
            </span>
          </div>
        </>
      }
      numerics={
        <>
          <NumericPanel label="Quaternions" color="var(--text-secondary)">
            <QuatRow label="q₀ [w,x,y,z]" q={q0} color="var(--accent-blue)" />
            <QuatRow label="q₁ [w,x,y,z]" q={q1} color="var(--accent-red)" />
            <QuatRow label={`NLERP q(${s.toFixed(2)})`} q={qNlerp} color="var(--accent-green)" />
            <QuatRow label={`SLERP q(${s.toFixed(2)})`} q={qSlerp} color="#d97706" />
          </NumericPanel>
          <NumericPanel label="R₀ (start)" color="var(--accent-blue)">
            <MatrixDisplay matrix={R0} rows={3} cols={3} />
          </NumericPanel>
          <NumericPanel label="R₁ (end)" color="var(--accent-red)">
            <MatrixDisplay matrix={R1} rows={3} cols={3} />
          </NumericPanel>
          <NumericPanel label={`NLERP R(${s.toFixed(2)})`} color="var(--accent-green)">
            <MatrixDisplay matrix={Rs} rows={3} cols={3} />
          </NumericPanel>
        </>
      }
    />
  );
}
