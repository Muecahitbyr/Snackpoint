import { useInView } from '../hooks/useInView';
import { useContent, useSite } from '../site/SiteProvider';
import Reveal from './Reveal';
import SplitWords from './SplitWords';
import './Reviews.css';

function ReviewCard({ review }) {
  return (
    <div className="review-card">
      <div className="review-top">
        <div className="avatar" style={{ background: review.color }}>{review.initials}</div>
        <div>
          <strong>{review.name}</strong>
          <div className="stars">★★★★★</div>
        </div>
      </div>
      <p>„{review.text}“</p>
      <span className="review-time">{review.time}</span>
    </div>
  );
}

export default function Reviews() {
  // Render the review set twice so the CSS translateX(-50%) loop is seamless — no visible start or end.
  const { reviews, settings } = useSite();
  const { rating, contact } = settings;
  const content = useContent();
  const loopedReviews = [...reviews, ...reviews];
  const { ref, inView } = useInView();

  if (!reviews.length) return null;

  return (
    <section
      className={`reviews ${inView ? '' : 'is-offscreen'}`}
      ref={ref}
      id="reviews"
      data-character-target="reviews"
    >
      <Reveal as="p" className="eyebrow center">{content['reviews.eyebrow']}</Reveal>
      <Reveal as="h2" className="section-title center"><SplitWords text={content['reviews.title']} /></Reveal>

      <div className="marquee">
        <div className="marquee-track">
          {loopedReviews.map((review, i) => (
            <ReviewCard key={`${review.id}-${i}`} review={review} />
          ))}
        </div>
      </div>

      <Reveal className="review-cta">
        <div className="review-cta-score">
          <span className="review-cta-value">{rating.value.toFixed(1).replace('.', ',')}</span>
          <span className="stars" aria-hidden="true">★★★★★</span>
          <span className="review-cta-count">{rating.count} Bewertungen auf Google</span>
        </div>
        <div className="review-cta-body">
          <h3>{content['reviews.ctaTitle']}</h3>
          <p>{content['reviews.ctaText']}</p>
          <div className="review-cta-actions">
            <a className="btn btn-primary" href={rating.reviewUrl || contact.mapsUrl} target="_blank" rel="noopener noreferrer">
              ★ {content['reviews.ctaButton']}
            </a>
            <a className="review-cta-link" href={contact.mapsUrl} target="_blank" rel="noopener noreferrer">
              {content['reviews.ctaAll']} →
            </a>
          </div>
        </div>
      </Reveal>

      {content['reviews.note'] && <p className="reviews-note">{content['reviews.note']}</p>}
    </section>
  );
}
