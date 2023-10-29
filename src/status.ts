import * as vscode from "vscode";
import { LTJudgeAPI } from "./api/judge";
import { Object } from "./interfaces";

export async function updateStatusBar(
  status: vscode.StatusBarItem,
  context: vscode.ExtensionContext
) {
  const ltJudge = await LTJudgeAPI.getInstance(context);
  const body = JSON.stringify({});
  const res = await ltJudge.session(body);
  const active = res.sessions.find((element: Object) => {
    return element.is_active;
  });
  if (active !== undefined) {
    status.text = `$(vsleet-logo) ${active.name || "anon"} $(issue-closed) `;
    status.text += `${active.ac_questions}/${active.submitted_questions}`;
    status.tooltip = "vsleet Session\n";
    status.tooltip += `ID: ${active.id}\n`;
    status.tooltip += `Accepted: ${active.ac_questions}\n`;
    status.tooltip += `Submitted: ${active.submitted_questions}\n`;
    status.show();
  }
  status.name = "vsleet Session";
  status.show();
}
