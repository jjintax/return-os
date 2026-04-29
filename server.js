const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const root = __dirname;
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, "data");
const dataFile = path.join(dataDir, "app-state.json");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    if (requestPath === "/healthz") {
      res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (requestPath === "/probe") {
      res.writeHead(200, { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Return OS Probe</title><style>body{font-family:system-ui,sans-serif;background:#f8fbff;color:#1e3a8a;padding:24px} .card{max-width:520px;margin:40px auto;background:#fff;border:2px solid #bfdbfe;border-radius:20px;padding:24px;box-shadow:0 12px 30px rgba(37,99,235,.08)} h1{margin:0 0 12px;font-size:28px} p{margin:8px 0;font-size:18px}</style></head><body><div class="card"><h1>로컬 서버 연결 성공</h1><p>이 화면이 보이면 <strong>localhost:4181</strong> 서버는 정상입니다.</p><p>시간: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p><p>경로: /probe</p></div></body></html>`);
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
        res.writeHead(404, { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const headers = { ...corsHeaders, "Content-Type": mimeTypes[ext] || "application/octet-stream" };
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
      res.writeHead(500, { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Failed to read state" }));
      return;
    }
    res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
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
          res.writeHead(500, { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "Failed to save state" }));
          return;
        }
        res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true }));
      });
    } catch {
      res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
}
