import * as vscode from "vscode";
import { LTJudgeAPI } from "./api/judge";
import { Object } from "./interfaces";
import { stat } from "fs";

export async function updateStatusBar(
  context: vscode.ExtensionContext,
  status: vscode.StatusBarItem
) {
  status.name = "vsleet Session";
  status.command = "vsleet.session";
  status.show();
  const ltJudge = await LTJudgeAPI.getInstance(context);
  const body = JSON.stringify({});
  const res = await ltJudge.session(body);
  const active = res.sessions.find((session: Object) => {
    return session.is_active;
  });
  if (active !== undefined) {
    status.text = `$(vsleet-logo) ${active.name || "anonymous"} `;
    status.text += `${active.ac_questions}:${active.total_acs}`;
    status.tooltip =
      "vsleet Session\n" +
      `ID: ${active.id}\n` +
      `Name: ${active.name || "anonymous"}\n` +
      `Questions: ${active.ac_questions}/${active.submitted_questions}\n` +
      `Submissions: ${active.total_acs}/${active.total_submitted}\n`;
    status.show();
  }
}

export async function handleSession(
  context: vscode.ExtensionContext,
  status: vscode.StatusBarItem
) {
  const ltJudge = await LTJudgeAPI.getInstance(context);
  const body = JSON.stringify({});
  const res = await ltJudge.session(body);
  const input = vscode.window.createQuickPick();
  input.title = "Change Active LeetCode Session";
  input.items = res.sessions.map((session: Object) => {
    const item: vscode.QuickPickItem = {
      label: session.name || "anonymous",
      description: session.id.toString(),
      detail:
        `Questions: ${session.ac_questions}/${session.submitted_questions} ` +
        `Submissions: ${session.total_acs}/${session.total_submitted}`,
    };
    return item;
  });

  const activeIndex = res.sessions.findIndex(
    (session: Object) => session.is_active
  );
  if (activeIndex > -1) {
    input.activeItems = [input.items[activeIndex]];
  }

  input.onDidAccept(async () => {
    const [activeItem] = input.activeItems;
    if (activeItem.description) {
      const body = JSON.stringify({
        func: "activate",
        target: parseInt(activeItem.description),
      });
      ltJudge.session(body).then(() => {
        input.hide();
        updateStatusBar(context, status);
      });
    }
  });
  input.show();
}
