import fs from "node:fs";
import path from "node:path";
import {
  containsComparableText,
  nowTimestamp,
  printDryRunSummary,
  printSection,
} from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "AGENTS.md",
    summary: "Git commitの明示承認と、承認後の履歴品質を定義する",
    locations: [
      "ファイル変更とcommitの承認境界を分離する",
      "日本語のcommit messageとcommit後の報告を必須にする",
    ],
  },
  {
    file: "docs/DEVELOPMENT_GUIDELINE.md",
    summary: "commit前の確認、message形式、commit後の報告を定義する",
    locations: [
      "既存のConventional Commits形式を維持できる",
      "変更理由、変更内容、確認内容、関連識別子の標準形を追加する",
    ],
  },
];

const LEGACY_GIT_PROHIBITION = "- ユーザーの操作を代行する形で Git の確定操作を行わない";
const SCOPED_GIT_PROHIBITION = "- ユーザーの明示的な依頼または許可なしに、ユーザーの操作を代行する形で Git の確定操作を行わない";

const AGENTS_SECTION = `- **承認された Git commit の履歴品質**

  ファイル変更の承認は、Git commit の承認を兼ねない。ユーザーが commit を明示的に依頼または許可した場合に限り、承認された範囲を commit してよい。

  承認された commit を行う場合は、次を守る。詳細は \`docs/DEVELOPMENT_GUIDELINE.md\` の「Git commit の実行と記録」を正本とする。

  - commit 前に staged diff を確認し、承認範囲外の変更を含めない
  - commit message の説明部分と本文は原則として日本語で記載する
  - 件名にはファイル操作ではなく、変更の目的または結果を記載する
  - 小さく自明な変更を除き、本文に変更理由、主要な変更内容、確認内容、関連識別子を記録する
  - commit 後は hash、message、対象範囲、push の有無を報告する`;

const DEVELOPMENT_SECTION = `### Git commit の実行と記録

#### 承認境界

- ファイル変更の承認は、Git commit の承認を兼ねない
- ユーザーが commit を明示的に依頼または許可した場合に限り、承認された範囲を commit してよい
- commit の承認は、push、amend、rebase、merge の承認を含まない
- commit の承認を求める場合は、対象ファイルと提案する commit message を事前に示す
- ユーザーの依頼に commit が明示的に含まれる場合は、同じ commit について重複して承認を求めない

#### commit 前の確認

- \`git status --short\` と staged diff を確認する
- 承認範囲のファイルだけを明示的に stage し、無関係な変更を含めない
- \`git diff --check\` と \`git diff --cached --check\` を実行する
- staged diff から変更の目的、理由、主要な変更、確認結果を把握してから commit message を作成する

#### commit message

- commit message の説明部分と本文は原則として日本語で記載する
- プロジェクトが Conventional Commits 等の形式を採用している場合は、\`feat\`、\`fix\`、\`docs\` 等の種別と scope はその形式に従い、変更の説明は日本語で記載する
- 件名には、ファイル操作ではなく変更の目的または結果を簡潔に記載する
- 「ファイルを更新」「修正」「変更」「WIP」など、履歴から変更内容を特定できない件名を使用しない
- 小さく自明な変更は件名だけでよい
- それ以外は、本文に「変更理由」「変更内容」「確認内容」を記載し、関連する WBS / MNT / OPS / issue があれば「関連」に記載する

標準形:

\`\`\`text
<type>(<scope>): <変更の目的または結果を日本語で記載>

変更理由:
- なぜこの変更が必要だったか

変更内容:
- 主要な変更内容

確認内容:
- 実施したテストや確認

関連:
- WBS 3.2.01
\`\`\`

#### commit 後の報告

- commit hash と commit message を報告する
- commit に含めた対象範囲を報告する
- push の有無を明示する
- 未 commit の変更が残っている場合は、その存在と対象を報告する`;

function readIfExists(targetPath) {
  return fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
}

