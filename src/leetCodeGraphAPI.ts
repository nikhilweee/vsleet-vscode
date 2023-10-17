export class LeetCodeGraphAPI {
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
      limit: 5,
      filters: { searchKeywords: keywords },
    };

    return this.graphAPICall(query, variables);
  }

  async fetchProblem(slug: string) {
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
          questionId
          questionFrontendId
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

  async graphAPICall(query: string, variables: object): Promise<any> {
    const res = await fetch("https://leetcode.com/graphql/", {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: query,
        variables: variables,
      }),
      method: "POST",
    });
    return res.json();
  }
}
