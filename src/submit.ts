/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { LeetCodeJudgeAPI } from "./leetcodeJudgeAPI";

let ltJudge: LeetCodeJudgeAPI;

interface Object {
  [key: string]: string;
}

export async function handleRun(context: vscode.ExtensionContext) {
  if (!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage(
      `Cannot find active editor.
      Please run this command from 
      an active editor window.`
    );
    return;
  }

  ltJudge = new LeetCodeJudgeAPI(context);

  const name = vscode.window.activeTextEditor.document.fileName;
  const stem = name.split("/").pop() || "";
  const reName = RegExp("(\\d*)-([\\w-]*).py");
  const resultsName = reName.exec(stem);
  if (!resultsName || resultsName.length < 3) {
    vscode.window.showErrorMessage(
      `Cannot parse problem information.
      Expected filename format is {id}-{slug}.py
      (as in 0001-two-sum.py).`
    );
    return;
  }

  const slug = resultsName[2];
  const id = parseInt(resultsName[1]);

  let code = vscode.window.activeTextEditor.document.getText();
  const reCode = RegExp("# vsleet: start(.*)# vsleet: end", "gms");
  const resultsCode = reCode.exec(code);
  if (!resultsCode || resultsCode.length < 2) {
    vscode.window.showErrorMessage(
      `Cannot find code markers.
      Please decorate your solution between 
      # vsleet: start and # vsleet: end tags.`
    );
    return;
  }

  let res = await ltJudge.submitRun(id, slug, code);
  const interpredId = res.interpret_id;
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Waiting for Judge",
      cancellable: true,
    },
    async (progress, token) => {
      for (let retries = 1; retries <= 24; retries++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        res = await ltJudge.checkRun(interpredId, slug);
        if (res.state === "SUCCESS") {
          const panel = vscode.window.createWebviewPanel(
            "leetcode",
            "Run Results",
            vscode.ViewColumn.Beside,
            {}
          );
          panel.webview.html = parseRunResults(res);
          return;
        }
      }
      vscode.window.showErrorMessage("Timed out waiting for Judge");
    }
  );
}

function parseRunResults(results: Object): string {
  const parsed: Object = {};

  // Format Test Cases

  const answers = pop(results, "code_answer");
  const truths = pop(results, "expected_code_answer");
  const comparison = pop(results, "compare_result");

  parsed.tests = "";

  if (answers instanceof Array && truths instanceof Array) {
    parsed.tests = `
    <h3>Test Cases</h3>
    `;
    answers.map((answer, i) => {
      const expected = truths[i];
      const compare = comparison[i];
      parsed.tests += `
      <pre>
      Expected : ${expected}
      Answer   : ${answer}
      Correct  : ${compare}
      </pre>
      `;
    });
  }

  // Format Heading

  const num_total = pop(results, "total_testcases");
  const num_correct = pop(results, "total_correct");
  const status_msg = pop(results, "status_msg");

  parsed.heading = `
  <h2>${status_msg} (${num_correct} / ${num_total})</h2>
  `;

  // Format Status

  parsed.status = `
  <h3>Run Status</h3>
  <ul>
  <li><strong>Correct</strong>: ${pop(results, "correct_answer")}</li>
  <li><strong>Elapsed Time</strong>: ${pop(results, "elapsed_time")}</li>
  <li><strong>Runtime Status</strong>: ${pop(results, "status_runtime")}</li>
  <li><strong>Memory Status</strong>: ${pop(results, "status_memory")}</li>
  </ul>
  `;

  // Format Errors

  parsed.errors = "";

  const runtime_error = pop(results, "runtime_error");
  if (runtime_error) {
    parsed.errors += `
    <h3>Error</h3>
    <pre>${runtime_error}</pre>
    `;
  }

  const full_runtime_error = pop(results, "full_runtime_error");
  if (runtime_error) {
    parsed.errors += `
    <h3>Full Error</h3>
    <pre>${full_runtime_error}</pre>
    `;
  }

  // Format Details

  parsed.details = `
  <details>
  <summary><strong>Other Information</strong></summary>
  <pre>${JSON.stringify(results, null, 2)}</pre>
  </details>
  </body>
  </html>
  `;

  // Format All

  let formatted = `
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>pre { white-space: pre-wrap; }</style>
  </head>
  <body>
  ${parsed.heading}
  ${parsed.status}
  ${parsed.tests}
  ${parsed.errors}
  ${parsed.details}
  </body>
  </html>
  `;

  return formatted;
}

function pop(object: Object, key: string): string | [] {
  let value = "";
  if (key in object) {
    value = object[key];
    delete object[key];
  }
  return value;
}
