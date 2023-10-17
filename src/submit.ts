/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { LeetCodeJudgeAPI } from "./leetcodeJudgeAPI";

let ltJudge: LeetCodeJudgeAPI;

interface Object {
  [key: string]: string;
}

export async function handleRun(context: vscode.ExtensionContext) {
  if (!vscode.window.activeTextEditor) {
    return;
  }

  ltJudge = new LeetCodeJudgeAPI(context);

  const name = vscode.window.activeTextEditor.document.fileName;
  const stem = name.split("/").pop();
  if (!stem) {
    vscode.window.showErrorMessage("Cannot parse problem ID");
    return;
  }
  const slug = stem.slice(5, -3);
  const id = parseInt(stem.slice(0, 4));

  const code = vscode.window.activeTextEditor.document.getText();

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
