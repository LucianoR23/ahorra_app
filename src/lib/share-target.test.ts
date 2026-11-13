import { describe, expect, it } from "vitest";
import {
  handleShare,
  isShareRequest,
  keepShare,
  SHARE_MAX_TEXT,
  SHARE_TTL_MS,
  sharedSentence,
  takeShare,
} from "./share-target";
import { STORAGE_KEYS } from "./storage-keys";

/** Cache Storage in memory, enough for what the share code uses. */
function memoryCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const cache = (entries: Map<string, Response>) =>
    ({
      put: async (key: string, res: Response) => void entries.set(key, res),
      match: async (key: string) => entries.get(key)?.clone(),
    }) as unknown as Cache;
  const store = {
    has: async (name: string) => stores.has(name),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      return cache(stores.get(name)!);
    },
    delete: async (name: string) => stores.delete(name),
  } as unknown as CacheStorage;
  return { store, stores };
}

function form(fields: Record<string, string | File | File[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    for (const one of Array.isArray(v) ? v : [v]) f.append(k, one);
  }
  return f;
}

const NOW = Date.parse("2026-11-13T15:00:00-03:00");
const png = new File([new Uint8Array([137, 80, 78, 71])], "captura mp.png", { type: "image/png" });

describe("sharedSentence", () => {
  it("joins title and text, drops links and repeats, cuts to the box's limit", () => {
    expect(sharedSentence("Comprobante", "Pagaste $ 15.430 a Carrefour https://mpago.la/abc")).toBe(
      "Comprobante Pagaste $ 15.430 a Carrefour",
    );
    expect(sharedSentence("café 2500", "café 2500")).toBe("café 2500");
    expect(sharedSentence(null, "  súper\n\n 3000  ")).toBe("súper 3000");
    expect(sharedSentence("", "https://example.test/x")).toBe("");
    expect(Array.from(sharedSentence(null, "ñ".repeat(400)))).toHaveLength(SHARE_MAX_TEXT);
  });
});

describe("keepShare and takeShare", () => {
  it("keeps the first image, which wins over text, and gives it back once", async () => {
    const { store, stores } = memoryCaches();
    const pdf = new File(["%PDF"], "a.pdf", { type: "application/pdf" });
    await keepShare(store, form({ text: "café 2500", image: [pdf, png] }), NOW);

    const got = await takeShare(store, NOW + 60_000);
    expect(got?.text).toBeUndefined();
    expect(got?.image?.name).toBe("captura mp.png");
    expect(got?.image?.type).toBe("image/png");
    expect(new Uint8Array(await got!.image!.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
    expect(stores.has(STORAGE_KEYS.shareCache)).toBe(false);
    expect(await takeShare(store, NOW + 60_000)).toBeNull();
  });

  it("keeps a text when there is no image, and a new share replaces the old one", async () => {
    const { store } = memoryCaches();
    await keepShare(store, form({ image: png }), NOW);
    await keepShare(store, form({ title: "Pago", text: "Edenor 18000 https://x.test" }), NOW);
    expect(await takeShare(store, NOW)).toEqual({ text: "Pago Edenor 18000" });
  });

  it("drops a share older than ten minutes, from the future, or empty", async () => {
    const { store, stores } = memoryCaches();
    await keepShare(store, form({ text: "café 2500" }), NOW);
    expect(await takeShare(store, NOW + SHARE_TTL_MS + 1)).toBeNull();
    expect(stores.has(STORAGE_KEYS.shareCache)).toBe(false);

    await keepShare(store, form({ text: "café 2500" }), NOW);
    expect(await takeShare(store, NOW - 1)).toBeNull();

    await keepShare(store, form({ url: "https://x.test" }), NOW);
    expect(await takeShare(store, NOW)).toBeNull();
  });

  it("is null without Cache Storage or when it fails", async () => {
    expect(await takeShare(undefined, NOW)).toBeNull();
    const broken = { has: async () => Promise.reject(new Error("denied")) } as unknown as CacheStorage;
    expect(await takeShare(broken, NOW)).toBeNull();
  });
});

describe("handleShare", () => {
  it("keeps the share and sends the person to Cargar gasto", async () => {
    const { store } = memoryCaches();
    const req = new Request("https://app.example.test/compartir", { method: "POST", body: form({ text: "café 2500" }) });
    const res = await handleShare(req, store, NOW);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.example.test/agregar?recibido=1");
    expect(await takeShare(store, NOW)).toEqual({ text: "café 2500" });
  });

  it("still lands on Cargar gasto when the body cannot be read", async () => {
    const { store } = memoryCaches();
    const req = new Request("https://app.example.test/compartir", { method: "POST", body: "not a form" });
    const res = await handleShare(req, store, NOW);
    expect(res.status).toBe(303);
    expect(await takeShare(store, NOW)).toBeNull();
  });
});

describe("isShareRequest", () => {
  const origin = "https://app.example.test";
  it("matches only a POST to /compartir on this origin", () => {
    expect(isShareRequest(new Request(`${origin}/compartir`, { method: "POST" }), origin)).toBe(true);
    expect(isShareRequest(new Request(`${origin}/compartir`), origin)).toBe(false);
    expect(isShareRequest(new Request(`${origin}/compartir/x`, { method: "POST" }), origin)).toBe(false);
    expect(isShareRequest(new Request("https://other.test/compartir", { method: "POST" }), origin)).toBe(false);
  });
});
