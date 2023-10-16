import * as vscode from "vscode";
import * as question from "./question";
import * as login from "./login";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("leetcode-python.loadProblem", () => {
      question.handleInput();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("leetcode-python.login", () => {
      login.handleLogin(context);
    })
  );
}

export function deactivate() {}
