/**
 * 小程序码 / 扫码进入时的 scene 解析（微信会 urlencode，需安全 decode）
 */
export function safeDecodeURIComponent(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

export function parseMiniProgramScene(scene: string | null | undefined): URLSearchParams | null {
  if (scene == null || scene === '') return null;
  const raw = safeDecodeURIComponent(String(scene));
  try {
    return new URLSearchParams(raw);
  } catch {
    return null;
  }
}

/** 解析 scene 或普通 query 中的正整数 id（排除 NaN） */
export function parsePositiveIntParam(value: string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
