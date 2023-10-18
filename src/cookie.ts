import * as vscode from "vscode";

export async function handleLogin(context: vscode.ExtensionContext) {
  const cookie = await vscode.window.showInputBox({
    placeHolder: "cookie",
    prompt: "Please paste session cookie",
    title: "Login to LeetCode",
  });
  if (cookie) {
    context.secrets.store("cookie", cookie);
    let token = cookie.split(";").find((element) => {
      return element.split("=").shift() === "csrftoken";
    });
    let csrftoken = token?.split("=").pop() || "";
    if (!csrftoken) {
      vscode.window.showErrorMessage(`Cannot find csrftoken in cookie.`);
    } else {
      vscode.window.showInformationMessage(`Cookie set successfully.`);
    }
  }
}
