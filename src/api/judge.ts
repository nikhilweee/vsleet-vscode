/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { Object } from "../interfaces";

export class LTJudgeAPI {
  private cookie = "";
  private static instance: LTJudgeAPI;

  public static async getInstance(context: vscode.ExtensionContext) {
    if (!LTJudgeAPI.instance) {
      LTJudgeAPI.instance = new LTJudgeAPI();
    }
    const cookie = await context.secrets.get("cookie");
    if (cookie) {
      LTJudgeAPI.instance.cookie = cookie;
    }
    return LTJudgeAPI.instance;
  }

  async checkStatus(checkId: string, slug: string) {
    const url = `https://leetcode.com/submissions/detail/${checkId}/check/`;
    const headers = { referer: `https://leetcode.com/problems/${slug}/` };
    return this.judgeAPICall(url, headers, null);
  }

  async submitSolution(id: number, slug: string, code: string) {
    const body = JSON.stringify({
      lang: "python3",
      question_id: id,
      typed_code: code,
    });

    const url = `https://leetcode.com/problems/${slug}/submit/`;
    const headers = { referer: `https://leetcode.com/problems/${slug}/` };
    return this.judgeAPICall(url, headers, body);
  }

  async runSolution(id: number, slug: string, code: string, tests: string) {
    const body = JSON.stringify({
      data_input: tests,
      lang: "python3",
      question_id: id,
      typed_code: code,
    });

    const url = `https://leetcode.com/problems/${slug}/interpret_solution/`;
    const headers = { referer: `https://leetcode.com/problems/${slug}/` };
    return this.judgeAPICall(url, headers, body);
  }

  async session(body: string) {
    const url = `https://leetcode.com/session/`;
    const headers = {
      "x-requested-with": "XMLHttpRequest",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/118.0.0.0 Safari/537.36",
    };
    const method = body === "{}" ? "POST" : "PUT";
    return this.judgeAPICall(url, headers, body, method);
  }

  async prepareHeaders(incomingHeaders: Object) {
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
      "x-csrftoken": csrftoken,
      cookie: this.cookie,
      ...incomingHeaders,
    };

    return headers;
  }

  async judgeAPICall(
    url: string,
    headers: Object,
    body: string | null,
    method = "POST"
  ): Promise<any> {
    const csrfHeaders = await this.prepareHeaders(headers);
    const res = await fetch(url, {
      headers: csrfHeaders,
      body: body,
      method: method,
      credentials: "same-origin",
    });
    // Use this for debugging.
    // res.text().then((data) => console.log(data));
    return res.json();
  }
}
