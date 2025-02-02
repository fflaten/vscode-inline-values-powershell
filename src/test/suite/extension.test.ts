import * as assert from 'assert';

import * as vscode from 'vscode';
import { PowerShellVariableInlineValuesProvider } from '../../powerShellVariableInlineValuesProvider';

suite('Variable detection', async () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Misc variable tests', async () => {
		const doc = await vscode.workspace.openTextDocument({
			language: 'powershell',
			content: `
$normal = Get-Process
$script:scoped = 5
$numb3rInside = 'asdf'
$33333 = 'numbers'
$normal, \${braces}, $script:scoped
4
`,
		});

		const provider = new PowerShellVariableInlineValuesProvider();

		const result = await provider.provideInlineValues(doc, new vscode.Range(0, 0, 0, 0), {
			stoppedLocation: new vscode.Range(doc.lineCount - 1, 0, doc.lineCount - 1, 0),
			frameId: 0
		});

		assert.strictEqual(result?.length, 7);
		for (let i = 0; i < result.length; i++) {
			const variable = result![i] as vscode.InlineValueVariableLookup;

			let name: string = '';
			let startChar: number = 0;
			let line: number = i + 1;
			switch (i) {
				case 0:
					name = '$normal';
					break;
				case 1:
					name = '$scoped';
					break;
				case 2:
					name = '$numb3rInside';
					break;
				case 3:
					name = '$33333';
					break;
				case 4:
					name = '$normal';
					break;
				case 5:
					name = '$braces';
					startChar = 9;
					line = 5;
					break;
				case 6:
					name = '$scoped';
					startChar = 20;
					line = 5;
					break;
			}

			assert.strictEqual(variable.caseSensitiveLookup, false);
			assert.strictEqual(variable.range.start.line, line);
			assert.strictEqual(variable.range.end.line, line);
			assert.strictEqual(variable.range.start.character, startChar);
			assert.strictEqual(variable.variableName, name);
			assert.strictEqual(variable.range.end.character, name.length + startChar);
		}
	});

	test('Known constants ignored', async () => {
		const doc = await vscode.workspace.openTextDocument({
			language: 'powershell',
			content: '$false $true $null $123',
		});

		const provider = new PowerShellVariableInlineValuesProvider();

		const result = await provider.provideInlineValues(doc, new vscode.Range(0, 0, 0, 0), {
			stoppedLocation: new vscode.Range(doc.lineCount - 1, 0, doc.lineCount - 1, 0),
			frameId: 0
		});

		assert.strictEqual(result?.length, 1);

		// Making sure the test actually ran by including a real variable
		const variable = result![0] as vscode.InlineValueVariableLookup;
		assert.strictEqual(variable.caseSensitiveLookup, false);
		assert.strictEqual(variable.range.start.line, 0);
		assert.strictEqual(variable.range.end.line, 0);
		assert.strictEqual(variable.range.start.character, 19);
		assert.strictEqual(variable.variableName, '$123');
		assert.strictEqual(variable.range.end.character, (19 + 4));
	});

	test('Alphanumerical variables', async () => {
		const doc = await vscode.workspace.openTextDocument({
			language: 'powershell',
			content: `
$normal = Get-Process
$numb3rInside = 'asdf'
$33333 = 'numbers'
$something_wrong? = 123
4
`,
		});

		const provider = new PowerShellVariableInlineValuesProvider();

		const result = await provider.provideInlineValues(doc, new vscode.Range(0, 0, 0, 0), {
			stoppedLocation: new vscode.Range(doc.lineCount - 1, 0, doc.lineCount - 1, 0),
			frameId: 0
		});

		assert.strictEqual(result?.length, 4);
		for (let i = 0; i < result.length; i++) {
			const variable = result![i] as vscode.InlineValueVariableLookup;

			let name: string = '';
			let startChar: number = 0;
			let line: number = i + 1;
			switch (i) {
				case 0:
					name = '$normal';
					break;
				case 1:
					name = '$numb3rInside';
					break;
				case 2:
					name = '$33333';
					break;
				case 3:
					name = '$something_wrong?';
					break;
			}

			assert.strictEqual(variable.caseSensitiveLookup, false);
			assert.strictEqual(variable.range.start.line, line);
			assert.strictEqual(variable.range.end.line, line);
			assert.strictEqual(variable.range.start.character, startChar);
			assert.strictEqual(variable.variableName, name);
			assert.strictEqual(variable.range.end.character, name.length + startChar);
		}
	});

	test('Scoped variables', async () => {
		const doc = await vscode.workspace.openTextDocument({
			language: 'powershell',
			content: `
$script:scoped = 5
$global:scoped = 5
$local:scoped = 5
$using:scoped = 5
$private:scoped = 5
$variable:scoped = 5
\${Script:special scoped}
$invalidscope:notdetected = 123
4
`,
		});

		const provider = new PowerShellVariableInlineValuesProvider();

		const result = await provider.provideInlineValues(doc, new vscode.Range(0, 0, 0, 0), {
			stoppedLocation: new vscode.Range(doc.lineCount - 1, 0, doc.lineCount - 1, 0),
			frameId: 0
		});

		assert.strictEqual(result?.length, 7);
		for (let i = 0; i < result.length; i++) {
			const variable = result![i] as vscode.InlineValueVariableLookup;

			let name: string = '';
			let startChar: number = 0;
			let line: number = i + 1;
			switch (i) {
				case 0:
					name = '$scoped';
					break;
				case 1:
					name = '$scoped';
					break;
				case 2:
					name = '$scoped';
					break;
				case 3:
					name = '$scoped';
					break;
				case 4:
					name = '$scoped';
					break;
				case 5:
					name = '$scoped';
					break;
				case 6:
					name = '$special scoped';
					break;
			}

			assert.strictEqual(variable.caseSensitiveLookup, false);
			assert.strictEqual(variable.range.start.line, line);
			assert.strictEqual(variable.range.end.line, line);
			assert.strictEqual(variable.range.start.character, startChar);
			assert.strictEqual(variable.variableName, name);
			assert.strictEqual(variable.range.end.character, name.length + startChar);
		}
	});

	test('Special character variables', async () => {
		const doc = await vscode.workspace.openTextDocument({
			language: 'powershell',
			content: `
\${hello\`\`b}
\${braces} = "asdf"
\${     } = 'spaces'
\${Script:omg\`b}
\${bra%!c\\e\`}<s} = 'special'
`,
		});

		const provider = new PowerShellVariableInlineValuesProvider();

		const result = await provider.provideInlineValues(doc, new vscode.Range(0, 0, 0, 0), {
			stoppedLocation: new vscode.Range(doc.lineCount - 1, 0, doc.lineCount - 1, 0),
			frameId: 0
		});

		assert.strictEqual(result?.length, 5);
		for (let i = 0; i < result.length; i++) {
			const variable = result![i] as vscode.InlineValueVariableLookup;

			let name: string = '';
			let startChar: number = 0;
			let line: number = i + 1;
			switch (i) {
				case 0:
					name = '$hello`b';
					break;
				case 1:
					name = '$braces';
					break;
				case 2:
					name = '$     ';
					break;
				case 3:
					name = '$omgb';
					break;
				case 4:
					name = '$bra%!c\\e}<s';
					break;
			}

			assert.strictEqual(variable.caseSensitiveLookup, false);
			assert.strictEqual(variable.range.start.line, line);
			assert.strictEqual(variable.range.end.line, line);
			assert.strictEqual(variable.range.start.character, startChar);
			assert.strictEqual(variable.variableName, name);
			assert.strictEqual(variable.range.end.character, name.length + startChar);
		}
	});

	test('Special character variables in scriptblock', async () => {
		const doc = await vscode.workspace.openTextDocument({
			language: 'powershell',
			content: `$sb = {\${hello \`{ \`} world}}`,
		});

		const provider = new PowerShellVariableInlineValuesProvider();

		const result = await provider.provideInlineValues(doc, new vscode.Range(0, 0, 0, 0), {
			stoppedLocation: new vscode.Range(doc.lineCount - 1, 0, doc.lineCount - 1, 0),
			frameId: 0
		});

		assert.strictEqual(result?.length, 2);
		for (let i = 0; i < result.length; i++) {
			const variable = result![i] as vscode.InlineValueVariableLookup;

			let name: string = '';
			let startChar: number = 0;
			let line: number = i;
			switch (i) {
				case 0:
					name = '$sb';
					break;
				case 1:
					name = '$hello { } world';
					startChar = 7;
					line = 0;
					break;
			}

			assert.strictEqual(variable.caseSensitiveLookup, false);
			assert.strictEqual(variable.range.start.line, line);
			assert.strictEqual(variable.range.end.line, line);
			assert.strictEqual(variable.range.start.character, startChar);
			assert.strictEqual(variable.variableName, name);
			assert.strictEqual(variable.range.end.character, name.length + startChar);
		}
	});

	test('Variables used with collections', async () => {
		const doc = await vscode.workspace.openTextDocument({
			language: 'powershell',
			content: `
$dict[$key]
@($element,$element2, $element3)
$normal, \${braces}, $script:scoped
@{key = $var}
@{key = \${special var}}
`,
		});

		const provider = new PowerShellVariableInlineValuesProvider();

		const result = await provider.provideInlineValues(doc, new vscode.Range(0, 0, 0, 0), {
			stoppedLocation: new vscode.Range(doc.lineCount - 1, 0, doc.lineCount - 1, 0),
			frameId: 0
		});

		assert.strictEqual(result?.length, 10);
		for (let i = 0; i < result.length; i++) {
			const variable = result![i] as vscode.InlineValueVariableLookup;

			let name: string = '';
			let startChar: number = 0;
			let line: number = i + 1;
			switch (i) {
				case 0:
					name = '$dict';
					break;
				case 1:
					name = '$key';
					startChar = 6;
					line = 1;
					break;
				case 2:
					name = '$element';
					startChar = 2;
					line = 2;
					break;
				case 3:
					name = '$element2';
					startChar = 11;
					line = 2;
					break;
				case 4:
					name = '$element3';
					startChar = 22;
					line = 2;
					break;
				case 5:
					name = '$normal';
					line = 3;
					break;
				case 6:
					name = '$braces';
					startChar = 9;
					line = 3;
					break;
				case 7:
					name = '$scoped';
					startChar = 20;
					line = 3;
					break;
				case 8:
					name = '$var';
					startChar = 8;
					line = 4;
					break;
				case 9:
					name = '$special var';
					startChar = 8;
					line = 5;
					break;
			}

			assert.strictEqual(variable.caseSensitiveLookup, false);
			assert.strictEqual(variable.range.start.line, line);
			assert.strictEqual(variable.range.end.line, line);
			assert.strictEqual(variable.range.start.character, startChar);
			assert.strictEqual(variable.variableName, name);
			assert.strictEqual(variable.range.end.character, name.length + startChar);
		}
	});

	test('Variables with modifiers', async () => {
		const doc = await vscode.workspace.openTextDocument({
			language: 'powershell',
			content: `
$a;
$a,$b
$a-$b
$a+$b
$a/$b
$a*$b
`,
		});

		const provider = new PowerShellVariableInlineValuesProvider();

		const result = await provider.provideInlineValues(doc, new vscode.Range(0, 0, 0, 0), {
			stoppedLocation: new vscode.Range(doc.lineCount - 1, 0, doc.lineCount - 1, 0),
			frameId: 0
		});

		assert.strictEqual(result?.length, 11);
		for (let i = 0; i < result.length; i++) {
			const variable = result![i] as vscode.InlineValueVariableLookup;

			let name: string = '';
			let startChar: number = 0;
			let line: number = i + 1;
			switch (i) {
				case 0:
					name = '$a';
					break;
				case 1:
					name = '$a';
					break;
				case 2:
					name = '$b';
					startChar = 3;
					line = 2;
					break;
				case 3:
					name = '$a';
					line = 3;
					break;
				case 4:
					name = '$b';
					startChar = 3;
					line = 3;
					break;
				case 5:
					name = '$a';
					line = 4;
					break;
				case 6:
					name = '$b';
					startChar = 3;
					line = 4;
					break;
				case 7:
					name = '$a';
					line = 5;
					break;
				case 8:
					name = '$b';
					startChar = 3;
					line = 5;
					break;
				case 9:
					name = '$a';
					line = 6;
					break;
				case 10:
					name = '$b';
					startChar = 3;
					line = 6;
					break;
			}

			assert.strictEqual(variable.caseSensitiveLookup, false);
			assert.strictEqual(variable.range.start.line, line);
			assert.strictEqual(variable.range.end.line, line);
			assert.strictEqual(variable.range.start.character, startChar);
			assert.strictEqual(variable.variableName, name);
			assert.strictEqual(variable.range.end.character, name.length + startChar);
		}
	});
});
