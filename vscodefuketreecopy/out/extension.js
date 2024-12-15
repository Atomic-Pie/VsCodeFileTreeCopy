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
const micromatch = __importStar(require("micromatch"));
function activate(context) {
    console.log("Extension activated!");
    const disposable = vscode.commands.registerCommand("copyFileStructure.copy", async (uri) => {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage("Please select a valid folder.");
            return;
        }
        try {
            const config = vscode.workspace.getConfiguration("copyFileStructure");
            // Configuration options
            const allowedExtensions = config.get("allowedExtensions") || [];
            const excludedDirectories = config.get("excludedDirectories") || ["**/node_modules", "**/.vscode", "**/.git"];
            const excludedFiles = config.get("excludedFiles") || [];
            const maxFileSizeKB = config.get("maxFileSizeKB") || 0;
            const maxFileContentLength = config.get("maxFileContentLength") || 0;
            const maxDepth = config.get("maxDepth") || 0; // 0 means no limit
            const structure = await generateFileStructureObject(uri.fsPath, allowedExtensions, excludedDirectories, excludedFiles, maxFileSizeKB, maxFileContentLength, maxDepth, 1 // current depth starts at 1
            );
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
function deactivate() { }
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
async function generateFileStructureObject(folderPath, allowedExtensions, excludedDirectories, excludedFiles, maxFileSizeKB, maxFileContentLength, maxDepth, currentDepth) {
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
    const node = {
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
            const childDir = await generateFileStructureObject(itemPath, allowedExtensions, excludedDirectories, excludedFiles, maxFileSizeKB, maxFileContentLength, maxDepth, currentDepth + 1);
            // Only add if the directory is not empty or isn't excluded
            if (childDir.children.length > 0 || (childDir.name !== baseName)) {
                node.children.push(childDir);
            }
        }
        else {
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
            const fileNode = {
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
//# sourceMappingURL=extension.js.map