export interface DiscoveredTarget {
  facilityName: string;
  roomName?: string;
  category?: string;
  musicLikely: boolean;
  target: Record<string, unknown>;
}

const MUSIC_KEYWORD_RE = /音楽|スタジオ|ホール|リハーサル|練習|防音|音出し|ピアノ|バンド|講堂/;

export function isMusicLikely(...names: (string | undefined)[]): boolean {
  return names.some((name) => name !== undefined && MUSIC_KEYWORD_RE.test(name));
}

export interface TargetKey {
  facilityName: string;
  roomName?: string | undefined;
  roomLink?: string | undefined;
}

/** Playwright の accessible name 照合に揃え、サイト側の NBSP を差分として拾わない */
function normalizeName(name: string | undefined): string {
  return (name ?? "").replace(/\s+/g, " ").trim();
}

export function roomLinkOf(target: unknown): string | undefined {
  if (typeof target !== "object" || target === null || !("links" in target)) return undefined;
  const links = target.links;
  if (!Array.isArray(links)) return undefined;
  const last: unknown = links.at(-1);
  return typeof last === "string" ? last : undefined;
}

const CAPACITY_SUFFIX_RE = /^\s*[（(]定員/;

function isSameTarget(existing: TargetKey, discovered: DiscoveredTarget): boolean {
  if (normalizeName(existing.facilityName) !== normalizeName(discovered.facilityName)) {
    return false;
  }
  if (normalizeName(existing.roomName) === normalizeName(discovered.roomName)) return true;
  // 表示名だけ改称し roomName（D1 解決キー）を据え置いた対象は遷移リンクで照合する。
  // 既存リンクは定員サフィックスを省いた前方一致形のことがある（openreaf の roomLinkMatch: "prefix"）
  const existingLink = normalizeName(existing.roomLink);
  const discoveredLink = normalizeName(roomLinkOf(discovered.target));
  if (!existingLink || !discoveredLink.startsWith(existingLink)) return false;
  const rest = discoveredLink.slice(existingLink.length);
  return rest === "" || CAPACITY_SUFFIX_RE.test(rest);
}

export function diffDiscovered(
  discovered: readonly DiscoveredTarget[],
  existing: readonly TargetKey[]
): { added: DiscoveredTarget[]; missing: TargetKey[] } {
  return {
    added: discovered.filter((d) => !existing.some((e) => isSameTarget(e, d))),
    missing: existing.filter((e) => !discovered.some((d) => isSameTarget(e, d))),
  };
}

export function formatDiscoveryReport(
  discovered: readonly DiscoveredTarget[],
  existing?: readonly TargetKey[]
): string {
  const lines: string[] = [];
  const music = discovered.filter((d) => d.musicLikely);
  lines.push(`discovered: ${discovered.length} 件（うち musicLikely: ${music.length} 件）`);

  if (existing) {
    const { added, missing } = diffDiscovered(discovered, existing);
    lines.push(
      `targets との差分: 追加候補 ${added.length} 件 / サイトで未発見 ${missing.length} 件`
    );
    for (const d of added) {
      lines.push(
        `  + ${d.facilityName}${d.roomName ? ` / ${d.roomName}` : ""}${d.musicLikely ? " ♪" : ""}`
      );
    }
    for (const m of missing) {
      lines.push(`  - ${m.facilityName}${m.roomName ? ` / ${m.roomName}` : ""}`);
    }
  }
  return lines.join("\n");
}
