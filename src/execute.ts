/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as JSON5 from "json5";
import { LTJudgeAPI } from "./api/judge";
import { Object, ParsedEditor } from "./interfaces";
import { getCssUri } from "./utils";

let ltJudge: LTJudgeAPI;

export async function handleLocal() {
  if (vscode.window.activeNotebookEditor === undefined) {
    vscode.commands.executeCommand("python.execInTerminal");
  } else {
    vscode.window.showInformationMessage(
      `Please execute notebook cell directly.`
    );
  }
}

export async function handleRun(context: vscode.ExtensionContext) {
  ltJudge = await LTJudgeAPI.getInstance(context);

  const parsed = parseEditor();

  let res = await ltJudge.runSolution(
    parsed.problemId,
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

  let res = await ltJudge.submitSolution(
    parsed.problemId,
    parsed.envType,
    parsed.envId,
    parsed.slug,
    parsed.code
  );
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
          const [cssUri, localResourceRoots] = getCssUri();
          const panel = vscode.window.createWebviewPanel(
            "leetcode",
            `${command} Results`,
            { preserveFocus: true, viewColumn: vscode.ViewColumn.Beside },
            { localResourceRoots: localResourceRoots }
          );
          const cssSrc = panel.webview.asWebviewUri(cssUri).toString();
          const results = formatResults(res, command, testJSON, cssSrc);
          panel.webview.html = results.html;
          updateResults(results.json)
            .then()
            .catch((error) => {});
          return;
        }
      }
      vscode.window.showErrorMessage(
        `vsleet ${command}: Timed out waiting for Judge.`
      );
      throw new Error("Timed out waiting for Judge.");
    }
  );
}

