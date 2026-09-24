// Base UI's <Select> (components/ui/select.tsx) renders the raw `value` in its
// closed trigger unless the Root receives an `items` map of value -> label —
// it does NOT read the label from the <SelectItem> children. Every picker
// whose value is a Firestore id (team, project, user) therefore showed that
// id (e.g. "abc123XYZ") once something was selected. Pass the result of
// selectItems() as <Select items={...}> so the trigger shows the name while
// the stored value stays the id.

interface SelectItemsOptions {
  /** Labels for sentinel values such as "all" / "none" that aren't in `options`. */
  extra?: Record<string, string>;
  /** The currently selected value — if it isn't among the options (deleted, or not visible to this user), it's labeled with `unresolvedLabel` instead of leaking the raw id. */
  value?: string | null;
  unresolvedLabel?: string;
}

export function selectItems<T>(
  options: readonly T[],
  getValue: (option: T) => string,
  getLabel: (option: T) => string,
  { extra, value, unresolvedLabel = "Unknown" }: SelectItemsOptions = {}
): Record<string, string> {
  const items: Record<string, string> = { ...extra };
  for (const option of options) items[getValue(option)] = getLabel(option);
  if (value && !Object.hasOwn(items, value)) items[value] = unresolvedLabel;
  return items;
}
