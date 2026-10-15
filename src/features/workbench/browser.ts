import type { Locale } from "../../i18n/types";
export type Copy = readonly [string, string, string];
export const say = (
  copy: Copy,
  locale = document.documentElement.lang,
): string => copy[locale === "de" ? 2 : locale === "en" ? 1 : 0];
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const locale = (): Locale => document.documentElement.lang as Locale;
export const errorCopy: Copy = [
  "无法处理此输入，请检查格式和大小后重试。",
  "Cannot process this input. Check its format and size.",
  "Diese Eingabe kann nicht verarbeitet werden. Format und Größe prüfen.",
];
