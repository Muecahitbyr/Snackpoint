import { services } from '../data/services';
import { useTilt } from '../hooks/useTilt';
import Reveal from './Reveal';
import './Services.css';

function ServiceCard({ service, delay }) {
  const tilt = useTilt(8);

  return (
    <Reveal className="service-card-wrap" delay={delay} data-character-target={service.target}>
      <div
        className="service-card tilt-card"
        ref={tilt.ref}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
      >
        <div className={`service-icon icon-${service.gradient}`}>
          {service.logo ? <img src={service.logo} alt={`${service.title} Logo`} /> : service.icon}
        </div>
        <h3>{service.title}</h3>
        <p>{service.text}</p>
      </div>
    </Reveal>
  );
}

export default function Services() {
  return (
    <section className="services" id="services" data-character-target="services">
      <Reveal as="p" className="eyebrow center">Leistungen</Reveal>
      <Reveal as="h2" className="section-title center">Alles unter einem Dach.</Reveal>

      <div className="service-grid">
        {services.map((service, i) => (
          <ServiceCard key={service.title} service={service} delay={i * 0.15} />
        ))}
      </div>
    </section>
  );
}
