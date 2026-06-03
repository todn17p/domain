import { cookies } from "next/headers";

const ADMIN_COOKIE = "portfolio-gallery-admin-v2";

export async function isAdminLoggedIn() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === "yes";
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "yes", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export function verifyAdminCredentials(id: string, password: string) {
  const adminId = process.env.ADMIN_ID ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "1234";
  return id === adminId && password === adminPassword;
}
