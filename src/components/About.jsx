import { useParallax } from '../hooks/useParallax';
import Reveal from './Reveal';
import './About.css';

export default function About() {
  const visual = useParallax(0.1);

  return (
    <section className="about" id="about" data-character-target="about">
      <div className="about-inner">
        <Reveal className="about-text" data-character-target="about-text">
          <p className="eyebrow">Über uns</p>
          <h2>Mehr als nur ein Kiosk.</h2>
          <p className="lead">
            Bei SnackPoint Kaufbeuren erwartet dich ein herzlicher Empfang, frische Ware und ein
            Service, der weit über den klassischen Kiosk hinausgeht. Ob schneller Snack zwischendurch,
            Paket abholen oder Lottoschein abgeben — hier bist du in besten Händen.
          </p>
        </Reveal>
        <Reveal className="about-visual" delay={0.1}>
          <div ref={visual}>
            <div className="glow-card-ring">
              <div className="glow-card">
                <img src="/logo.jpg" alt="SnackPoint" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
