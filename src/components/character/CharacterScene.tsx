import type { RefObject } from 'react';
import { POSE_SRC } from './characterScenes';
import './character.css';

interface CharacterSceneProps {
  figureRef: RefObject<HTMLDivElement>;
  imgARef: RefObject<HTMLImageElement>;
  imgBRef: RefObject<HTMLImageElement>;
}

/** Purely presentational: the two crossfading pose layers, wrapped in the idle-bob figure element. */
export default function CharacterScene({ figureRef, imgARef, imgBRef }: CharacterSceneProps) {
  return (
    <div ref={figureRef} className="character-figure">
      <img ref={imgARef} className="character-pose" src={POSE_SRC.greet} alt="" aria-hidden="true" draggable={false} />
      <img ref={imgBRef} className="character-pose" alt="" aria-hidden="true" draggable={false} />
    </div>
  );
}
