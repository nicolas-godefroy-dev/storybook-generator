import * as vscode from "vscode";
import * as path from "path";
import { createStoryFromTs } from "./helpers/createStoryFromTs";

export async function createStory(componentUri: vscode.Uri) {
  const dirname = path.dirname(componentUri.fsPath);
  const basename = path.basename(componentUri.fsPath);
  const storyname = basename.replace(/.(t|j)sx?/, ".stories.$1sx");
  const storyUri = vscode.Uri.parse(path.join(dirname, storyname));

  createStoryFromTs(componentUri.fsPath, storyUri, path.parse(basename).name);
}
