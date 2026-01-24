// lib/domains.ts
export const RE_DOMAIN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normalizeDomains(input: unknown): string[] {
  const arr = Array.isArray(input) ? input : [];
  return Array.from(
    new Set(
      arr
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean)
        .filter((d) => RE_DOMAIN.test(d))
    )
  );
}

export async function fetchDomains(domainsUrl: string): Promise<string[]> {
  const res = await fetch(domainsUrl, {
    method: "GET",
    cache: "no-store", // runtime sempre “fresco” no browser
  });

  if (!res.ok) return [];
  const json = await res.json();
  return normalizeDomains(json);
}
