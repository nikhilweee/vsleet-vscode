import * as vscode from "vscode";
import * as question from "./question";
import * as login from "./login";
import * as submit from "./submit";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("leetcode-python.load", () => {
      question.handleLoad();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("leetcode-python.login", () => {
      login.handleLogin(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("leetcode-python.run", () => {
      submit.handleRun(context);
    })
  );
}

export function deactivate() {}
