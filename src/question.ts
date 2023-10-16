import * as vscode from "vscode";

class ProblemItem implements vscode.QuickPickItem {
  id: number;
  description: string;
  label: string;

  constructor(num: number, slug: string, title: string) {
    this.id = num;
    this.label = slug;
    this.description = `[${num}] ${title}`;
  }
}

export async function handleInput() {
  const disposables: vscode.Disposable[] = [];
  const input = vscode.window.createQuickPick<ProblemItem>();
  input.placeholder = "Search Keywords";
  input.title = "Load Problem from LeetCode";
  disposables.push(
    input.onDidChangeValue(async (value) => {
      input.items = [];
      input.busy = true;
      const res = await searchProblems(value);
      const questions = res.data.problemsetQuestionList?.questions;
      if (questions) {
        for (const question of questions) {
          input.items = input.items.concat(
            new ProblemItem(
              parseInt(question.frontendQuestionId),
              question.titleSlug,
              question.title
            )
          );
        }
      }
      input.busy = false;
    }),
    input.onDidAccept(async () => {
      let res = null;
      const [activeItem] = input.activeItems;

      // Show Tests
      res = await fetchTests(activeItem.label);
      const tests = res.data.question.exampleTestcaseList;
      const meta = JSON.parse(res.data.question.metaData);

      // Show Answer
      res = await fetchEditor(activeItem.label);
      const snippets: [{ [key: string]: string }] =
        res.data.question.codeSnippets;
      const snippet = snippets.find((el) => {
        return el.langSlug == "python3";
      });
      if (snippet) {
        const document = await vscode.workspace.openTextDocument({
          content: generateCode(snippet.code, tests, meta.params),
          language: "python",
        });
        vscode.window.showTextDocument(document, vscode.ViewColumn.Active);
      }

      // Show Question
      res = await fetchProblem(activeItem.label);
      const panel = vscode.window.createWebviewPanel(
        "leetcode",
        activeItem.description,
        vscode.ViewColumn.Beside,
        {}
      );
      panel.webview.html = generateHTML(res.data.question.content);
    })
  );
  input.show();
}

async function searchProblems(keywords: string) {
  const query = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        acRate
        difficulty
        frontendQuestionId: questionFrontendId
        paidOnly: isPaidOnly
        status
        title
        titleSlug
      }
    }
  }`;

  const res = await fetch("https://leetcode.com/graphql/", {
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: query,
      variables: {
        categorySlug: "",
        skip: 0,
        limit: 5,
        filters: { searchKeywords: keywords },
      },
    }),
    method: "POST",
  });
  return res.json();
}

async function fetchProblem(slug: string) {
  const query = `
  query questionContent($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      content
      mysqlSchemas
      dataSchemas
    }
  }`;

  const res = await fetch("https://leetcode.com/graphql/", {
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: query,
      variables: {
        titleSlug: slug,
      },
    }),
    method: "POST",
  });
  return res.json();
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
  snippet: string,
  tests: string[],
  params: [{ [key: string]: string }]
) {
  let code = snippet;
  code += "\n\n";
  code += "# Test Cases\n";

  tests.forEach((test) => {
    code += "#\n";
    test.split("\n").forEach((input, index) => {
      code += `# ${params[index].name}: ${input}\n`;
    });
  });
  return code;
}

async function fetchEditor(slug: string) {
  const query = `
  query questionEditorData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      questionFrontendId
      codeSnippets {
        lang
        langSlug
        code
      }
      envInfo
      enableRunCode
      hasFrontendPreview
      frontendPreviews
    }
  }`;
  const res = await fetch("https://leetcode.com/graphql/", {
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: query,
      variables: {
        titleSlug: slug,
      },
    }),
    method: "POST",
  });
  return res.json();
}

async function fetchTests(slug: string) {
  const query = `
  query consolePanelConfig($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      questionFrontendId
      questionTitle
      enableDebugger
      enableRunCode
      enableSubmit
      enableTestMode
      exampleTestcaseList
      metaData
    }
  }`;
  const res = await fetch("https://leetcode.com/graphql/", {
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: query,
      variables: {
        titleSlug: slug,
      },
    }),
    method: "POST",
  });
  return res.json();
}
