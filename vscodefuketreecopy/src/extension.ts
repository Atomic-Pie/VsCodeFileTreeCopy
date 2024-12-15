import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import * as micromatch from "micromatch";

export function activate(context: vscode.ExtensionContext) {
    console.log("Extension activated!");

    const disposable = vscode.commands.registerCommand("copyFileStructure.copy", async (uri: vscode.Uri) => {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage("Please select a valid folder.");
            return;
        }

        try {
            const config = vscode.workspace.getConfiguration("copyFileStructure");

            // Configuration options
            const allowedExtensions = config.get<string[]>("allowedExtensions") || [];
            const excludedDirectories = config.get<string[]>("excludedDirectories") || ["**/node_modules", "**/.vscode", "**/.git"];
            const excludedFiles = config.get<string[]>("excludedFiles") || [];
            const maxFileSizeKB = config.get<number>("maxFileSizeKB") || 0;
            const maxFileContentLength = config.get<number>("maxFileContentLength") || 0;
            const maxDepth = config.get<number>("maxDepth") || 0; // 0 means no limit

            const structure = await generateFileStructureObject(
                uri.fsPath, 
                allowedExtensions, 
                excludedDirectories, 
                excludedFiles, 
                maxFileSizeKB, 
                maxFileContentLength, 
                maxDepth,
                1 // current depth starts at 1
            );

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

export function deactivate() {}

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
 * 
 * @param folderPath The file system path of the current folder.
 * @param allowedExtensions If not empty, only files with these extensions are included.
 * @param excludedDirectories Glob patterns for directories to exclude.
 * @param excludedFiles Glob patterns for files to exclude.
 * @param maxFileSizeKB Maximum file size allowed in KB (0 for no limit).
 * @param maxFileContentLength Maximum characters of file content (0 for no limit).
 * @param maxDepth Maximum depth of directory traversal (0 for no limit).
 * @param currentDepth Current depth of recursion.
 */
async function generateFileStructureObject(
    folderPath: string,
    allowedExtensions: string[],
    excludedDirectories: string[],
    excludedFiles: string[],
    maxFileSizeKB: number,
    maxFileContentLength: number,
    maxDepth: number,
    currentDepth: number
): Promise<DirectoryNode> {
    const baseName = path.basename(folderPath);

    // If this directory matches any excluded pattern, skip it
    if (micromatch.isMatch(folderPath, excludedDirectories, { dot: true })) {
        return {
            type: "directory",
            name: baseName,
            children: []
        };
    }

    // If we've exceeded maximum depth, return directory without children
    if (maxDepth > 0 && currentDepth > maxDepth) {
        return {
            type: "directory",
            name: baseName,
            children: []
        };
    }

    const items = await fs.readdir(folderPath, { withFileTypes: true });
    const node: DirectoryNode = {
        type: "directory",
        name: baseName,
        children: []
    };

    for (const item of items) {
        const itemPath = path.join(folderPath, item.name);

        if (item.isDirectory()) {
            // Check exclusion for directories
            if (micromatch.isMatch(itemPath, excludedDirectories, { dot: true })) {
                continue;
            }

            const childDir = await generateFileStructureObject(
                itemPath, 
                allowedExtensions, 
                excludedDirectories, 
                excludedFiles, 
                maxFileSizeKB, 
                maxFileContentLength, 
                maxDepth,
                currentDepth + 1
            );

            // Only add if the directory is not empty or isn't excluded
            if (childDir.children.length > 0 || (childDir.name !== baseName)) {
                node.children.push(childDir);
            }
        } else {
            // Check exclusion for files
            if (micromatch.isMatch(itemPath, excludedFiles, { dot: true })) {
                continue;
            }

            const ext = path.extname(item.name);
            
            // If allowedExtensions is not empty, only include those extensions
            if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
                continue;
            }

            // Check file size if maxFileSizeKB is set
            if (maxFileSizeKB > 0) {
                const stat = await fs.stat(itemPath);
                const fileSizeKB = stat.size / 1024;
                if (fileSizeKB > maxFileSizeKB) {
                    // Skip large files
                    continue;
                }
            }

            // Read file content
            let content = await fs.readFile(itemPath, "utf8");

            // Truncate content if maxFileContentLength is set and content is too large
            if (maxFileContentLength > 0 && content.length > maxFileContentLength) {
                content = content.slice(0, maxFileContentLength) + "...(truncated)";
            }

            const fileNode: FileNode = {
                type: "file",
                name: item.name,
                content: content
            };
            node.children.push(fileNode);
        }
    }

    // Sort children: directories first, then files, all alphabetically by name
    node.children.sort((a, b) => {
        if (a.type === b.type) {
            return a.name.localeCompare(b.name);
        }
        return a.type === "directory" ? -1 : 1;
    });

    return node;
}
