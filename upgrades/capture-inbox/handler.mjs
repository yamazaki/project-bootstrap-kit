import fs from "node:fs";
import path from "node:path";
import {
  containsComparableText,
  copyRecursive,
  ensureDir,
  getSkillTargets,
  hashDirectory,
  nowTimestamp,
  printDryRunSummary,
  printSection,
} from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "docs/WORK/inbox/",
    summary: "Add status-based capture inbox folders",
    locations: [
      "Add docs/WORK/inbox/open, triaged, promoted, deferred, and closed",
      "Add docs/WORK/inbox/README.md",
    ],
  },
  {
    file: "docs/DOCUMENTATION.md",
    summary: "Add capture inbox placement, metadata, status, and triage rules",
    locations: [
      "Add docs/WORK/inbox to the document structure",
      "Add capture inbox handling rules after phase transition documents",
      "Add capture inbox triage output to phase transition documents",
      "Clarify that triage does not always mean promotion",
    ],
  },
  {
    file: "docs/DEVELOPMENT_GUIDELINE.md",
    summary: "Add guidance for capturing ideas, issues, and questions during work",
    locations: [
      "Add '作業中の気づきの捕捉' after phase transition process",
      "Clarify WBS milestone and phase transition triage timing",
    ],
  },
  {
    file: "AGENTS.md",
    summary: "Add AI agent behavior for /capture-inbox",
    locations: [
      "Add capture behavior during progress management",
      "Add a capture inbox operation section",
      "Add capture-inbox to the skill list",
    ],
  },
  {
    file: ".agents/skills/capture-inbox/ or .claude/skills/capture-inbox/",
    summary: "Add the capture-inbox skill to the selected AI surface",
    locations: [
      "Copy boilerplate/skills/capture-inbox to the selected AI surface",
      "Add capture-inbox to the skill README when present",
    ],
  },
];

const INBOX_README = `# capture inbox

作業中に発見した思いつき、課題、疑問を一時捕捉する場所。

正式な仕様、計画、参照資産ではない。棚卸し時に、\`SPEC / ADR / REF / WORK / PLAN\` へ反映するか、後続フェーズへ送るか、閉じるかを判断する。

## ディレクトリ

- \`open/\`
  - 捕捉直後で未整理
- \`triaged/\`
  - 棚卸し済みだが、まだ反映先や対応時期を確定していない
- \`promoted/\`
  - \`SPEC / ADR / REF / WORK / PLAN\` などへ反映済み
- \`deferred/\`
  - 後続フェーズまたは将来検討へ送った
- \`closed/\`
  - 対応不要、重複、解消済み

## 命名

\`\`\`text
capture_yyyymmdd_hhmm_<slug>.md
\`\`\`

状態はファイル名ではなく、配置フォルダと frontmatter の \`status\` で管理する。
`;

const DEVELOPMENT_SECTION = `### 3.6 作業中の気づきの捕捉

作業中に発見した思いつき、機能追加候補、仕様変更候補、バグ、考慮漏れ、疑問は、必要に応じて \`docs/WORK/inbox/\` に捕捉する。

\`capture inbox\` は、作業の本筋を止めずに気づきを失わないための一時保管場所である。捕捉した時点では、仕様変更、WBS 変更、実装変更として確定しない。

捕捉する気づきの種別は、次の 3 種に限定する。

- \`idea\`
  - 思いつき、改善案、将来やりたいこと
- \`issue\`
  - 課題、仕様変更候補、バグ、考慮漏れ、リスク
- \`question\`
  - 疑問、確認事項、判断待ち

棚卸しは、セッション終了ごとではなく、WBS マイルストーン切り替え時、WBS の大きな組み替え時、フェーズ終了と次フェーズ計画策定時に行う。ここでいう WBS マイルストーン切り替え時とは、例えば \`1.1\` の完了後に \`1.2\` を開始する前のような区切りであり、必要に応じて実施する。

棚卸しは、必ず仕様や実装へ反映することではない。次 WBS や次フェーズへ影響するものを見極め、\`promoted\`、\`deferred\`、\`closed\`、または継続確認として \`triaged\` に分類する。`;

const DOCUMENTATION_STRUCTURE_LINE = `│   ├── inbox/`;
const DOCUMENTATION_WORK_ROLE = `- \`WORK/inbox/\`
  - 作業中に発見したアイデア、課題、疑問を、分類前の気づきとして一時捕捉する場所`;
