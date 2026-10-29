// Server-side entry: renders the public pages to static HTML, so crawlers that
// don't run JavaScript (most AI search bots) still get the full text. Built
// with `vite build --ssr` (npm run build) into build/ssr/ and used twice:
//   - scripts/prerender.mjs at build time: the HTML files in dist/ (the
//     fallback, and what the Node server serves),
//   - worker/index.js per request: the same pages with the current products,
//     events and opening hours from the API.
// In the browser React renders the page from scratch as before (see the
// [data-prerendered] rule in index.css).
import { renderToString } from 'react-dom/server';
import App from './App.jsx';
import ProduktePage from './components/products/ProduktePage.jsx';
import Impressum from './components/legal/Impressum.jsx';
import Datenschutz from './components/legal/Datenschutz.jsx';
import { StaticSiteProvider, withCodeContent } from './site/SiteProvider';
import { applySiteData } from './data/siteStore';
import { PUBLIC_PAGES, structuredData } from './seo/structuredData';

export { CONTENT, SETTINGS } from './data/siteContent';
export { PUBLIC_PAGES };

const COMPONENTS = { index: App, produkte: ProduktePage, impressum: Impressum, datenschutz: Datenschutz };

// The part of each page that depends on the data lies between these two
// markers: the root element with the rendered page, the JSON-LD and, when
// rendered per request, the data itself for the browser.
export const REGION_START = '<!--ssr-->';
export const REGION_END = '<!--/ssr-->';
export const EMPTY_SITE = { groups: [], products: [], events: { current: [], past: [] }, hours: [], specialHours: [], banners: [], promotions: [] };

// Made-up data that walks every code path once (product with picture, price and
// label, sold-out product, event, banner, promotion). Only for warmUp(), never sent.
const WARMUP_SITE = {
  groups: [{ id: 'g', name: 'Gruppe', emoji: '🍫', notice: 'Hinweis', ageRestricted: true, categories: ['Kategorie'] }],
  products: [
    { id: 'p1', group: 'g', category: 'Kategorie', title: 'Produkt', brand: 'Marke', text: 'Text', emoji: '🍬', image: '/logo.jpg', price: 199, availability: 'available', showInCatalog: true, isHighlight: true, badge: 'NEU', highlightOrder: 10, allergens: 'Nüsse', info: 'Info', searchTerms: ['a'], tags: ['suess'], chatCategory: 'snacks' },
    { id: 'p2', group: 'g', category: 'Kategorie', title: 'Produkt 2', text: 'Text', emoji: '🥤', image: null, price: null, availability: 'sold_out', showInCatalog: true, isHighlight: true, badge: '', highlightOrder: 20, searchTerms: [], tags: [], chatCategory: null },
  ],
  events: {
    current: [
      { id: 'e1', title: 'Event', description: 'Text', location: 'Ort', startsAt: '2030-01-05T17:00:00.000Z', endsAt: '2030-01-05T20:00:00.000Z', price: 0, priceNote: '', featured: true, isPast: false, image: '/logo.jpg', gallery: [] },
      { id: 'e2', title: 'Event 2', description: '', location: '', startsAt: '2030-01-06T17:00:00.000Z', endsAt: null, price: 500, priceNote: 'Hinweis', featured: false, isPast: false, image: null, gallery: [] },
    ],
    past: [],
  },
  hours: [{ day: 'Montag', jsDay: 1, open: '08:00', close: '20:00', closed: false }, { day: 'Sonntag', jsDay: 0, open: null, close: null, closed: true }],
  specialHours: [{ date: '2030-12-24', closed: false, open: '08:00', close: '14:00', note: 'Heiligabend' }, { date: '2030-12-25', closed: true }],
  banners: [{ id: 'b1', text: 'Hinweis', linkUrl: '/produkte', linkLabel: 'Mehr', variant: 'info', version: '2030-01-01T00:00:00.000Z', endsAt: null }],
  promotions: [{ id: 'a1', title: 'Aktion', text: 'Text', badge: 'TOP', priceText: '1 €', emoji: '🔥', image: '/logo.jpg', endsAt: '2030-01-01T00:00:00.000Z' }],
};

/**
 * Renders every page once. The Worker calls this while its isolate starts,
 * so React and the components are compiled before the first request instead
 * of during it: CPU time of a request is limited (10 ms on the free plan),
 * startup has its own, larger allowance.
 */
export function warmUp(siteUrl) {
  for (const page of PUBLIC_PAGES) renderRegion(page.name, WARMUP_SITE, { siteUrl, title: '', description: '' });
}

// Inside <script> nothing may look like "</script>" or "<!--".
const scriptJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

/**
 * Everything between REGION_START and REGION_END for one page.
 *   apiData     payload of GET /api/public/site (or EMPTY_SITE)
 *   inlineData  hand the payload to the browser (src/site/SiteProvider.jsx
 *               then skips its own request) — only for current data, never
 *               for the build-time snapshot
 */
export function renderRegion(pageName, apiData, { siteUrl, title, description, inlineData = false }) {
  const page = PUBLIC_PAGES.find((entry) => entry.name === pageName);
  const Page = COMPONENTS[pageName];
  const site = withCodeContent(apiData);
  applySiteData(site);
  const markup = renderToString(
    <StaticSiteProvider data={site}>
      <Page />
    </StaticSiteProvider>
  );
  const jsonLd = structuredData({ page, site, siteUrl, title, description });
  return [
    REGION_START,
    `<div id="root"><div data-prerendered>${markup}</div></div>`,
    `<script type="application/ld+json">${jsonLd}</script>`,
    inlineData ? `<script type="application/json" id="site-data">${scriptJson(apiData)}</script>` : '',
    REGION_END,
  ].join('\n');
}
