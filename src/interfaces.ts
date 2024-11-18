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
  envType: string;
  envId: string;
  slug: string;
  code: string;
  tests: string;
  testJSON: Object[];
  results: string;
}

/* eslint-disable @typescript-eslint/naming-convention */

export interface SolutionPayload {
  /** The language of the current solution */
  lang: string;
  /** The problemId of the current solution */
  question_id: number;
  /** The code representing the current solution */
  typed_code: string;
  /** The envId of the problem list */
  favourite_slug?: string;
  /** The envId of the study plan */
  study_plan_slug?: string;
}

/* eslint-enable @typescript-eslint/naming-convention */

export type TestCase = [string, string[]];
