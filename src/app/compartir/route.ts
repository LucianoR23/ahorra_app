import { SHARE_LANDING } from "@/lib/share-target";

// Share Target (plan 3.4) without the service worker (first visit, or the
// worker not running yet): nothing is kept, so Cargar gasto says nothing
// arrived. The shared content is never read or logged here. The Location is
// relative because behind the proxy request.url carries the internal host.
function toLanding(): Response {
  return new Response(null, { status: 303, headers: { Location: SHARE_LANDING } });
}

export const POST = toLanding;
export const GET = toLanding;
