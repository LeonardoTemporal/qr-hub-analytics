const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function serializeCsvCell(value: string): string {
  const neutralized = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  return `"${neutralized.replaceAll('"', '""')}"`;
}

export function serializeCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map(serializeCsvCell).join(","))
    .join("\r\n");
}
