/** @param {{ id?: string }[] | null | undefined} data */
export function mapListItemRowsToIds(data) {
  if (!Array.isArray(data)) return [];
  return data.map((r) => r?.id).filter(Boolean);
}
