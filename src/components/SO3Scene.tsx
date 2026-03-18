// SO(3) 3D scene — rotation only
//
// FIX: TransformControls must be a SIBLING of the target group in the R3F tree,
// NOT a child. Being a child causes circular updateMatrixWorld calls.
//
// FIX 2: useEffect (outside Canvas) fires before R3F sets refs. Use useFrame
// (inside Canvas) to sync React state → Three.js objects, guaranteed after R3F commits.

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import Scene3D from './Scene3D';
import PoseObject from './PoseObject';

interface Props {
  R0: number[];
  R1: number[];
  Rs: number[];
  onR0Change: (R: number[]) => void;
  onR1Change: (R: number[]) => void;
}

function r3ToQuat(R: number[]): THREE.Quaternion {
  const m4 = new THREE.Matrix4().set(
    R[0], R[1], R[2], 0,
    R[3], R[4], R[5], 0,
    R[6], R[7], R[8], 0,
    0,    0,    0,    1,
  );
  return new THREE.Quaternion().setFromRotationMatrix(m4);
}

function quatToR3(q: THREE.Quaternion): number[] {
  const m4 = new THREE.Matrix4().makeRotationFromQuaternion(q);
  const e = m4.elements; // column-major
  return [e[0],e[4],e[8], e[1],e[5],e[9], e[2],e[6],e[10]];
}

// Inner component lives INSIDE Canvas so useFrame works and refs are always set
interface ContentProps {
  R0: number[];
  R1: number[];
  Rs: number[];
  activeTarget: 'start' | 'end';
  isDragging: React.MutableRefObject<boolean>;
  controlsRef: React.MutableRefObject<any>;
  cb0: React.MutableRefObject<(R: number[]) => void>;
  cb1: React.MutableRefObject<(R: number[]) => void>;
}

function SceneContent({ R0, R1, Rs, activeTarget, isDragging, controlsRef, cb0, cb1 }: ContentProps) {
  const ref0 = useRef<THREE.Group>(null);
  const ref1 = useRef<THREE.Group>(null);
  const refS = useRef<THREE.Group>(null);

  // Keep latest prop values accessible in useFrame without stale closures
  const R0Ref = useRef(R0);
  const R1Ref = useRef(R1);
  const RsRef = useRef(Rs);
  R0Ref.current = R0;
  R1Ref.current = R1;
  RsRef.current = Rs;

  // Sync React state → Three.js objects every frame.
  // useFrame is guaranteed to run after R3F commits, so refs are always set.
  useFrame(() => {
    if (!isDragging.current) {
      if (ref0.current) ref0.current.quaternion.copy(r3ToQuat(R0Ref.current));
      if (ref1.current) ref1.current.quaternion.copy(r3ToQuat(R1Ref.current));
    }
    if (refS.current) refS.current.quaternion.copy(r3ToQuat(RsRef.current));
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
      if (activeRef.current) cb.current(quatToR3(activeRef.current.quaternion));
    };
    ctrl.addEventListener('mouseDown', onDown);
    ctrl.addEventListener('mouseUp',   onUp);
    return () => {
      ctrl.removeEventListener('mouseDown', onDown);
      ctrl.removeEventListener('mouseUp',   onUp);
    };
  }, [activeTarget, controlsRef, isDragging, cb0, cb1]);

  const activeRef = activeTarget === 'start' ? ref0 : ref1;
  const activeCb  = activeTarget === 'start' ? cb0  : cb1;

  return (
    <>
      <group ref={ref0}><PoseObject color="#4a9eff" opacity={0.6} /></group>
      <group ref={ref1}><PoseObject color="#ff6b6b" opacity={0.6} /></group>
      <group ref={refS}><PoseObject color="#51cf66" opacity={1}   /></group>

      <TransformControls
        ref={controlsRef}
        object={activeRef as React.MutableRefObject<THREE.Object3D>}
        mode="rotate"
        onObjectChange={() => {
          if (activeRef.current)
            activeCb.current(quatToR3(activeRef.current.quaternion));
        }}
      />
    </>
  );
}

export default function SO3Scene({ R0, R1, Rs, onR0Change, onR1Change }: Props) {
  const [activeTarget, setActiveTarget] = useState<'start' | 'end'>('start');

  const controlsRef = useRef<any>(null);
  const isDragging  = useRef(false);

  const cb0 = useRef(onR0Change);
  const cb1 = useRef(onR1Change);
  useEffect(() => { cb0.current = onR0Change; });
  useEffect(() => { cb1.current = onR1Change; });

  return (
    <div>
      <Scene3D height={460}>
        <SceneContent
          R0={R0} R1={R1} Rs={Rs}
          activeTarget={activeTarget}
          isDragging={isDragging}
          controlsRef={controlsRef}
          cb0={cb0}
          cb1={cb1}
        />
      </Scene3D>

      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTarget('start')}
          style={{ borderColor: '#4a9eff', color: activeTarget === 'start' ? '#fff' : '#4a9eff', background: activeTarget === 'start' ? '#4a9eff' : undefined }}
        >
          Gizmo: Start (blue)
        </button>
        <button
          onClick={() => setActiveTarget('end')}
          style={{ borderColor: '#ff6b6b', color: activeTarget === 'end' ? '#fff' : '#ff6b6b', background: activeTarget === 'end' ? '#ff6b6b' : undefined }}
        >
          Gizmo: End (red)
        </button>
      </div>
    </div>
  );
}
