'use strict';
import * as vscode from 'vscode';

import { Mode } from './modes_types';
import * as scrollCommands from './scroll_commands';
import { enterNormalMode, enterVisualMode, setModeCursorStyle } from './modes';
import { typeHandler } from './type_handler';
import { addTypeSubscription, removeTypeSubscription } from './type_subscription';
import { VimState } from './vim_state_types';
import { escapeHandler } from './escape_handler';

const globalVimState: VimState = {
    typeSubscription: undefined,
    mode: Mode.Insert,
    desiredColumns: [],
    keysPressed: [],
    registers: {},
    semicolonAction: () => undefined,
    commaAction: () => undefined,
};

function onSelectionChange(vimState: VimState, e: vscode.TextEditorSelectionChangeEvent): void {
    const editor = vscode.window.activeTextEditor;

    if (vimState.mode === Mode.Insert || !editor) return;

    vimState.desiredColumns = [];

    // It would be nice if we could also go from visual to normal mode when all selections are empty
    // but visual mode on an empty line will yield an empty selection and there's no good way of
    // distinguishing that case from the rest.
    if (e.selections.some(selection => !selection.isEmpty) && vimState.mode === Mode.Normal) {
        enterVisualMode(vimState);
        setModeCursorStyle(vimState.mode, editor);
    }

    // The following code makes find/replace take extra clicks because after replacing it moves
    // the cursor to the next result with an empty selection which causes us to set editor.selections.
    // So for now we don't need this.

    // if (vimState.mode === Mode.Normal) {
    //     // Prevent cursor from landing on the last character of the line
    //     editor.selections = editor.selections.map(function(selection, i) {
    //         const lineLength = editor.document.lineAt(selection.active.line).text.length;

    //         if (lineLength > 0 && selection.active.character === lineLength) {
    //             const newPosition = new vscode.Position(
    //                 selection.active.line,
    //                 lineLength - 1,
    //             );
    //             return new vscode.Selection(newPosition, newPosition);
    //         } else {
    //             return selection;
    //         }
    //     });
    // }
}

function onDidChangeActiveTextEditor(vimState: VimState, editor: vscode.TextEditor | undefined) {
    if (!editor) return;

    setModeCursorStyle(vimState.mode, editor);

    vimState.desiredColumns = [];
    vimState.keysPressed = [];
}

export function activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => onDidChangeActiveTextEditor(globalVimState, editor)),
        vscode.window.onDidChangeTextEditorSelection((e) => onSelectionChange(globalVimState, e)),
        vscode.commands.registerCommand(
            'extension.simpleVim.escapeKey',
            () => escapeHandler(globalVimState),
        ),
        vscode.commands.registerCommand(
            'extension.simpleVim.scrollDownHalfPage',
            scrollCommands.scrollDownHalfPage,
        ),
        vscode.commands.registerCommand(
            'extension.simpleVim.scrollUpHalfPage',
            scrollCommands.scrollUpHalfPage,
        ),
        vscode.commands.registerCommand(
            'extension.simpleVim.scrollDownPage',
            scrollCommands.scrollDownPage,
        ),
        vscode.commands.registerCommand(
            'extension.simpleVim.scrollUpPage',
            scrollCommands.scrollUpPage,
        ),
    );

    enterNormalMode(globalVimState);
    addTypeSubscription(globalVimState, typeHandler);

    if (vscode.window.activeTextEditor) {
        onDidChangeActiveTextEditor(globalVimState, vscode.window.activeTextEditor);
    }
}

export function deactivate(): void {
    removeTypeSubscription(globalVimState);
}
