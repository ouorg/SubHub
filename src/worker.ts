import { Router } from "itty-router";
import { handleLogin, handleLogout } from "./routes/login";
import { handleUserPage } from "./routes/user";
import {
  handleAdminPage,
  handleListUsers,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
} from "./routes/admin";
import { handleRefresh } from "./routes/refresh";
import { handleStatic } from "./routes/static";
import type { Env } from "./types";

const router = Router();

router.post("/login", (request, env: Env) => handleLogin(request, env));
router.get("/logout", () => handleLogout());
router.get("/user", (request, env: Env) => handleUserPage(request, env));
router.post("/refresh/:uuid", (request, env: Env) => handleRefresh(request, env));

router.get("/admin", (request, env: Env) => handleAdminPage(request, env));
router.get("/admin/users", (request, env: Env) => handleListUsers(request, env));
router.post("/admin/users", (request, env: Env) => handleCreateUser(request, env));
router.put("/admin/users/:uuid", (request, env: Env) => handleUpdateUser(request, env));
router.delete("/admin/users/:uuid", (request, env: Env) => handleDeleteUser(request, env));

router.get("/", (request) => handleStatic(request));
router.get("/docs", (request) => handleStatic(request));
router.get("/clients", (request) => handleStatic(request));

router.all("*", () => new Response("Not Found", { status: 404 }));

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> | Response {
    return router.handle(request, env, ctx);
  },
};
