/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";

export async function handleRun(context: vscode.ExtensionContext) {
  if (!vscode.window.activeTextEditor) {
    return;
  }

  const name = vscode.window.activeTextEditor.document.fileName;
  const stem = name.split("/").pop();
  if (!stem) {
    return;
  }
  const slug = stem.slice(5, -3);
  const id = parseInt(stem.slice(0, 4));

  const code = vscode.window.activeTextEditor.document.getText();
  const cookies = await context.secrets.get("cookie");
  if (!cookies) {
    const message = "Session cookie not found. Please Login";
    await vscode.window.showErrorMessage(message);
    return;
  }

  let res = await submitRun(id, slug, cookies, code);
  const interpredId = res.interpret_id;
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Waiting for Judge",
      cancellable: true,
    },
    async (progress, token) => {
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        res = await checkRun(interpredId, slug, cookies);
        if (res.state === "SUCCESS") {
          const document = await vscode.workspace.openTextDocument({
            content: JSON.stringify(res, null, 2),
            language: "json",
          });
          return vscode.window.showTextDocument(document, {
            preview: true,
            preserveFocus: true,
            viewColumn: vscode.ViewColumn.Beside,
          });
        }
      }
    }
  );
}

async function checkRun(interpretId: string, slug: string, cookies: string) {
  const headers = await prepareHeaders(slug, cookies);
  const res = await fetch(
    `https://leetcode.com/submissions/detail/${interpretId}/check/`,
    {
      headers: headers,
      body: null,
      method: "POST",
      credentials: "same-origin",
    }
  );

  return res.json();
}

async function submitRun(
  id: number,
  slug: string,
  cookies: string,
  code: string
) {
  const headers = await prepareHeaders(slug, cookies);

  let tests = await fetchTests(slug);
  tests = tests.data.question.exampleTestcaseList.join("\n");

  const body = JSON.stringify({
    data_input: tests,
    lang: "python3",
    question_id: id,
    typed_code: code,
  });

  const res = await fetch(
    `https://leetcode.com/problems/${slug}/interpret_solution/`,
    {
      headers: headers,
      body: body,
      method: "POST",
      credentials: "same-origin",
    }
  );
  return res.json();
}

async function prepareHeaders(slug: string, cookies: string) {
  let csrftoken = cookies.split(";").find((element) => {
    return element.split("=").shift() === "csrftoken";
  });
  csrftoken = csrftoken?.split("=").pop();

  if (!csrftoken) {
    const message = "CSRFToken cookie not found. Please login again.";
    await vscode.window.showErrorMessage(message);
    return;
  }

  const headers = {
    "x-csrftoken": csrftoken,
    referer: `https://leetcode.com/problems/${slug}/`,
    cookie: cookies,
    "content-type": "application/json",
  };
  return headers;
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
