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
    parsed.tests
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
          const results = parseResults(res, command, testJSON);
          panel.webview.html = results.formatted;
          updateResults(results.parsed)
            .then()
            .catch((error) => {});
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
  const matchName = reName.exec(text);
  if (!matchName || matchName.length < 3) {
    vscode.window.showErrorMessage(
      `Cannot parse problem details.
      Please include a comment line: # {id}-{slug}.py
      (for example: # 0001-two-sum.py).`
    );
    throw new Error("Cannot parse problem details.");
  }
  const slug = matchName[2];
  const id = parseInt(matchName[1]);

  const reCode = RegExp("# vsleet:code:start(.*)# vsleet:code:end", "gs");
  const matchCode = reCode.exec(text);
  if (!matchCode || matchCode.length < 2) {
    vscode.window.showErrorMessage(
      `Cannot find code markers.
      Please write your solution between
      # vsleet:code:start and # vsleet:code:end tags.`
    );
    throw new Error("Cannot find code markers.");
  }
  const code = matchCode[1];

  const parsed: ParsedEditor = {
    id: id,
    slug: slug,
    code: code,
    tests: "",
    testJSON: [],
    results: "",
  };

  if (requireTests) {
    const reTests = RegExp("# vsleet:tests:start(.*)# vsleet:tests:end", "gs");
    const matchTests = reTests.exec(text);
    if (!matchTests || matchTests.length < 2) {
      vscode.window.showErrorMessage(
        `Cannot find test markers.
        Please write your solution between
        # vsleet:tests:start and # vsleet:tests:end tags.`
      );
      throw new Error("Cannot find test markers.");
    }

    const testCases = matchTests[1];
    const reTestCases = RegExp("\\[(.*)\\]", "gs");
    const resultsTestCases = reTestCases.exec(testCases);
    if (!resultsTestCases || resultsTestCases.length < 2) {
      vscode.window.showErrorMessage(`Cannot parse test cases.`);
      throw new Error("Cannot parse test cases.");
    }

    const testJSON = JSON5.parse(resultsTestCases[0]);
    let tests = "";
    testJSON.forEach((testcase: Object) => {
      for (let value of Object.values(testcase)) {
        tests += JSON.stringify(value);
        tests += "\n";
      }
    });
    tests = tests.trim();

    parsed.tests = tests;
    parsed.testJSON = testJSON;
  }

  const reResults = RegExp(
    "# vsleet:results:start(.*)# vsleet:results:end",
    "gs"
  );
  const matchResults = reResults.exec(text);
  if (matchResults && matchResults.length === 2) {
    parsed.results = matchResults[1];
  }

  return parsed;
}

function parseResults(results: Object, command: string, testJSON: Object[]) {
  const html: Object = {};
  const parsed: Object = {};

  // Format Test Cases

  const answers = pop(results, "code_answer");
  const truths = pop(results, "expected_code_answer");
  const comparison = pop(results, "compare_result");

  html.tests = "";

  if (
    typeof answers === "object" &&
    typeof truths === "object" &&
    typeof comparison === "string"
  ) {
    html.tests = `
    <h3>Test Cases</h3>
    `;
    answers.map((answer, i) => {
      const expected = truths[i];
      const compare = comparison[i] === "1" ? "🟢" : "🔴";
      const test = JSON.stringify(testJSON[i]);
      html.tests += `
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
    html.heading = `<h2>${command} ${status_msg}: `;
    html.heading += `${num_correct} / ${num_total} ${emoji}</h2>`;
    parsed.type = command;
    parsed.status = status_msg.toString();
    parsed.num_total = num_total.toString();
    parsed.num_correct = num_correct.toString();
  } else {
    html.heading = `<h2>${command} ${status_msg}</h2>`;
    parsed.type = command;
    parsed.status = status_msg.toString();
  }

  // Format Statuses

  let runtime_status = pop(results, "status_runtime");
  parsed.runtime_status = runtime_status.toString();
  runtime_status = `<li>Runtime Status: ${runtime_status}</li>`;

  let memory_status = pop(results, "status_memory");
  parsed.memory_status = memory_status.toString();
  memory_status = `<li>Memory Status: ${memory_status}</li>`;

  let runtime_percentile = pop(results, "runtime_percentile");
  if (typeof runtime_percentile === "number") {
    runtime_percentile = runtime_percentile.toFixed(5);
    parsed.runtime_percentile = runtime_percentile.toString();
    runtime_percentile = `<li>Runtime Percentile: ${runtime_percentile}</li>`;
  } else {
    runtime_percentile = "";
  }

  let memory_percentile = pop(results, "memory_percentile");
  if (typeof memory_percentile === "number") {
    memory_percentile = memory_percentile.toFixed(5);
    parsed.memory_percentile = memory_percentile.toString();
    memory_percentile = `<li>Memory Percentile: ${memory_percentile}</li>`;
  } else {
    memory_percentile = "";
  }

  parsed.result_time = new Date().toJSON();

  html.status = `
  <h3>${command} Status</h3>
  <ul>
  ${runtime_status}
  ${memory_status}
  ${runtime_percentile}
  ${memory_percentile}
  </ul>
  `;

  // Format Errors

  html.errors = "";

  const runtime_error = pop(results, "runtime_error");
  if (runtime_error) {
    html.errors += `
    <h3>Error</h3>
    <pre>${runtime_error}</pre>
    `;
  }

  const full_runtime_error = pop(results, "full_runtime_error");
  if (runtime_error) {
    html.errors += `
    <h3>Full Error</h3>
    <pre>${full_runtime_error}</pre>
    `;
  }

  // Format Details

  html.details = `
  <details>
  <summary><strong>Additional Information</strong></summary>
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
  ${html.heading}
  ${html.status}
  ${html.tests}
  ${html.errors}
  ${html.details}
  </body>
  </html>
  `;

  return { parsed: parsed, formatted: formatted };
}

function pop(object: Object, key: string): string | number | [] {
  let value = "";
  if (key in object) {
    value = object[key];
    delete object[key];
  }
  return value;
}

async function updateResults(parsed: Object) {
  if (!vscode.window.activeTextEditor) {
    throw new Error("No active editor found.");
  }

  const document = vscode.window.activeTextEditor.document;
  const code = document.getText();

  // For now, just restore previous solution
  await vscode.window.activeTextEditor.edit((editBuilder) => {
    const regex = RegExp(
      "# vsleet:results:start(.*)# vsleet:results:end",
      "gds"
    );
    const match = regex.exec(code);
    if (!match || match.length < 2 || !match.indices) {
      throw new Error("Cannot find result markers.");
    }
    const start = document.positionAt(match.indices[1][0]);
    const end = document.positionAt(match.indices[1][1]);
    const range = new vscode.Range(start, end);
    const results = `\n${JSON.stringify(parsed, null, 2)}\n`;
    editBuilder.replace(range, results);
  });
}