const DOCUMENTATION_SECTION = `### 4.5 capture inbox の扱い

作業中に発見した思いつき、機能追加候補、仕様変更候補、バグ、考慮漏れ、疑問は、すぐに \`SPEC / ADR / REF / PLAN\` へ反映せず、必要に応じて \`docs/WORK/inbox/\` に捕捉する。

\`capture inbox\` は、作業の本筋を止めずに気づきを失わないための一時保管場所である。正式な仕様、計画、参照資産ではない。

ディレクトリは状態別に分ける。

\`\`\`text
docs/WORK/inbox/
├── open/
├── triaged/
├── promoted/
├── deferred/
└── closed/
\`\`\`

状態の視認性はフォルダで確保し、ファイル名には状態を含めない。

\`\`\`text
capture_yyyymmdd_hhmm_<slug>.md
\`\`\`

例:

\`\`\`text
docs/WORK/inbox/open/capture_20260531_1430_fqdn-design.md
\`\`\`

各 capture ファイルは、冒頭に次のメタデータを持つ。

\`\`\`md
---
type: idea | issue | question
status: open | triaged | promoted | deferred | closed
created_at: YYYY-MM-DD HH:mm
source: session | implementation | review | test | user-feedback
related_wbs:
related_docs:
priority: low | medium | high
---
\`\`\`

\`type\` は次の 3 種に限定する。

- \`idea\`
  - 思いつき、改善案、将来やりたいこと
- \`issue\`
  - 課題、仕様変更候補、バグ、考慮漏れ、リスク
- \`question\`
  - 疑問、確認事項、判断待ち

状態変更時は、フォルダ移動とメタデータの \`status\` 更新を同時に行う。

\`\`\`text
docs/WORK/inbox/open/foo.md
-> docs/WORK/inbox/triaged/foo.md
\`\`\`

\`capture inbox\` の棚卸しは、次のタイミングで行う。

- WBS マイルストーン切り替え時
  - 例: \`1.1\` 完了後、\`1.2\` 開始前
  - 必要に応じて実施し、次 WBS の作業を優先する場合は残留を許容する
- WBS の大きな組み替えやマイナーチェンジ時
- フェーズ終了、次フェーズ計画策定時
- ユーザーが明示した時

セッション終了ごとの棚卸しは必須にしない。

棚卸しは、必ず仕様反映や実装反映を行うことではない。各 capture の扱いを判定し、状態を更新することである。

- WBS マイルストーン切り替え時
  - 次 WBS に影響するものは \`PLAN_PHASE_CURRENT.md\`、\`WORK/x.y\`、\`SPEC\` などへ反映する
  - まだ判断しないものは \`triaged\` または \`deferred\` として残してよい
- フェーズ終了時
  - 原則として全件を確認する
  - 反映する、後続フェーズへ送る、対応不要として閉じる、のいずれかを判定する
  - 必ず inbox を空にする必要はないが、\`open\` のまま放置しない

状態の意味は次の通りである。

- \`open\`
  - 捕捉直後で未整理
- \`triaged\`
  - 棚卸し済みだが、まだ反映先や対応時期を確定していない
- \`promoted\`
  - \`SPEC / ADR / REF / WORK / PLAN\` などへ反映済み
- \`deferred\`
  - 後続フェーズまたは将来検討へ送った
- \`closed\`
  - 対応不要、重複、解消済み`;

const DOCUMENTATION_SKILL_ENTRY = `- \`skills/capture-inbox/\`
  - 作業中の気づき、課題、疑問を \`docs/WORK/inbox/\` に捕捉する`;

const AGENTS_PROGRESS_LINES = `- 作業中に思いつき、課題、仕様変更候補、考慮漏れ、疑問が出た場合は、必要に応じて \`/capture-inbox\` として \`docs/WORK/inbox/\` に捕捉する
- \`/capture-inbox\` で捕捉した内容は、その場で勝手に仕様、WBS、実装へ反映しない`;

