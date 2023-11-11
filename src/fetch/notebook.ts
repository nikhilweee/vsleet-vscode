/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { LTGraphAPI } from "../api/graph";
import { ProblemItem } from "./base";
import { Object, Snippet, QuestionMeta, QuestionDisplay } from "../interfaces";

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
      progress.report({ message: "Creating Notebook" });
      const code = await getCode(activeItem.slug, ltGraph);
      const path = `${code.question.id}-${code.question.slug}.ipynb`;
      const pathUri = vscode.Uri.file(path);
      // Create empty notebook with suggested filename
      const document = await vscode.workspace.openNotebookDocument(
        pathUri.with({ scheme: "untitled" })
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
      vscode.window
        .showNotebookDocument(document, {
          viewColumn: vscode.ViewColumn.Active,
        })
        .then((editor) => {
          setTimeout(() => {
            // Apply formatting after a while
            vscode.commands.executeCommand("notebook.format");
          }, 5000);
        });
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
  res = await ltGraph.fetchContent(slug);
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
  ## ${question.id} ${question.title}

  View this problem directly from your browser  
  https://leetcode.com/problems/${question.slug}#${question.fragment}

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
  # https://leetcode.com/problems/${question.slug}#${question.fragment}

  from typing import List, Dict, Optional

  # vsleet:code:start

  ${snippet}pass

  # vsleet:code:end

  `.replace(/\n  /g, "\n");

  // Add tests cell

  let testcasespy = "null, true, false = None, True, False\n\n";
  testcasespy += "# vsleet:tests:start\n\n";
  testcasespy += `testcases = ${testString}\n\n`;
  testcasespy += "# vsleet:tests:end\n\n";

  // Add runner cell

  let runnerpy = `
  if __name__ == "__main__":
    solution = Solution()
    for testcase in testcases:
      print("testcase:", testcase)
      result = solution.${meta.name}(**testcase)
      print("result:", result)
  `.replace(/\n  /g, "\n");

  // Add results cell

  let resultspy = `
  # vsleet:results:start
  # Run your solution for memory and runtime status, or
  # Submit your solution for memory and runtime percentiles
  # vsleet:results:end
  `.replace(/\n  /g, "\n");

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Code,
      headerpy + testcasespy + runnerpy + resultspy,
      "python"
    )
  );

  let notesmd = `
  ## Notes
  * Problem Caveats
  * Initial Iterations
  * Alternative Approaches
  * Future Improvements
  `;

  cells.push(
    new vscode.NotebookCellData(
      vscode.NotebookCellKind.Markup,
      notesmd,
      "markdown"
    )
  );

  const data = new vscode.NotebookData(cells);

  return data;
}
