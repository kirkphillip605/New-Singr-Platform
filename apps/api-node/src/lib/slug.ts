import { rawPrisma } from '@singr/db'

/**
 * Convert arbitrary text into a URL-safe slug fragment.
 * Lowercases, strips accents, and collapses any run of non-alphanumeric
 * characters into a single hyphen, trimming leading/trailing hyphens.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generate a globally unique show slug from the show name and venue name.
 *
 * Base slug is `slugify(showName + ' ' + venueName)` (e.g.
 * "karaoke-nights-the-wobbly-penguin"). If that slug is already taken by any
 * show (including soft-deleted rows, since the DB unique index covers them),
 * a numeric suffix is appended ("-1", "-2", ...) until a free slug is found.
 */
export async function generateUniqueShowSlug(
  showName: string,
  venueName: string | null | undefined,
  options: { excludeShowId?: string } = {}
): Promise<string> {
  const base = slugify([showName, venueName].filter(Boolean).join(' ')) || 'show'

  // Pull every existing slug that matches the base or one of its numeric
  // variants so we can pick the lowest available suffix in a single query.
  const existing = await rawPrisma.show.findMany({
    where: {
      slug: { startsWith: base },
      ...(options.excludeShowId ? { id: { not: options.excludeShowId } } : {}),
    },
    select: { slug: true },
  })

  const taken = new Set(existing.map((s) => s.slug))

  if (!taken.has(base)) {
    return base
  }

  let suffix = 1
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1
  }
  return `${base}-${suffix}`
}
