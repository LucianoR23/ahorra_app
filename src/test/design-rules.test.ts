import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Design rules that a grep can keep (design/app README "Decisions").

const SRC = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

function offenders(pattern: RegExp): string[] {
  return sourceFiles(SRC).flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, i) => (pattern.test(line) ? [`${relative(SRC, file).replaceAll("\\", "/")}:${i + 1}`] : [])),
  );
}

describe("design rules", () => {
  it("never sets type below 12 px", () => {
    expect(offenders(/text-\[(\d|1[01])(\.\d+)?px\]/)).toEqual([]);
    expect(offenders(/text-\[0?\.(?:[0-6]\d*|7(?:[0-4]\d*)?)rem\]/)).toEqual([]);
  });

  it("uses Lucide icons, not emojis or another icon library", () => {
    // lib/category-icons.ts translates the emojis older categories store.
    const emoji = offenders(/\p{Emoji_Presentation}|\p{Extended_Pictographic}\u{FE0F}/u).filter((f) => !f.startsWith("lib/category-icons.ts"));
    expect(emoji).toEqual([]);
    expect(offenders(/@hugeicons|react-icons|@heroicons|@tabler\/icons|phosphor-react/)).toEqual([]);
  });

  it("uses components/ui instead of native controls", () => {
    expect(offenders(/type="(checkbox|radio|date|month)"|<select\b|<dialog\b/)).toEqual([]);
  });
});
