import { sanitizeCsvField } from "../../services/adminService";

describe("sanitizeCsvField", () => {
  test("wraps plain values in quotes", () => {
    expect(sanitizeCsvField("Alice")).toBe('"Alice"');
  });

  test("renders null/undefined as empty quoted field", () => {
    expect(sanitizeCsvField(null)).toBe('""');
    expect(sanitizeCsvField(undefined)).toBe('""');
  });

  test("escapes embedded double quotes by doubling them", () => {
    expect(sanitizeCsvField('he said "hi"')).toBe('"he said ""hi"""');
  });

  test.each(["=", "+", "-", "@", "\t", "\r"])(
    "neutralizes leading formula character %j with an apostrophe",
    (prefix) => {
      const result = sanitizeCsvField(`${prefix}cmd|'/C calc'!A1`);
      expect(result.startsWith(`"'${prefix}`)).toBe(true);
    },
  );

  test("does not prefix when the formula char is not leading", () => {
    expect(sanitizeCsvField("a=b")).toBe('"a=b"');
  });
});
