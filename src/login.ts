import * as vscode from "vscode";

export async function handleLogin(context: vscode.ExtensionContext) {
  console.log(context);
  const token = await vscode.window.showInputBox({
    placeHolder: "csrftoken",
    prompt: "Please enter CSRFTOKEN",
    title: "Login to LeetCode",
  });
  if (token) {
    context.secrets.store("csrftoken", token);
  }
}
