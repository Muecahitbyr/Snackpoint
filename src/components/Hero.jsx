import { useEffect, useRef, useState } from 'react';
import { useParallax } from '../hooks/useParallax';
import { useCountUp } from '../hooks/useCountUp';
import { useMagnetic } from '../hooks/useMagnetic';
import Reveal from './Reveal';
import './Hero.css';

const PARTICLES = [
  { emoji: '🍬', top: '18%', left: '10%', delay: '0s', duration: '7s' },
  { emoji: '🍭', top: '68%', left: '14%', delay: '1.2s', duration: '8s' },
  { emoji: '🥤', top: '22%', left: '86%', delay: '0.6s', duration: '6.5s' },
  { emoji: '🍫', top: '72%', left: '88%', delay: '1.8s', duration: '7.5s' },
  { emoji: '🎰', top: '10%', left: '48%', delay: '2.4s', duration: '9s' },
  { emoji: '📦', top: '85%', left: '50%', delay: '0.3s', duration: '8.5s' },
];

const HERO_NAME = 'SnackPoint';
const SPARKLE = 'M0 -22C4 -6 6 -4 22 0C6 4 4 6 0 22C-4 6 -6 4 -22 0C-6 -4 -4 -6 0 -22Z';

// Two hand-built graffiti pieces for the hero's corners. Both share the
// same vocabulary — black outlines, brand colors, paint drips, a soft spray
// halo — but differ in subject so they read as a pair, not a copy. Static
// and decorative only.

// Top right: an "SP" piece with chrome-banded fill, block extrusion, an
// arrow swinging out beneath it, a crown and drips.
function HeroArtTopRight({ artRef }) {
  return (
    <div className="hero-art hero-art-tr" ref={artRef} aria-hidden="true">
      <svg className="hero-art-svg" viewBox="0 0 360 280" focusable="false">
        <defs>
          <radialGradient id="hero-tr-mist">
            <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: 0.28 }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id="hero-tr-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe08a" />
            <stop offset="0.38" style={{ stopColor: 'var(--accent-2)' }} />
            <stop offset="0.42" stopColor="#fff4cf" />
            <stop offset="0.48" style={{ stopColor: 'var(--accent-2)' }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
          </linearGradient>
        </defs>
        <ellipse cx="190" cy="150" rx="172" ry="112" fill="url(#hero-tr-mist)" />
        <path
          className="hero-art-ink"
          style={{ fill: 'var(--accent-3)' }}
          d="M26 248C116 262 226 258 298 236L290 214L352 240L300 278L298 258C224 278 116 282 30 268Z"
        />
        <path className="hero-art-ink" style={{ fill: 'var(--accent-2)' }} transform="translate(216 22) rotate(10)" d="M0 40L10 6L28 26L44 0L60 26L78 6L88 40Z" />
        <path className="hero-art-ink hero-art-drip" style={{ fill: 'var(--accent)' }} d="M110 196V236a8 8 0 0 0 16 0V196ZM146 196V222a7 7 0 0 0 14 0V196ZM232 196V244a8 8 0 0 0 16 0V196Z" />
        <text className="hero-art-letters hero-art-depth" x="52" y="210" textLength="256" lengthAdjust="spacingAndGlyphs" transform="translate(10 10)">SP</text>
        <text className="hero-art-letters" x="52" y="210" textLength="256" lengthAdjust="spacingAndGlyphs" transform="translate(5 5)" style={{ fill: 'var(--accent-3)' }}>SP</text>
        <text className="hero-art-letters" x="52" y="210" textLength="256" lengthAdjust="spacingAndGlyphs" fill="url(#hero-tr-fill)">SP</text>
        <path className="hero-art-spark" transform="translate(316 206) scale(0.8)" d={SPARKLE} />
        <path className="hero-art-spark" transform="translate(48 82) scale(0.6)" d={SPARKLE} />
      </svg>
    </div>
  );
}

const FLOW_MAIN = 'M30 200C60 110 150 210 200 120S270 60 286 52';
const FLOW_CROSS = 'M50 100C102 60 150 132 222 96';
const FLOW_HEAD = 'M322 34L295 83L266 26Z';

