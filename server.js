const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const root = __dirname;
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, "data");
const dataFile = path.join(dataDir, "app-state.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

ensureDataFile();

http
  .createServer(async (req, res) => {
    const requestPath = decodeURIComponent(req.url.split("?")[0]);

    if (requestPath === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (requestPath === "/api/state" && req.method === "GET") {
      return readState(res);
    }

    if (requestPath === "/api/state" && req.method === "PUT") {
      return writeState(req, res);
    }

    const relative = requestPath === "/" ? "/index.html" : requestPath;
    const filePath = path.join(root, relative);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const headers = { "Content-Type": mimeTypes[ext] || "application/octet-stream" };
      if ([".html", ".js", ".css", ".json", ".webmanifest"].includes(ext)) {
        headers["Cache-Control"] = "no-store";
      }
      res.writeHead(200, headers);
      res.end(data);
    });
  })
  .listen(port, host, () => {
    console.log(`Return OS running at http://${host}:${port}`);
    console.log(`Shared state file: ${dataFile}`);
  });

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(
      dataFile,
      JSON.stringify({ activeProfileId: null, profiles: [], profileData: {} }, null, 2),
      "utf8",
    );
  }
}

function readState(res) {
  fs.readFile(dataFile, "utf8", (err, raw) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Failed to read state" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(raw);
  });
}

function writeState(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 5 * 1024 * 1024) {
      req.destroy();
    }
  });
  req.on("end", () => {
    try {
      const parsed = JSON.parse(body || "{}");
      fs.writeFile(dataFile, JSON.stringify(parsed, null, 2), "utf8", (err) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "Failed to save state" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true }));
      });
    } catch {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
}
