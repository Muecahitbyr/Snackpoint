import { useEffect, useRef, useState } from 'react';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { useTilt } from '../hooks/useTilt';
import { useContent, useSite } from '../site/SiteProvider';
import Reveal from './Reveal';
import SplitWords from './SplitWords';
import './Social.css';

// Two phone mockups that show our TikTok and Instagram profiles, drawn from our
// own product pictures (no follower counts or likes — we don't invent numbers).
// After consent each phone shows the real profile instead: TikTok's creator
// embed and Instagram's profile embed.

const TILE_GRADIENTS = ['grad-1', 'grad-2', 'grad-3', 'grad-4'];

// /api/media/<id>?v=… → the small version (/api/media/<id>/thumb?v=…).
const thumb = (url) => url.replace(/(\/api\/media\/[^/?]+)/, '$1/thumb');

// "https://www.tiktok.com/@snackpoint13" → "snackpoint13"
const handleFrom = (url) => url.replace(/\/+$/, '').split('/').pop().replace(/^@/, '');

function TikTokIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
      />
    </svg>
  );
}

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Phone({ className, children }) {
  const tilt = useTilt(10);
  return (
    <div className={`phone ${className}`} ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}>
      <div className="phone-screen">
        <div className="phone-island" aria-hidden="true" />
        <div className="phone-status" aria-hidden="true"><span>9:41</span><span>●●● ▮</span></div>
        {children}
      </div>
    </div>
  );
}

// The embeds are rendered at the size they're made for and scaled down to the
// phone screen. Their card (profile + latest posts) is shorter than the
// screen, so it sits centered on the app's background.
const EMBEDS = {
  tiktok: {
    app: 'TikTok',
    width: 325,
    height: 420,
    src: (handle) => `https://www.tiktok.com/embed/@${encodeURIComponent(handle)}?lang=de-DE&embedFrom=oembed`,
    Icon: TikTokIcon,
    more: 'Alle Videos auf TikTok ↗',
  },
  instagram: {
    app: 'Instagram',
    width: 360,
    height: 395,
    src: (handle) => `https://www.instagram.com/${encodeURIComponent(handle)}/embed/`,
    Icon: InstagramIcon,
    more: 'Alle Beiträge auf Instagram ↗',
  },
};

function ProfileEmbed({ kind, url }) {
  const { app, width, height, src, Icon, more } = EMBEDS[kind];
  const handle = handleFrom(url);
  const box = useRef(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);
  return (
    <div className={`embed-box embed-${kind}`} ref={box}>
      <Icon className="embed-logo" />
      <div className="embed-card" style={{ height: height * scale }}>
        {scale > 0 && (
          <iframe
            title={`${app}-Profil @${handle}`}
            src={src(handle)}
            style={{ width, height, transform: `scale(${scale})` }}
            allow="encrypted-media; fullscreen"
            loading="lazy"
          />
        )}
      </div>
      <a className="embed-more" href={url} target="_blank" rel="noopener noreferrer">{more}</a>
    </div>
  );
}

/** The drawn screen until the visitor agrees, then the real profile. */
function PhoneContent({ kind, url, allowed, onAllow, children }) {
  if (allowed) return <ProfileEmbed kind={kind} url={url} />;
  return (
    <>
      {children}
      <div className={`embed-gate embed-gate-${kind}`}>
        <button type="button" className="embed-gate-btn" onClick={onAllow}>Echtes Profil laden</button>
        <small>Dabei werden Daten an {kind === 'instagram' ? 'Instagram (Meta)' : 'TikTok'} übertragen.</small>
      </div>
    </>
  );
}

function ProfileHead({ logo, name, handle }) {
  return (
    <div className="profile-head">
      <span className="profile-avatar"><img src={logo} alt="" loading="lazy" /></span>
      <strong className="profile-name">{name}</strong>
      <span className="profile-handle">@{handle}</span>
    </div>
  );
}

