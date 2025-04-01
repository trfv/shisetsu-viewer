/**
 * 配列末尾の空要素を削除する
 * @param arr - 処理対象の配列
 * @returns 末尾の空要素を削除した配列
 */
export function stripTrailingEmptyValue(arr: string[]): string[] {
  const lastIndex = arr.length - 1;
  for (let i = lastIndex; i >= 0; i--) {
    if (arr[i]?.trim()) {
      return arr.slice(0, i + 1);
    }
  }
  return [];
}