export function parseEditor(parseTests = true) {
  if (!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage(
      `Cannot find active editor.
      Please run this command from an active editor.`
    );
    throw new Error("No active editor found.");
  }

  const text = vscode.window.activeTextEditor.document.getText();

  let slug = "";
  let problemId = 0;
  let envId = "";
  let envType = "";

  // Parse problem URL

  const reURL = RegExp("# (https:\\/\\/leetcode\\.com\\/problems\\/.*)");
  const matchURL = reURL.exec(text);
  if (!matchURL || matchURL.length !== 2) {
    vscode.window.showWarningMessage(
      `Cannot parse problem URL.
      Please run vsleet: Update Template
      to update the solution template.`
    );
  } else {
    const url = new URL(matchURL[1]);
    slug = url.pathname.split("/")[2];
    problemId = parseInt(url.searchParams.get("problemId") || "0");
    envId = url.searchParams.get("envId") || "";
    envType = url.searchParams.get("envType") || "";
  }

  if (!problemId) {
    vscode.window.showErrorMessage(
      `Cannot parse problem ID.
      Please run vsleet: New Problem
      to load a fresh solution template.`
    );
    throw new Error("Cannot parse problem ID.");
  }

  if (envId && !envType) {
    vscode.window.showErrorMessage(`Missing envType for envId ${envId}.`);
    throw new Error("Missing envType.");
  }

  // Parse solution
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
    problemId: problemId,
    envId: envId,
    envType: envType,
    slug: slug,
    code: code,
    tests: "",
    testJSON: [],
    results: "",
  };

  // Parse tests
  if (parseTests) {
    const reTests = RegExp("# vsleet:tests:start(.*)# vsleet:tests:end", "gs");
    const matchTests = reTests.exec(text);
    if (!matchTests || matchTests.length < 2) {
      vscode.window.showErrorMessage(
        `Cannot find test markers.
        Please write your test cases between
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

    // Remove comments from test cases
    const parsedTestCases = resultsTestCases[0].replace(
      RegExp("\\n\\s*#.*", "g"),
      ""
    );

    console.log(parsedTestCases);

    const testJSON = JSON5.parse(parsedTestCases);
    let tests = "";
    testJSON.forEach((testcase: Object) => {
      for (let value of testcase[1]) {
        tests += JSON.stringify(value);
        tests += "\n";
      }
    });
    tests = tests.trim();

    parsed.tests = tests;
    parsed.testJSON = testJSON;
  }

  // Parse results
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

function formatResults(
  results: Object,
  command: string,
  testJSON: Object[],
  cssSrc: string
) {
  const doc: Object = {};
  const json: Object = {};

  // Format Test Cases

  const n = parseInt(results.total_testcases);
  const answers = pop(results, "code_answer");
  const truths = pop(results, "expected_code_answer");
  const comparison = pop(results, "compare_result");
  const std_output_list = pop(results, "std_output_list");

  doc.tests = "";

  if (
    typeof answers === "object" &&
    typeof truths === "object" &&
    typeof comparison === "string" &&
    typeof std_output_list === "object"
  ) {
    doc.tests = `<h2>Test Cases</h2>`;
    answers.slice(0, n).map((answer, i) => {
      const expected = truths[i];
      const compare = comparison[i] === "1" ? "🟢" : "🔴";
      const stdout = std_output_list[i];

      let inputs_formatted = "";
      Object.values(testJSON[i][1]).forEach((input, index) => {
        inputs_formatted += `<strong>Input ${index + 1}</strong>  : ${input}\n`;
      });
      inputs_formatted = inputs_formatted.trim();

      doc.tests += `
      <pre>
      ${inputs_formatted}
      <strong>Expected</strong> : ${expected}
      <strong>Answer</strong>   : ${answer}
      <strong>Correct</strong>  : ${compare}
      <strong>STDOUT</strong>   : ${stdout}
      </pre>
      `.replace(/\n      /g, "\n");
    });
  }

  // Format Heading

  const num_total = pop(results, "total_testcases");
  const num_correct = pop(results, "total_correct");
  const status_msg = pop(results, "status_msg");
  doc.heading = `<h1>${command} Results</h1>`;
  doc.heading += `<strong>Status</strong>: ${status_msg}<br/>`;
  json.type = command;
  json.status = status_msg.toString();

  if (num_total) {
    let emoji = "🔴";
    if (num_correct === num_total) {
      emoji = "🟢";
    } else if (typeof num_correct === "number" && num_correct > 0) {
      emoji = "🟡";
    }
    doc.heading += `<strong>Passed</strong>: `;
    doc.heading += `${num_correct} / ${num_total} ${emoji}<br/>`;
    json.num_total = num_total.toString();
    json.num_correct = num_correct.toString();
  }

  // Format Statuses

  let runtime_status = pop(results, "status_runtime");
  json.runtime_status = runtime_status.toString();
  runtime_status = `<li>Runtime Status: ${runtime_status}</li>`;

  let memory_status = pop(results, "status_memory");
  json.memory_status = memory_status.toString();
  memory_status = `<li>Memory Status: ${memory_status}</li>`;

  let runtime_percentile = pop(results, "runtime_percentile");
  if (typeof runtime_percentile === "number") {
    runtime_percentile = runtime_percentile.toFixed(5);
    json.runtime_percentile = runtime_percentile.toString();
    runtime_percentile = `<li>Runtime Percentile: ${runtime_percentile}</li>`;
  } else {
    runtime_percentile = "";
  }

  let memory_percentile = pop(results, "memory_percentile");
  if (typeof memory_percentile === "number") {
    memory_percentile = memory_percentile.toFixed(5);
    json.memory_percentile = memory_percentile.toString();
    memory_percentile = `<li>Memory Percentile: ${memory_percentile}</li>`;
  } else {
    memory_percentile = "";
  }

  json.timestamp = new Date().toJSON();

  doc.status = `
  <h2>Performance</h2>
  <ul>
  ${runtime_status}
  ${memory_status}
  ${runtime_percentile}
  ${memory_percentile}
  </ul>
  `;

  // Format Errors

  doc.errors = "";

  const invalid_testcase = pop(results, "invalid_testcase");
  if (invalid_testcase) {
    doc.errors += `
    <h2>Error</h2>
    <pre>Invalid Testcase</pre>
    `;
  }

  const runtime_error = pop(results, "runtime_error");
  if (runtime_error) {
    doc.errors += `
    <h2>Error</h2>
    <pre>${runtime_error}</pre>
    `;
  }

  const full_runtime_error = pop(results, "full_runtime_error");
  if (runtime_error) {
    doc.errors += `
    <h2>Full Error</h2>
    <pre>${full_runtime_error}</pre>
    `;
  }

  const last_testcase = pop(results, "last_testcase");
  if (last_testcase) {
    const inputs = last_testcase.toString().split("\n");
    const code_output = pop(results, "code_output");
    const std_output = pop(results, "std_output");
    const expected_output = pop(results, "expected_output");

    let inputs_formatted = "";
    inputs.forEach((input, index) => {
      inputs_formatted += `<strong>Input ${index + 1}</strong> : ${input}\n`;
    });
    inputs_formatted = inputs_formatted.trim();

    doc.errors += `<h2>Failure Details</h2>`;
    doc.errors += `
    <pre>
    ${inputs_formatted}
    <strong>Expected</strong>: ${expected_output}
    <strong>Answer</strong>  : ${code_output}
    <strong>STDOUT</strong>  : ${std_output}
    </pre>
    `.replace(/\n    /g, "\n");
  }

  // Format Details

  doc.details = `
  <h2>Additional Information</h2>
  <details>
  <summary>Click here to view additional information</summary><br />
  <pre>${JSON.stringify(results, null, 4)}</pre>
  </details>
  </body>
  </html>
  `;

  // Format HTML

  let html = `
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" type="text/css" href="${cssSrc}">
  </head>
  <body>
  ${doc.heading}
  ${doc.status}
  ${doc.tests}
  ${doc.errors}
  ${doc.details}
  </body>
  </html>
  `;

  return { json: json, html: html };
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
    const results = `\n${JSON.stringify(parsed, null, 4)}\n`;
    editBuilder.replace(range, results);
  });
}
