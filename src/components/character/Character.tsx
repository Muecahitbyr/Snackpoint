import { useRef } from 'react';
import CharacterScene from './CharacterScene';
import { useCharacterAnimation } from '../../hooks/useCharacterAnimation';
import './character.css';

/**
 * Scroll-driven character companion. Mounted once in App; everything else
 * (position, pose, choreography) is driven imperatively by GSAP inside
 * useCharacterAnimation so scrolling never triggers a React re-render.
 */
export default function Character() {
  const containerRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const imgARef = useRef<HTMLImageElement>(null);
  const imgBRef = useRef<HTMLImageElement>(null);

  useCharacterAnimation({
    container: containerRef,
    figure: figureRef,
    imgA: imgARef,
    imgB: imgBRef,
  });

  return (
    <div ref={containerRef} className="character-container" aria-hidden="true">
      <CharacterScene figureRef={figureRef} imgARef={imgARef} imgBRef={imgBRef} />
    </div>
  );
}
