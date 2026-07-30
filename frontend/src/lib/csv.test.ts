import { describe, expect, it } from "vitest";

import { serializeCsv, serializeCsvCell } from "./csv";

describe("CSV serialization", () => {
  it.each(["=1+1", "+SUM(A1:A2)", "-2+3", "@IMPORT", "\tcmd", "\rcmd"])(
    "neutralizes spreadsheet formula prefix %s",
    (value) => {
      expect(serializeCsvCell(value)).toBe(`"'${value}"`);
    },
  );

  it("quotes commas, line breaks, and quotes", () => {
    expect(serializeCsv([["Naucalpan, Mexico", 'Taller "7F"', "linea\n2"]])).toBe(
      '"Naucalpan, Mexico","Taller ""7F""","linea\n2"',
    );
  });
});
