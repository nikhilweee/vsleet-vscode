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
  const reName = RegExp("(d*)-([-w]*).py");
  const resultsName = reName.exec(stem);
  if (!resultsName || resultsName.length < 3) {
    vscode.window.showErrorMessage(
      `Cannot parse problem information.
      Expected filename format is {id}-{slug}.py
      (as in 0001-two-sum.py).`
    );
    return;
  }

  const slug = resultsName[1];
  const id = parseInt(resultsName[2]);

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
  let parsed = `
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>pre { white-space: pre-wrap; }</style>
  </head>
  <body>
  <h3>${results.submission_id}</h3>

  <h3>Run Overview</h3>
  <ul>
  <li><strong>State</strong>: ${results.state}</li>
  <li><strong>Run Success</strong>: ${results.run_success}</li>
  <li><strong>Elapsed Time</strong>: ${results.elapsed_time}</li>
  <li><strong>Total Correct</strong>: ${results.total_correct}</li>
  <li><strong>Total Testcases</strong>: ${results.total_testcases}</li>
  </ul>

  <h3>Run Status</h3>
  <ul>
  <li><strong>Runtime Status</strong>: ${results.status_runtime}</li>
  <li><strong>Runtime Percentile</strong>: ${results.runtime_percentile}</li>
  <li><strong>Memory Status</strong>: ${results.status_memory}</li>
  <li><strong>Memory Percentile</strong>: ${results.memory_percentile}</li>
  </ul>

  <h3>Error</h3>
  <pre>${results.runtime_error}</pre>

  <h3>Full Error</h3>
  <pre>${results.full_runtime_error}</pre>
  `;

  [
    "submission_id",
    "state",
    "run_success",
    "elapsed_time",
    "total_correct",
    "total_testcases",
    "status_runtime",
    "runtime_percentile",
    "status_memory",
    "memory_percentile",
    "runtime_error",
    "full_runtime_error",
  ].forEach((key) => {
    delete results[key];
  });

  let otherResults = JSON.stringify(results, null, 2);

  parsed += `
  <h3>Other Information</h3>
  <pre>${otherResults}</pre>
  </body>
  </html>
  `;

  return parsed;
}