const AGENTS_SECTION = `### 4.6 capture inbox の運用

ユーザーが \`/capture-inbox\`、または同等の表現で作業中の気づきを記録したいと指示した場合、AI エージェントは \`docs/DOCUMENTATION.md\` の capture inbox ルールに従う。

実施すること:

1. 内容を \`idea\`、\`issue\`、\`question\` のいずれかに分類する
2. \`docs/WORK/inbox/open/capture_yyyymmdd_hhmm_<slug>.md\` を作成する
3. メタデータに \`type\`、\`status: open\`、\`created_at\`、\`source\`、\`related_wbs\`、\`related_docs\`、\`priority\` を記録する
4. 本文に、気づき、背景、影響しそうな範囲、次に判断することを書く
5. 緊急に現在作業を止めるべきリスクがある場合は、記録に加えてユーザーへ報告する

してはならないこと:

- 捕捉しただけで、仕様、WBS、実装、ROADMAP を確定変更しない
- 種別を細かく増やさない
- \`open\` のまま長期間残ることを前提にせず、WBS マイルストーン切り替え時、WBS の大きな組み替え時、またはフェーズ移行時に棚卸しする`;

const AGENTS_SKILL_ENTRY = `- \`skills/capture-inbox/\`
  - 作業中の気づき、課題、疑問を \`docs/WORK/inbox/\` に捕捉する`;

const SKILL_README_ENTRY = "- `capture-inbox`: 作業中の気づき、課題、疑問を `docs/WORK/inbox/` に捕捉する。";

function readIfExists(targetPath) {
  return fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
}

function writeIfChanged(targetPath, original, content) {
  if (content === original) return false;
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function patchBootstrapAdoption(targetPath, addedTargets) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied capture-inbox feature from project-bootstrap-kit`;
  const addedFilesBlock = [
    `  - ${timestamp}`,
    `    - docs/WORK/inbox/`,
    ...addedTargets.map((item) => `    - ${item}`),
  ].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied capture-inbox feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("docs/WORK/inbox/") && !content.includes("capture-inbox/")) {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, addedBody) => {
      const trimmedBody = addedBody.replace(/\n+$/, "");
      return `- Upgrade Added Files:\n${trimmedBody}\n${addedFilesBlock}\n`;
    });
  }
  return writeIfChanged(targetPath, original, content);
}

function patchDevelopmentGuideline(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "### 3.6 作業中の気づきの捕捉")) {
    if (content.includes("## 4. 設計ガイドライン")) {
      content = content.replace("## 4. 設計ガイドライン", `${DEVELOPMENT_SECTION}\n\n## 4. 設計ガイドライン`);
    } else {
      content = `${content.trimEnd()}\n\n${DEVELOPMENT_SECTION}\n`;
    }
  }
  if (!containsComparableText(content, "docs/WORK/inbox/ の open を確認")) {
    content = content.replace(
      "- `docs/WORK/<phase>.*`、関連 `SPEC / ADR / REF / Runbook / session` を確認する",
      "- `docs/WORK/<phase>.*`、`docs/WORK/inbox/`、関連 `SPEC / ADR / REF / Runbook / session` を確認する"
    );
    content = content.replace(
      "- `promote`、`retain-in-work`、`delete` のいずれかに分類する",
      "- `promote`、`retain-in-work`、`delete` のいずれかに分類する\n   - `docs/WORK/inbox/` の `open` を確認し、次フェーズ計画へ反映するもの、後続フェーズへ送るもの、対応不要として閉じるもの、継続確認するものに分類する"
    );
  }
  if (!containsComparableText(content, "`docs/WORK/inbox/` の `open` が確認")) {
    content = content.replace(
      "- 後続フェーズへ送った事項が、後で再検討できる台帳または同等の文書に残っている",
      "- 後続フェーズへ送った事項が、後で再検討できる台帳または同等の文書に残っている\n- `docs/WORK/inbox/` の `open` が確認され、各 capture の扱いが判定されている"
    );
  }
  if (!containsComparableText(content, "ここでいう WBS マイルストーン切り替え時とは")) {
    content = content.replace(
      "棚卸しは、セッション終了ごとではなく、WBS マイルストーン切り替え時、WBS の大きな組み替え時、フェーズ終了と次フェーズ計画策定時に行う。",
      "棚卸しは、セッション終了ごとではなく、WBS マイルストーン切り替え時、WBS の大きな組み替え時、フェーズ終了と次フェーズ計画策定時に行う。ここでいう WBS マイルストーン切り替え時とは、例えば `1.1` の完了後に `1.2` を開始する前のような区切りであり、必要に応じて実施する。"
    );
  }
  return writeIfChanged(targetPath, original, content);
}

