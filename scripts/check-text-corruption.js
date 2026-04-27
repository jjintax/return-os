const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const exts = new Set([".js", ".css", ".html", ".json", ".md"]);
const ignoreDirs = new Set(["node_modules", ".git", "data", "github-upload", "scripts"]);
const suspiciousRegexes = [/�/, /\?\?[^\s]/];
const suspiciousFragments = ["吏㏃", "以묐떒", "怨쇰ぉ", "戮紐⑤룄濡", "諛⑷툑", "媛먯젙", "愿???", "異붿쿇 移대뱶"];

const findings = [];

function isSuspicious(line) {
  if (suspiciousRegexes.some((pattern) => pattern.test(line))) return true;
  return suspiciousFragments.some((fragment) => line.includes(fragment));
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) walk(path.join(dir, entry.name));
      continue;
    }

    const ext = path.extname(entry.name);
    if (!exts.has(ext)) continue;

    const file = path.join(dir, entry.name);
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (isSuspicious(line)) {
        findings.push(`${path.relative(root, file)}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

walk(root);

if (findings.length) {
  console.error("Potential text corruption found:");
  findings.forEach((line) => console.error(`- ${line}`));
  process.exit(1);
}

console.log("No suspicious text corruption found.");
