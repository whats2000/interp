// SE(3) 3D scene — rotation + translation
// Same useFrame fix as SO3Scene: refs are null when useEffect fires outside Canvas.

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import Scene3D from './Scene3D';
import PoseObject from './PoseObject';

interface Props {
  X0: number[];
  X1: number[];
  Xs: number[];
  onX0Change: (X: number[]) => void;
  onX1Change: (X: number[]) => void;
  overlayXs?: number[] | null;
  overlayColor?: string;
}

function applyX4(obj: THREE.Object3D, X: number[]) {
  const m4 = new THREE.Matrix4().set(
    X[0],  X[1],  X[2],  X[3],
    X[4],  X[5],  X[6],  X[7],
    X[8],  X[9],  X[10], X[11],
    X[12], X[13], X[14], X[15],
  );
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  m4.decompose(p, q, s);
  obj.position.copy(p);
  obj.quaternion.copy(q);
}

function readX4(obj: THREE.Object3D): number[] {
  const m4 = new THREE.Matrix4().compose(obj.position, obj.quaternion, new THREE.Vector3(1,1,1));
  const e = m4.elements;
  return [
    e[0], e[4], e[8],  e[12],
    e[1], e[5], e[9],  e[13],
    e[2], e[6], e[10], e[14],
    e[3], e[7], e[11], e[15],
  ];
}

interface ContentProps {
  X0: number[];
  X1: number[];
  Xs: number[];
  overlayXs?: number[] | null;
  overlayColor: string;
  activeTarget: 'start' | 'end';
  gizmoMode: 'translate' | 'rotate';
  isDragging: React.MutableRefObject<boolean>;
  controlsRef: React.MutableRefObject<any>;
  cb0: React.MutableRefObject<(X: number[]) => void>;
  cb1: React.MutableRefObject<(X: number[]) => void>;
}

function SceneContent({ X0, X1, Xs, overlayXs, overlayColor, activeTarget, gizmoMode, isDragging, controlsRef, cb0, cb1 }: ContentProps) {
  const ref0 = useRef<THREE.Group>(null);
  const ref1 = useRef<THREE.Group>(null);
  const refS = useRef<THREE.Group>(null);
  const refO = useRef<THREE.Group>(null);

  // Keep latest prop values accessible in useFrame
  const X0Ref = useRef(X0);
  const X1Ref = useRef(X1);
  const XsRef = useRef(Xs);
  const overlayRef = useRef(overlayXs);
  X0Ref.current = X0;
  X1Ref.current = X1;
  XsRef.current = Xs;
  overlayRef.current = overlayXs;

  // Sync React state → Three.js objects every frame (useFrame runs after R3F commits)
  useFrame(() => {
    if (!isDragging.current) {
      if (ref0.current) applyX4(ref0.current, X0Ref.current);
      if (ref1.current) applyX4(ref1.current, X1Ref.current);
    }
    if (refS.current) applyX4(refS.current, XsRef.current);
    if (refO.current && overlayRef.current) applyX4(refO.current, overlayRef.current);
  });

  // Register mouseDown/mouseUp on TransformControls
  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const onDown = () => { isDragging.current = true; };
    const onUp   = () => {
      isDragging.current = false;
      const activeRef = activeTarget === 'start' ? ref0 : ref1;
      const cb        = activeTarget === 'start' ? cb0  : cb1;
      if (activeRef.current) cb.current(readX4(activeRef.current));
    };
    ctrl.addEventListener('mouseDown', onDown);
    ctrl.addEventListener('mouseUp',   onUp);
    return () => {
      ctrl.removeEventListener('mouseDown', onDown);
      ctrl.removeEventListener('mouseUp',   onUp);
    };
  }, [activeTarget, gizmoMode, controlsRef, isDragging, cb0, cb1]);

  const activeRef = activeTarget === 'start' ? ref0 : ref1;
  const activeCb  = activeTarget === 'start' ? cb0  : cb1;

  return (
    <>
      <group ref={ref0}><PoseObject color="#4a9eff" opacity={0.6} /></group>
      <group ref={ref1}><PoseObject color="#ff6b6b" opacity={0.6} /></group>
      <group ref={refS}><PoseObject color="#51cf66" opacity={1}   /></group>
      {overlayXs && <group ref={refO}><PoseObject color={overlayColor} opacity={0.7} wireframe /></group>}

      <TransformControls
        ref={controlsRef}
        object={activeRef as React.MutableRefObject<THREE.Object3D>}
        mode={gizmoMode}
        onObjectChange={() => {
          if (activeRef.current) activeCb.current(readX4(activeRef.current));
        }}
      />
    </>
  );
}

export default function SE3Scene({ X0, X1, Xs, onX0Change, onX1Change, overlayXs, overlayColor = '#ffd43b' }: Props) {
  const [activeTarget, setActiveTarget] = useState<'start' | 'end'>('start');
  const [gizmoMode, setGizmoMode]       = useState<'translate' | 'rotate'>('rotate');

  const controlsRef = useRef<any>(null);
  const isDragging  = useRef(false);

  const cb0 = useRef(onX0Change);
  const cb1 = useRef(onX1Change);
  useEffect(() => { cb0.current = onX0Change; });
  useEffect(() => { cb1.current = onX1Change; });

  return (
    <div>
      <Scene3D height={460}>
        <SceneContent
          X0={X0} X1={X1} Xs={Xs}
          overlayXs={overlayXs}
          overlayColor={overlayColor}
          activeTarget={activeTarget}
          gizmoMode={gizmoMode}
          isDragging={isDragging}
          controlsRef={controlsRef}
          cb0={cb0}
          cb1={cb1}
        />
      </Scene3D>

      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setActiveTarget('start')} style={{ borderColor: '#4a9eff', color: activeTarget === 'start' ? '#fff' : '#4a9eff', background: activeTarget === 'start' ? '#4a9eff' : undefined }}>
          Gizmo: Start
        </button>
        <button onClick={() => setActiveTarget('end')} style={{ borderColor: '#ff6b6b', color: activeTarget === 'end' ? '#fff' : '#ff6b6b', background: activeTarget === 'end' ? '#ff6b6b' : undefined }}>
          Gizmo: End
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>|</span>
        <button onClick={() => setGizmoMode('rotate')}    className={gizmoMode === 'rotate'    ? 'active' : ''}>Rotate</button>
        <button onClick={() => setGizmoMode('translate')} className={gizmoMode === 'translate' ? 'active' : ''}>Translate</button>
      </div>
    </div>
  );
}
