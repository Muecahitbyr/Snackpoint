// schema.org data (JSON-LD) for the public pages, built from exactly what the
// page shows: texts, contact details and services from src/data/siteContent.js,
// products, events and opening hours from the API. Used at build time
// (scripts/prerender.mjs) and per request in the Cloudflare Worker
// (worker/index.js) through src/prerender.jsx.
//
// Deliberately left out: the Google rating (Google ignores self-served ratings
// for local businesses) and anything the website doesn't state itself.

/** The public, indexable pages. admin.html is noindex and stays out. */
export const PUBLIC_PAGES = [
  { name: 'index', file: 'index.html', path: '/', label: 'Startseite', type: 'WebPage' },
  { name: 'produkte', file: 'produkte.html', path: '/produkte', label: 'Sortiment', type: 'CollectionPage' },
  { name: 'impressum', file: 'impressum.html', path: '/impressum', label: 'Impressum', type: 'WebPage' },
  { name: 'datenschutz', file: 'datenschutz.html', path: '/datenschutz', label: 'Datenschutzerklärung', type: 'WebPage' },
];

const SCHEMA_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Neugablonzer Str. 25, 87600 Kaufbeuren" → schema.org PostalAddress. */
function postalAddress(address) {
  const match = address.match(/^(.+?),\s*(\d{5})\s+(.+)$/);
  if (!match) return undefined;
  return { '@type': 'PostalAddress', streetAddress: match[1], postalCode: match[2], addressLocality: match[3], addressCountry: 'DE' };
}

/** Days with the same hours are merged into one OpeningHoursSpecification. */
function openingHours(hours) {
  const groups = new Map();
  for (const day of hours) {
    if (day.closed || !day.open || !day.close) continue;
    const key = `${day.open}-${day.close}`;
    if (!groups.has(key)) groups.set(key, { '@type': 'OpeningHoursSpecification', dayOfWeek: [], opens: day.open, closes: day.close });
    groups.get(key).dayOfWeek.push(SCHEMA_DAYS[day.jsDay]);
  }
  return groups.size ? [...groups.values()] : undefined;
}

/** Holidays, closures and short days; a closed day is 00:00–00:00 for schema.org. */
function specialOpeningHours(days = []) {
  const specs = days.map((day) => ({
    '@type': 'OpeningHoursSpecification',
    validFrom: day.date,
    validThrough: day.date,
    opens: day.closed ? '00:00' : day.open,
    closes: day.closed ? '00:00' : day.close,
  }));
  return specs.length ? specs : undefined;
}

const absolute = (siteUrl, path) => (path && path.startsWith('/') ? `${siteUrl}${path}` : path || undefined);

function business({ siteUrl, site }) {
  const { content, settings, services } = site;
  const sameAs = Object.values(settings.social).filter(Boolean);
  return {
    '@type': 'ConvenienceStore',
    '@id': `${siteUrl}/#business`,
    name: content['brand.fullName'],
    alternateName: content['brand.name'],
    description: content['about.text'],
    url: `${siteUrl}/`,
    logo: absolute(siteUrl, content['brand.logo']),
    image: absolute(siteUrl, content['brand.logo']),
    address: postalAddress(settings.contact.address),
    hasMap: settings.contact.mapsUrl || undefined,
    telephone: settings.contact.phone || undefined,
    email: settings.contact.email || undefined,
    paymentAccepted: settings.info.paymentMethods.length ? settings.info.paymentMethods.join(', ') : undefined,
    openingHoursSpecification: openingHours(site.hours),
    specialOpeningHoursSpecification: specialOpeningHours(site.specialHours),
    // Only the services offered today (no "BALD VERFÜGBAR").
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: content['services.eyebrow'],
      itemListElement: services
        .filter((service) => !service.badge)
        .map((service) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: service.title, description: service.text } })),
    },
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

/** The upcoming events of the homepage. They take place at the shop (the
 * site lists the event location as a detail of the shop's address). */
function events({ siteUrl, site }) {
  const address = postalAddress(site.settings.contact.address);
  return site.events.current.map((event) => {
    const node = {
      '@type': 'Event',
      '@id': `${siteUrl}/#event-${event.id}`,
      name: event.title,
      description: event.description || undefined,
      url: `${siteUrl}/#event-${event.id}`,
      startDate: event.startsAt,
      endDate: event.endsAt || undefined,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: event.location || site.content['brand.fullName'], address },
      image: absolute(siteUrl, event.image),
      organizer: { '@id': `${siteUrl}/#business` },
    };
    if (event.price === 0) node.isAccessibleForFree = true;
    else if (event.price > 0) {
      node.offers = { '@type': 'Offer', price: (event.price / 100).toFixed(2), priceCurrency: 'EUR', url: node.url };
    }
    return node;
  });
}

/** The catalog of /produkte, in the order the page lists it. */
function catalog({ siteUrl, site, url }) {
  const groups = new Set(site.groups.map((group) => group.id));
  const products = site.products.filter((product) => product.showInCatalog && groups.has(product.group));
  const order = new Map(site.groups.map((group, i) => [group.id, i]));
  products.sort((a, b) => order.get(a.group) - order.get(b.group));
  return {
    '@type': 'ItemList',
    '@id': `${url}#sortiment`,
    name: `Sortiment von ${site.content['brand.fullName']}`,
    numberOfItems: products.length,
    itemListElement: products.map((product, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: product.title,
      description: product.text || undefined,
    })),
  };
}

/**
 * The JSON-LD graph of one page as a string that is safe inside <script>.
 * `site` is the payload of /api/public/site plus the code content
 * (withCodeContent in src/site/SiteProvider.jsx).
 */
export function structuredData({ page, site, siteUrl, title, description }) {
  const url = `${siteUrl}${page.path}`;
  const home = page.name === 'index';
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: site.content['brand.fullName'],
      alternateName: site.content['brand.name'],
      inLanguage: 'de-DE',
      publisher: { '@id': `${siteUrl}/#business` },
    },
    business({ siteUrl, site }),
  ];

  const webPage = {
    '@type': page.type,
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: 'de-DE',
    isPartOf: { '@id': `${siteUrl}/#website` },
  };
  if (home) webPage.about = { '@id': `${siteUrl}/#business` };
  else {
    webPage.breadcrumb = { '@id': `${url}#breadcrumb` };
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: PUBLIC_PAGES[0].label, item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: page.label, item: url },
      ],
    });
  }
  graph.push(webPage);

  if (home) graph.push(...events({ siteUrl, site }));
  if (page.name === 'produkte') {
    const list = catalog({ siteUrl, site, url });
    if (list.numberOfItems) {
      graph.push(list);
      webPage.mainEntity = { '@id': list['@id'] };
    }
  }

  // JSON.stringify drops undefined fields; "<" is escaped so the text can't end the script tag.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}
