import * as vscode from "vscode";
import * as question from "./question";
import * as login from "./login";
import * as submit from "./submit";

export function activate(context: vscode.ExtensionContext) {
  // context.secrets.store("cookie", "");

  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.load", () => {
      question.handleLoad(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.login", () => {
      login.handleLogin(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.run", () => {
      submit.handleRun(context);
    })
  );
}

export function deactivate() {}
