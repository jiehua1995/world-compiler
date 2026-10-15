import { describe, it, expect } from "vitest";
import {
  wifiPayload,
  convertText,
  parseTime,
  parseJsonDocument,
} from "../../src/features/utilities/core";
import { compareTexts } from "../../src/features/utilities/diff";
import {
  cropRectangle,
  validateOutput,
} from "../../src/features/utilities/image";
import {
  shapeRows,
  serializeTsv,
  escapeSpreadsheetFormulas,
} from "../../src/features/data-shape/shape";
import { parseDelimitedText } from "../../src/features/data-shape/csv";
import {
  suggestForeground,
  contrastRatio,
  parseHexColor,
} from "../../src/features/contrast-lens/contrast";

describe("workbench transforms", () => {
  it("bounds JSON depth and node counts before formatting", () => {
    expect(parseJsonDocument('{"ok":[1,2]}')).toEqual({ ok: [1, 2] });
    expect(() =>
      parseJsonDocument("[".repeat(34) + "0" + "]".repeat(34)),
    ).toThrow();
    expect(() =>
      parseJsonDocument(JSON.stringify(Array(20001).fill(0))),
    ).toThrow();
  });
  it("round trips Unicode Base64 and rejects invalid UTF-8", () => {
    const text = "世界 · Grüße 🌍";
    expect(
      convertText(convertText(text, "base64-encode"), "base64-decode"),
    ).toBe(text);
    expect(() => convertText("/w==", "base64-decode")).toThrow();
    expect(() => convertText("%%%", "url-decode")).toThrow();
  });
  it("escapes markup without interpreting it", () => {
    const value = '<img src=x onerror="alert(1)">&';
    expect(convertText(convertText(value, "html-encode"), "html-decode")).toBe(
      value,
    );
    expect(convertText("&#x1F30D;", "html-decode")).toBe("🌍");
    expect(() => convertText("&#xD800;", "html-decode")).toThrow();
  });
  it("escapes Wi-Fi separators and excludes passwords for open networks", () => {
    expect(wifiPayload("a;b", "c:d", "WPA", false)).toBe(
      "WIFI:T:WPA;S:a\\;b;P:c\\:d;H:false;;",
    );
    expect(wifiPayload("Open", "secret", "nopass", true)).not.toContain(
      "secret",
    );
    expect(() => wifiPayload("", "x", "WPA", false)).toThrow();
  });
  it("converts timestamps and explicit zones and rejects invalid calendar dates", () => {
    expect(parseTime("0", "seconds").toISOString()).toBe(
      "1970-01-01T00:00:00.000Z",
    );
    expect(parseTime("2026-10-15T12:00:00+02:00", "iso").toISOString()).toBe(
      "2026-10-15T10:00:00.000Z",
    );
    expect(() => parseTime("2025-02-29T12:00:00Z", "iso")).toThrow();
    expect(() => parseTime("2026-10-15T12:00:00", "iso")).toThrow();
    expect(() => parseTime("Infinity", "seconds")).toThrow();
  });
  it("compares changed lines and honors normalization with bounded input", () => {
    const parts = compareTexts(
      "Hello\nold\n",
      "Hello\nnew\n",
      "lines",
      false,
      false,
    );
    expect(parts.some((part) => part.added && part.value === "new\n")).toBe(
      true,
    );
    expect(
      compareTexts(" HELLO \n", "hello\n", "lines", true, true).some(
        (part) => part.added || part.removed,
      ),
    ).toBe(false);
    expect(() =>
      compareTexts("x".repeat(50001), "", "lines", false, false),
    ).toThrow();
  });
  it("computes centered crops and rejects excessive canvas allocations", () => {
    expect(cropRectangle(400, 200, 1)).toEqual({
      x: 100,
      y: 0,
      width: 200,
      height: 200,
    });
    expect(() => validateOutput(8192, 8192)).toThrow();
    expect(() => validateOutput(0, 100)).toThrow();
  });
  it("transforms from original rows with header-preserving sorting and duplicate removal", () => {
    const input = [
      [" name ", "n"],
      ["Ada", "12"],
      ["Lin", "3"],
      ["Ada", "12"],
    ];
    expect(
      shapeRows(input, {
        columns: "2,1",
        names: "visits,person",
        sortColumn: 1,
        direction: "asc",
        deduplicate: true,
      }),
    ).toEqual([
      ["visits", "person"],
      ["3", "Lin"],
      ["12", "Ada"],
    ]);
    expect(input[0][0]).toBe(" name ");
    expect(() =>
      shapeRows(input, {
        columns: "0",
        names: "",
        sortColumn: 1,
        direction: "none",
        deduplicate: false,
      }),
    ).toThrow();
    const value = [
      ["a\tb", '"quoted"'],
      ["line\nb", "c"],
    ];
    expect(parseDelimitedText(serializeTsv(value), "\t")).toEqual(value);
    expect(escapeSpreadsheetFormulas([["=SUM(A1)", "safe"]])).toEqual([
      ["'=SUM(A1)", "safe"],
    ]);
  });
  it("finds a contrast correction or reports that a target is unreachable", () => {
    const bg = parseHexColor("#fff")!,
      fg = parseHexColor("#aaa")!;
    const suggested = suggestForeground(fg, bg, 4.5)!;
    expect(contrastRatio(suggested, bg)).toBeGreaterThanOrEqual(4.5);
    expect(
      suggestForeground(parseHexColor("#777")!, parseHexColor("#777")!, 21),
    ).toBeNull();
  });
});
