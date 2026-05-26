const VENDOR_API = process.env.VENDOR_API_URL ?? 'http://localhost:5174';

const VENDOR_KEYWORDS = [
  'vendor', 'supplier', 'paper mill', 'board supplier',
  'who supplies', 'where do we get', 'price from', 'lead time',
  'manufacturer', 'source', 'buy from', 'purchase from'
];

export function shouldLookupVendors(message: string): boolean {
  const lower = message.toLowerCase();
  return VENDOR_KEYWORDS.some(kw => lower.includes(kw));
}

export async function lookupVendors(query: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const url = `${VENDOR_API}/api/vendors?q=${encodeURIComponent(query)}&status=Active`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return '';

    const vendors = await res.json() as Array<{
      name: string;
      country: string;
      city: string;
      contact_name: string;
      email: string;
      phone: string;
      rating: number;
      status: string;
    }>;

    if (!vendors.length) return '';

    return vendors.slice(0, 5).map(v =>
      `Vendor: ${v.name} | Location: ${v.city}, ${v.country} | Contact: ${v.contact_name} (${v.email}, ${v.phone}) | Rating: ${v.rating}/5 | Status: ${v.status}`
    ).join('\n');
  } catch (_) {
    return '';
  } finally {
    clearTimeout(timeout);
  }
}
