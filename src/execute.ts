/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as JSON5 from "json5";
import { LTJudgeAPI } from "./api/judge";
import { Object, ParsedEditor } from "./interfaces";

let ltJudge: LTJudgeAPI;

export async function handleLocal() {
  vscode.commands.executeCommand("python.execInTerminal");
}

export async function handleRun(context: vscode.ExtensionContext) {
  ltJudge = await LTJudgeAPI.getInstance(context);

  const parsed = parseEditor();

  let res = await ltJudge.runSolution(
    parsed.id,
    parsed.slug,
    parsed.code,
    parsed.testStr
  );
  const checkId = res.interpret_id;
  await checkExecution(checkId, parsed.slug, parsed.testJSON, "Run");
}

export async function handleSubmit(context: vscode.ExtensionContext) {
  ltJudge = await LTJudgeAPI.getInstance(context);

  const parsed = parseEditor(false);

  let res = await ltJudge.submitSolution(parsed.id, parsed.slug, parsed.code);
  const checkId = res.submission_id;
  await checkExecution(checkId, parsed.slug, [], "Submission");
}

async function checkExecution(
  checkId: string,
  slug: string,
  testJSON: Object[],
  command: string
) {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `vsleet ${command}: Waiting for Judge`,
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
            { preserveFocus: true, viewColumn: vscode.ViewColumn.Beside }
          );
          panel.webview.html = parseExecutionResults(res, command, testJSON);
          return;
        }
      }
      vscode.window.showErrorMessage(
        `vsleet ${command}: Timed out waiting for Judge.`
      );
    }
  );
}

export function parseEditor(requireTests = true) {
  if (!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage(
      `Cannot find active editor.
      Please run this command from 
      an active editor window.`
    );
    throw new Error("No active editor found.");
  }

  const text = vscode.window.activeTextEditor.document.getText();

  const reName = RegExp("# (\\d*)-([\\w-]*).py");
  const resultsName = reName.exec(text);
  if (!resultsName || resultsName.length < 3) {
    vscode.window.showErrorMessage(
      `Cannot parse problem details.
      Please include a comment line: # {id}-{slug}.py
      (for example: # 0001-two-sum.py).`
    );
    throw new Error("Cannot parse problem details.");
  }
  const slug = resultsName[2];
  const id = parseInt(resultsName[1]);

  const reCode = RegExp("# vsleet:code:start(.*)# vsleet:code:end", "gs");
  const resultsCode = reCode.exec(text);
  if (!resultsCode || resultsCode.length < 2) {
    vscode.window.showErrorMessage(
      `Cannot find code markers.
      Please write your solution between
      # vsleet:code:start and # vsleet:code:end tags.`
    );
    throw new Error("Cannot find code markers.");
  }
  const code = resultsCode[1];

  const parsed: ParsedEditor = {
    id: id,
    slug: slug,
    code: code,
    testStr: "",
    testJSON: [],
  };

  if (requireTests) {
    const reTests = RegExp("# vsleet:tests:start(.*)# vsleet:tests:end", "gs");
    const resultsTests = reTests.exec(text);
    if (!resultsTests || resultsTests.length < 2) {
      vscode.window.showErrorMessage(
        `Cannot find test markers.
        Please write your solution between
        # vsleet:tests:start and # vsleet:tests:end tags.`
      );
      throw new Error("Cannot find test markers.");
    }

    const testCases = resultsTests[1];
    const reTestCases = RegExp("\\[(.*)\\]", "gs");
    const resultsTestCases = reTestCases.exec(testCases);
    if (!resultsTestCases || resultsTestCases.length < 2) {
      vscode.window.showErrorMessage(`Cannot parse test cases.`);
      throw new Error("Cannot parse test cases.");
    }

    const testJSON = JSON5.parse(resultsTestCases[0]);
    let testStr = "";
    testJSON.forEach((testcase: Object) => {
      for (let value of Object.values(testcase)) {
        testStr += JSON.stringify(value);
        testStr += "\n";
      }
    });
    testStr = testStr.trim();

    parsed.testStr = testStr;
    parsed.testJSON = testJSON;
  }

  return parsed;
}

function parseExecutionResults(
  results: Object,
  command: string,
  testJSON: Object[]
): string {
  const parsed: Object = {};

  // Format Test Cases

  const answers = pop(results, "code_answer");
  const truths = pop(results, "expected_code_answer");
  const comparison = pop(results, "compare_result");

  parsed.tests = "";

  if (
    typeof answers === "object" &&
    typeof truths === "object" &&
    typeof comparison === "string"
  ) {
    parsed.tests = `
    <h3>Test Cases</h3>
    `;
    answers.map((answer, i) => {
      const expected = truths[i];
      const compare = comparison[i] === "1" ? "🟢" : "🔴";
      const test = JSON.stringify(testJSON[i]);
      parsed.tests += `
      <pre>
      Input:   : ${test}
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

  if (num_total) {
    let emoji = "🔴";
    if (num_correct === num_total) {
      emoji = "🟢";
    } else if (typeof num_correct === "number" && num_correct > 0) {
      emoji = "🟡";
    }
    parsed.heading = `
    <h2>${command} ${status_msg}: ${num_correct} / ${num_total} ${emoji}</h2>`;
  } else {
    parsed.heading = `<h2>${status_msg}</h2>`;
  }

  // Format Status

  let runtime_percentile = pop(results, "runtime_percentile");
  if (typeof runtime_percentile === "number") {
    runtime_percentile = runtime_percentile.toFixed(5);
    runtime_percentile = `<li>Runtime Percentile: ${runtime_percentile}</li>`;
  } else {
    runtime_percentile = "";
  }

  let memory_percentile = pop(results, "memory_percentile");
  if (typeof memory_percentile === "number") {
    memory_percentile = memory_percentile.toFixed(5);
    memory_percentile = `<li>Memory Percentile: ${memory_percentile}</li>`;
  } else {
    memory_percentile = "";
  }

  parsed.status = `
  <h3>${command} Status</h3>
  <ul>
  <li>Runtime Status: ${pop(results, "status_runtime")}</li>
  <li>Memory Status: ${pop(results, "status_memory")}</li>
  ${runtime_percentile}
  ${memory_percentile}
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

  // Format HTML

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

function pop(object: Object, key: string): string | number | [] {
  let value = "";
  if (key in object) {
    value = object[key];
    delete object[key];
  }
  return value;
}
