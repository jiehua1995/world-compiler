import { cleanRows, parseDelimitedText } from "./csv";
export interface ShapeOptions {
  columns: string;
  names: string;
  sortColumn: number;
  direction: "none" | "asc" | "desc";
  deduplicate: boolean;
}
export function shapeRows(
  source: string[][],
  options: ShapeOptions,
): string[][] {
  let rows = cleanRows(source);
  if (!rows.length) return [];
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const selected = options.columns.trim()
    ? options.columns.split(",").map((value) => {
        if (!/^\d+$/u.test(value.trim())) throw new Error("Invalid column");
        const index = Number(value.trim()) - 1;
        if (index < 0 || index >= width)
          throw new Error("Column outside table");
        return index;
      })
    : Array.from({ length: width }, (_, i) => i);
  if (new Set(selected).size !== selected.length)
    throw new Error("Repeated column");
  rows = rows.map((row) => selected.map((i) => row[i] ?? ""));
  const [header, ...body] = rows;
  let data = body;
  if (options.deduplicate) {
    const seen = new Set<string>();
    data = data.filter((row) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (options.direction !== "none") {
    if (
      !Number.isInteger(options.sortColumn) ||
      options.sortColumn < 1 ||
      options.sortColumn > header.length
    )
      throw new Error("Invalid sort column");
    const column = options.sortColumn - 1,
      sign = options.direction === "asc" ? 1 : -1;
    data.sort(
      (a, b) =>
        sign *
        (a[column] ?? "").localeCompare(b[column] ?? "", undefined, {
          numeric: true,
        }),
    );
  }
  if (options.names.trim()) {
    const names = parseDelimitedText(options.names, ",")[0] ?? [];
    if (names.length !== header.length)
      throw new Error("Header count mismatch");
    return [names, ...data];
  }
  return [header, ...data];
}
export function serializeTsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) =>
          /["\t\r\n]/u.test(cell)
            ? '"' + cell.replace(/"/gu, '""') + '"'
            : cell,
        )
        .join("\t"),
    )
    .join("\r\n");
}
export const escapeSpreadsheetFormulas = (rows: string[][]): string[][] =>
  rows.map((row) =>
    row.map((cell) => (/^[=+\-@\t\r]/u.test(cell) ? "'" + cell : cell)),
  );
