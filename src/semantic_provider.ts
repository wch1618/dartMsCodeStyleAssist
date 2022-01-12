import * as vscode from 'vscode';


const tokenTypes = ['emptycomment'];
const tokenModifiers = ['documentation'];


export class DocumentSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {

	legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
	tokenTypesMap = new Map<string, number>();
	tokenModifiersMap = new Map<string, number>();

	idxDocumentation: number;
	idxEmptyCommentType: number;


	constructor() {
		tokenTypes.forEach((tokenType, index) => this.tokenTypesMap.set(tokenType, index));
		tokenModifiers.forEach((tokenModifier, index) => this.tokenModifiersMap.set(tokenModifier, index));

		this.idxDocumentation = this.tokenModifiersMap.get('documentation')!;

		this.idxEmptyCommentType = this.tokenTypesMap.get('emptycomment')!;

	}

	public async provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken)
		: Promise<vscode.SemanticTokens> {

		const tokensBuilder = new vscode.SemanticTokensBuilder(this.legend);

		const lineCount = document.lineCount;
		for(let i = 0; i < lineCount; i++){
			const line = document.lineAt(i);
			const text = line.text;
			
			let r = text.search(/\/(\/)+\s*$/);

			if(r > -1){

				tokensBuilder.push(i, r, text.length - r, this.idxEmptyCommentType, this.idxDocumentation);
				console.log('add empty comment:' + (i + 1) + ":" + text.substring(r));
			}
		}

		return tokensBuilder.build();
	}


	// async buildTokensBy(tokensBuilder: vscode.SemanticTokensBuilder, document: vscode.TextDocument, token: vscode.CancellationToken) {

	// 	if (token.isCancellationRequested) return;

	// 	let flxmuri = document.uri.toString();

	// 	let data = this.someData.getOrCreateFlxmData(flxmuri, document.fileName, () => document.getText());
	// 	let cvtresult = await data.getSyntaxResult(token);
		
	// 	if (token.isCancellationRequested) return;

	// 	let pc = cvtresult.pc;
	// 	let fcm = cvtresult.fcm.codeSplitter;

	// 	for (let defs of cvtresult.defs) {
	// 		for (let def of defs) {

	// 			let pos = pc.getPosition(def.start);
	// 			let len;

	// 			if (def.end < 0) {
	// 				len = 1;
	// 			}
	// 			else {
	// 				len = def.end - def.start;
	// 			}

	// 			if (def.type == DefBaseType.clazz) {
	// 				tokensBuilder.push(pos.line, pos.character, len, this.idxClassType, this.idxDeclaration);
	// 			}
	// 			else {
	// 				tokensBuilder.push(pos.line, pos.character, len, this.idxPropertyType, this.idxDeclaration);
	// 				if (def.type == DefBaseType.property) {
	// 					let pro = <PropertyDef>def;

	// 					for (let pp of pro.lessGraterThans) {
	// 						pos = pc.getPosition(pp);
	// 						tokensBuilder.push(pos.line, pos.character, 1, this.idxOpType, this.idxDocumentation);
	// 					}
	// 				}
	// 			}
	// 		}
	// 	}

	// 	for (let cb of fcm.comments) {
	// 		let pos = pc.getPosition(cb.pos);
	// 		tokensBuilder.push(pos.line, pos.character, cb.code.length, this.idxCommentType, this.idxDocumentation);
	// 	}

	// 	for (let cb of fcm.strs) {
	// 		let pos = pc.getPosition(cb.pos);
	// 		tokensBuilder.push(pos.line, pos.character, cb.code.length, this.idxStringType, this.idxDocumentation);
	// 	}

	// }
}