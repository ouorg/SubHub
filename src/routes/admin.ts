import type { Env } from "../types";
import { buildLogoutCookie, extractTokenFromCookie, verifyJWT } from "../utils/jwt";
import { renderAdminPage } from "../utils/render";
import { createStorage, normalizeUserRecord } from "../utils/storage";

const jsonResponse = (data: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json;charset=utf-8",
      ...(init.headers ?? {}),
    },
    ...init,
  });

class AuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const requireAdmin = async (request: Request, env: Env): Promise<void> => {
  const token = extractTokenFromCookie(request, "subhub_token");
  if (!token) {
    throw new AuthError(401, "未登录");
  }
  let payload;
  try {
    payload = await verifyJWT(token, env.JWT_SECRET);
  } catch (error) {
    throw new AuthError(401, "登录态失效");
  }
  if (payload.role !== "admin") {
    throw new AuthError(403, "无权访问");
  }
};

export const handleAdminPage = async (request: Request, env: Env): Promise<Response> => {
  try {
    await requireAdmin(request, env);
  } catch (error) {
    if (error instanceof AuthError) {
      const headers: Record<string, string> = { location: "/" };
      if (error.status === 401) {
        headers["set-cookie"] = buildLogoutCookie();
      }
      return new Response("", {
        status: 302,
        headers,
      });
    }
    throw error;
  }
  return new Response(renderAdminPage(), {
    headers: { "content-type": "text/html;charset=utf-8" },
  });
};

export const handleListUsers = async (request: Request, env: Env): Promise<Response> => {
  try {
    await requireAdmin(request, env);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  const storage = createStorage(env);
  const users = await storage.listUsers();
  return jsonResponse({ users });
};

export const handleCreateUser = async (request: Request, env: Env): Promise<Response> => {
  try {
    await requireAdmin(request, env);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  let uuid = "";
  let recordInput: unknown;
  try {
    const body = (await request.json()) as { uuid?: string; record?: unknown };
    uuid = typeof body.uuid === "string" ? body.uuid.trim() : "";
    recordInput = body.record;
  } catch (error) {
    return jsonResponse({ error: "请求体格式错误" }, { status: 400 });
  }
  if (!uuid || typeof recordInput !== "object" || recordInput === null) {
    return jsonResponse({ error: "缺少必要字段" }, { status: 400 });
  }
  let record;
  try {
    record = normalizeUserRecord(recordInput as any);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, { status: 400 });
  }
  const storage = createStorage(env);
  await storage.putUser(uuid, record);
  return jsonResponse({ success: true });
};

interface ParamsRequest extends Request {
  params?: Record<string, string>;
}

export const handleUpdateUser = async (request: ParamsRequest, env: Env): Promise<Response> => {
  try {
    await requireAdmin(request, env);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  const uuid = request.params?.uuid;
  if (!uuid) {
    return jsonResponse({ error: "缺少用户" }, { status: 400 });
  }
  let recordInput: unknown;
  try {
    recordInput = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    return jsonResponse({ error: "请求体格式错误" }, { status: 400 });
  }
  let record;
  try {
    record = normalizeUserRecord(recordInput as any);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, { status: 400 });
  }
  const storage = createStorage(env);
  await storage.putUser(uuid, record);
  return jsonResponse({ success: true });
};

export const handleDeleteUser = async (request: ParamsRequest, env: Env): Promise<Response> => {
  try {
    await requireAdmin(request, env);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  const uuid = request.params?.uuid;
  if (!uuid) {
    return jsonResponse({ error: "缺少用户" }, { status: 400 });
  }
  const storage = createStorage(env);
  await storage.deleteUser(uuid);
  return jsonResponse({ success: true });
};
