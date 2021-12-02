/* eslint-disable curly */

import path = require('path');
import * as vscode from 'vscode';

//export const dartCodeExtensionIdentifier = "Dart-Code.dart-code";

export async function activate(context: vscode.ExtensionContext) {

	let subs = context.subscriptions;

	//console.log('Congratulations, your extension "dartexformatter" is now active!');

	// const dartExt = vscode.extensions.getExtension(dartCodeExtensionIdentifier);
	// if (!dartExt) {
	// 	// This should not happen since the Flutter extension has a dependency on the Dart one
	// 	// but just in case, we'd like to give a useful error message.
	// 	throw new Error("The Dart extension is not installed, flxm extension is unable to activate.");
	// }
	// await dartExt.activate();

	// if (!dartExt.exports) {
	// 	console.error("The Dart extension did not provide an exported API. Maybe it failed to activate?");
	// 	return;
	// }

	let te = vscode.workspace.onDidChangeTextDocument(async (ev) => {
		if (ev.reason) return; //修复撤销问题
		let fn = ev.document.fileName;
		let beSetLines: number[] = [];
		//console.log('reason:' + ev.reason);
		ev.contentChanges.forEach(cc => {
			let line = ev.document.lineAt(ev.document.positionAt(cc.rangeOffset));
			if (checkNeedAddAssistComment(line)) {
				beSetLines.push(line.lineNumber);
			}
		});

		if (beSetLines.length > 0) {
			new Promise((so, re) => {
				let editor = vscode.window.visibleTextEditors.find(v => v.document.fileName === fn);
				if (editor) {
					addMsCodeStyleAssistComment(editor, beSetLines);
				}
			});
		}

	});
	subs.push(te);


	let disposable = vscode.commands.registerCommand('dartmscodestyle.addcodestylecomment', (...args) => {
		//console.log(args);
		if (args && args[0] instanceof vscode.Uri) {
			let uri = args[0] as vscode.Uri;
			let uristr = uri.toString();
			let editor = vscode.window.visibleTextEditors.find(v => v.document.uri.toString() === uristr);
			if (editor) {
				addDartMsCodeStyleAssistComment(editor);
			}

		}
		else {
			if (vscode.window.activeTextEditor && vscode.window.activeTextEditor!.document.uri
				&& path.extname(vscode.window.activeTextEditor!.document.uri.fsPath).toLowerCase() === ".dart") {
				addDartMsCodeStyleAssistComment(vscode.window.activeTextEditor);
			}
		}

	});

	subs.push(disposable);
}

export function deactivate() { }

function checkNeedAddAssistComment(line: vscode.TextLine) {
	return (line.firstNonWhitespaceCharacterIndex < 4
		|| /\b(while|for)\b/ig.test(line.text))
		&& line.text.charAt(line.text.length - 1) === '{'
		&& line.text.length - line.firstNonWhitespaceCharacterIndex > 1;
}


function addMsCodeStyleAssistComment(editor: vscode.TextEditor, beSetLines: number[]) {
	let doc = editor.document;
	editor.edit(cb => {

		beSetLines.forEach(e => {
			let line = doc.lineAt(e);

			if (line.text.charAt(line.text.length - 1) === '{' && line.text.length > 1) {

				let lastSecondChar = line.text.charAt(line.text.length - 2);
				if (/\b(while|for)\b/ig.test(line.text)
					|| line.firstNonWhitespaceCharacterIndex < 2) {
					cb.insert(new vscode.Position(line.lineNumber, line.text.length - 1)
						, (lastSecondChar === " " ? "" : " ") + "//\n" + line.text.substring(0, line.firstNonWhitespaceCharacterIndex));
				}
				else if (line.firstNonWhitespaceCharacterIndex < 4) {
					let isClass = true;
					for (let i = line.lineNumber - 1; i >= 0; i--) {
						let nline = doc.lineAt(i);
						if (nline.firstNonWhitespaceCharacterIndex === 0
							&& !nline.isEmptyOrWhitespace
							&& nline.text.substring(nline.firstNonWhitespaceCharacterIndex, 1) !== '{') {
							//console.log('line ' + i + ":" + nline.text);
							if (!/\bclass\b/ig.test(nline.text)) {
								isClass = false;
							}
							break;
						}
					}
					if (isClass) {
						cb.insert(new vscode.Position(line.lineNumber, line.text.length - 1)
							, (lastSecondChar === " " ? "" : " ") + "//\n" + line.text.substring(0, line.firstNonWhitespaceCharacterIndex));
					}
				}
			}

		});
	});
}


function addDartMsCodeStyleAssistComment(editor: vscode.TextEditor) {

	let doc = editor.document;
	let lineCount = doc.lineCount;
	let beSetLines: number[] = [];
	for (let i = 0; i < lineCount; i++) {
		let line = doc.lineAt(i);
		if (checkNeedAddAssistComment(line)) {
			beSetLines.push(i);
		}
	}
	addMsCodeStyleAssistComment(editor, beSetLines);
}

