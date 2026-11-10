import http from "node:http";

/** Serve a single in-memory report on loopback. No project files are exposed. */
export async function startPreview(
  html: string,
  port: number,
): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
    } else if (req.url !== "/") {
      res.writeHead(404);
      res.end();
    } else {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(req.method === "HEAD" ? undefined : html);
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}
