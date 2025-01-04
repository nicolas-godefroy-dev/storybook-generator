import * as vscode from "vscode";

export async function checkExistingStory(
  storyUri: vscode.Uri,
  languageId: string
) {
  try {
    await vscode.workspace.fs.stat(storyUri);
    const document = await vscode.workspace.openTextDocument(storyUri);
    await vscode.window.showTextDocument(document);

    const answer = await await vscode.window.showQuickPick(["Yes", "No"], {
      canPickMany: false,
      placeHolder:
        "Found an existing stories file, do you want to replace it with a new one?",
    });
    if (answer === "No") {
      return;
    }
    const invalidRange = new vscode.Range(
      0,
      0,
      document.lineCount /*intentionally missing the '-1' */,
      0
    );
    const fullRange = document.validateRange(invalidRange);
    vscode.window.activeTextEditor?.edit((e) => e.replace(fullRange, ""));
  } catch (e) {
    const document = await vscode.workspace.openTextDocument(
      storyUri.with({ scheme: "untitled" })
    );
    await vscode.window.showTextDocument(document);
    vscode.workspace.onDidOpenTextDocument(async (doc) => {
      if (doc === document) {
        await vscode.languages.setTextDocumentLanguage(document, languageId);
      }
    });
  }
}
