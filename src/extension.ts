import * as vscode from "vscode";
import * as fetch from "./fetch/file";
import * as cookie from "./cookie";
import * as execute from "./execute";
import * as update from "./update";
import * as session from "./session";
import * as notebook from "./fetch/notebook";

export function activate(context: vscode.ExtensionContext) {
  // Status Bar
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    0
  );
  context.subscriptions.push(statusBar);

  // Update status bar once at start
  session.updateStatusBar(context, statusBar);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.load", () => {
      fetch.handleLoad(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.notebook", () => {
      notebook.handleLoad(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.login", () => {
      cookie.handleLogin(context).then(() => {
        session.updateStatusBar(context, statusBar);
      });
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
      execute.handleSubmit(context).then(() => {
        session.updateStatusBar(context, statusBar);
      });
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.update", () => {
      update.handleUpdate(context);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.description", () => {
      update.handleDescription(context);
    })
  );
}

export function deactivate() {}
