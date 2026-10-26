// The loaded website data (from GET /api/public/site), plus the hand-off to
// the modules the chat assistant reads synchronously.
import { setSiteSettings } from './constants';
import { setOpeningHours } from './hours';
import { setChatProducts } from './products';

let site = null;

export function getSite() {
  return site;
}

export function applySiteData(data) {
  site = data;
  setSiteSettings(data.settings);
  setOpeningHours(data.hours);
  setChatProducts(data.products);
}
