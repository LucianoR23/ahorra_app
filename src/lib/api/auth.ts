"use client";

/**
 * Auth lives entirely client-side: cross-origin httpOnly refresh cookie
 * (set by api-ahorra.lemydev.com) is only attached on requests from the
 * browser to that origin. Server Action proxying breaks the Set-Cookie flow.
 */

import { apiFetch } from "./client";
import { authResponseSchema, refreshResponseSchema, type AuthResponse, type RefreshResponse, type LoginInput, type RegisterInput } from "./schemas";

export async function login(input: LoginInput): Promise<AuthResponse> {
  const json = await apiFetch({ method: "POST", path: "/auth/login", body: input });
  return authResponseSchema.parse(json);
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const json = await apiFetch({ method: "POST", path: "/auth/register", body: input });
  return authResponseSchema.parse(json);
}

export async function refresh(): Promise<RefreshResponse> {
  const json = await apiFetch({ method: "POST", path: "/auth/refresh" });
  return refreshResponseSchema.parse(json);
}

export async function logout(): Promise<void> {
  await apiFetch({ method: "POST", path: "/auth/logout" });
}

export async function getMe(token: string) {
  const json = await apiFetch({ path: "/me", token });
  return json as { id: string; email: string; firstName: string; lastName: string };
}
