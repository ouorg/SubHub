import type { Env } from "../types";
import { buildAuthCookie, buildLogoutCookie, signJWT } from "../utils/jwt";
import { createStorage } from "../utils/storage";

const jsonResponse = (data: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json;charset=utf-8",
      ...(init.headers ?? {}),
    },
    ...init,
  });

export const handleLogin = async (request: Request, env: Env): Promise<Response> => {
  const storage = createStorage(env);
  let credential = "";
  try {
    const body = (await request.json()) as { credential?: string };
    credential = typeof body.credential === "string" ? body.credential.trim() : "";
  } catch (error) {
    return jsonResponse({ error: "缺少登录信息" }, { status: 400 });
  }

  if (!credential) {
    return jsonResponse({ error: "缺少登录信息" }, { status: 400 });
  }

  if (credential === env.ADMIN_KEY) {
    const token = await signJWT({ role: "admin" }, env.JWT_SECRET);
    return jsonResponse(
      { role: "admin" },
      {
        headers: { "set-cookie": buildAuthCookie(token) },
      }
    );
  }

  const record = await storage.getUser(credential);
  if (!record) {
    return jsonResponse({ error: "用户不存在" }, { status: 401 });
  }
  const token = await signJWT({ role: "user", uuid: credential }, env.JWT_SECRET);
  return jsonResponse(
    { role: "user" },
    {
      headers: { "set-cookie": buildAuthCookie(token) },
    }
  );
};

export const handleLogout = async (): Promise<Response> => {
  return new Response("", {
    status: 302,
    headers: {
      location: "/",
      "set-cookie": buildLogoutCookie(),
    },
  });
};
