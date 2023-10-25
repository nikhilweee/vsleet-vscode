import * as vscode from "vscode";
import * as fetch from "./fetch";
import * as cookie from "./cookie";
import * as execute from "./execute";
import * as update from "./update";

export function activate(context: vscode.ExtensionContext) {
  // context.secrets.store("cookie", "");

  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.load", () => {
      fetch.handleLoad(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.login", () => {
      cookie.handleLogin(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.local", () => {
      execute.handleLocal();
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
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.update", () => {
      update.handleUpdate(context);
    })
  );
}

export function deactivate() {}
