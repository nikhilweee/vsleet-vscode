import * as vscode from "vscode";

export async function handleStudyPlan(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration();
  const currentStudyPlan = config.get("vsleet.currentStudyPlanSlug", "");
  vscode.window
    .showInputBox({
      placeHolder: "leetcode-75",
      prompt: "Enter the slug for the current study plan",
      title: "Change Active LeetCode Study Plan",
      value: currentStudyPlan,
    })
    .then((value) => {
      if (value) {
        config.update("vsleet.currentStudyPlanSlug", value).then(() => {
          vscode.window.showInformationMessage(
            `Active Study Plan set to ${value}.`
          );
        });
      } else {
        value = undefined;
        config.update("vsleet.currentStudyPlanSlug", value).then(() => {
          vscode.window.showInformationMessage(`Active Study Plan cleared.`);
        });
      }
    });
}
