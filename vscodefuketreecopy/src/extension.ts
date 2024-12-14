import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";

export function activate(context: vscode.ExtensionContext) {
    console.log("Extension activated!");

    const disposable = vscode.commands.registerCommand("copyFileStructure.copy", async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage("Please select a valid folder.");
            return;
        }

        try {
            const config = vscode.workspace.getConfiguration("copyFileStructure");
            const allowedExtensions = config.get<string[]>("allowedExtensions") || [];
            const structure = await generateFileStructureObject(uri.fsPath, allowedExtensions);

            // Convert the structure object to a JSON string
            const result = JSON.stringify(structure, null, 2);
            await vscode.env.clipboard.writeText(result);

            vscode.window.showInformationMessage("File structure (JSON) copied to clipboard!");
        } catch (error) {
            const message = (error instanceof Error) ? error.message : String(error);
            vscode.window.showErrorMessage("Error copying file structure: " + message);
        }
    });

    context.subscriptions.push(disposable);
}

interface FileNode {
    type: "file";
    name: string;
    content: string;
}

interface DirectoryNode {
    type: "directory";
    name: string;
    children: (FileNode | DirectoryNode)[];
}

/**
 * Recursively generates a JSON-like object describing the directory tree.
 * Directories have `type: "directory"` and a `children` array.
 * Files have `type: "file"`, a `name`, and a `content` string.
 */
async function generateFileStructureObject(
    folderPath: string,
    allowedExtensions: string[]
): Promise<DirectoryNode> {
    const items = await fs.readdir(folderPath, { withFileTypes: true });
    const node: DirectoryNode = {
        type: "directory",
        name: path.basename(folderPath),
        children: []
    };

    for (const item of items) {
        const itemPath = path.join(folderPath, item.name);

        if (item.isDirectory()) {
            const childDir = await generateFileStructureObject(itemPath, allowedExtensions);
            node.children.push(childDir);
        } else {
            const ext = path.extname(item.name);
            if (allowedExtensions.length === 0 || allowedExtensions.includes(ext)) {
                const content = await fs.readFile(itemPath, "utf8");
                const fileNode: FileNode = {
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

export function deactivate() {}
