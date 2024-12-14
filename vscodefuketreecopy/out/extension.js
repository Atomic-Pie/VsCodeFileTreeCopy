"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
function activate(context) {
    console.log("Extension activated!");
    const disposable = vscode.commands.registerCommand("copyFileStructure.copy", async (uri) => {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage("Please select a valid folder.");
            return;
        }
        try {
            const config = vscode.workspace.getConfiguration("copyFileStructure");
            const allowedExtensions = config.get("allowedExtensions") || [];
            const structure = await generateFileStructureObject(uri.fsPath, allowedExtensions);
            // Convert the structure object to a JSON string
            const result = JSON.stringify(structure, null, 2);
            await vscode.env.clipboard.writeText(result);
            vscode.window.showInformationMessage("File structure (JSON) copied to clipboard!");
        }
        catch (error) {
            const message = (error instanceof Error) ? error.message : String(error);
            vscode.window.showErrorMessage("Error copying file structure: " + message);
        }
    });
    context.subscriptions.push(disposable);
}
/**
 * Recursively generates a JSON-like object describing the directory tree.
 * Directories have `type: "directory"` and a `children` array.
 * Files have `type: "file"`, a `name`, and a `content` string.
 */
async function generateFileStructureObject(folderPath, allowedExtensions) {
    const items = await fs.readdir(folderPath, { withFileTypes: true });
    const node = {
        type: "directory",
        name: path.basename(folderPath),
        children: []
    };
    for (const item of items) {
        const itemPath = path.join(folderPath, item.name);
        if (item.isDirectory()) {
            const childDir = await generateFileStructureObject(itemPath, allowedExtensions);
            node.children.push(childDir);
        }
        else {
            const ext = path.extname(item.name);
            if (allowedExtensions.length === 0 || allowedExtensions.includes(ext)) {
                const content = await fs.readFile(itemPath, "utf8");
                const fileNode = {
                    type: "file",
                    name: item.name,
                    content: content
                };
                node.children.push(fileNode);
            }
        }
    }
    return node;
}
function deactivate() { }
//# sourceMappingURL=extension.js.map