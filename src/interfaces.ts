export interface Object {
  [key: string]: string;
}

export interface Snippet {
  langSlug: string;
  code: string;
}

export interface Question {
  frontendQuestionId: string;
  acRate: number;
  titleSlug: string;
  paidOnly: boolean;
  title: string;
  difficulty: string;
  status: string;
}

export interface QuestionMeta {
  params: Object[];
  name: string;
}

export interface ParsedEditor {
  id: number;
  slug: string;
  code: string;
  testStr: string;
  testJSON: Object[];
  results: string;
}
