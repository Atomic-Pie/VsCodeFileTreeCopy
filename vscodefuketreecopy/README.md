# VsCodeFileTreeCopy

**VsCodeFileTreeCopy** is a Visual Studio Code extension that allows you to quickly copy a project's file structure and file contents as a structured JSON object. This makes it easy to share or analyze a codebase's layout.

## Features

- **Right-Click in Explorer:**  
  Right-click on any folder in the VS Code Explorer and select **"Copy File Structure"**.  
- **JSON Representation:**  
  The copied data is a JSON-structured hierarchy of directories and files, including file contents.
- **Configurable Extensions:**  
  Customize which file extensions to include by editing the `copyFileStructure.allowedExtensions` setting. Leave it empty to include all files.

## Installation

1. **From Source (Local):**
   - Run `npm install` in the extension's root directory.
   - Run `npm run compile` to build the extension.
   - Package the extension:
     ```bash
     npx @vscode/vsce package
     ```
   - In VS Code, open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`), choose **"Extensions: Install from VSIX..."**, and select the generated `.vsix` file.

2. **From Marketplace (If Published):**  
   Open the Extensions view in VS Code, search for **"VsCodeFileTreeCopy"**, and click **Install**.

## Usage

1. Open a folder in VS Code.
2. In the Explorer, right-click on a folder.
3. Select **"Copy File Structure"** from the context menu.
4. The file structure is now copied to your clipboard as a formatted JSON string. Paste it into a text editor, ChatGPT, or anywhere else to analyze it.

## Settings

- `copyFileStructure.allowedExtensions`: An array of file extensions to include when copying. For example:
  ```json
  "copyFileStructure.allowedExtensions": [".js", ".ts"]
  ```
  If left empty, all files are included.

## Contributing

Contributions are welcome!  
- Fork the repository,  
- Make your changes,  
- Submit a pull request.
