// @vitest-environment node
// Node's own File/FormData: undici cannot stream jsdom's File objects, which
// would hang the request (real browsers are not affected).
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { API, lastRequest, server } from "@/test/msw";
import { createTicket } from "./support";

it("creates a ticket as multipart with at most 3 files and the client metadata", async () => {
  let form: FormData | undefined;
  server.use(
    http.post(`${API}/support/tickets`, async ({ request }) => {
      form = await request.formData();
      return HttpResponse.json({ id: "t1" }, { status: 201 });
    }),
  );
  const files = [1, 2, 3, 4].map((n) => new File([`img${n}`], `cap${n}.png`, { type: "image/png" }));

  await createTicket({ type: "bug", subject: "No anda", description: "Detalle", files, metadata: { locale: "es-AR" } });

  const r = lastRequest();
  expect(r.path).toBe("/support/tickets");
  expect(r.headers.get("x-household-id")).toBeNull();
  expect(r.headers.get("content-type")).toMatch(/^multipart\/form-data/);
  expect(form?.get("type")).toBe("bug");
  expect(form?.get("subject")).toBe("No anda");
  expect(form?.get("description")).toBe("Detalle");
  expect(form?.getAll("files")).toHaveLength(3);
  expect(form?.get("metadata")).toBe('{"locale":"es-AR"}');
});
