let counter = 0;
/** Short, sortable, collision-free ids for proposals and log entries. */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}
