import { useRef } from 'react';
import { useParallax } from '../hooks/useParallax';
import { useCountUp } from '../hooks/useCountUp';
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

export default function Hero() {
  const blob1 = useParallax(0.15);
  const blob2 = useParallax(0.3);
  const blob3 = useParallax(0.08);
  const logo = useParallax(0.2);
  const heroRef = useRef(null);

  const reviewCount = useCountUp(4945);
  const rating = useCountUp(5, { decimals: 1 });

  function handleMouseMove(e) {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  }

  return (
    <section className="hero" id="home" ref={heroRef} onMouseMove={handleMouseMove} data-character-target="hero">
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

      <div className="hero-content">
        <img src="/logo.jpg" alt="Snack Point Logo" className="hero-logo" ref={logo} />
        <Reveal as="p" className="eyebrow">Kiosk · Kaufbeuren</Reveal>
        <Reveal as="h1" className="hero-title">
          Snack Point<br /><span>Kaufbeuren</span>
        </Reveal>
        <Reveal as="p" className="hero-subtitle">
          Frische Snacks. Süße Neuheiten. DHL-Paketshop &amp; Lotto — alles an einem Ort.
        </Reveal>

        <Reveal className="hero-actions">
          <a className="btn btn-primary" href="#new" data-character-target="cta-hero">Neue Waren entdecken</a>
          <a className="btn btn-ghost" href="#location">Öffnungszeiten &amp; Adresse</a>
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

      <div className="scroll-hint">
        <span>Scrollen</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
}
