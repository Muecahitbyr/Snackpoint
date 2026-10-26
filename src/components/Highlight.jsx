import { useInView } from '../hooks/useInView';
import Reveal from './Reveal';
import SplitWords from './SplitWords';
import { useContent } from '../site/SiteProvider';
import './Highlight.css';

const FLOATERS = [
  { emoji: '🍬', top: '14%', left: '8%', duration: '8s', delay: '0s' },
  { emoji: '🍭', top: '70%', left: '12%', duration: '7s', delay: '1s' },
  { emoji: '🍫', top: '20%', left: '90%', duration: '9s', delay: '0.5s' },
  { emoji: '🥤', top: '75%', left: '88%', duration: '6.5s', delay: '1.6s' },
  { emoji: '📦', top: '15%', left: '50%', duration: '8.5s', delay: '2s' },
];

export default function Highlight() {
  const { ref, inView } = useInView();
  const content = useContent();

  return (
    <section
      className={`highlight ${inView ? '' : 'is-offscreen'}`}
      ref={ref}
      data-character-target="highlight"
    >
      <div className="highlight-floaters">
        {FLOATERS.map((f, i) => (
          <span
            key={i}
            className="hfloat"
            style={{ top: f.top, left: f.left, animationDuration: f.duration, animationDelay: f.delay }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      <Reveal className="highlight-inner">
        <p className="highlight-eyebrow">{content['highlight.eyebrow']}</p>
        <h2 className="highlight-quote">
          <SplitWords text={content['highlight.quote']} step={0.03} />
        </h2>
        <span className="highlight-author">{content['highlight.author']}</span>
      </Reveal>
    </section>
  );
}
