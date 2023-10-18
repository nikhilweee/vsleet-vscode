/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { LeetCodeJudgeAPI } from "./leetcodeJudgeAPI";
import { Object } from "./interfaces";

let ltJudge: LeetCodeJudgeAPI;

export async function handleRun(context: vscode.ExtensionContext) {
  ltJudge = new LeetCodeJudgeAPI(context);

  const { id, slug, code } = parseEditor();

  let res = await ltJudge.runSolution(id, slug, code);
  const checkId = res.interpret_id;
  await checkExecution(checkId, slug, "Run");
}

export async function handleSubmit(context: vscode.ExtensionContext) {
  ltJudge = new LeetCodeJudgeAPI(context);

  const { id, slug, code } = parseEditor();

  let res = await ltJudge.submitSolution(id, slug, code);
  const checkId = res.submission_id;
  await checkExecution(checkId, slug, "Submission");
}

async function checkExecution(checkId: string, slug: string, command: string) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Waiting for Judge",
      cancellable: true,
    },
    async (progress, token) => {
      for (let retries = 1; retries <= 24; retries++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        let res = await ltJudge.checkStatus(checkId, slug);
        if (res.state === "SUCCESS") {
          const panel = vscode.window.createWebviewPanel(
            "leetcode",
            `${command} Results`,
            vscode.ViewColumn.Beside,
            {}
          );
          panel.webview.html = parseExecutionResults(res, command);
          return;
        }
      }
      vscode.window.showErrorMessage("Timed out waiting for Judge");
    }
  );
}

function parseEditor() {
  if (!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage(
      `Cannot find active editor.
      Please run this command from 
      an active editor window.`
    );
    throw new Error("No active editor found.");
  }

  const name = vscode.window.activeTextEditor.document.fileName;
  const stem = name.split("/").pop() || "";
  const reName = RegExp("(\\d*)-([\\w-]*).py");
  const resultsName = reName.exec(stem);
  if (!resultsName || resultsName.length < 3) {
    vscode.window.showErrorMessage(
      `Cannot parse problem details.
      Expected filename format is {id}-{slug}.py
      (as in 0001-two-sum.py).`
    );
    throw new Error("Cannot parse problem details.");
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
    throw new Error("Cannot find code markers.");
  }

  return { id: id, slug: slug, code: code };
}

function parseExecutionResults(results: Object, command: string): string {
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
  <h3>${command} Status</h3>
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
