import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLogout } from "./use-logout";
import { API, server, signIn } from "@/test/msw";
import { useAuthStore } from "@/stores/auth";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
const unsubscribePush = vi.fn();
vi.mock("@/lib/push", () => ({ unsubscribePush: (token: string) => unsubscribePush(token) }));

beforeEach(() => {
  replace.mockClear();
  unsubscribePush.mockReset();
  signIn();
});

describe("useLogout", () => {
  it("still signs out when turning push off fails", async () => {
    unsubscribePush.mockRejectedValue(new Error("no service worker"));
    server.use(http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })));
    const { result } = renderHook(() => useLogout());

    await result.current();

    expect(unsubscribePush).toHaveBeenCalledWith("access-1");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

});
