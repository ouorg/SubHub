import type { Env } from "../types";
import { buildLogoutCookie, extractTokenFromCookie, verifyJWT } from "../utils/jwt";
import { renderUserPage } from "../utils/render";
import { createStorage } from "../utils/storage";

const unauthorized = (): Response =>
  new Response("", {
    status: 302,
    headers: { location: "/" },
  });

export const handleUserPage = async (request: Request, env: Env): Promise<Response> => {
  const token = extractTokenFromCookie(request, "subhub_token");
  if (!token) {
    return unauthorized();
  }
  let payload;
  try {
    payload = await verifyJWT(token, env.JWT_SECRET);
  } catch (error) {
    return new Response("", {
      status: 302,
      headers: { location: "/", "set-cookie": buildLogoutCookie() },
    });
  }
  if (payload.role !== "user" || !payload.uuid) {
    return new Response("禁止访问", { status: 403 });
  }
  const storage = createStorage(env);
  const record = await storage.getUser(payload.uuid);
  if (!record) {
    return new Response("用户不存在", { status: 404 });
  }
  return new Response(renderUserPage(payload.uuid, record), {
    headers: { "content-type": "text/html;charset=utf-8" },
  });
};
