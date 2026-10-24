import { useParallax } from '../hooks/useParallax';
import { useInView } from '../hooks/useInView';
import Reveal from './Reveal';
import './About.css';

const CAN_BODY = 'M30 100C30 78 50 66 75 66C100 66 120 78 120 100V272H30Z';

// An aerosol spray-paint can leaning against the logo card: slim cylinder
// with a domed shoulder, metal valve cup and actuator with a side nozzle,
// a dark street-style label that paint has run down onto, and a light mist
// leaving the nozzle. Decorative only.
function SprayCan() {
  return (
    <svg className="about-spray" viewBox="0 0 150 300" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="about-can-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6e0a0b" />
          <stop offset="0.18" stopColor="#c4181c" />
          <stop offset="0.34" stopColor="#ff6b5a" />
          <stop offset="0.48" style={{ stopColor: 'var(--accent)' }} />
          <stop offset="0.8" style={{ stopColor: 'var(--accent-3)' }} />
          <stop offset="1" stopColor="#5c0809" />
        </linearGradient>
        <linearGradient id="about-can-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6b6f76" />
          <stop offset="0.3" stopColor="#eef0f2" />
          <stop offset="0.55" stopColor="#b9bec5" />
          <stop offset="1" stopColor="#5d6168" />
        </linearGradient>
        <linearGradient id="about-can-cap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b9bec5" />
          <stop offset="0.35" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9aa0a8" />
        </linearGradient>
        <linearGradient id="about-can-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </linearGradient>
        <clipPath id="about-can-clip">
          <path d={CAN_BODY} />
        </clipPath>
        <radialGradient id="about-can-mist">
          <stop offset="0" style={{ stopColor: 'var(--accent-2)', stopOpacity: 0.6 }} />
          <stop offset="1" style={{ stopColor: 'var(--accent-2)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      <ellipse cx="124" cy="34" rx="36" ry="20" transform="rotate(-20 124 34)" fill="url(#about-can-mist)" />
      <g style={{ fill: 'var(--accent-2)' }}>
        <circle cx="112" cy="26" r="2.2" />
        <circle cx="127" cy="19" r="1.6" />
        <circle cx="138" cy="31" r="2" />
        <circle cx="131" cy="43" r="1.4" />
        <circle cx="146" cy="22" r="1.2" />
      </g>

      <rect className="about-can-edge" x="60" y="54" width="30" height="14" rx="3" fill="url(#about-can-metal)" />
      <rect className="about-can-edge" x="62" y="30" width="26" height="26" rx="6" fill="url(#about-can-cap)" />
      <rect x="86" y="38" width="7" height="8" rx="2" style={{ fill: 'var(--text)' }} />

      <path d={CAN_BODY} fill="url(#about-can-body)" />
      <path d="M30 103H120" className="about-can-seam" />
      <rect x="30" y="130" width="90" height="104" style={{ fill: 'var(--text)' }} />
      <path
        fill="url(#about-can-body)"
        d="M30 130H120V137C116 137 115 141 115 149S112 160 109 160 106 155 106 149 104 137 100 137H74C70 137 69 140 69 145S66 154 63 154 60 151 60 145 58 137 54 137H30Z"
      />
      <text className="about-can-tag about-can-tag-depth" x="78" y="208" textAnchor="middle" transform="rotate(-8 75 196)">SP</text>
      <text className="about-can-tag" x="75" y="205" textAnchor="middle" transform="rotate(-8 75 196)">SP</text>
      <text className="about-can-brand" x="75" y="225" textAnchor="middle">SNACKPOINT</text>
      <g clipPath="url(#about-can-clip)">
        <rect x="30" y="66" width="90" height="206" fill="url(#about-can-shade)" />
        <rect x="44" y="78" width="7" height="186" rx="3.5" fill="#fff" fillOpacity="0.32" />
      </g>
      <path d={CAN_BODY} className="about-can-edge" fill="none" />
      <rect className="about-can-edge" x="28" y="268" width="94" height="18" rx="7" fill="url(#about-can-metal)" />
    </svg>
  );
}

export default function About() {
  const visual = useParallax(0.1);
  const { ref: sectionRef, inView } = useInView();

  return (
    <section className={`about ${inView ? '' : 'is-offscreen'}`} ref={sectionRef} id="about" data-character-target="about">
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
          <SprayCan />
        </Reveal>
      </div>
    </section>
  );
}
