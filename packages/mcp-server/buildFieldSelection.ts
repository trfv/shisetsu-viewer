export function buildFieldSelection(
  allowed: readonly string[],
  selected: readonly string[] | undefined
): string {
  const fields = selected ?? allowed;
  for (const f of fields) {
    if (!allowed.includes(f)) {
      throw new Error(`Invalid field: ${f}`);
    }
  }
  return fields.join("\n        ");
}