function patchDocumentation(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, DOCUMENTATION_STRUCTURE_LINE) && content.includes("│   ├── 0.1/")) {
    content = content.replace("│   ├── 0.1/", `│   ├── 0.1/\n${DOCUMENTATION_STRUCTURE_LINE}`);
  }
  if (!containsComparableText(content, "`WORK/inbox/`")) {
    content = content.replace(
      "- `WORK/0.1/`\n  - 新規プロジェクト開始時の初期構想",
      `- \`WORK/0.1/\`\n  - 新規プロジェクト開始時の初期構想\n${DOCUMENTATION_WORK_ROLE}`
    );
  }
  if (!containsComparableText(content, "### 4.5 capture inbox の扱い")) {
    if (content.includes("## 5. 文書タイプと REF の命名規則")) {
      content = content.replace("## 5. 文書タイプと REF の命名規則", `${DOCUMENTATION_SECTION}\n\n## 5. 文書タイプと REF の命名規則`);
    } else {
      content = `${content.trimEnd()}\n\n${DOCUMENTATION_SECTION}\n`;
    }
  }
  if (!containsComparableText(content, "capture inbox 棚卸し結果")) {
    content = content.replace(
      "| 見送り事項台帳 | `docs/WORK/<last-phase>.<last-milestone>/` または `docs/REF/` | 後続フェーズへ送る事項を、再検討タイミング付きで残す |",
      "| 見送り事項台帳 | `docs/WORK/<last-phase>.<last-milestone>/` または `docs/REF/` | 後続フェーズへ送る事項を、再検討タイミング付きで残す |\n| capture inbox 棚卸し結果 | `docs/WORK/<last-phase>.<last-milestone>/` | `docs/WORK/inbox/` の各 capture を `promoted / deferred / closed / triaged` に判定した結果を記録する |"
    );
  }
  if (!containsComparableText(content, "フェーズ移行時は、`docs/WORK/inbox/` の `open` を必ず確認")) {
    content = content.replace(
      "見送り事項台帳は、単一フェーズに閉じる場合は `WORK` に置く。複数フェーズで継続的に使うことが確認できた場合は、`REF_catalog_*` として昇格を検討する。",
      "見送り事項台帳は、単一フェーズに閉じる場合は `WORK` に置く。複数フェーズで継続的に使うことが確認できた場合は、`REF_catalog_*` として昇格を検討する。\n\nフェーズ移行時は、`docs/WORK/inbox/` の `open` を必ず確認する。フェーズクローズ文書または capture inbox 棚卸し結果には、各 capture を次フェーズ計画へ反映したか、後続フェーズへ送ったか、対応不要として閉じたか、継続確認として残したかを記録する。"
    );
  }
  if (!containsComparableText(content, "次 WBS の作業を優先する場合は残留を許容する")) {
    content = content.replace(
      "  - 例: `1.1` 完了後、`1.2` 開始前",
      "  - 例: `1.1` 完了後、`1.2` 開始前\n  - 必要に応じて実施し、次 WBS の作業を優先する場合は残留を許容する"
    );
  }
  if (!containsComparableText(content, "skills/capture-inbox")) {
    if (content.includes("### 11.2 skill に期待すること")) {
      content = content.replace("### 11.2 skill に期待すること", `${DOCUMENTATION_SKILL_ENTRY}\n\n### 11.2 skill に期待すること`);
    } else {
      content = `${content.trimEnd()}\n\n${DOCUMENTATION_SKILL_ENTRY}\n`;
    }
  }
  return writeIfChanged(targetPath, original, content);
}

