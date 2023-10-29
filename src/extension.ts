import * as vscode from "vscode";
import * as fetch from "./fetch";
import * as cookie from "./cookie";
import * as execute from "./execute";
import * as update from "./update";
import * as status from "./status";

export function activate(context: vscode.ExtensionContext) {
  // Events
  const updateStatusBarEmitter = new vscode.EventEmitter();
  // Commands
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
      execute.handleSubmit(context).then(() => {
        updateStatusBarEmitter.fire(null);
      });
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("vsleet.update", () => {
      update.handleUpdate(context);
    })
  );
  // Status Bar
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  context.subscriptions.push(statusBar);

  // Subscribe to custom events
  context.subscriptions.push(
    updateStatusBarEmitter.event((data) => {
      status.updateStatusBar(statusBar, context);
    })
  );
  // Update status bar once at start
  status.updateStatusBar(statusBar, context);
}

export function deactivate() {}
