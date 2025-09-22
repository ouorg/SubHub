import type { Env } from "../types";
import { extractTokenFromCookie, verifyJWT } from "../utils/jwt";
import { parseSubscriptionHeaders } from "../utils/parser";
import { createStorage, UserRecord } from "../utils/storage";

const jsonResponse = (data: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json;charset=utf-8",
      ...(init.headers ?? {}),
    },
    ...init,
  });

interface RefreshRequest extends Request {
  params?: Record<string, string>;
}

export const handleRefresh = async (request: RefreshRequest, env: Env): Promise<Response> => {
  const token = extractTokenFromCookie(request, "subhub_token");
  if (!token) {
    return jsonResponse({ error: "未登录" }, { status: 401 });
  }
  let payload;
  try {
    payload = await verifyJWT(token, env.JWT_SECRET);
  } catch (error) {
    return jsonResponse({ error: "登录态失效" }, { status: 401 });
  }
  const uuid = request.params?.uuid;
  if (!uuid) {
    return jsonResponse({ error: "缺少用户" }, { status: 400 });
  }
  if (payload.role === "user" && payload.uuid !== uuid) {
    return jsonResponse({ error: "没有权限" }, { status: 403 });
  }

  const storage = createStorage(env);
  const record = await storage.getUser(uuid);
  if (!record) {
    return jsonResponse({ error: "用户不存在" }, { status: 404 });
  }

  let response: Response;
  try {
    response = await fetch(record.sub, { cf: { cacheTtl: 0 } });
  } catch (error) {
    return jsonResponse({ error: "订阅链接请求失败" }, { status: 502 });
  }
  if (!response.ok) {
    return jsonResponse({ error: `订阅返回错误: ${response.status}` }, { status: 502 });
  }

  const updates = parseSubscriptionHeaders(response.headers);
  const updated: UserRecord = {
    ...record,
    traffic: updates.traffic ?? record.traffic,
    expire: updates.expire ?? record.expire,
  };
  await storage.putUser(uuid, updated);

  return jsonResponse({ record: updated });
};