function patchAgents(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "/capture-inbox")) {
    if (content.includes("- 発見した課題や仕様差分を即座に共有する")) {
      content = content.replace("- 発見した課題や仕様差分を即座に共有する", `- 発見した課題や仕様差分を即座に共有する\n${AGENTS_PROGRESS_LINES}`);
    } else {
      content = `${content.trimEnd()}\n\n${AGENTS_PROGRESS_LINES}\n`;
    }
  }
  if (!containsComparableText(content, "### 4.6 capture inbox の運用")) {
    if (content.includes("## 5. 作業ルール")) {
      content = content.replace("## 5. 作業ルール", `${AGENTS_SECTION}\n\n## 5. 作業ルール`);
    } else {
      content = `${content.trimEnd()}\n\n${AGENTS_SECTION}\n`;
    }
  }
  if (!containsComparableText(content, "`docs/WORK/inbox/` の棚卸し")) {
    content = content.replace(
      [
        "1. 現行フェーズの抜け漏れチェックと完了要件確認",
        "2. フェーズクローズ文書の作成",
        "3. 文書棚卸し",
        "4. 未解決事項と後続フェーズ送り論点の整理",
        "5. 完了済み `PLAN_PHASE_CURRENT.md` の `docs/history/` 退避",
        "6. `ROADMAP.md` と新しい `PLAN_PHASE_CURRENT.md` の更新",
        "7. 前フェーズ成果物から次フェーズ WBS への反映漏れレビュー",
        "8. 後続フェーズへ送る見送り事項の再検討台帳化",
        "9. セッション記録と再開プロンプトの更新",
      ].join("\n"),
      [
        "1. 現行フェーズの抜け漏れチェックと完了要件確認",
        "2. フェーズクローズ文書の作成",
        "3. 文書棚卸し",
        "4. `docs/WORK/inbox/` の棚卸し",
        "5. 未解決事項と後続フェーズ送り論点の整理",
        "6. 完了済み `PLAN_PHASE_CURRENT.md` の `docs/history/` 退避",
        "7. `ROADMAP.md` と新しい `PLAN_PHASE_CURRENT.md` の更新",
        "8. 前フェーズ成果物から次フェーズ WBS への反映漏れレビュー",
        "9. 後続フェーズへ送る見送り事項の再検討台帳化",
        "10. セッション記録と再開プロンプトの更新",
      ].join("\n")
    );
  }
  if (!containsComparableText(content, "`docs/WORK/inbox/` の棚卸しでは")) {
    content = content.replace(
      "反映漏れレビューでは、前フェーズの `WORK` 文書、Runbook、未解決事項、引き継ぎ文書を読み、次フェーズで実施するもの、さらに後続へ送るもの、長期バックログへ残すものを明示的に再分類する。",
      "反映漏れレビューでは、前フェーズの `WORK` 文書、Runbook、未解決事項、引き継ぎ文書を読み、次フェーズで実施するもの、さらに後続へ送るもの、長期バックログへ残すものを明示的に再分類する。\n\n`docs/WORK/inbox/` の棚卸しでは、`open` のまま残っている capture を確認し、次フェーズ計画へ反映するもの、後続フェーズへ送るもの、対応不要として閉じるもの、継続確認するものに分類する。"
    );
  }
  if (!containsComparableText(content, "WBS の大きな組み替え時、またはフェーズ移行時")) {
    content = content.replace(
      "- `open` のまま長期間残ることを前提にせず、WBS マイルストーン切り替え時またはフェーズ移行時に棚卸しする",
      "- `open` のまま長期間残ることを前提にせず、WBS マイルストーン切り替え時、WBS の大きな組み替え時、またはフェーズ移行時に棚卸しする"
    );
  }
  if (!containsComparableText(content, "skills/capture-inbox")) {
    if (content.includes("skill は補助であり、正本ではない。")) {
      content = content.replace("skill は補助であり、正本ではない。", `${AGENTS_SKILL_ENTRY}\n\nskill は補助であり、正本ではない。`);
    } else {
      content = `${content.trimEnd()}\n\n${AGENTS_SKILL_ENTRY}\n`;
    }
  }
  return writeIfChanged(targetPath, original, content);
}

function patchSkillReadme(targetPath) {
  let content = fs.existsSync(targetPath)
    ? fs.readFileSync(targetPath, "utf8")
    : "# skills\n\nこのディレクトリには、文書運用や企画整理を補助する skill を配置する。\n";
  const original = content;
  if (!containsComparableText(content, "capture-inbox")) {
    content = `${content.trimEnd()}\n${SKILL_README_ENTRY}\n`;
  }
  return writeIfChanged(targetPath, original, content);
}

