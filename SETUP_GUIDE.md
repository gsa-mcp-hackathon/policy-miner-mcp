# FDA Guidance MCP Server - Complete Setup Guide

This guide provides step-by-step instructions for setting up and running the FDA Guidance MCP Server locally on Windows.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running the Server](#running-the-server)
5. [Using with Claude Desktop](#using-with-claude-desktop)
6. [Processing Documents](#processing-documents)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

1. **Node.js** (v18.0.0 or higher)
   - Download from: https://nodejs.org/
   - Install the LTS (Long Term Support) version
   - Verify installation:
     ```powershell
     node --version
     # Should show v18.0.0 or higher
     ```

2. **npm** (comes with Node.js)
   - Verify installation:
     ```powershell
     npm --version
     # Should show 9.0.0 or higher
     ```

### System Requirements

- **Operating System**: Windows 10 or Windows 11
- **RAM**: Minimum 4 GB (8 GB recommended)
- **Disk Space**: 500 MB for installation + space for PDF and JSON files
- **Processor**: Any modern CPU (multi-core recommended for large batches)

## Installation

### Step 1: Navigate to Project Directory

Open PowerShell and navigate to the project:

```powershell
cd C:\Users\SMITHLO\Downloads\fda-guidance-mcp
```

### Step 2: Install Dependencies

Install all required npm packages:

```powershell
npm install
```

This will install:
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `pdf-parse` - PDF text extraction
- `zod` - Schema validation
- TypeScript and type definitions

**Expected output:**
```
added 50 packages, and audited 51 packages in 5s
found 0 vulnerabilities
```

**Note:** If you see any warnings about deprecated packages, that's normal and won't affect functionality.

### Step 3: Build the Project

Compile TypeScript to JavaScript:

```powershell
npm run build
```

**Expected output:**
```
> fda-guidance-mcp-server@1.0.0 build
> tsc && chmod +x build/index.js
```

This creates a `build/` directory with compiled JavaScript files.

### Step 4: Verify Installation

Check that all files were created:

```powershell
dir build
```

You should see:
- `index.js`, `index.d.ts`, `index.js.map`
- `pdf-extractor.js`, `pdf-extractor.d.ts`, `pdf-extractor.js.map`
- `search-engine.js`, `search-engine.d.ts`, `search-engine.js.map`
- `types.js`, `types.d.ts`, `types.js.map`

### Step 5: Verify Directories

The `pdfs` and `data` directories should already exist:

```powershell
dir
```

You should see both `pdfs` and `data` folders listed.

## Configuration

### Default Configuration

The server uses these default paths:
- **PDFs**: `C:\Users\SMITHLO\Downloads\fda-guidance-mcp\pdfs`
- **Data**: `C:\Users\SMITHLO\Downloads\fda-guidance-mcp\data`

### Custom Paths (Optional)

If you want to use different directories:

**Option 1: Environment Variables (Temporary - current session only)**

```powershell
$env:FDA_PDF_PATH="C:/path/to/your/pdfs"
$env:FDA_DATA_PATH="C:/path/to/your/data"
```

**Option 2: Set Permanently (All sessions)**

1. Right-click "This PC" or "My Computer"
2. Click "Properties"
3. Click "Advanced system settings"
4. Click "Environment Variables"
5. Under "User variables", click "New"
6. Add:
   - Variable name: `FDA_PDF_PATH`
   - Variable value: `C:\path\to\your\pdfs`
7. Repeat for `FDA_DATA_PATH`

### Add PDF Files

Place your FDA guidance PDF files in the `pdfs` directory:

```powershell
# Example: Copy PDFs from Downloads
copy C:\Users\SMITHLO\Downloads\*.pdf pdfs\
```

**Tips:**
- PDFs should be text-based (not scanned images without OCR)
- Files can have any name (e.g., `bioequivalence-2024.pdf`)
- Subdirectories are not currently supported

## Running the Server

### Option 1: Standalone Mode (Testing)

Run the server directly to test:

```powershell
node build/index.js
```

**Expected output:**
```
FDA Guidance MCP Server running on stdio
PDF Path: C:\Users\SMITHLO\Downloads\fda-guidance-mcp\pdfs
Data Path: C:\Users\SMITHLO\Downloads\fda-guidance-mcp\data
```

The server will continue running and wait for MCP protocol messages on stdin.

**To stop the server:** Press `Ctrl+C`

### Option 2: With Custom Paths

```powershell
$env:FDA_PDF_PATH="C:/custom/pdfs"
$env:FDA_DATA_PATH="C:/custom/data"
node build/index.js
```

## Using with Claude Desktop

### Step 1: Locate Configuration File

The Claude Desktop configuration file is located at:

```
%APPDATA%\Claude\claude_desktop_config.json
```

To open it:

**Option A: Using File Explorer**
1. Press `Win + R` to open Run dialog
2. Type: `%APPDATA%\Claude`
3. Press Enter
4. Open `claude_desktop_config.json` in Notepad

**Option B: Using PowerShell**
```powershell
notepad "$env:APPDATA\Claude\claude_desktop_config.json"
```

### Step 2: Edit Configuration

If the file exists, add the `fda-guidance` server to the `mcpServers` section.

If it doesn't exist, create it with this content:

```json
{
  "mcpServers": {
    "fda-guidance": {
      "command": "node",
      "args": [
        "C:/Users/SMITHLO/Downloads/fda-guidance-mcp/build/index.js"
      ],
      "env": {
        "FDA_PDF_PATH": "C:/Users/SMITHLO/Downloads/fda-guidance-mcp/pdfs",
        "FDA_DATA_PATH": "C:/Users/SMITHLO/Downloads/fda-guidance-mcp/data"
      }
    }
  }
}
```

**Important Notes:**
- Use **forward slashes** (/) not backslashes (\) in paths
- Use **absolute paths** (full paths from C:)
- Adjust the paths if you installed the project elsewhere

### Step 3: Save and Close

Save the file and close Notepad.

### Step 4: Restart Claude Desktop

1. Completely quit Claude Desktop (right-click system tray icon → Exit)
2. Relaunch Claude Desktop
3. The MCP server will start automatically when you open Claude

### Step 5: Verify Connection

In Claude Desktop, ask:

```
What tools do you have available from the FDA Guidance server?
```

Claude should list tools like:
- extract_pdf
- extract_all_pdfs
- smart_search
- search_by_document_name
- search_by_center
- search_by_status
- get_document
- get_statistics
- load_documents

## Processing Documents

### Extract a Single PDF

**Using Claude Desktop:**

```
Please extract the PDF at pdfs/bioequivalence-guidance.pdf
```

Claude will use the `extract_pdf` tool and return the extracted document structure.

### Extract All PDFs

**Using Claude Desktop:**

```
Please extract all PDFs from the pdfs directory
```

This will:
1. Process all PDF files in the directory
2. Save individual JSON files for each document
3. Create/update `data/all_documents.json`
4. Automatically load documents into the search engine

### Check Extracted Files

After extraction, check the data directory:

```powershell
dir data
```

You should see:
- `all_documents.json` - Combined file with all documents
- Individual JSON files for each document

## Searching Documents

### Load Documents (if needed)

If documents were extracted in a previous session:

```
Please load the extracted documents
```

### Perform a SmartSearch

```
Search for "clinical trial endpoints" in the guidance documents
```

This searches using:
- Exact match: "clinical trial endpoints"
- Partial match: "cli tri end" (first 3 letters of each word)

### Search by Document Name

```
Find guidance documents with "bioequivalence" in the name
```

### Search by Center

```
Show me all CDER guidance documents
```

### Get Statistics

```
What statistics do you have about the guidance documents?
```

## Troubleshooting

### Issue: "node is not recognized as an internal or external command"

**Problem:** Node.js not installed or not in PATH

**Solution:**
1. Download and install Node.js from https://nodejs.org/
2. Restart PowerShell
3. Verify: `node --version`

### Issue: "Cannot find module '@modelcontextprotocol/sdk'"

**Problem:** Dependencies not installed

**Solution:**
```powershell
cd C:\Users\SMITHLO\Downloads\fda-guidance-mcp
npm install
npm run build
```

### Issue: "Failed to process PDF"

**Problem:** PDF file is corrupted, password-protected, or scanned

**Solution:**
1. Try opening the PDF in Adobe Reader or Edge
2. If password-protected, remove the password first
3. Ensure PDF is text-based (not a scanned image)

### Issue: "No documents loaded" when searching

**Problem:** Documents not loaded into search engine

**Solution:**
Using Claude Desktop:
```
Please load the documents from data/all_documents.json
```

### Issue: Claude Desktop doesn't see the MCP server

**Problem:** Configuration file incorrect or server not starting

**Solution:**

1. **Check configuration file exists:**
   ```powershell
   Test-Path "$env:APPDATA\Claude\claude_desktop_config.json"
   ```
   If it returns `False`, create the file.

2. **Check configuration syntax:**
   - Use forward slashes (/) not backslashes (\)
   - Ensure paths are correct
   - Verify JSON syntax is valid

3. **Test server runs standalone:**
   ```powershell
   cd C:\Users\SMITHLO\Downloads\fda-guidance-mcp
   node build/index.js
   ```
   Press Ctrl+C to stop.

4. **Check Claude Desktop logs:**
   - Look in `%APPDATA%\Claude\logs` for error messages

5. **Restart Claude Desktop completely:**
   - Right-click system tray icon
   - Click "Exit"
   - Restart from Start menu

### Issue: "ENOENT: no such file or directory"

**Problem:** PDF or data directory doesn't exist

**Solution:**
```powershell
cd C:\Users\SMITHLO\Downloads\fda-guidance-mcp
mkdir pdfs
mkdir data
```

### Issue: Poor extraction quality

**Problem:** PDF has non-standard formatting

**Solution:**
- Check the `ocrUncertain` flag in the output
- Review the `extractionNotes` for warnings
- Some PDFs may require manual review
- Download PDF files from official FDA website for best results

### Debug Mode

To see detailed logs:

```powershell
node build/index.js 2>&1 | Tee-Object -FilePath debug.log
```

This saves all output to `debug.log` for review.

## Next Steps

1. ✅ **Installation Complete**: You've successfully installed the server
2. 📄 **Add PDFs**: Place FDA guidance PDFs in the `pdfs` folder
3. 🔧 **Configure Claude**: Update Claude Desktop config file
4. 🚀 **Start Extracting**: Use Claude to extract and search documents
5. 📖 **Learn More**: Check EXAMPLES.md for usage patterns

## Quick Reference

### Common Commands

```powershell
# Navigate to project
cd C:\Users\SMITHLO\Downloads\fda-guidance-mcp

# Install dependencies
npm install

# Build project
npm run build

# Run server (testing)
node build/index.js

# View extracted data
type data\all_documents.json

# Count PDFs
(dir pdfs\*.pdf).Count

# Check disk usage
(Get-ChildItem data -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
```

### File Locations

- **Project**: `C:\Users\SMITHLO\Downloads\fda-guidance-mcp`
- **PDFs**: `C:\Users\SMITHLO\Downloads\fda-guidance-mcp\pdfs`
- **Data**: `C:\Users\SMITHLO\Downloads\fda-guidance-mcp\data`
- **Claude Config**: `%APPDATA%\Claude\claude_desktop_config.json`

### Getting Help

- **README.md**: Overview and quick start
- **DESIGN.md**: Technical architecture
- **EXAMPLES.md**: Usage examples and workflows

---

**You're now ready to use the FDA Guidance MCP Server!**

For specific features and examples, refer to README.md and EXAMPLES.md.
