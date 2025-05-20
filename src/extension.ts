"use strict";

import * as vscode from "vscode";
import { PreviewSidebarViewProvider } from "./previewer-sidebar";

export function activate(context: vscode.ExtensionContext) {
  console.log("Extension activated");

  const previewSidebarViewProvider = new PreviewSidebarViewProvider(context.extensionUri);

  // Adding sidebar view, for the previews.
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PreviewSidebarViewProvider.viewType,
      previewSidebarViewProvider
    )
  );

  // Adding onchange event to the active editor, so we could get the text
  // block and send to the preview afterward.
  let previewDebounceTimer: NodeJS.Timeout | undefined;
  vscode.window.onDidChangeTextEditorSelection(
    (event) => {
      if (event === undefined) {
        return;
      }

      let activeTextEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
      if (!activeTextEditor) {
        return;
      }

      // Clear the previous timer, if it exists.
      if (previewDebounceTimer) {
        clearTimeout(previewDebounceTimer);
      }

      // Await a few miliseconds before sending the preview to the sidebar.
      previewDebounceTimer = setTimeout(() => {
        // Getting additional info from the current cursor.
        let selection = event.selections[0];
        let currentLine = selection.start.line;

        // Recursive function that gets all previous characters from the current line,
        // until it finds a line that ends with an open brace.
        const readPreviousCharsUntilOpenBrace = (textEditor: vscode.TextEditor, line: number) => {
          const previousLineRange = new vscode.Range(line - 1, 0, line, 0);
          let text = textEditor.document.getText(previousLineRange);
          if (!text.trim().endsWith('{')) {
            text = readPreviousCharsUntilOpenBrace(textEditor, line - 1) + text;
          }
          return text;
        };

        // Recursive function that gets all next characters from the current line,
        // until it finds a line that ends with an close brace.
        const readNextCharsUntilCloseBrace = (textEditor: vscode.TextEditor, line: number) => {
          const currentLineRange = new vscode.Range(line, 0, line + 1, 0);
          let text = textEditor.document.getText(currentLineRange);
          if (!text.trim().endsWith('}')) {
            text += readNextCharsUntilCloseBrace(textEditor, line + 1);
          }
          return text;
        }

        // Gets the entire text block from the current line, by using the two
        // recursive functions above.
        const getTextBlock = (textEditor: vscode.TextEditor, line: number) => {
          const previousCharsUntilOpenBrace = readPreviousCharsUntilOpenBrace(textEditor, line);
          const nextCharsUntilCloseBrace = readNextCharsUntilCloseBrace(textEditor, line);
          return previousCharsUntilOpenBrace + nextCharsUntilCloseBrace;
        }

        // Extracts all text blocks (without any script tags), from an
        // entire text block.
        const extractTextBlocks = (text: string) => {
          const textBlocks: any = [];
          let i: number = 0;
          let lineHasThreeQuotes = false;

          textBlockSelection.split('\n').forEach((line) => {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('"') && trimmedLine.endsWith('"') && trimmedLine.length > 3) {
              if (typeof textBlocks[i] == 'undefined') textBlocks[i] = '';
              textBlocks[i] += trimmedLine.replaceAll('"', '');
            }

            if (trimmedLine.startsWith('"""')) {
              lineHasThreeQuotes = !lineHasThreeQuotes;
              return; // Continue to next iteration.
            }
            if (lineHasThreeQuotes) {
              if (typeof textBlocks[i] == 'undefined') textBlocks[i] = '';
              textBlocks[i] += trimmedLine + '\n';
            }

            if (trimmedLine.includes('clearMsg')) i++;
          });

          for(const i in textBlocks) {
            textBlocks[i] = textBlocks[i].trimEnd();
          }
          return textBlocks;
        }

        // Getting all text block, between braces (including tags).
        const textBlockSelection = getTextBlock(activeTextEditor as vscode.TextEditor, currentLine);

        // Extracting, from the selection above, all text blocks without the tags.
        const textBlocks = extractTextBlocks(textBlockSelection);

        // Previewing the extracted text blocks.
        previewSidebarViewProvider.setPreview(textBlocks);
      }, 250);
    },
    null,
    context.subscriptions
  );
}

// This method is called when your extension is deactivated.
export function deactivate() {}