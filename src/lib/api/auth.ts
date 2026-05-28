"use client";

/**
 * Auth lives entirely client-side: cross-origin httpOnly refresh cookie
 * (set by api-ahorra.lemydev.com) is only attached on requests from the
 * browser to that origin. Server Action proxying breaks the Set-Cookie flow.
 */

import { apiFetch } from "./client";
import {
  authResponseSchema,
  googleAuthResponseSchema,
  refreshResponseSchema,
  userSchema,
  type AuthResponse,
  type GoogleAuthResponse,
  type RefreshResponse,
  type LoginInput,
  type RegisterInput,
  type User,
} from "./schemas";

export async function login(input: LoginInput): Promise<AuthResponse> {
  const json = await apiFetch({ method: "POST", path: "/auth/login", body: input });
  return authResponseSchema.parse(json);
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const json = await apiFetch({ method: "POST", path: "/auth/register", body: input });
  return authResponseSchema.parse(json);
}

export async function loginWithGoogle(idToken: string): Promise<GoogleAuthResponse> {
  const json = await apiFetch({
    method: "POST",
    path: "/auth/google",
    body: { idToken },
  });
  return googleAuthResponseSchema.parse(json);
}

export async function refresh(): Promise<RefreshResponse> {
  const json = await apiFetch({ method: "POST", path: "/auth/refresh" });
  return refreshResponseSchema.parse(json);
}

export async function logout(): Promise<void> {
  await apiFetch({ method: "POST", path: "/auth/logout" });
}

export async function getMe(token: string): Promise<User> {
  const json = await apiFetch({ path: "/me", token });
  return userSchema.parse(json);
}

// --- Password reset / verify / change -------------------------------------

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch({ method: "POST", path: "/auth/forgot-password", body: { email } });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiFetch({
    method: "POST",
    path: "/auth/reset-password",
    body: { token, newPassword },
  });
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiFetch({
    method: "POST",
    path: "/auth/change-password",
    body: { currentPassword, newPassword },
    token,
  });
}

export async function verifyEmail(token: string): Promise<void> {
  await apiFetch({ method: "POST", path: "/auth/verify-email", body: { token } });
}

export async function resendVerificationEmail(token: string): Promise<void> {
  await apiFetch({
    method: "POST",
    path: "/auth/resend-verification-email",
    token,
  });
}
