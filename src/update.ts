import * as vscode from "vscode";
import { parseEditor } from "./execute";
import { getCode } from "./fetch";
import { LTGraphAPI } from "./api/graph";
import { QuestionDisplay } from "./interfaces";

export async function handleUpdate(context: vscode.ExtensionContext) {
  const ltGraph = await LTGraphAPI.getInstance(context);
  const parsed = parseEditor(false);

  const newCode = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `vsleet: Updating template`,
      cancellable: true,
    },
    async (progress, token) => {
      const question: QuestionDisplay = {
        id: parsed.id.toString(),
        slug: parsed.slug,
        fragment: parsed.id.toString(),
      };
      return getCode(question, ltGraph)
        .then((code) => code)
        .catch((error) => {
          vscode.window.showErrorMessage(`vsleet: Error updating template.`);
        });
    }
  );

  if (!newCode) {
    throw new Error("Error fetching question");
  }

  if (!vscode.window.activeTextEditor) {
    throw new Error("No active editor found.");
  }
  const document = vscode.window.activeTextEditor.document;
  const currentCodeLength = document.getText().length;

  // Replace current editor with new template
  await vscode.window.activeTextEditor.edit((editBuilder) => {
    const start = document.positionAt(0);
    const end = document.positionAt(currentCodeLength);
    const range = new vscode.Range(start, end);
    editBuilder.replace(range, newCode);
  });

  // Restore previous solution
  await vscode.window.activeTextEditor.edit((editBuilder) => {
    const regex = RegExp("# vsleet:code:start(.*)# vsleet:code:end", "gds");
    const match = regex.exec(document.getText());
    if (!match || match.length < 2 || !match.indices) {
      throw new Error("Cannot find code markers.");
    }
    const start = document.positionAt(match.indices[1][0]);
    const end = document.positionAt(match.indices[1][1]);
    const range = new vscode.Range(start, end);
    editBuilder.replace(range, parsed.code);
  });

  // Restore execution results
  if (parsed.results) {
    await vscode.window.activeTextEditor.edit((editBuilder) => {
      const regex = RegExp(
        "# vsleet:results:start(.*)# vsleet:results:end",
        "gds"
      );
      const match = regex.exec(document.getText());
      if (!match || match.length < 2 || !match.indices) {
        throw new Error("Cannot find result markers.");
      }
      const start = document.positionAt(match.indices[1][0]);
      const end = document.positionAt(match.indices[1][1]);
      const range = new vscode.Range(start, end);
      editBuilder.replace(range, parsed.results);
    });
  }

  await vscode.commands.executeCommand("editor.action.formatDocument");
}
