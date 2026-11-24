# FDA Guidance MCP Server

A comprehensive Model Context Protocol (MCP) server for processing FDA guidance documents. This server extracts structured content from PDF files and provides advanced search capabilities.

## Features

### Part One: Document Processing Service
- **PDF Extraction**: Extracts structured content from FDA guidance PDF files
- **Metadata Extraction**: Automatically identifies:
  - Document name
  - Center/Office name (CDER, CBER, etc.)
  - Document status (draft/final)
  - Publication date (month and year)
- **Hierarchical Structure**: Preserves document structure with sections and subsections
- **Quality Indicators**: Flags uncertain OCR results and structural ambiguities
- **Page Numbers**: Tracks page numbers for each section/subsection
- **JSON Storage**: Saves extracted data in structured JSON format

### Part Two: Search API
- **SmartSearch**: Advanced search using full terms or first 3 letters of each word
- **Multiple Search Modes**:
  - Full-text search across all documents
  - Search by document name
  - Search by center/office
  - Search by status (draft/final)
- **Relevance Ranking**: Results sorted by relevance score
- **Context Extraction**: Shows text context around matches
- **Statistics**: Document analytics and counts

## Quick Start

### 1. Install Dependencies

```bash
cd C:\Users\SMITHLO\Downloads\fda-guidance-mcp
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Create Directories

```bash
mkdir pdfs
mkdir data
```

### 4. Add PDF Files

Place your FDA guidance PDF files in the `pdfs/` directory.

### 5. Run the Server

```bash
node build/index.js
```

## Project Structure

```
fda-guidance-mcp/
├── src/
│   ├── index.ts              # Main MCP server
│   ├── pdf-extractor.ts      # PDF processing logic
│   ├── search-engine.ts      # Search functionality
│   └── types.ts              # TypeScript type definitions
├── pdfs/                     # Place PDF files here
├── data/                     # Extracted JSON data stored here
├── package.json
├── tsconfig.json
├── README.md
├── SETUP_GUIDE.md           # Detailed setup instructions
├── DESIGN.md                # Technical specifications
└── EXAMPLES.md              # Usage examples
```

## Configuration

### Environment Variables

Configure the server using environment variables:

- `FDA_PDF_PATH`: Directory containing PDF files (default: `./pdfs`)
- `FDA_DATA_PATH`: Directory for storing extracted JSON data (default: `./data`)

**On Windows (PowerShell):**
```powershell
$env:FDA_PDF_PATH="C:/path/to/pdfs"
$env:FDA_DATA_PATH="C:/path/to/data"
```

**On Windows (Command Prompt):**
```cmd
set FDA_PDF_PATH=C:\path\to\pdfs
set FDA_DATA_PATH=C:\path\to\data
```

## Using with Claude Desktop

Add to your Claude Desktop configuration file:

**Location:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fda-guidance": {
      "command": "node",
      "args": ["C:/Users/SMITHLO/Downloads/fda-guidance-mcp/build/index.js"],
      "env": {
        "FDA_PDF_PATH": "C:/Users/SMITHLO/Downloads/fda-guidance-mcp/pdfs",
        "FDA_DATA_PATH": "C:/Users/SMITHLO/Downloads/fda-guidance-mcp/data"
      }
    }
  }
}
```

After adding this configuration, restart Claude Desktop.

## Available Tools

| Tool Name | Description |
|-----------|-------------|
| extract_pdf | Extract content from a single PDF |
| extract_all_pdfs | Batch extract all PDFs in directory |
| smart_search | Search with partial matching (first 3 letters) |
| search_by_document_name | Filter by document name |
| search_by_center | Filter by FDA center/office |
| search_by_status | Filter by draft/final status |
| get_document | Retrieve specific document |
| get_statistics | Get document analytics |
| load_documents | Load extracted JSONs into search engine |

## Example Usage

### Extract All PDFs

```
Please extract all PDF files from the pdfs directory
```

### Search Documents

```
Search for "clinical trial endpoints" in the guidance documents
```

### Get Statistics

```
What statistics do you have about the loaded documents?
```

## Data Format

Each extracted document is saved as JSON:

```json
{
  "documentName": "Guidance for Industry: Bioequivalence Studies",
  "centerOrOfficeName": "Center for Drug Evaluation and Research",
  "documentStatus": "final",
  "date": "January 2024",
  "sections": [
    {
      "sectionTitle": "I. INTRODUCTION",
      "sectionText": "This guidance provides recommendations...",
      "pageNumber": 3,
      "subsections": [
        {
          "subsectionTitle": "A. Background",
          "subsectionText": "The FDA has established...",
          "pageNumber": 3
        }
      ]
    }
  ],
  "metadata": {
    "fileName": "bioequivalence-guidance.pdf",
    "processedDate": "2024-01-15T10:30:00.000Z",
    "totalPages": 25
  }
}
```

## Troubleshooting

### "Failed to process PDF"

**Solution:**
- Verify the PDF opens in a standard PDF reader
- Remove password protection if present
- Ensure PDF is text-based (not scanned)

### "No documents loaded" in search

**Solution:**
```
Please load the documents from data/all_documents.json
```

### Poor search results

**Solution:**
- Try partial search with first 3 letters
- Use broader terms
- Search by document name or center instead

## Documentation

- **SETUP_GUIDE.md**: Complete installation and configuration guide
- **DESIGN.md**: Technical architecture and design specifications
- **EXAMPLES.md**: Practical usage examples and workflows

## Performance

- **Extraction**: 1-5 seconds per document
- **Search**: <200ms for up to 500 documents
- **Storage**: JSON files are ~2-5x larger than original PDFs

## Limitations

1. Does not perform OCR on scanned PDFs (use pre-OCRed PDFs)
2. Table structure may not be preserved perfectly
3. Images and figures are not extracted
4. Optimized for English FDA documents

## License

MIT License

## Version

1.0.0 - Initial Release
