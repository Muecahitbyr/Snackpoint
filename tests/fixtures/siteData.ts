// A public-site payload (as GET /api/public/site returns it) built from the
// original content in server/db/seedData.js — lets the chat tests run without
// a database.
import { CATALOG_PRODUCTS, CHAT_PRODUCTS, GROUPS, HIGHLIGHT_PRODUCTS, OPENING_HOURS, SERVICES } from '../../server/db/seedData.js';
import { SETTINGS_DEFAULTS } from '../../server/lib/contentRegistry.js';
import { applySiteData } from '../../src/data/siteStore';

interface SeedProduct {
  name: string;
  category: string;
  brand?: string;
  terms?: string[];
  tags?: string[];
  inChat?: boolean;
  chatCategory?: string;
}

const categoryChat = new Map<string, string | null>(
  GROUPS.flatMap((group: { categories: { name: string; chat: string | null }[] }) =>
    group.categories.map((category) => [category.name, category.chat] as [string, string | null])
  )
);

function toSiteProduct(product: SeedProduct, showInCatalog: boolean, inChat = product.inChat ?? true) {
  return {
    id: product.name,
    title: product.name,
    brand: product.brand,
    price: null,
    availability: 'available' as const,
    showInCatalog,
    searchTerms: product.terms ?? [],
    tags: product.tags ?? [],
    chatCategory: inChat ? product.chatCategory ?? categoryChat.get(product.category) ?? null : null,
  };
}

export function loadSeedSiteData() {
  applySiteData({
    settings: SETTINGS_DEFAULTS,
    hours: OPENING_HOURS.map((entry: { day: string; weekday: number; open: string; close: string; closed: boolean }) => ({
      day: entry.day, jsDay: entry.weekday, open: entry.open, close: entry.close, closed: entry.closed,
    })),
    products: [
      ...CATALOG_PRODUCTS.map((product: SeedProduct) => toSiteProduct(product, true)),
      ...HIGHLIGHT_PRODUCTS.map((product: SeedProduct) => toSiteProduct(product, false, false)),
      ...CHAT_PRODUCTS.map((product: SeedProduct) => toSiteProduct(product, false)),
    ],
    services: SERVICES.map((service: { slug: string; title: string; description: string }) => ({
      id: service.slug, title: service.title, text: service.description,
    })),
  });
}
