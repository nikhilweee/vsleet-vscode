/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { posix } from "path";
import { LeetCodeGraphAPI } from "./leetCodeGraphAPI";

interface Snippet {
  langSlug: string;
  code: string;
}

interface Question {
  frontendQuestionId: string;
  acRate: number;
  titleSlug: string;
  paidOnly: boolean;
  title: string;
  difficulty: string;
  status: string;
}

class ProblemItem implements vscode.QuickPickItem {
  id: string;
  description: string;
  label: string;
  detail: string;
  slug: string;
  title: string;

  constructor(question: Question) {
    this.id = question.frontendQuestionId.padStart(4, "0");
    this.slug = question.titleSlug;
    this.description = this.slug;
    this.title = `[${this.id}] ${question.title}`;
    this.label = this.title;

    const price = question.paidOnly ? "Paid" : "Free";
    const acceptance = question.acRate.toFixed(3);
    this.detail = `Price: ${price} | Difficulty: ${question.difficulty} | AC: ${acceptance}%`;
    this.detail += ``;
    switch (question.status) {
      case "ac":
        this.detail += ` | Status: Accepted`;
        break;
      case "notac":
        this.detail += ` | Status: Attempted`;
        break;
      case null:
        break;
    }
  }
}

let ltGraph: LeetCodeGraphAPI;

export async function handleLoad(context: vscode.ExtensionContext) {
  ltGraph = new LeetCodeGraphAPI(context);
  const disposables: vscode.Disposable[] = [];
  const input = vscode.window.createQuickPick<ProblemItem>();
  input.placeholder = "Search Keywords";
  input.title = "Load Problem from LeetCode";
  disposables.push(
    input.onDidChangeValue((value) => {
      handleChange(input, value);
    }),
    input.onDidAccept(async () => {
      handleAccept(input);
    })
  );
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

async function handleAccept(input: vscode.QuickPick<ProblemItem>) {
  let res = null;
  const [activeItem] = input.activeItems;

  // Fetch test cases
  res = await ltGraph.fetchTests(activeItem.slug);
  const tests = res.data.question.exampleTestcaseList;
  const meta = JSON.parse(res.data.question.metaData);

  // Fetch editor contents
  res = await ltGraph.fetchEditor(activeItem.slug);
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

  const fileName = `${activeItem.id}-${activeItem.slug}.py`;
  const fileContents = generateCode(fileName, snippet.code, tests, meta.params);

  // Open existing or create new file
  // const document = await getTextDocument(fileName, fileContents);

  const document = await vscode.workspace.openTextDocument({
    content: fileContents,
    language: "python",
  });
  vscode.window.showTextDocument(document, vscode.ViewColumn.Active);

  // Fetch problem description
  res = await ltGraph.fetchProblem(activeItem.slug);
  const panel = vscode.window.createWebviewPanel(
    "leetcode",
    activeItem.title,
    vscode.ViewColumn.Beside,
    {}
  );
  panel.webview.html = generateHTML(res.data.question.content);
}

async function getTextDocument(fileName: string, fileContents: string) {
  let document: vscode.TextDocument;

  if (!vscode.workspace.workspaceFolders) {
    // No workspace found. Don't create new file on disk.
    return await vscode.workspace.openTextDocument({
      content: fileContents,
      language: "python",
    });
  }

  const folderUri = vscode.workspace.workspaceFolders[0].uri;
  const fileUri = folderUri.with({
    path: posix.join(folderUri.path, fileName),
  });

  // Check if file exists on disk
  let fileExists = true;
  try {
    const stat = await vscode.workspace.fs.stat(fileUri);
  } catch (error) {
    fileExists = false;
  }

  if (fileExists) {
    // Open existing file from disk
    document = await vscode.workspace.openTextDocument(fileUri);
  } else {
    // Try to create a new file on disk
    const data = Buffer.from(fileContents, "utf-8");
    try {
      await vscode.workspace.fs.writeFile(fileUri, data);
      document = await vscode.workspace.openTextDocument(fileUri);
    } catch (error) {
      // Open untitled file
      document = await vscode.workspace.openTextDocument({
        content: fileContents,
        language: "python",
      });
    }
  }

  return document;
}

function generateHTML(content: string) {
  const html = `
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>pre { white-space: pre-wrap; }</style>
  </head>
  <body>${content}</body>
  </html>`;
  return html;
}

function generateCode(
  fileName: string,
  snippet: string,
  tests: string[],
  params: [{ [key: string]: string }]
) {
  let code = `# ${fileName}\n\n`;
  code += "# vsleet: start\n\n";
  code += `${snippet}\n\n`;
  code += "# vsleet: end\n\n";
  code += "# Test Cases\n";

  tests.forEach((test) => {
    code += "\n";
    test.split("\n").forEach((input, index) => {
      code += `# ${params[index].name}: ${input}\n`;
    });
  });
  return code;
}
