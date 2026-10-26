import { config } from '../config.js';

/** Client IP: from the Cloudflare Worker, a trusted proxy, or the socket. */
export function clientIp(c) {
  if (c.get('viaProxy')) {
    const forwarded = c.req.header('x-client-ip');
    if (forwarded) return forwarded.slice(0, 64);
  }
  if (config.trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    if (forwarded) return forwarded.slice(0, 64);
    const real = c.req.header('x-real-ip');
    if (real) return real.slice(0, 64);
  }
  return c.env?.incoming?.socket?.remoteAddress ?? 'unknown';
}
