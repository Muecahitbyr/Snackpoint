import { useTilt } from '../hooks/useTilt';
import { useContent, useSite } from '../site/SiteProvider';
import Reveal from './Reveal';
import TickerBadge from './TickerBadge';
import SplitWords from './SplitWords';
import './Services.css';

function ServiceCard({ service, delay }) {
  const tilt = useTilt(8);

  return (
    <Reveal className="service-card-wrap" delay={delay} data-character-target={service.id}>
      <div
        className={`service-card tilt-card ${service.badge ? 'has-badge' : ''}`}
        ref={tilt.ref}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
      >
        {service.badge && <TickerBadge text={service.badge} />}
        <div className={`service-icon ${service.logo ? 'has-logo' : `icon-${service.gradient}`}`}>
          {service.logo ? <img src={service.logo} alt={`${service.title} Logo`} /> : service.icon}
        </div>
        <h3>{service.title}</h3>
        <p>{service.text}</p>
      </div>
    </Reveal>
  );
}

export default function Services() {
  const { services } = useSite();
  const content = useContent();

  return (
    <section className="services" id="services" data-character-target="services">
      <Reveal as="p" className="eyebrow center">{content['services.eyebrow']}</Reveal>
      <Reveal as="h2" className="section-title center"><SplitWords text={content['services.title']} /></Reveal>

      <div className="service-grid">
        {services.map((service, i) => (
          <ServiceCard key={service.id} service={service} delay={i * 0.15} />
        ))}
      </div>
    </section>
  );
}
