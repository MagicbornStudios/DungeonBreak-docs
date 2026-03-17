import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distDir = join(root, "dist");
const defaultPort = Number.parseInt(process.env.PORT ?? "3001", 10);
const UPWARD_PATH_REGEX = /^(\.\.[\\/])+/;

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function contentTypeFor(pathname) {
  return CONTENT_TYPES[extname(pathname)] ?? "application/octet-stream";
}

function resolveRequestPath(urlPathname) {
  const pathname = urlPathname === "/" ? "/index.html" : urlPathname;
  const normalized = normalize(pathname).replace(UPWARD_PATH_REGEX, "");
  return join(distDir, normalized);
}

function sendMissing(res) {
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

function sendFile(res, filePath) {
  res.writeHead(200, { "content-type": contentTypeFor(filePath) });
  createReadStream(filePath).pipe(res);
}

function createStaticServer() {
  return createServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const filePath = resolveRequestPath(requestUrl.pathname);

    if (!existsSync(filePath)) {
      sendMissing(res);
      return;
    }

    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      const indexPath = join(filePath, "index.html");
      if (!existsSync(indexPath)) {
        sendMissing(res);
        return;
      }
      sendFile(res, indexPath);
      return;
    }

    sendFile(res, filePath);
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", onError);
      resolve();
    });
  });
}

async function findOpenPort(startPort) {
  let candidate = startPort;
  while (candidate < startPort + 20) {
    const probe = createStaticServer();
    try {
      await listen(probe, candidate);
      probe.close();
      return candidate;
    } catch (error) {
      probe.close();
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EADDRINUSE"
      ) {
        candidate += 1;
        continue;
      }
      throw error;
    }
  }
  throw new Error(
    `No open port found between ${startPort} and ${startPort + 19}.`
  );
}

async function main() {
  const port = await findOpenPort(defaultPort);
  const server = createStaticServer();
  await listen(server, port);
  console.log(`[kaplay] standalone server ready at http://127.0.0.1:${port}`);
  if (port !== defaultPort) {
    console.log(`[kaplay] port ${defaultPort} was busy, using ${port} instead`);
  }

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  if (process.stdin.isTTY) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.on("SIGINT", shutdown);
  }
}

main().catch((error) => {
  console.error("[kaplay] standalone server failed");
  console.error(error);
  process.exit(1);
});