function ensureInboxDirs(targetRoot) {
  const inboxRoot = path.join(targetRoot, "docs", "WORK", "inbox");
  const changed = [];
  for (const status of ["open", "triaged", "promoted", "deferred", "closed"]) {
    const dirPath = path.join(inboxRoot, status);
    if (!fs.existsSync(dirPath)) {
      ensureDir(dirPath);
      changed.push(`docs/WORK/inbox/${status}/`);
    }
    const keepPath = path.join(dirPath, ".gitkeep");
    if (!fs.existsSync(keepPath)) {
      fs.writeFileSync(keepPath, "", "utf8");
      changed.push(`docs/WORK/inbox/${status}/.gitkeep`);
    }
  }
  const readmePath = path.join(inboxRoot, "README.md");
  if (!fs.existsSync(readmePath)) {
    ensureDir(path.dirname(readmePath));
    fs.writeFileSync(readmePath, INBOX_README, "utf8");
    changed.push("docs/WORK/inbox/README.md");
  }
  return changed;
}

function getInboxStatuses(ctx) {
  const results = [];
  const inboxRoot = path.join(ctx.targetRoot, "docs", "WORK", "inbox");
  const readmePath = path.join(inboxRoot, "README.md");
  results.push({
    label: "docs/WORK/inbox/README.md",
    status: !fs.existsSync(readmePath)
      ? "ADD"
      : containsComparableText(readIfExists(readmePath), "状態はファイル名ではなく、配置フォルダと frontmatter の status で管理する")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  for (const status of ["open", "triaged", "promoted", "deferred", "closed"]) {
    const dirPath = path.join(inboxRoot, status);
    results.push({
      label: `docs/WORK/inbox/${status}/`,
      status: fs.existsSync(dirPath) ? "SKIP(SAME)" : "ADD",
    });
  }
  return results;
}

function getSkillStatuses(ctx) {
  const result = [];
  if (!ctx.aiSurface) {
    result.push({ label: ".agents/skills/capture-inbox/ or .claude/skills/capture-inbox/", status: "WARN" });
    return result;
  }
  const sourceSkillRoot = path.join(ctx.rootDir, "boilerplate", "skills", "capture-inbox");
  for (const skillTarget of getSkillTargets(ctx.aiSurface, ctx.targetRoot)) {
    const targetSkillRoot = path.join(skillTarget, "capture-inbox");
    if (!fs.existsSync(targetSkillRoot)) {
      result.push({ label: `${path.relative(ctx.targetRoot, targetSkillRoot)}/`, status: "ADD" });
    } else {
      result.push({
        label: `${path.relative(ctx.targetRoot, targetSkillRoot)}/`,
        status: hashDirectory(sourceSkillRoot) === hashDirectory(targetSkillRoot) ? "SKIP(SAME)" : "UPDATE",
      });
    }
    const readmePath = path.join(skillTarget, "README.md");
    result.push({
      label: `${path.relative(ctx.targetRoot, readmePath)}`,
      status: !fs.existsSync(readmePath)
        ? "ADD"
        : containsComparableText(readIfExists(readmePath), "capture-inbox")
          ? "SKIP(SAME)"
          : "UPDATE",
    });
  }
  return result;
}

function getStatus(ctx) {
  const results = [];
  results.push(...getInboxStatuses(ctx));
  const agentsContent = readIfExists(path.join(ctx.targetRoot, "AGENTS.md"));
  const agentsHasPhaseTransition = containsComparableText(agentsContent, "### 4.5 フェーズ移行時の処理");
  results.push({
    label: "AGENTS.md",
    status:
      containsComparableText(agentsContent, "### 4.6 capture inbox の運用") &&
      containsComparableText(agentsContent, "skills/capture-inbox") &&
      (!agentsHasPhaseTransition || containsComparableText(agentsContent, "`docs/WORK/inbox/` の棚卸し"))
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  const developmentContent = readIfExists(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"));
  const developmentHasPhaseTransition = containsComparableText(developmentContent, "### 3.5 フェーズ移行プロセス");
  results.push({
    label: "docs/DEVELOPMENT_GUIDELINE.md",
    status:
      containsComparableText(developmentContent, "### 3.6 作業中の気づきの捕捉") &&
      (!developmentHasPhaseTransition || containsComparableText(developmentContent, "docs/WORK/inbox/ の open を確認")) &&
      containsComparableText(developmentContent, "ここでいう WBS マイルストーン切り替え時とは")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  const documentationContent = readIfExists(path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"));
  const documentationHasPhaseDocs = containsComparableText(documentationContent, "### 4.4 フェーズ移行文書の扱い");
  results.push({
    label: "docs/DOCUMENTATION.md",
    status:
      containsComparableText(documentationContent, "### 4.5 capture inbox の扱い") &&
      containsComparableText(documentationContent, "`WORK/inbox/`") &&
      (!documentationHasPhaseDocs || containsComparableText(documentationContent, "capture inbox 棚卸し結果")) &&
      containsComparableText(documentationContent, "次 WBS の作業を優先する場合は残留を許容する") &&
      containsComparableText(documentationContent, "skills/capture-inbox")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  results.push(...getSkillStatuses(ctx));
  results.push({
    label: "docs/BOOTSTRAP_ADOPTION.md",
    status: readIfExists(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md")).includes("Applied capture-inbox feature from project-bootstrap-kit")
      ? "SKIP(SAME)"
      : "UPDATE",
  });
  return results;
}

export function dryRun(ctx) {
  const diffResults = getStatus(ctx);
  console.log("");
  printSection("Capture Inbox Diff");
  for (const item of diffResults) {
    console.log(`[${item.status}] ${item.label}`);
  }
  const counts = {
    add: diffResults.filter((item) => item.status === "ADD").length,
    update: diffResults.filter((item) => item.status === "UPDATE").length,
    same: diffResults.filter((item) => item.status === "SKIP(SAME)").length,
    warn: diffResults.filter((item) => item.status === "WARN").length,
  };
  console.log("");
  console.log(`Result: ${counts.add} add, ${counts.update} update, ${counts.same} skip(same), ${counts.warn} warn.`);
  printDryRunSummary([
    "1. WARN が出た場合は、--ai-surface codex|rovo|claude|both を指定して skill 配置先を明示してください。",
    "2. UPDATE が出たファイルだけ反映対象として考えてください。",
    "3. 問題なければ --apply を付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  const inboxChanges = ensureInboxDirs(ctx.targetRoot);
  const skillTargets = ctx.aiSurface ? getSkillTargets(ctx.aiSurface, ctx.targetRoot) : [];
  const sourceSkillRoot = path.join(ctx.rootDir, "boilerplate", "skills", "capture-inbox");
  const copiedSkillTargets = [];
  for (const skillTarget of skillTargets) {
    const targetSkillRoot = path.join(skillTarget, "capture-inbox");
    if (fs.existsSync(targetSkillRoot)) {
      fs.rmSync(targetSkillRoot, { recursive: true, force: true });
    }
    ensureDir(targetSkillRoot);
    copyRecursive(sourceSkillRoot, targetSkillRoot);
    copiedSkillTargets.push(`${path.relative(ctx.targetRoot, targetSkillRoot)}/`);
  }

  const skillReadmeResults = skillTargets.map((skillTarget) => [
    `${path.relative(ctx.targetRoot, path.join(skillTarget, "README.md"))}`,
    patchSkillReadme(path.join(skillTarget, "README.md")),
  ]);

  const patchResults = [
    ["AGENTS.md", patchAgents(path.join(ctx.targetRoot, "AGENTS.md"))],
    ["docs/DEVELOPMENT_GUIDELINE.md", patchDevelopmentGuideline(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"))],
    ["docs/DOCUMENTATION.md", patchDocumentation(path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"))],
    ...skillReadmeResults,
    ["docs/BOOTSTRAP_ADOPTION.md", patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"), copiedSkillTargets)],
  ];

  console.log("");
  printSection("Apply Result");
  console.log(`${inboxChanges.length ? "[APPLY]" : "[SKIP]"} docs/WORK/inbox/`);
  for (const [label, changed] of patchResults) {
    console.log(`${changed ? "[APPLY]" : "[SKIP]"} ${label}`);
  }
  for (const target of copiedSkillTargets) {
    console.log(`[APPLY] ${target}`);
  }
  if (!ctx.aiSurface) {
    console.log("[WARN] ai-surface was not specified, so capture-inbox skill was not copied.");
  }
  console.log("");
  console.log("Result: capture-inbox feature was applied.");
  printDryRunSummary([
    "1. docs/WORK/inbox/ の状態別フォルダが作成されたことを確認してください。",
    "2. capture-inbox skill を使う AI surface に配置できているか確認してください。",
    "3. 作業中の気づきは /capture-inbox として open に 1 件 1 ファイルで記録してください。",
  ], "<<< Upgrade apply completed. >>>");
}