function writeIfChanged(targetPath, original, content) {
  if (content === original) return false;
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function patchAgents(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;

  if (content.includes(LEGACY_GIT_PROHIBITION)) {
    content = content.replace(LEGACY_GIT_PROHIBITION, SCOPED_GIT_PROHIBITION);
  }

  if (!containsComparableText(content, "commit message の説明部分と本文は原則として日本語で記載する")) {
    if (/^## 4\./m.test(content)) {
      content = content.replace(/^## 4\./m, `${AGENTS_SECTION}\n\n## 4.`);
    } else {
      content = `${content.trimEnd()}\n\n## Git commit の承認と履歴品質\n\n${AGENTS_SECTION}\n`;
    }
  }

  return writeIfChanged(targetPath, original, content);
}

function patchDevelopmentGuideline(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;

  if (!containsComparableText(content, "commit message の説明部分と本文は原則として日本語で記載する")) {
    if (/^## 6\./m.test(content)) {
      content = content.replace(/^## 6\./m, `${DEVELOPMENT_SECTION}\n\n## 6.`);
    } else {
      content = `${content.trimEnd()}\n\n## Git commit の実行と記録\n\n${DEVELOPMENT_SECTION.replace(/^### Git commit の実行と記録\n\n/, "")}\n`;
    }
  }

  return writeIfChanged(targetPath, original, content);
}

function patchBootstrapAdoption(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const historyEntry = `  - ${timestamp}: Applied git-commit-guidance feature from project-bootstrap-kit`;
  const detailEntry = [
    `  - ${timestamp}`,
    "    - updated Git commit approval and Japanese message guidance",
  ].join("\n");

  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${historyEntry}\n`;
  } else if (!content.includes("Applied git-commit-guidance feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, body, nextSection) => {
      return `- Upgrade History:\n${body.replace(/\n+$/, "")}\n${historyEntry}${nextSection}`;
    });
  }

  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${detailEntry}\n`;
  } else if (!content.includes("updated Git commit approval and Japanese message guidance")) {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, body) => {
      return `- Upgrade Added Files:\n${body.replace(/\n+$/, "")}\n${detailEntry}\n`;
    });
  }

  return writeIfChanged(targetPath, original, content);
}

function statusForFile(targetPath, needle) {
  if (!fs.existsSync(targetPath)) return "WARN(MISSING)";
  return containsComparableText(fs.readFileSync(targetPath, "utf8"), needle)
    ? "SKIP(SAME)"
    : "UPDATE";
}

function getStatus(targetRoot) {
  const adoptionPath = path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md");
  return [
    {
      label: "AGENTS.md",
      status: statusForFile(
        path.join(targetRoot, "AGENTS.md"),
        "commit message の説明部分と本文は原則として日本語で記載する"
      ),
    },
    {
      label: "docs/DEVELOPMENT_GUIDELINE.md",
      status: statusForFile(
        path.join(targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"),
        "commit message の説明部分と本文は原則として日本語で記載する"
      ),
    },
    {
      label: "docs/BOOTSTRAP_ADOPTION.md",
      status: !fs.existsSync(adoptionPath)
        ? "WARN(MISSING)"
        : fs.readFileSync(adoptionPath, "utf8").includes("Applied git-commit-guidance feature from project-bootstrap-kit")
          ? "SKIP(SAME)"
          : "UPDATE",
    },
  ];
}

export function dryRun(ctx) {
  const results = getStatus(ctx.targetRoot);
  console.log("");
  printSection("Git Commit Guidance Diff");
  for (const item of results) {
    console.log(`[${item.status}] ${item.label}`);
  }
  console.log("");
  console.log(`Result: ${results.filter((item) => item.status === "UPDATE").length} update, ${results.filter((item) => item.status === "SKIP(SAME)").length} skip(same), ${results.filter((item) => item.status.startsWith("WARN")).length} warn.`);
  printDryRunSummary([
    "1. UPDATEのファイルと--diffの内容を確認してください。",
    "2. 独自のcommit規約がある場合は、両方を満たすか確認してください。",
    "3. 問題なければ--applyを付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  const results = [
    ["AGENTS.md", patchAgents(path.join(ctx.targetRoot, "AGENTS.md"))],
    ["docs/DEVELOPMENT_GUIDELINE.md", patchDevelopmentGuideline(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"))],
    ["docs/BOOTSTRAP_ADOPTION.md", patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"))],
  ];
  console.log("");
  printSection("Apply Result");
  for (const [label, changed] of results) {
    console.log(`${changed ? "[APPLY]" : "[SKIP]"} ${label}`);
  }
  console.log("");
  console.log("Result: git-commit-guidance feature was applied.");
  printDryRunSummary([
    "1. AGENTS.mdとdocs/DEVELOPMENT_GUIDELINE.mdの追記位置を確認してください。",
    "2. プロジェクト独自のcommit規約と矛盾しないことを確認してください。",
    "3. docs/BOOTSTRAP_ADOPTION.mdに適用履歴が追記されたことを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
