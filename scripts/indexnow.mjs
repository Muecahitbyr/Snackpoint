// Tells Bing (and through IndexNow also Yandex, Seznam, Naver) that the
// pages changed, so they are crawled again within hours instead of weeks.
// Bing's index also feeds ChatGPT search, Copilot and DuckDuckGo. Google
// doesn't take part; it reads the sitemap (Search Console).
//
// The key proves the site is ours: public/<KEY>.txt holds the same value.
// Usage after a deploy with new content: npm run seo:indexnow
const KEY = '99d43a399b25990e9ddd9457948e5a88';
const SITE = (process.argv[2] ?? 'https://snackpointkf.de').replace(/\/$/, '');

const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (!urlList.length) throw new Error(`Keine URLs in ${SITE}/sitemap.xml`);

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
});
// 200 = accepted, 202 = accepted, key is checked later.
console.log(`IndexNow: ${response.status} für ${urlList.length} Seiten`);
if (!response.ok) process.exit(1);
