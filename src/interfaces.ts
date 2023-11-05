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
  fragment: string;
  title?: string;
  content?: string;
}

export interface QuestionMeta {
  params: Object[];
  name: string;
}

export interface ParsedEditor {
  id: number;
  slug: string;
  code: string;
  fragment: string;
  tests: string;
  testJSON: Object[];
  results: string;
}
