/* eslint-disable curly */

import { createCipheriv } from 'crypto';
import path = require('path');
import * as vscode from 'vscode';

//export const dartCodeExtensionIdentifier = "Dart-Code.dart-code";

export async function activate(context: vscode.ExtensionContext) {

	let subs = context.subscriptions;

	console.log('Congratulations, your extension "dartexformatter" is now active!');

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

		const doc = ev.document;

		let fn = doc.fileName;
		if (path.extname(fn) !== ".dart") return;

		let map = new Map<number, number>();

		let beAddLines: TData[] = [];
		//console.log('reason:' + ev.reason);
		for (let i = 0; i < ev.contentChanges.length; i++) {
			let cc = ev.contentChanges[i];
			let line = doc.lineAt(doc.positionAt(cc.rangeOffset));

			checkAddLine(doc, line, beAddLines, map);

		}


		if (beAddLines.length > 0) {
			new Promise((so, re) => {
				let editor = vscode.window.visibleTextEditors.find(v => v.document.fileName === fn);
				if (editor) {
					addMsCodeStyleAssistComment(editor, beAddLines);
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

	disposable = vscode.commands.registerCommand('dartmscodestyle.deleteAllLineComment', (...args) => {
		//console.log(args);
		if (args && args[0] instanceof vscode.Uri) {
			let uri = args[0] as vscode.Uri;
			let uristr = uri.toString();
			let editor = vscode.window.visibleTextEditors.find(v => v.document.uri.toString() === uristr);
			if (editor) {
				deleteAllLineComment(editor);
			}

		}
		else {
			if (vscode.window.activeTextEditor && vscode.window.activeTextEditor!.document.uri
				&& path.extname(vscode.window.activeTextEditor!.document.uri.fsPath).toLowerCase() === ".dart") {
				deleteAllLineComment(vscode.window.activeTextEditor);
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

function checkNeedAddAssistComment(doc: vscode.TextDocument, line: vscode.TextLine) {
	const text = line.text;
	let b = text.length - line.firstNonWhitespaceCharacterIndex > 1 //长度2 以上
		&& /[{]\s*$/.test(text) //行尾为{
		&& !/\/\//.test(text) //不能是行注释
		&& !/\/\s*[{]\s*$/.test(text) //不能是/ {结尾，排除准备加注释时只打了一个/的问题
		&& (
			isTryFinallyStart(text) || isFunctionLike(doc, line) || isClassBlock(text)
		);

	return b;
}

class TData {
	constructor(public position: vscode.Position,
		public line: vscode.TextLine,
	) {

	}
}

function addMsCodeStyleAssistComment(editor: vscode.TextEditor, beInsert: TData[]) {

	editor.edit(cb => {

		beInsert.forEach(e => {
			let line = e.line;
			cb.insert(e.position
				, "//\n" + line.text.substring(0, line.firstNonWhitespaceCharacterIndex));
		});

	});
}


function addDartMsCodeStyleAssistComment(editor: vscode.TextEditor) {

	let doc = editor.document;
	let lineCount = doc.lineCount;
	let beAddLines: TData[] = [];
	let map = new Map<number, number>();
	for (let i = 0; i < lineCount; i++) {
		let line = doc.lineAt(i);

		checkAddLine(doc, line, beAddLines, map);
	}

	addMsCodeStyleAssistComment(editor, beAddLines);
}

function deleteAllLineComment(editor: vscode.TextEditor) {

	let doc = editor.document;
	let lineCount = doc.lineCount;
	let beDeleteLines: vscode.Range[] = [];
	for (let i = 0; i < lineCount; i++) {
		let line = doc.lineAt(i);
		if (/^\s*\/\//.test(line.text)) {
			beDeleteLines.push(new vscode.Range(new vscode.Position(line.lineNumber, 0), new vscode.Position(line.lineNumber + 1, 0)));
		}
	}

	if (beDeleteLines.length > 0) {

		editor.edit(cb => {

			beDeleteLines.forEach(e => {
				cb.delete(e);
			});

		});
	}

}

//////
//是否为(try|finally){
function isTryFinallyStart(text: string) {
	return /\b(try|finally)\b/ig.test(text);
}
//
function isFunctionLike(doc: vscode.TextDocument, line: vscode.TextLine): boolean {

	let text = line.text;
	let pos = text.length;
	let linePos = line.lineNumber;
	if (/[)]\s*[{]\s*$/.test(text)) {
		for (let i = text.length - 2; i >= line.firstNonWhitespaceCharacterIndex; i--) {
			if (text[i] === ")") {
				pos = i;
				break;
			}
		}

		if (pos < text.length) {	//存在)
			let count = 0;
			let src = pos;
			let b = false;
			for (let i = pos - 1; i >= line.firstNonWhitespaceCharacterIndex; i--) {
				if (text[i] === "(") {
					if (count > 0) { count--; }
					else {
						pos = i;
						b = true;
						break;
					}
				} else if (text[i] === ")") count++;
			}

			if (b) { //存在对称(

			} else { //当前行不存在( 	
				for (let p = linePos - 1; p >= 0; p--) {
					let tline = doc.lineAt(p);
					for (let k = tline.text.length - 1; k >= tline.firstNonWhitespaceCharacterIndex; k--) {
						if (tline.text[k] === "(") {
							if (count > 0) { count--; }
							else {
								pos = k;
								b = true;
								linePos = p;
								break;
							}
						} else if (tline.text[k] === ")") count++;
					}
					if (b) break;
				}
			}

			if (b) {
				if (pos === 0) {
					linePos--;
					if (linePos >= 0) {
						pos = doc.lineAt(linePos).text.length;
					}
				}
				if (linePos >= 0 && /[a-zA-Z_$][a-zA-Z_0-9$]*$/.test(doc.lineAt(linePos).text.substring(0, pos))) {
					return true;
				}
			}
		}
	}
	return false;
}

function isClassBlock(text: string): boolean {
	//class aa extends ......
	//......{
	//对于以上分行的无能为力，涉及到语义的问题

	return /\b(class|extension|abstract)\b/ig.test(text);
}
/**
 * 查找需要增加行的on|catch|finally|while|else
 * @param line 
 * @returns 
 */
function findAddLinePosition(line: vscode.TextLine): Array<TData> {

	let arr: TData[] = [];
	//
	const text = line.text;
	var r = /[}]\s*(on|catch|finally|while|else)/ig;
	for (let a of text.matchAll(r)) {
		arr.push(new TData(new vscode.Position(line.lineNumber, a.index! + 1), line));
	}
	//.forEach((m, i) => m.forEach((v, j) => console.log(`group ${i},${j} : ${v}`)));

	return arr;
}

function checkAddLine(doc: vscode.TextDocument, line: vscode.TextLine, beAddLines: TData[], map: Map<number, number>) {

	if (map.has(line.lineNumber)) return false;

	if (checkNeedAddAssistComment(doc, line)) {
		beAddLines.push(new TData(new vscode.Position(line.lineNumber, line.text.length - 1), line));
		map.set(line.lineNumber, line.lineNumber);
	}
	let pps = findAddLinePosition(line);
	if (pps.length > 0) {
		beAddLines.push(...pps);
	}

}
//////