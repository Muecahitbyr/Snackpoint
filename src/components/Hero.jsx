import { useParallax } from '../hooks/useParallax';
import { useCountUp } from '../hooks/useCountUp';
import Reveal from './Reveal';
import './Hero.css';

export default function Hero() {
  const blob1 = useParallax(0.15);
  const blob2 = useParallax(0.3);
  const blob3 = useParallax(0.08);
  const logo = useParallax(0.2);

  const reviewCount = useCountUp(4945);
  const rating = useCountUp(5, { decimals: 1 });

  return (
    <section className="hero" id="home">
      <div className="hero-blob blob-1" ref={blob1} />
      <div className="hero-blob blob-2" ref={blob2} />
      <div className="hero-blob blob-3" ref={blob3} />

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
          <a className="btn btn-primary" href="#new">Neue Waren entdecken</a>
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