function TikTokScreen({ url, logo, name, images }) {
  return (
    <a className="screen tiktok-screen" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name} auf TikTok`}>
      <div className="screen-bar"><TikTokIcon className="screen-bar-icon" /></div>
      <ProfileHead logo={logo} name={name} handle={handleFrom(url)} />
      <span className="profile-follow tiktok-follow">Folgen</span>
      <p className="profile-bio">Kiosk in Kaufbeuren 🍬🥤 Neue Snacks &amp; Drinks</p>
      <div className="profile-grid tiktok-grid">
        {images.map((src, i) => (
          <span key={`${src}-${i}`} className={`tile ${TILE_GRADIENTS[i % 4]}`}>
            <img src={src} alt="" loading="lazy" decoding="async" />
            <span className="tile-play" aria-hidden="true">▶</span>
          </span>
        ))}
      </div>
    </a>
  );
}

function InstagramScreen({ url, logo, name, images, highlights }) {
  return (
    <a className="screen insta-screen" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name} auf Instagram`}>
      <div className="screen-bar insta-bar"><strong>{handleFrom(url)}</strong><InstagramIcon className="screen-bar-icon" /></div>
      <ProfileHead logo={logo} name={name} handle={handleFrom(url)} />
      <span className="profile-follow insta-follow">Folgen</span>
      <p className="profile-bio">Snacks · Drinks · Paketshop 📍 Kaufbeuren</p>
      <div className="insta-highlights">
        {highlights.map(({ label, src }, i) => (
          <span key={label} className="insta-highlight">
            <span className={`insta-highlight-ring ${TILE_GRADIENTS[(i + 1) % 4]}`}><img src={src} alt="" loading="lazy" /></span>
            <span>{label}</span>
          </span>
        ))}
      </div>
      <div className="profile-grid insta-grid">
        {images.map((src, i) => (
          <span key={`${src}-${i}`} className={`tile ${TILE_GRADIENTS[(i + 2) % 4]}`}>
            <img src={src} alt="" loading="lazy" decoding="async" />
          </span>
        ))}
      </div>
    </a>
  );
}

export default function Social() {
  const site = useSite();
  const content = useContent();
  const { embeds, acceptEmbed } = useCookieConsent();
  const { tiktok, instagram } = site.settings.social;
  if (!tiktok && !instagram) return null;

  const logo = content['brand.logo'] ?? '/logo.jpg';
  const name = content['brand.name'];
  // Real product pictures, spread over both phones. AI-generated ones are left
  // out: the tiles are too small to carry their label.
  const photos = site.products.filter((p) => p.image && !p.imageAi);
  const pictures = photos.filter((p) => p.showInCatalog).map((p) => thumb(p.image));
  const pick = (start, count) => Array.from({ length: Math.min(count, pictures.length) }, (_, i) => pictures[(start + i * 3) % pictures.length]);
  const highlightPicture = (group) => thumb(photos.find((p) => p.group === group)?.image ?? '') || pictures[0];

  return (
    <section className="social" id="social">
      <div className="social-glow" aria-hidden="true" />
      <Reveal as="p" className="eyebrow center">{content['social.eyebrow']}</Reveal>
      <Reveal as="h2" className="section-title center"><SplitWords text={content['social.title']} /></Reveal>
      <Reveal as="p" className="lead social-lead">{content['social.text']}</Reveal>

      <div className="social-phones">
        {tiktok && (
          <Reveal className="social-col" delay={0.1}>
            <Phone className="phone-tiktok">
              <PhoneContent kind="tiktok" url={tiktok} allowed={embeds.tiktok} onAllow={() => acceptEmbed('tiktok')}>
                <TikTokScreen url={tiktok} logo={logo} name={name} images={pick(0, 6)} />
              </PhoneContent>
            </Phone>
            <a className="social-btn social-btn-tiktok" href={tiktok} target="_blank" rel="noopener noreferrer">
              <TikTokIcon className="social-btn-icon" />
              <span><span className="social-btn-long">Auf </span>TikTok<span className="social-btn-long"> folgen</span></span>
            </a>
          </Reveal>
        )}
        {instagram && (
          <Reveal className="social-col" delay={0.2}>
            <Phone className="phone-insta">
              <PhoneContent kind="instagram" url={instagram} allowed={embeds.instagram} onAllow={() => acceptEmbed('instagram')}>
                <InstagramScreen
                  url={instagram}
                  logo={logo}
                  name={name}
                  images={pick(1, 9)}
                  highlights={[
                    { label: 'Snacks', src: highlightPicture('snacks') },
                    { label: 'Drinks', src: highlightPicture('getraenke') },
                    { label: 'To go', src: highlightPicture('essen') },
                  ]}
                />
              </PhoneContent>
            </Phone>
            <a className="social-btn social-btn-insta" href={instagram} target="_blank" rel="noopener noreferrer">
              <InstagramIcon className="social-btn-icon" />
              <span><span className="social-btn-long">Auf </span>Instagram<span className="social-btn-long"> folgen</span></span>
            </a>
          </Reveal>
        )}
      </div>
    </section>
  );
}
