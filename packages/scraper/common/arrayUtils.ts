export function stripTrailingEmptyValue(arr: string[]): string[] {
  const lastIndex = arr.length - 1;
  for (let i = lastIndex; i >= 0; i--) {
    if (arr[i]?.trim()) {
      return arr.slice(0, i + 1);
    }
  }
  return [];
}
