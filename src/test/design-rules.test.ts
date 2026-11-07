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
      .flatMap((line, i) => (pattern.test(line) ? [`${relative(SRC, file)}:${i + 1}`] : [])),
  );
}

describe("design rules", () => {
  it("never sets type below 12 px", () => {
    expect(offenders(/text-\[(\d|1[01])(\.\d+)?px\]/)).toEqual([]);
    expect(offenders(/text-\[0?\.(?:[0-6]\d*|7(?:[0-4]\d*)?)rem\]/)).toEqual([]);
  });
});
