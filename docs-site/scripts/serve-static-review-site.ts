import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsSiteDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(docsSiteDir, "static-review-site");
const port = Number(process.env.REVIEW_SITE_PORT ?? 3210);

const contentTypes = new Map<string, string>([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
  [".map", "application/json; charset=utf-8"],
]);

function resolveRequestPath(urlPath: string): string {
  const requestPath = urlPath.split("?")[0] ?? "/";
  const normalized = requestPath === "/" ? "/index.html" : requestPath;
  const safePath = path.normalize(normalized).replace(/^(\.\.[/\\])+/, "");
  let resolved = path.resolve(rootDir, `.${safePath}`);

  if (existsSync(resolved) && statSync(resolved).isDirectory()) {
    resolved = path.join(resolved, "index.html");
  }

  return resolved;
}

createServer((request, response) => {
  const filePath = resolveRequestPath(request.url ?? "/");
  const withinRoot =
    filePath === rootDir || filePath.startsWith(`${rootDir}${path.sep}`);

  if (
    !withinRoot ||
    !existsSync(filePath) ||
    statSync(filePath).isDirectory()
  ) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "content-type": contentTypes.get(extension) ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(
    `[serve-static-review-site] serving ${rootDir} on http://127.0.0.1:${port}`
  );
});
