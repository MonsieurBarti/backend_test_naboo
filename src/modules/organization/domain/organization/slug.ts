/**
 * Pure function that converts an organization name to a URL-safe slug.
 * Slug is auto-generated from org name and immutable after creation.
 *
 * Examples:
 *   "Acme Corp"     -> "acme-corp"
 *   "Café de Flore" -> "cafe-de-flore"
 *   "ABC   Corp!!"  -> "abc-corp"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-");
}
