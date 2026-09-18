import { services } from '../data/services';
import Reveal from './Reveal';
import './Services.css';

export default function Services() {
  return (
    <section className="services" id="services">
      <Reveal as="p" className="eyebrow center">Leistungen</Reveal>
      <Reveal as="h2" className="section-title center">Alles unter einem Dach.</Reveal>

      <div className="service-grid">
        {services.map((service, i) => (
          <Reveal key={service.title} className="service-card" delay={i * 0.15}>
            <div className="service-icon">{service.icon}</div>
            <h3>{service.title}</h3>
            <p>{service.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