// Bottom left: an abstract wildstyle "flow" — a red ribbon running under a
// bigger gold one that ends in an arrowhead — built like the SP piece:
// block extrusion, black outline, gradient fill, a shine line and drips.
function HeroArtBottomLeft({ artRef }) {
  return (
    <div className="hero-art hero-art-bl" ref={artRef} aria-hidden="true">
      <svg className="hero-art-svg" viewBox="0 0 340 250" focusable="false">
        <defs>
          <radialGradient id="hero-bl-mist">
            <stop offset="0" style={{ stopColor: 'var(--accent-2)', stopOpacity: 0.3 }} />
            <stop offset="1" style={{ stopColor: 'var(--accent-2)', stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id="hero-bl-gold" x1="30" y1="0" x2="322" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: 'var(--accent-2)' }} />
            <stop offset="0.55" stopColor="#ffc24a" />
            <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
          </linearGradient>
          <linearGradient id="hero-bl-red" x1="50" y1="0" x2="222" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ff6b5a" />
            <stop offset="0.5" style={{ stopColor: 'var(--accent)' }} />
            <stop offset="1" style={{ stopColor: 'var(--accent-3)' }} />
          </linearGradient>
        </defs>
        <ellipse cx="172" cy="132" rx="168" ry="110" fill="url(#hero-bl-mist)" />

        <g className="hero-flow-depth" transform="translate(9 9)">
          <path className="hero-flow-stroke" d={FLOW_CROSS} />
          <path className="hero-flow-stroke" d={FLOW_MAIN} />
          <path d={FLOW_HEAD} />
        </g>

        <path className="hero-flow-outline" d={FLOW_CROSS} />
        <path className="hero-flow-fill" d={FLOW_CROSS} stroke="url(#hero-bl-red)" />
        <path className="hero-flow-shine" d={FLOW_CROSS} transform="translate(-2 -7)" />

        <path className="hero-art-ink hero-art-drip" style={{ fill: 'var(--accent)' }} d="M96 178V218a9 9 0 0 0 18 0V178Z" />
        <path className="hero-art-ink hero-art-drip" style={{ fill: 'var(--accent)' }} d="M184 134V164a8 8 0 0 0 16 0V134Z" />

        <path className="hero-flow-outline" d={FLOW_MAIN} />
        <path className="hero-flow-fill" d={FLOW_MAIN} stroke="url(#hero-bl-gold)" />
        <path className="hero-art-ink" d={FLOW_HEAD} fill="url(#hero-bl-gold)" />
        <path className="hero-flow-shine" d={FLOW_MAIN} transform="translate(-3 -9)" />
      </svg>
    </div>
  );
}

export default function Hero() {
  const blob1 = useParallax(0.15);
  const blob2 = useParallax(0.3);
  const blob3 = useParallax(0.08);
  const logo = useParallax(0.2);
  const content = useParallax(0.6);
  const artTopRight = useParallax(0.5);
  const artBottomLeft = useParallax(0.3);
  const primaryCta = useMagnetic();
  const secondaryCta = useMagnetic();
  const heroRef = useRef(null);

  const reviewCount = useCountUp(4945);
  const rating = useCountUp(5, { decimals: 1 });

  // Pause the blobs/particles' infinite animations once the hero scrolls
  // out of view — they'd otherwise keep the compositor busy forever for
  // something nobody can see, which adds up with all the other sections
  // animating continuously at the same time.
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '200px 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleMouseMove(e) {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }

  return (
    <section
      className={`hero ${inView ? '' : 'is-offscreen'}`}
      id="home"
      ref={heroRef}
      onMouseMove={handleMouseMove}
      data-character-target="hero"
    >
      <div className="hero-spotlight" />
      <div className="hero-blob blob-1" ref={blob1} />
      <div className="hero-blob blob-2" ref={blob2} />
      <div className="hero-blob blob-3" ref={blob3} />

      <div className="hero-particles">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={{ top: p.top, left: p.left, animationDelay: p.delay, animationDuration: p.duration }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      <HeroArtTopRight artRef={artTopRight} />
      <HeroArtBottomLeft artRef={artBottomLeft} />

      <div className="hero-content" ref={content}>
        <img src="/logo.jpg" alt="SnackPoint Logo" className="hero-logo" ref={logo} />
        <Reveal as="p" className="eyebrow">Kiosk · Kaufbeuren</Reveal>
        {/* Letters are sprayed on one by one; the label keeps the heading's
            accessible name intact. */}
        <Reveal as="h1" className="hero-title" aria-label="SnackPoint Kaufbeuren">
          {HERO_NAME.split('').map((letter, i) => (
            <span key={i} className="hero-letter" style={{ '--i': i }} aria-hidden="true">{letter}</span>
          ))}
          <br /><span className="hero-tag" aria-hidden="true">Kaufbeuren</span>
        </Reveal>
        <Reveal as="p" className="hero-subtitle">
          Der Kiosk, der dich zum Leben erweckt.
        </Reveal>

        <Reveal className="hero-actions">
          <a className="btn btn-primary" href="#new" data-character-target="cta-hero" {...primaryCta}>Neue Waren entdecken</a>
          <a className="btn btn-ghost" href="#location" {...secondaryCta}>Öffnungszeiten &amp; Adresse</a>
        </Reveal>

        <Reveal className="hero-stats">
          <div className="stat">
            <span className="stat-number" ref={reviewCount.ref}>{reviewCount.formatted}</span>
            <span className="stat-label">Google Bewertungen</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-number" ref={rating.ref}>{rating.formatted}</span>
            <span className="stat-label">⌀ Sternebewertung</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
