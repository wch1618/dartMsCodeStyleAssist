/* eslint-disable curly */

import path = require('path');
import * as vscode from 'vscode';
import { DocumentSemanticTokensProvider } from './semantic_provider';

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
		if (path.extname(fn) !== ".dart") return;

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

	//以下功能有问题
	// const semanProvider = new DocumentSemanticTokensProvider();

	// const selectorLanguage = 'dart';
	// const selector: vscode.DocumentFilter[] = [{ language: selectorLanguage, scheme: "file" }];

	// subs.push(vscode.languages.registerDocumentSemanticTokensProvider(selector, semanProvider, semanProvider.legend));
}

export function deactivate() { }

//while|for|if|else|try|catch|final|do|while|class|extension

function checkNeedAddAssistComment(line: vscode.TextLine) {
	const text = line.text;
	return (line.firstNonWhitespaceCharacterIndex < 4
		|| /\b(class|extension|abstract)\b/.test(line.text))
		&& text.charAt(text.length - 1) === '{' //行尾为{
		&& text.length - line.firstNonWhitespaceCharacterIndex > 1 //长度2 以上
		&& !/\s*\/\//.test(text) //不能是注释//开头
		&& !/\/\s*{$/.test(text) //不能是/ {结尾，排除准备加注释时只打了一个/的问题
		&& text.indexOf('=') < 0
		;
}


function addMsCodeStyleAssistComment(editor: vscode.TextEditor, beSetLines: number[]) {
	let doc = editor.document;
	editor.edit(cb => {

		beSetLines.forEach(e => {
			let line = doc.lineAt(e);

			const text = line.text;
			if (text.charAt(text.length - 1) === '{' //行尾为{
				&& text.length > 1) {

				let lastSecondChar = text.charAt(text.length - 2);
				if (/\b(class|extension|abstract)\b/ig.test(text)
					|| line.firstNonWhitespaceCharacterIndex < 2) {
					cb.insert(new vscode.Position(line.lineNumber, text.length - 1)
						, (lastSecondChar === " " ? "" : " ") + "//\n" + text.substring(0, line.firstNonWhitespaceCharacterIndex));
				}
				else if (line.firstNonWhitespaceCharacterIndex < 4) {

					let isClass = true;
					if(text.indexOf('=') >= 0){
						isClass = false;
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

