// Address, map links and contact details. Maintained in the admin panel
// (Einstellungen) and filled in from the database when the page loads —
// see src/site/siteData.js. ES module bindings are live, so every importer
// sees the loaded values.
export let ADDRESS = '';
export let MAPS_URL = '';
export let MAPS_EMBED_URL = '';

// Optional details the chat assistant can quote. Empty = the assistant says
// it doesn't know instead of guessing.
export let CONTACT = { phone: '', email: '' };
export let PAYMENT_METHODS = [];

// Free-text answers for "Liefert ihr?" / "Gibt es Parkplätze?".
export let DELIVERY_INFO = '';
export let PARKING_INFO = '';

export function setSiteSettings(settings) {
  ADDRESS = settings.contact.address;
  MAPS_URL = settings.contact.mapsUrl;
  MAPS_EMBED_URL = settings.contact.mapsEmbedUrl;
  CONTACT = { phone: settings.contact.phone, email: settings.contact.email };
  PAYMENT_METHODS = settings.info.paymentMethods;
  DELIVERY_INFO = settings.info.deliveryInfo;
  PARKING_INFO = settings.info.parkingInfo;
}
