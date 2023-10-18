import * as vscode from "vscode";
import * as fetch from "./fetch";
import * as login from "./login";
import * as execute from "./execute";

export function activate(context: vscode.ExtensionContext) {
  // context.secrets.store("cookie", "");

  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.load", () => {
      fetch.handleLoad(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.login", () => {
      login.handleLogin(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.run", () => {
      execute.handleRun(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.submit", () => {
      execute.handleSubmit(context);
    })
  );
}

export function deactivate() {}
