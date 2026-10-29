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
export const EMPTY_SITE = { groups: [], products: [], events: { current: [], past: [] }, hours: [], banners: [], promotions: [] };

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
