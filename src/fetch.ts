/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { posix } from "path";
import { LeetCodeGraphAPI } from "./api/graph";
import { Object, Question, Snippet, Meta } from "./interfaces";

class ProblemItem implements vscode.QuickPickItem {
  id: string;
  description: string;
  label: string;
  detail: string;
  slug: string;
  title: string;

  constructor(question: Question) {
    this.id = question.frontendQuestionId.padStart(4, "0");
    this.slug = question.titleSlug;
    this.description = "";
    this.title = `[${this.id}] ${question.title}`;
    this.label = this.title;

    const price = question.paidOnly ? "Premium" : "Free";
    const acceptance = question.acRate.toFixed(3);
    this.detail = `Tier: ${price} | Difficulty: ${question.difficulty} | AC: ${acceptance}%`;
    this.detail += ``;
    switch (question.status) {
      case "ac":
        this.detail += ` | Status: Accepted`;
        this.label += ` $(check-all)`;
        break;
      case "notac":
        this.detail += ` | Status: Attempted`;
        this.label += ` $(check)`;
        break;
      case null:
        break;
    }
  }
}

let ltGraph: LeetCodeGraphAPI;

export async function handleLoad(context: vscode.ExtensionContext) {
  ltGraph = new LeetCodeGraphAPI();
  await ltGraph.setContext(context);
  const disposables: vscode.Disposable[] = [];
  const input = vscode.window.createQuickPick<ProblemItem>();
  input.placeholder = "Search Keywords";
  input.title = "Load Problem from LeetCode";
  disposables.push(
    input.onDidChangeValue((value) => {
      handleChange(input, value);
    }),
    input.onDidAccept(async () => {
      handleAccept(input);
    })
  );
  input.show();
}

async function handleChange(
  input: vscode.QuickPick<ProblemItem>,
  value: string
) {
  {
    input.items = [];
    input.busy = true;
    const res = await ltGraph.searchProblems(value);
    const questions = res.data.problemsetQuestionList?.questions;
    let questionsArray = [];
    if (questions) {
      for (const question of questions) {
        questionsArray.push(new ProblemItem(question));
      }
      input.items = questionsArray;
    }
    input.busy = false;
  }
}

async function handleAccept(input: vscode.QuickPick<ProblemItem>) {
  let res = null;
  const [activeItem] = input.activeItems;

  // Fetch test cases
  res = await ltGraph.fetchTests(activeItem.slug);
  const tests = res.data.question.exampleTestcaseList;
  const meta = JSON.parse(res.data.question.metaData);

  // Fetch editor contents
  res = await ltGraph.fetchEditor(activeItem.slug);
  let snippets: Snippet[] = res.data.question.codeSnippets;
  if (!snippets) {
    const message = "Code snippets not found.";
    vscode.window.showErrorMessage(message);
    snippets = [{ langSlug: "python3", code: "" }];
  }

  let snippet = snippets.find((el) => {
    return el.langSlug === "python3";
  });
  if (!snippet) {
    const message = "Python code snippet not found.";
    vscode.window.showErrorMessage(message);
    snippet = { langSlug: "python3", code: "" };
  }

  const fileContents = generateCode(activeItem, snippet.code, tests, meta);

  // Open existing or create new file
  // const document = await getTextDocument(fileName, fileContents);

  const document = await vscode.workspace.openTextDocument({
    content: fileContents,
    language: "python",
  });
  vscode.window
    .showTextDocument(document, vscode.ViewColumn.Active)
    .then(() => {
      vscode.commands.executeCommand("editor.action.formatDocument");
    });

  // Fetch problem description
  res = await ltGraph.fetchProblem(activeItem.slug);
  const panel = vscode.window.createWebviewPanel(
    "leetcode",
    activeItem.title,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );
  panel.webview.html = generateHTML(activeItem, res.data.question.content);
}

function generateHTML(activeItem: ProblemItem, content: string) {
  const html = `
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    pre { white-space: pre-wrap; }
    header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }
    header > * { display: inline-block; }
  </style>
  </head>
  <body>
  <header>
    <h3>${activeItem.title}</h3>
    <span id="stopwatch">00:00:00</span>
  </header>
  <main>${content}</main>
  <script>
  let start = Date.now();
  let intervalID = null;
  const display = document.getElementById("stopwatch");
  function setEmoji(emoji) {
    display.innerHTML = display.innerHTML.replace(/\\p{S}/gu, emoji);
  }
  function startStopwatch() {
    intervalID = setInterval(() => {
      const ms = Date.now() - start;
      display.dataset.ms = ms;
      const elapsed = new Date(ms).toISOString().slice(11, 19);
      display.innerHTML = "⏸ " + elapsed;
    }, 500);
  }
  function clickStopwatch() {
    if (intervalID) {
      clearInterval(intervalID);
      setEmoji("▶");
      intervalID = null;
    } else {
      const ms = display.dataset.ms;
      start = Date.now() - ms;
      setEmoji("⏸");
      startStopwatch();
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    startStopwatch();
    display.addEventListener("click", clickStopwatch);
  });
  </script>
  </body>
  </html>`;
  return html;
}

function generateCode(
  activeItem: ProblemItem,
  snippet: string,
  tests: string[],
  meta: Meta
) {
  const extension = vscode.extensions.getExtension("nikhilweee.vsleet");
  const version = extension?.packageJSON.version;

  // Format editor snippet
  let code = `# ${activeItem.id}-${activeItem.slug}.py\n\n`;
  code += `# https://leetcode.com/problems/${activeItem.slug}/\n\n`;
  code += `# This file was auto-generated using the vsleet extension version ${version}\n`;
  code += `# https://marketplace.visualstudio.com/items?itemName=nikhilweee.vsleet\n\n`;
  code += `# Write your solution between vsleet:code:start and vsleet:code:end.\n\n`;
  code += "from typing import List, Dict\n\n";
  code += "# vsleet:code:start\n\n";
  code += `${snippet}`;
  // pass is already indented
  code += "pass\n\n";
  code += "# vsleet:code:end\n\n";
  code += "# vsleet:tests:start\n\n";

  // Format test cases
  let testCases: Object[] = [];
  tests.forEach((test) => {
    let testCase: Object = {};
    test.split("\n").forEach((input, i) => {
      let arg = meta.params[i].name;
      testCase[arg] = JSON.parse(input);
    });
    testCases.push(testCase);
  });
  const testString = JSON.stringify(testCases, null, 2);

  // Format main block
  code += `testcases = ${testString}\n\n`;
  code += `# vsleet:tests:end\n\n`;
  code += `if __name__ == "__main__":\n`;
  code += `  solution = Solution()\n`;
  code += `  for testcase in testcases:\n`;
  code += `    print("testcase:", testcase)\n`;
  code += `    result = solution.${meta.name}(**testcase)\n`;
  code += `    print("result:", result)\n`;

  return code;
}
