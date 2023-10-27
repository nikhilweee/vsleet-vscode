import * as vscode from "vscode";

export function getCssUri(): [vscode.Uri, vscode.Uri[]] {
  let cssUri = vscode.Uri.from({
    scheme: "https",
    authority: "raw.githubusercontent.com",
    path:
      "microsoft/vscode/main/extensions/" +
      "markdown-language-features/media/markdown.css",
  });
  const localResourceRoots: vscode.Uri[] = [];
  const markdownExtension = vscode.extensions.getExtension(
    "vscode.markdown-language-features"
  );
  if (markdownExtension) {
    cssUri = vscode.Uri.joinPath(
      markdownExtension.extensionUri,
      "media",
      "markdown.css"
    );
    const cssRoot = vscode.Uri.joinPath(
      markdownExtension.extensionUri,
      "media"
    );
    localResourceRoots.push(cssRoot);
  }
  return [cssUri, localResourceRoots];
}
