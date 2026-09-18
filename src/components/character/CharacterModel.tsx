import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import type { Group, Object3D } from 'three';
import { useAnimations, useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';
import { FACE_CAMERA_ROTATION_Y, GLTF_PATH, HEAD_BONE_NAME, NECK_BONE_NAME } from './characterTypes';

useGLTF.preload(GLTF_PATH);

export interface CharacterModelHandle {
  group: Group | null;
  actions: ReturnType<typeof useAnimations>['actions'];
  mixer: ReturnType<typeof useAnimations>['mixer'];
  headBone: Object3D | null;
  neckBone: Object3D | null;
}

interface CharacterModelProps {
  initialPosition: [number, number, number];
  initialScale: number;
}

/** Loads the rigged/animated GLB and wires it to a Three.js AnimationMixer.
 * Purely the "what to render" layer — CharacterController owns movement and
 * clip-selection logic and drives this through the forwarded handle. */
const CharacterModel = forwardRef<CharacterModelHandle, CharacterModelProps>(function CharacterModel(
  { initialPosition, initialScale },
  ref
) {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF(GLTF_PATH) as unknown as GLTF;
  const { actions, mixer } = useAnimations(gltf.animations, groupRef);

  const headBone = useMemo(() => gltf.scene.getObjectByName(HEAD_BONE_NAME) ?? null, [gltf.scene]);
  const neckBone = useMemo(() => gltf.scene.getObjectByName(NECK_BONE_NAME) ?? null, [gltf.scene]);

  useImperativeHandle(ref, () => ({
    get group() {
      return groupRef.current;
    },
    actions,
    mixer,
    headBone,
    neckBone,
  }));

  return (
    <group
      ref={groupRef}
      position={initialPosition}
      scale={initialScale}
      rotation={[0, FACE_CAMERA_ROTATION_Y, 0]}
    >
      <primitive object={gltf.scene} />
    </group>
  );
});

export default CharacterModel;
