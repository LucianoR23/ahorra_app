#!/usr/bin/env node
// Vendors the workspace brand kit (`../brand`) into this repo (plan 1.1).
//
//   pnpm brand:sync    copy brand files, write brand/VERSION + brand/manifest.json
//   pnpm brand:check   verify vendored files still match the manifest (CI)
//
// The brand is edited only in the workspace repo (valuo_workspace/brand) and
// re-synced here. Never edit the vendored files by hand.
//
// Where things land:
//   brand/          tokens and docs (read by code and people, not served)
//   public/brand/   logos, icons and PNGs (served as /brand/...)
//   src/app/        favicon and apple icon (Next.js file conventions)
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docsDest = join(root, "brand");
const assetsDest = join(root, "public", "brand");
const manifestPath = join(docsDest, "manifest.json");
const versionPath = join(docsDest, "VERSION");

const DOC_ENTRIES = ["tokens.json", "tokens.css", "BRAND.md", "README.md"];
const ASSET_ENTRIES = ["logo", "icons", "png"];
const APP_ICONS = {
  "icons/favicon.svg": "src/app/icon.svg",
  "png/favicon.ico": "src/app/favicon.ico",
  "png/apple-touch-icon.png": "src/app/apple-icon.png",
};

const toPosix = (p) => p.split(sep).join("/");
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function vendoredFiles() {
  const docs = walk(docsDest).filter((f) => f !== manifestPath && f !== versionPath);
  const appIcons = Object.values(APP_ICONS).map((p) => join(root, p));
  return [...docs, ...walk(assetsDest), ...appIcons].map((f) => toPosix(relative(root, f))).sort();
}

function fail(message) {
  console.error(`brand: ${message}`);
  process.exit(1);
}

function check() {
  if (!existsSync(versionPath) || !existsSync(manifestPath)) fail("brand is not synced. Run `pnpm brand:sync`.");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const expected = Object.keys(manifest.files).sort();
  const actual = vendoredFiles();
  const missing = expected.filter((f) => !actual.includes(f));
  const extra = actual.filter((f) => !expected.includes(f));
  const changed = expected.filter((f) => actual.includes(f) && sha256(join(root, f)) !== manifest.files[f]);
  if (missing.length || extra.length || changed.length) {
    fail(
      [
        "vendored brand differs from its manifest (edit the brand in the workspace, then re-sync):",
        ...missing.map((f) => `  missing  ${f}`),
        ...extra.map((f) => `  extra    ${f}`),
        ...changed.map((f) => `  changed  ${f}`),
      ].join("\n"),
    );
  }
  console.log(`brand: OK (${expected.length} files, source ${manifest.source})`);
}

function sync() {
  const src = resolve(process.env.BRAND_SRC ?? join(root, "..", "brand"));
  if (!existsSync(join(src, "tokens.json"))) fail(`no brand kit at ${src} (set BRAND_SRC).`);

  const workspace = dirname(src);
  const git = (...args) => execFileSync("git", ["-C", workspace, ...args], { encoding: "utf8" }).trim();
  const dirty = git("status", "--porcelain", "--", "brand");
  if (dirty) fail(`refusing to sync: uncommitted changes in ${src}\n${dirty}`);
  const sha = git("rev-parse", "HEAD");

  for (const dir of [docsDest, assetsDest]) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }
  for (const entry of DOC_ENTRIES) cpSync(join(src, entry), join(docsDest, entry));
  for (const entry of ASSET_ENTRIES) cpSync(join(src, entry), join(assetsDest, entry), { recursive: true });
  for (const [from, to] of Object.entries(APP_ICONS)) cpSync(join(src, from), join(root, to));

  const files = Object.fromEntries(vendoredFiles().map((f) => [f, sha256(join(root, f))]));
  writeFileSync(manifestPath, `${JSON.stringify({ source: sha, files }, null, 2)}\n`);
  writeFileSync(versionPath, `${sha}\n`);
  console.log(`brand: synced ${Object.keys(files).length} files from valuo_workspace@${sha.slice(0, 7)}`);
}

if (process.argv.includes("--check")) check();
else sync();
