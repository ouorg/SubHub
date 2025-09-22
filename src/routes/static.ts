import docsHtml from "../../static/docs.html";
import clientsHtml from "../../static/clients.html";
import { renderLoginPage } from "../utils/render";

const htmlResponse = (body: string): Response =>
  new Response(body, {
    headers: { "content-type": "text/html;charset=utf-8" },
  });

export const handleStatic = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  switch (url.pathname) {
    case "/":
      return htmlResponse(renderLoginPage());
    case "/docs":
      return htmlResponse(docsHtml);
    case "/clients":
      return htmlResponse(clientsHtml);
    default:
      return new Response("Not Found", { status: 404 });
  }
};
