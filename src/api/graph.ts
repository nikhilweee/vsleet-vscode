/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { Object } from "../interfaces";

export class LTGraphAPI {
  private cookie = "";
  private static instance: LTGraphAPI;

  public static async getInstance(context: vscode.ExtensionContext) {
    if (!LTGraphAPI.instance) {
      LTGraphAPI.instance = new LTGraphAPI();
    }
    const cookie = await context.secrets.get("cookie");
    if (cookie) {
      LTGraphAPI.instance.cookie = cookie;
    }
    return LTGraphAPI.instance;
  }

  async searchProblems(keywords: string) {
    const query = `
      query problemsetQuestionList(
        $categorySlug: String
        $limit: Int
        $skip: Int
        $filters: QuestionListFilterInput
      ) {
        problemsetQuestionList: questionList(
          categorySlug: $categorySlug
          limit: $limit
          skip: $skip
          filters: $filters
        ) {
          total: totalNum
          questions: data {
            acRate
            difficulty
            backendQuestionId: questionId
            frontendQuestionId: questionFrontendId
            paidOnly: isPaidOnly
            status
            title
            titleSlug
          }
        }
      }`;

    const variables = {
      categorySlug: "",
      skip: 0,
      limit: 20,
      filters: { searchKeywords: keywords },
    };

    return this.graphAPICall(query, variables);
  }

  async fetchTitle(slug: string) {
    const query = `
      query questionTitle($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          backendQuestionId: questionId
          frontendQuestionId: questionFrontendId
          title
          titleSlug
          isPaidOnly
          difficulty
          likes
          dislikes
          categoryTitle
        }
      }`;

    const variables = {
      titleSlug: slug,
    };
    return this.graphAPICall(query, variables);
  }

  async fetchContent(slug: string) {
    const query = `
      query questionContent($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          content
          mysqlSchemas
          dataSchemas
        }
      }`;

    const variables = {
      titleSlug: slug,
    };
    return this.graphAPICall(query, variables);
  }

  async fetchEditor(slug: string) {
    const query = `
      query questionEditorData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          questionFrontendId
          codeSnippets {
            lang
            langSlug
            code
          }
          envInfo
          enableRunCode
          hasFrontendPreview
          frontendPreviews
        }
      }`;

    const variables = {
      titleSlug: slug,
    };
    return this.graphAPICall(query, variables);
  }

  async fetchTests(slug: string) {
    const query = `
      query consolePanelConfig($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          backendQuestionId: questionId
          frontendQuestionId: questionFrontendId
          questionTitle
          enableDebugger
          enableRunCode
          enableSubmit
          enableTestMode
          exampleTestcaseList
          metaData
        }
      }`;
    const variables = {
      titleSlug: slug,
    };
    return this.graphAPICall(query, variables);
  }

  async fetchGlobalData() {
    const query = `
      query globalData {
        userStatus {
          userId
          isSignedIn
          isMockUser
          isPremium
          isVerified
          username
          realName
          avatar
          isAdmin
          isSuperuser
          permissions
          isTranslator
          activeSessionId
        }
      }`;

    const variables = {};
    return this.graphAPICall(query, variables);
  }

  async prepareHeaders() {
    let headers: Object;
    let csrftoken = "";

    headers = {
      "content-type": "application/json",
    };

    if (this.cookie) {
      let token = this.cookie.split(";").find((element) => {
        return element.split("=").shift() === "csrftoken";
      });
      csrftoken = token?.split("=").pop() || "";
    }

    if (csrftoken) {
      headers["x-csrftoken"] = csrftoken;
      headers["cookie"] = this.cookie;
    }

    return headers;
  }

  async graphAPICall(query: string, variables: object): Promise<any> {
    const res = await fetch("https://leetcode.com/graphql/", {
      headers: await this.prepareHeaders(),
      body: JSON.stringify({
        query: query,
        variables: variables,
      }),
      method: "POST",
    });
    return res.json();
  }
}
