import { reviews } from '../data/reviews';
import Reveal from './Reveal';
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
  const loopedReviews = [...reviews, ...reviews];

  return (
    <section className="reviews" id="reviews" data-character-target="reviews">
      <Reveal as="p" className="eyebrow center">Bewertungen</Reveal>
      <Reveal as="h2" className="section-title center">Das sagen unsere Kunden.</Reveal>

      <div className="marquee">
        <div className="marquee-track">
          {loopedReviews.map((review, i) => (
            <ReviewCard key={`${review.name}-${i}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
