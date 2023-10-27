/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { LTGraphAPI } from "./api/graph";
import { Object, Question, Snippet, QuestionMeta } from "./interfaces";
import { getCssUri } from "./utils";

export class ProblemItem implements vscode.QuickPickItem {
  id: string;
  frontendId: string;
  backendId: string;
  description: string;
  label: string;
  detail: string;
  slug: string;
  title: string;

  constructor(question: Question) {
    this.backendId = question.backendQuestionId.padStart(4, "0");
    this.frontendId = question.frontendQuestionId.padStart(4, "0");
    this.id = this.backendId;
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

let ltGraph: LTGraphAPI;

export async function handleLoad(context: vscode.ExtensionContext) {
  ltGraph = await LTGraphAPI.getInstance(context);
  const disposables: vscode.Disposable[] = [];
  const input = vscode.window.createQuickPick<ProblemItem>();
  input.placeholder = "Search Keywords";
  input.title = "Load Problem from LeetCode";
  disposables.push(
    input.onDidChangeValue((value) => {
      handleChange(input, value);
    }),
    input.onDidAccept(async () => {
      const [activeItem] = input.activeItems;
      handleAccept(activeItem, ltGraph);
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

async function handleAccept(activeItem: ProblemItem, ltGraph: LTGraphAPI) {
  let res = null;

  const fileContents = await getCode(activeItem.id, activeItem.slug, ltGraph);

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
  const [cssUri, localResourceRoots] = getCssUri();
  const panel = vscode.window.createWebviewPanel(
    "leetcode",
    activeItem.title,
    vscode.ViewColumn.Beside,
    { enableScripts: true, localResourceRoots: localResourceRoots }
  );
  const cssSrc = panel.webview.asWebviewUri(cssUri).toString();
  panel.webview.html = generateHTML(
    activeItem.title,
    res.data.question.content,
    cssSrc
  );
}

export async function getCode(id: string, slug: string, ltGraph: LTGraphAPI) {
  let res = null;

  // Fetch test cases
  res = await ltGraph.fetchTests(slug);
  const tests = res.data.question.exampleTestcaseList;
  const meta = JSON.parse(res.data.question.metaData);

  // Fetch editor contents
  res = await ltGraph.fetchEditor(slug);
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

  const fileContents = generateCode(id, slug, snippet.code, tests, meta);
  return fileContents;
}

function generateHTML(title: string, content: string, cssSrc: string) {
  const html = `
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" type="text/css" href="${cssSrc}">
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
    <h3>${title}</h3>
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
  id: string,
  slug: string,
  snippet: string,
  tests: string[],
  meta: QuestionMeta
) {
  const extension = vscode.extensions.getExtension("nikhilweee.vsleet");
  const version = extension?.packageJSON.version;

  // Format tests
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

  // Header
  let code = `# ${id}-${slug}.py`;
  let header = `

  # View this problem directly from your browser
  # https://leetcode.com/problems/${slug}/#${id}

  # This file was generated using the vsleet extension version ${version}
  # https://marketplace.visualstudio.com/items?itemName=nikhilweee.vsleet

  # Write your solution between vsleet:code:start and vsleet:code:end
  # Write test cases between vsleet:tests:start and vsleet:tests:end

  from typing import List, Dict

  # vsleet:code:start

  ${snippet}pass

  # vsleet:code:end

  `;
  code += header.replace(/\n  /g, "\n");

  // Tests
  code += "# vsleet:tests:start\n\n";
  code += `testcases = ${testString}\n\n`;
  code += "# vsleet:tests:end";

  // Footer
  let footer = `
  
  if __name__ == "__main__":
    solution = Solution()
    for testcase in testcases:
      print("testcase:", testcase)
      result = solution.${meta.name}(**testcase)
      print("result:", result)

  # vsleet:results:start
  # Run your solution for memory and runtime status, or
  # Submit your solution for memory and runtime percentiles
  # vsleet:results:end
  `;
  code += footer.replace(/\n  /g, "\n");

  return code;
}
