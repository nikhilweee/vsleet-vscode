import * as vscode from "vscode";
import * as question from "./question";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "leetcode-python.loadProblem",
      question.handleInput
    )
  );
}

export function deactivate() {}
