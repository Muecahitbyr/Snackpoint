import { useParallax } from '../hooks/useParallax';
import { useInView } from '../hooks/useInView';
import Reveal from './Reveal';
import SplitWords from './SplitWords';
import { useContent } from '../site/SiteProvider';
import './About.css';

export default function About() {
  const visual = useParallax(0.1);
  const { ref: sectionRef, inView } = useInView();
  const content = useContent();

  return (
    <section className={`about ${inView ? '' : 'is-offscreen'}`} ref={sectionRef} id="about" data-character-target="about">
      <div className="about-inner">
        <Reveal className="about-text" data-character-target="about-text">
          <p className="eyebrow">{content['about.eyebrow']}</p>
          <h2><SplitWords text={content['about.title']} /></h2>
          <p className="lead">{content['about.text']}</p>
        </Reveal>
        <Reveal className="about-visual" delay={0.1}>
          <div ref={visual}>
            <div className="glow-card-ring">
              <div className="glow-card">
                <img src={content['about.image'] ?? content['brand.logo'] ?? '/logo.jpg'} alt={content['brand.name']} />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
