import { URL } from 'url';

/**
 * Validates a target URL against SSRF (Server-Side Request Forgery) vulnerabilities.
 * Blocks private IP networks, loopback addresses, link-local targets, and cloud metadata services.
 */
export function validateUrlForSsrf(rawUrl: string): { safe: boolean; error?: string; url?: URL } {
  try {
    const parsed = new URL(rawUrl);

    // Only permit standard web protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, error: `Disallowed protocol: ${parsed.protocol}. Only http and https are permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check loopback hostnames
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
      return { safe: false, error: 'Loopback and local addresses are blocked for safety.' };
    }

    // Check Cloud Metadata IP
    if (hostname === '169.254.169.254') {
      return { safe: false, error: 'Cloud metadata IP 169.254.169.254 is forbidden.' };
    }

    // Check if hostname is an IPv4 address
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const octet1 = parseInt(ipv4Match[1], 10);
      const octet2 = parseInt(ipv4Match[2], 10);

      // 10.0.0.0/8
      if (octet1 === 10) {
        return { safe: false, error: 'Private network (10.0.0.0/8) is blocked.' };
      }
      // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
        return { safe: false, error: 'Private network (172.16.0.0/12) is blocked.' };
      }
      // 192.168.0.0/16
      if (octet1 === 192 && octet2 === 168) {
        return { safe: false, error: 'Private network (192.168.0.0/16) is blocked.' };
      }
      // 127.0.0.0/8
      if (octet1 === 127) {
        return { safe: false, error: 'Loopback network (127.0.0.0/8) is blocked.' };
      }
      // 169.254.0.0/16 (Link-local)
      if (octet1 === 169 && octet2 === 254) {
        return { safe: false, error: 'Link-local network (169.254.0.0/16) is blocked.' };
      }
      // 0.0.0.0/8
      if (octet1 === 0) {
        return { safe: false, error: 'Current network (0.0.0.0/8) is blocked.' };
      }
    }

    // Block internal suffixes like .local, .internal, .lan, .corp
    if (
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan') ||
      hostname.endsWith('.corp') ||
      hostname.endsWith('.localhost')
    ) {
      return { safe: false, error: `Internal hostname domain ${hostname} is blocked.` };
    }

    return { safe: true, url: parsed };
  } catch (err: any) {
    return { safe: false, error: `Malformed URL: ${err.message}` };
  }
}
