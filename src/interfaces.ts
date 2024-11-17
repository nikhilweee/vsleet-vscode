export interface Object {
  [key: string]: string;
}

export interface Snippet {
  langSlug: string;
  code: string;
}

export interface Question {
  frontendQuestionId: string;
  backendQuestionId: string;
  acRate: number;
  titleSlug: string;
  paidOnly: boolean;
  title: string;
  difficulty: string;
  status: string;
}

export interface QuestionDisplay {
  id: string;
  slug: string;
  queryString: string;
  title?: string;
  content?: string;
}

export interface QuestionMeta {
  params: Object[];
  name: string;
  classname?: string;
  methods?: { params: Object[]; name: string }[];
}

export interface ParsedEditor {
  problemId: number;
  slug: string;
  code: string;
  tests: string;
  testJSON: Object[];
  results: string;
}

export interface SolutionPayload {
  lang: string;
  question_id: number;
  typed_code: string;
  study_plan_slug?: string;
}

export type TestCase = [string, string[]];
