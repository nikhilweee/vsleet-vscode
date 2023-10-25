/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";

export class LTJudgeAPI {
  private cookie = "";

  private static instance: LTJudgeAPI;

  public static async getInstance(context: vscode.ExtensionContext) {
    if (!LTJudgeAPI.instance) {
      LTJudgeAPI.instance = new LTJudgeAPI();
      // Set cookie for a new instance
      const cookie = await context.secrets.get("cookie");
      if (cookie) {
        LTJudgeAPI.instance.cookie = cookie;
      }
    }
    return LTJudgeAPI.instance;
  }

  async checkStatus(checkId: string, slug: string) {
    const url = `https://leetcode.com/submissions/detail/${checkId}/check/`;

    return this.judgeAPICall(url, slug, null);
  }

  async submitSolution(id: number, slug: string, code: string) {
    const body = JSON.stringify({
      lang: "python3",
      question_id: id,
      typed_code: code,
    });

    const url = `https://leetcode.com/problems/${slug}/submit/`;

    return this.judgeAPICall(url, slug, body);
  }

  async runSolution(id: number, slug: string, code: string, tests: string) {
    const body = JSON.stringify({
      data_input: tests,
      lang: "python3",
      question_id: id,
      typed_code: code,
    });

    const url = `https://leetcode.com/problems/${slug}/interpret_solution/`;

    return this.judgeAPICall(url, slug, body);
  }

  async prepareHeaders(slug: string) {
    let csrftoken = "";

    let token = this.cookie.split(";").find((element) => {
      return element.split("=").shift() === "csrftoken";
    });
    csrftoken = token?.split("=").pop() || "";

    // Show error if cookie not found
    if (!csrftoken) {
      const message = "Session cookie not found.";
      const selected = await vscode.window.showErrorMessage(
        message,
        "Paste Cookie"
      );
      if (selected) {
        vscode.commands.executeCommand("vsleet.login");
      }
      throw new Error("Missing Cookies");
    }

    const headers = {
      "content-type": "application/json",
      referer: `https://leetcode.com/problems/${slug}/`,
      "x-csrftoken": csrftoken,
      cookie: this.cookie,
    };

    return headers;
  }

  async judgeAPICall(
    url: string,
    slug: string,
    body: string | null
  ): Promise<any> {
    const res = await fetch(url, {
      headers: await this.prepareHeaders(slug),
      body: body,
      method: "POST",
      credentials: "same-origin",
    });
    return res.json();
  }
}
