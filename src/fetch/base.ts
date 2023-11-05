import * as vscode from "vscode";
import { Question } from "../interfaces";

export class ProblemItem implements vscode.QuickPickItem {
  // Inherited attributes
  description: string;
  label: string;
  detail: string;
  // Custom attributes
  id: string;
  slug: string;
  title: string;

  constructor(question: Question) {
    this.description = "";
    // Set label
    this.id = question.frontendQuestionId.padStart(4, "0");
    this.slug = question.titleSlug;
    this.title = `[${this.id}] ${question.title}`;
    this.label = this.title;
    // Set detail
    const price = question.paidOnly ? "Premium" : "Free";
    const acceptance = question.acRate.toFixed(3);
    this.detail = `Tier: ${price} | Difficulty: ${question.difficulty} | AC: ${acceptance}%`;
    this.detail += ``;
    switch (question.status) {
      case "ac":
        this.detail += ` | Status: Accepted`;
        this.label += ` $(issue-closed)`;
        break;
      case "notac":
        this.detail += ` | Status: Attempted`;
        this.label += ` $(issue-opened)`;
        break;
      case null:
        break;
    }
  }
}
