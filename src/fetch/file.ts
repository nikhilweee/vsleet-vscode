/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { LTGraphAPI } from "../api/graph";
import { ProblemItem } from "./base";
import { getCssUri } from "../utils";
import {
  Object,
  Snippet,
  QuestionMeta,
  QuestionDisplay,
  TestCase,
} from "../interfaces";

let ltGraph: LTGraphAPI;

export async function handleLoad(context: vscode.ExtensionContext) {
  ltGraph = await LTGraphAPI.getInstance(context);
  const input = vscode.window.createQuickPick<ProblemItem>();
  input.placeholder = "Search Keywords";
  input.title = "Load Problem from LeetCode";
  input.onDidChangeValue((value) => {
    handleChange(input, value);
  });
  input.onDidAccept(async () => {
    const [activeItem] = input.activeItems;
    if (activeItem) {
      handleAccept(activeItem, ltGraph);
    }
  });
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
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `vsleet`,
      cancellable: true,
    },
    async (progress, token) => {
      // Fetch problem description
      progress.report({ message: "Creating Template" });
      const code = await getCode(activeItem.slug, ltGraph);
      const path = `${code.question.id}-${code.question.slug}.py`;
      let pathUri = vscode.Uri.file(path);
      if (vscode.workspace.workspaceFolders) {
        const folder = vscode.workspace.workspaceFolders[0];
        pathUri = vscode.Uri.joinPath(folder.uri, path);
      }
      // Create empty file with suggested filename
      try {
        await vscode.workspace.fs.stat(pathUri);
        // path exists, add unix epoch to filename
        const stem = pathUri.path.split(".").shift();
        const epoch = Math.floor(Date.now() / 1000);
        const path = `${stem}-${epoch}.py`;
        pathUri = pathUri.with({ scheme: "untitled", path: path });
      } catch {
        // path does not exist, continue as is
        pathUri = pathUri.with({ scheme: "untitled" });
      }
      const document = await vscode.workspace.openTextDocument(pathUri);
      // Edit file and insert template data
      const edit = new vscode.WorkspaceEdit();
      edit.set(document.uri, [
        vscode.TextEdit.insert(new vscode.Position(0, 0), code.contents),
      ]);
      await vscode.workspace.applyEdit(edit);
      // Show notebook
      vscode.window
        .showTextDocument(document, {
          viewColumn: vscode.ViewColumn.Active,
        })
        .then((editor) => {
          setTimeout(() => {
            // Apply formatting after a while
            vscode.commands.executeCommand("editor.action.formatDocument");
          }, 2000);
        });

      // Fetch problem description
      progress.report({ message: "Loading Problem" });
      const res = await ltGraph.fetchProblem(activeItem.slug);
      const [cssUri, localResourceRoots] = getCssUri();
      // Create webview panel
      const panel = vscode.window.createWebviewPanel(
        "leetcode",
        activeItem.title,
        { preserveFocus: true, viewColumn: vscode.ViewColumn.Beside },
        {
          enableScripts: true,
          enableForms: false,
          localResourceRoots: localResourceRoots,
        }
      );
      // Update webview panel
      const cssSrc = panel.webview.asWebviewUri(cssUri).toString();
      panel.webview.html = generateHTML(
        activeItem.title,
        res.data.question.content,
        cssSrc
      );
    }
  );
}

export async function getCode(slug: string, ltGraph: LTGraphAPI) {
  let res = null;

  // Fetch test cases
  res = await ltGraph.fetchTests(slug);
  const q = res.data.question;
  const tests = q.exampleTestcaseList;
  const meta = JSON.parse(q.metaData);
  const question: QuestionDisplay = {
    id: q.frontendQuestionId.padStart(4, "0"),
    slug: slug,
    fragment: q.backendQuestionId.padStart(4, "0"),
  };

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

  const fileContents = generateCode(question, snippet.code, tests, meta);
  return { contents: fileContents, question: question };
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
  question: QuestionDisplay,
  snippet: string,
  tests: string[],
  meta: QuestionMeta
) {
  const extension = vscode.extensions.getExtension("nikhilweee.vsleet");
  const version = extension?.packageJSON.version;
  const className = meta.classname || "Solution";
  const instance = className.toLowerCase();
  const testCases = generateRunner(tests, meta);
  const testString = JSON.stringify(testCases, null, 4);
  snippet = snippet.replace(/(\ *def.*:\n\ +)/g, "$1pass");

  // Header
  let code = "";
  let header = `
  # This file was generated using the vsleet extension (version ${version})
  # https://marketplace.visualstudio.com/items?itemName=nikhilweee.vsleet

  # View this problem directly from your browser
  # https://leetcode.com/problems/${question.slug}#${question.fragment}

  # Write your solution between vsleet:code:start and vsleet:code:end
  # Write test cases between vsleet:tests:start and vsleet:tests:end

  from typing import List, Dict, Optional

  # vsleet:code:start

  ${snippet}

  # vsleet:code:end

  null, true, false = None, True, False

  `;
  code += header.replace(/\n  /g, "\n");

  // Tests
  code += "# vsleet:tests:start\n\n";
  code += `testcases = ${testString}\n\n`;
  code += "# vsleet:tests:end";

  // Footer
  let footer = `
  
  if __name__ == "__main__":
    ${instance} = ${className}()
    for method, args in testcases:
      print("testcase:", method, args)
      function = getattr(${instance}, method)
      result = function(*args)
      print("result:", result)

  # vsleet:results:start
  # Run your solution for memory and runtime status, or
  # Submit your solution for memory and runtime percentiles
  # vsleet:results:end
  `;
  code += footer.replace(/\n  /g, "\n");

  return code;
}

function generateRunner(tests: string[], meta: QuestionMeta) {
  // Format tests
  let testCases: TestCase[] = [];

  if ("classname" in meta && tests.length === 1) {
    // classname !== "Solution"
    const splits = tests[0].split("\n");
    const methods: string[] = JSON.parse(splits[0]);
    const args: string[][] = JSON.parse(splits[1]);

    args.forEach((argsArray: string[], i: number) => {
      const method = meta.methods?.find((m) => m.name === methods[i]);
      if (!method) {
        return;
      }
      let testCase: TestCase = [method.name, []];
      argsArray.forEach((arg) => {
        testCase[1].push(arg);
      });
      testCases.push(testCase);
    });
  } else {
    // classname === "Solution"
    tests.forEach((test) => {
      let testCase: TestCase = [meta.name, []];
      test.split("\n").forEach((input) => {
        testCase[1].push(JSON.parse(input));
      });
      testCases.push(testCase);
    });
  }
  return testCases;
}
