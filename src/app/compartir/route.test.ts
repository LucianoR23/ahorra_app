import { describe, expect, it } from "vitest";
import manifest from "../manifest";
import { GET, POST } from "./route";

describe("Share Target (plan 3.4)", () => {
  it("is in the manifest as a multipart POST with images and text", () => {
    expect(manifest().share_target).toMatchObject({
      action: "/compartir",
      method: "POST",
      enctype: "multipart/form-data",
      params: { title: "title", text: "text", files: [{ name: "image", accept: ["image/*"] }] },
    });
  });

  it("without the service worker, lands on Cargar gasto with nothing kept", () => {
    for (const handler of [POST, GET]) {
      const res = handler();
      expect(res.status).toBe(303);
      expect(res.headers.get("location")).toBe("/agregar?recibido=1");
    }
  });
});
