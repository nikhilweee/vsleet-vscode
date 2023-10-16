import * as vscode from "vscode";

export async function handleLogin(context: vscode.ExtensionContext) {
  console.log(context);
  const token = await vscode.window.showInputBox({
    placeHolder: "cookie",
    prompt: "Please paste session cookie",
    title: "Login to LeetCode",
  });
  if (token) {
    context.secrets.store("cookie", token);
  }
}
