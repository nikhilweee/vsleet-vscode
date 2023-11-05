/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { LTGraphAPI } from "./api/graph";
import { ProblemItem } from "./fetch";
import { Object, Snippet, QuestionMeta, QuestionDisplay } from "./interfaces";
import { getCssUri } from "./utils";
import { posix } from "path";

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
    handleAccept(activeItem, ltGraph);
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
      title: `vsleet: Fetching Problem`,
      cancellable: true,
    },
    async (progress, token) => {
      // Fetch problem description
      const code = await getCode(activeItem.slug, ltGraph);
      const path = `${code.question.id}-${code.question.slug}.ipynb`;
      // Create empty notebook with suggested filename
      const document = await vscode.workspace.openNotebookDocument(
        vscode.Uri.from({ scheme: "untitled", path: path })
      );
      // Edit notebook and insert template data
      const edit = new vscode.WorkspaceEdit();
      edit.set(document.uri, [
        vscode.NotebookEdit.replaceCells(
          new vscode.NotebookRange(0, 1),
          code.cells
        ),
      ]);
      await vscode.workspace.applyEdit(edit);
      // Show notebook
      await vscode.window.showNotebookDocument(document, {
        viewColumn: vscode.ViewColumn.Active,
      });
      // Apply formatting after a while
      await new Promise((f) => setTimeout(f, 5000));
      await vscode.commands.executeCommand("notebook.format");
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
    title: q.questionTitle,
    fragment: q.backendQuestionId.padStart(4, "0"),
  };

  // Fetch question content
  res = await ltGraph.fetchProblem(slug);
  question.content = res.data.question.content;

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

  const fileContents = generateCells(question, snippet.code, tests, meta);
  return { cells: fileContents.cells, question: question };
}

function generateCells(
  question: QuestionDisplay,
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
  const testString = JSON.stringify(testCases, null, 4);

  const cells: vscode.NotebookCellData[] = [];

  // Add header cell

  let headermd = `
  This notebook was generated using the vsleet extension (version ${version})  
  https://marketplace.visualstudio.com/items?itemName=nikhilweee.vsleet

  Write your solution between \`vsleet:code:start\` and \`vsleet:code:end\`  
  Write test cases between \`vsleet:tests:start\` and \`vsleet:tests:end\`  
  `;

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Markup,
      headermd,
      "markdown"
    )
  );

  // Add question content

  let contentsmd = `## Question

  ### ${question.id} ${question.title}

  View this problem directly from your browser  
  https://leetcode.com/problems/${question.slug}#${question.fragment}

  ${question.content}
  `;

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Markup,
      contentsmd,
      "markdown"
    )
  );

  // Add solution cell

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Markup,
      "## Solution",
      "markdown"
    )
  );

  let headerpy = `
  from typing import List, Dict, Optional

  # vsleet:code:start

  ${snippet}pass

  # vsleet:code:end
  `.replace(/\n  /g, "\n");

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Code,
      headerpy,
      "python"
    )
  );

  // Add tests cell

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Markup,
      "## Test Cases",
      "markdown"
    )
  );

  let testcasespy = "null, true, false = None, True, False\n\n";
  testcasespy += "# vsleet:tests:start\n\n";
  testcasespy += `testcases = ${testString}\n\n`;
  testcasespy += "# vsleet:tests:end";

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Code,
      testcasespy,
      "python"
    )
  );

  // Add runner cell

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Markup,
      "## Run Locally",
      "markdown"
    )
  );

  let runnerpy = `
  if __name__ == "__main__":
    solution = Solution()
    for testcase in testcases:
      print("testcase:", testcase)
      result = solution.${meta.name}(**testcase)
      print("result:", result)
  `.replace(/\n  /g, "\n");

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Code,
      runnerpy,
      "python"
    )
  );

  // Add results cell

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Markup,
      "## Results",
      "markdown"
    )
  );

  let resultspy = `
  # vsleet:results:start
  # Run your solution for memory and runtime status, or
  # Submit your solution for memory and runtime percentiles
  # vsleet:results:end
  `.replace(/\n  /g, "\n");

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Code,
      resultspy,
      "python"
    )
  );

  const data = new vscode.NotebookData(cells);

  return data;
}
