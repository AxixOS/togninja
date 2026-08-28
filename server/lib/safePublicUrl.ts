// Is this a URL we are willing to fetch on the server's behalf?
//
// /api/setup/read-site takes a URL from whoever is standing in front of an un-onboarded
// instance and fetches it server-side. Without a guard that is a request forwarder sitting
// inside the network boundary: ask it for http://169.254.169.254/latest/meta-data/ and it
// reads the cloud metadata service and hands back the result.
//
// THE HOSTNAME IS NOT ENOUGH. Blocking the string "localhost" stops nobody, because DNS is
// attacker-controlled: a name they own can resolve to 127.0.0.1 or to a private address on
// this network. So the name is resolved and the ADDRESS is what gets judged.
//
// This is not a complete defence and does not pretend to be. A DNS record can change between
// this lookup and the fetch (the classic rebind), which is only fully closed by pinning the
// resolved address into the connection. What it does close is the whole class of "point it at
// something interesting and read the reply", which is what an open endpoint invites.

import dns from 'dns';

const lookup = dns.promises.lookup;

/** Loopback, link-local, and the RFC1918 / unique-local ranges. */
function isPrivateAddress(addr: string, family: number): boolean {
  if (family === 6) {
    const a = addr.toLowerCase();
    if (a === '::1' || a === '::') return true;
    if (a.startsWith('fe80:')) return true;            // link-local
    if (/^f[cd][0-9a-f]{2}:/.test(a)) return true;     // unique-local fc00::/7
    // IPv4-mapped (::ffff:10.0.0.1) — judge the embedded address.
    const m = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return isPrivateAddress(m[1], 4);
    return false;
  }
  const p = addr.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0 || a === 127) return true;               // this host / loopback
  if (a === 10) return true;                           // RFC1918
  if (a === 172 && b >= 16 && b <= 31) return true;    // RFC1918
  if (a === 192 && b === 168) return true;             // RFC1918
  if (a === 169 && b === 254) return true;             // link-local, incl. cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true;   // carrier-grade NAT
  if (a >= 224) return true;                           // multicast / reserved
  return false;
}

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

/**
 * Parse, normalise and vet a URL the server is about to fetch.
 *
 * Throws UnsafeUrlError with a message safe to show a studio — they are usually here because
 * they typed their own address wrongly, not because they are attacking anything.
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const trimmed = String(raw || '').trim();
  if (!trimmed) throw new UnsafeUrlError('Please enter your website address.');

  // A photographer types "caroline-king.com", not "https://caroline-king.com".
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    throw new UnsafeUrlError('That does not look like a website address.');
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http and https addresses can be read.');
  }
  // Credentials in a URL are never something a studio pastes on purpose, and they would be
  // forwarded to whatever this fetches.
  if (u.username || u.password) throw new UnsafeUrlError('Please remove the login details from the address.');

  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host.endsWith('.internal') || host === 'metadata.google.internal') {
    throw new UnsafeUrlError('That address is not reachable from the internet.');
  }

  // Judge the ADDRESS, not the name. `all: true` because a name can carry several records and
  // one private answer is enough to refuse.
  let addrs: Array<{ address: string; family: number }>;
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new UnsafeUrlError('We could not find that website. Check the address and try again.');
  }
  if (!addrs.length) throw new UnsafeUrlError('We could not find that website. Check the address and try again.');
  for (const { address, family } of addrs) {
    if (isPrivateAddress(address, family)) {
      throw new UnsafeUrlError('That address is not reachable from the internet.');
    }
  }

  return u;
}
