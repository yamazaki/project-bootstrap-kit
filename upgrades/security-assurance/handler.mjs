import fs from "node:fs";
import path from "node:path";
import { getSkillTargets, listFilesRecursive } from "../../scripts/upgrade-lib.mjs";
import { readFile, safePath, writeExclusive } from "../../boilerplate/skills/security-gate/scripts/security-lib.mjs";

export const planDetails = [{ file: "docs/SECURITY_ASSURANCE.md", summary: "Add the common gate and policy, preserving local security guidance", locations: ["Add missing common files, append references, and ignore private tool directories; no network or audit"] }];
const reference = "\n\n## セキュリティ確認\n\n開始、重要変更、受入、公開・release前は `docs/SECURITY_ASSURANCE.md` と `security-gate` skillで必要な検査を確認する。Cloudflareは標準コード監査、OSVは依存検査。未導入時は具体計画と利用者承認後に導入・監査へ進む。Mantisの導入・実行は明示指示時だけとする。\n";
const ignores = [".security-tools/", ".agents/skills/security-audit/", ".claude/skills/security-audit/"];
function entries(ctx) {
  const roots = getSkillTargets(ctx.aiSurface, ctx.targetRoot);
  if (!roots.length) throw new Error("Specify --ai-surface codex|claude|both|rovo.");
  const source = path.join(ctx.rootDir, "boilerplate");
  const values = [];
  for (const file of ["docs/SECURITY_ASSURANCE.md", "docs/SECURITY_ASSURANCE.json"]) values.push([file, readFile(path.join(source, file)).toString("utf8"), false]);
  for (const root of roots) for (const file of listFilesRecursive(path.join(source, "skills/security-gate"))) values.push([path.relative(ctx.targetRoot, path.join(root, "security-gate", file)).split(path.sep).join("/"), readFile(path.join(source, "skills/security-gate", file)).toString("utf8"), false]);
  for (const file of ["AGENTS.md", "docs/DEVELOPMENT_GUIDELINE.md", "docs/DOCUMENTATION.md", "docs/INDEX.md"]) {
    const target = safePath(ctx.targetRoot, file, { missing: true });
    if (!fs.existsSync(target)) continue;
    const content = readFile(target).toString("utf8");
    values.push([file, content.includes("docs/SECURITY_ASSURANCE.md") || content.includes("./SECURITY_ASSURANCE.md") ? content : content.trimEnd() + reference, true]);
  }
  const ignorePath = safePath(ctx.targetRoot, ".gitignore", { missing: true });
  let ignore = fs.existsSync(ignorePath) ? readFile(ignorePath).toString("utf8") : "";
  for (const line of ignores) if (!ignore.split(/\r?\n/u).includes(line)) ignore = `${ignore.trimEnd()}\n${line}\n`.trimStart();
  values.push([".gitignore", ignore, true]);
  const adoptionPath = safePath(ctx.targetRoot, "docs/BOOTSTRAP_ADOPTION.md", { missing: true });
  if (fs.existsSync(adoptionPath)) {
    const content = readFile(adoptionPath).toString("utf8");
    const note = "Applied security-assurance feature from project-bootstrap-kit";
    values.push(["docs/BOOTSTRAP_ADOPTION.md", content.includes(note) ? content : `${content.trimEnd()}\n\n- ${note}; external tools were not installed or run.\n`, true]);
  }
  return values.map(([rel, expected, append]) => {
    const file = safePath(ctx.targetRoot, rel, { missing: true });
    const actual = fs.existsSync(file) ? readFile(file).toString("utf8") : null;
    return { rel, expected, file, status: actual === null ? "ADD" : actual === expected ? "SKIP(SAME)" : append ? "UPDATE" : "SKIP(KEEP)" };
  });
}
export function dryRun(ctx) { for (const item of entries(ctx)) console.log(`[${item.status}] ${item.rel}`); }
export function apply(ctx) {
  const plan = entries(ctx); // Full no-follow preflight before changing any file.
  for (const item of plan) {
    if (item.status === "ADD") writeExclusive(ctx.targetRoot, item.rel, item.expected, 0o644);
    else if (item.status === "UPDATE") {
      const fd = fs.openSync(item.file, fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW);
      try { const st = fs.fstatSync(fd); if (!st.isFile() || st.nlink !== 1) throw new Error("Unsafe upgrade file."); fs.ftruncateSync(fd); fs.writeFileSync(fd, item.expected); } finally { fs.closeSync(fd); }
    }
    console.log(`[${item.status}] ${item.rel}`);
  }
}
