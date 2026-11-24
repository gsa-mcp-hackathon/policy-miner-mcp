# FDA Guidance MCP Server - Design Specifications

## Overview

This document provides comprehensive design specifications for the FDA Guidance MCP Server, a two-part system for processing FDA guidance documents and enabling advanced search capabilities.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client (Claude)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ MCP Protocol (stdio)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                 MCP Server (index.ts)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Tool & Resource Handlers                   │   │
│  └──────────────────┬────────────────────────────────────┘   │
│                     │                                         │
│  ┌─────────────────▼──────────┐  ┌────────────────────────┐ │
│  │   PDF Extractor Module     │  │  Search Engine Module  │ │
│  │  (pdf-extractor.ts)        │  │  (search-engine.ts)    │ │
│  └─────────────────┬──────────┘  └──────────┬─────────────┘ │
└────────────────────┼────────────────────────┼───────────────┘
                     │                        │
            ┌────────▼────────┐      ┌───────▼────────┐
            │   PDF Files     │      │  JSON Data     │
            │   (pdfs/)       │      │  (data/)       │
            └─────────────────┘      └────────────────┘
```

## Component Design

### 1. MCP Server (index.ts)

**Purpose**: Main entry point that implements the Model Context Protocol

**Responsibilities**:
- Initialize server with stdio transport
- Register and handle tool requests
- Register and handle resource requests
- Coordinate between PDF extractor and search engine
- Manage file I/O operations
- Handle errors and validate inputs

**Key Methods**:
- `setupHandlers()`: Register all MCP handlers
- `handleExtractPDF()`: Process single PDF extraction
- `handleExtractAllPDFs()`: Batch process PDFs
- `handleSmartSearch()`: Execute smart search
- `handleLoadDocuments()`: Load documents into search engine
- `ensureDataDirectory()`: Create data directory if needed
- `updateAllDocuments()`: Maintain combined JSON file

**Configuration**:
- Environment variables: `FDA_PDF_PATH`, `FDA_DATA_PATH`
- Default paths: `./pdfs`, `./data`

### 2. PDF Extractor Module (pdf-extractor.ts)

**Purpose**: Extract structured content from FDA guidance PDFs

**Core Algorithm**:

```
1. Load PDF → Extract raw text
2. Identify document metadata:
   - Parse document name from title area
   - Detect center/office from known patterns
   - Determine draft/final status
   - Extract publication date
3. Parse document structure:
   - Identify section headers using pattern matching
   - Identify subsection headers
   - Extract text content for each section/subsection
   - Track page numbers
   - Flag uncertain extractions
4. Build hierarchical document object
5. Save to JSON format
```

**Pattern Matching Rules**:

| Pattern Type | Regex | Example |
|--------------|-------|---------|
| Major Section | `^[A-Z][.\s]+[A-Z][^a-z]{10,100}$` | "I. INTRODUCTION" |
| Major Section | `^[IVX]+\.\s+[A-Z][A-Za-z\s]{5,100}$` | "I. Introduction" |
| Major Section | `^\d+\.\s+[A-Z][A-Za-z\s]{5,100}$` | "1. Introduction" |
| Major Section | `^[A-Z][A-Z\s]{10,100}$` | "INTRODUCTION" |
| Subsection | `^[A-Z]\.\s+[A-Z][A-Za-z\s]{5,100}$` | "A. Background" |
| Subsection | `^\d+\.\d+\s+[A-Z][A-Za-z\s]{5,100}$` | "1.1 Background" |
| Subsection | `^[a-z]\.\s+[A-Z][A-Za-z\s]{5,100}$` | "a. Background" |

**Metadata Extraction**:

1. **Document Name**:
   - Search first 20 lines for "Guidance for Industry/FDA Staff"
   - Look for all-caps titles
   - Fallback to filename

2. **Center/Office**:
   - Pattern match against known centers:
     - Center for Drug Evaluation and Research (CDER)
     - Center for Biologics Evaluation and Research (CBER)
     - Center for Devices and Radiological Health (CDRH)
     - Center for Food Safety and Applied Nutrition (CFSAN)
     - Center for Veterinary Medicine (CVM)
     - Office of Regulatory Affairs (ORA)

3. **Document Status**:
   - Search for "draft guidance" → draft
   - Search for "final guidance" → final
   - Search for "contains nonbinding recommendations" → final
   - Default: unknown

4. **Date Extraction**:
   - Pattern 1: "Month Year" (e.g., "January 2024")
   - Pattern 2: "Month DD, YYYY"
   - Pattern 3: "MM/YYYY" or "MM/DD/YYYY"
   - Default: "Unknown Date"

**Quality Indicators**:
- `ocrUncertain`: Set to true when section structure is ambiguous
- `extractionNotes`: Array of warnings about extraction quality

### 3. Search Engine Module (search-engine.ts)

**Purpose**: Provide advanced search capabilities across all documents

**SmartSearch Algorithm**:

```
Input: query string, maxResults
Output: ranked list of SearchResult objects

1. Normalize query (lowercase, trim)
2. Split query into words
3. Generate patterns:
   - Exact: full words
   - Partial: first 3 letters of each word
4. For each document:
   a. Search in document name
   b. Search in center/office name
   c. For each section:
      - Search in section title
      - Search in section text
      - For each subsection:
        * Search in subsection title
        * Search in subsection text
5. For each match:
   a. Calculate exact matches count
   b. Calculate partial matches count
   c. Determine match type (exact/partial)
   d. Calculate relevance score
   e. Extract context around match
   f. Create SearchResult object
6. Sort results by relevance score (descending)
7. Return top maxResults items
```

**Relevance Scoring**:

```typescript
score = 0

// Match scoring
score += exactMatches × 10
score += partialMatches × 5

// Completeness bonus
if (exactMatches === totalQueryTerms) {
  score += 20
}

// Location bonuses
if (matchLocation === "Document Name") {
  score += 15
} else if (matchLocation.includes("Section:") && !matchLocation.includes("/")) {
  score += 10  // Major section
} else if (matchLocation.includes("Subsection:")) {
  score += 7   // Subsection
}

// Length penalty
if (textLength > 1000) {
  score -= 5  // Less specific
}

return max(0, score)
```

**Context Extraction**:
- Extract ±75 characters around first match
- Add "..." ellipsis if truncated
- Maximum context length: 150 characters

**Additional Search Methods**:
- `searchByDocumentName()`: Simple contains match
- `searchByCenter()`: Filter by center/office
- `searchByStatus()`: Filter by draft/final/unknown
- `searchByDateRange()`: Filter by date (basic string comparison)

### 4. Type System (types.ts)

**Core Data Structures**:

```typescript
interface Subsection {
  subsectionTitle: string;      // e.g., "A. Background"
  subsectionText: string;        // Full text content
  pageNumber?: number;           // PDF page number
  ocrUncertain?: boolean;        // Quality flag
}

interface Section {
  sectionTitle: string;          // e.g., "I. INTRODUCTION"
  sectionText: string;           // Text before first subsection
  subsections: Subsection[];     // Array of nested subsections
  pageNumber?: number;           // PDF page number
  ocrUncertain?: boolean;        // Quality flag
}

interface GuidanceDocument {
  documentName: string;          // Full title
  centerOrOfficeName: string;    // e.g., "CDER"
  documentStatus: 'draft' | 'final' | 'unknown';
  date: string;                  // "Month Year"
  sections: Section[];           // Hierarchical structure
  metadata?: {
    fileName: string;            // Original PDF filename
    processedDate: string;       // ISO timestamp
    totalPages?: number;         // Page count
    extractionNotes?: string[];  // Warnings
  };
}

interface SearchResult {
  documentName: string;
  documentStatus: string;
  centerOrOfficeName: string;
  date: string;
  matchLocation: string;         // "Section: X / Subsection: Y"
  matchedText: string;           // Context snippet
  matchType: 'exact' | 'partial';
  relevanceScore: number;
}
```

## MCP Protocol Implementation

### Tools

| Tool Name | Input | Output | Purpose |
|-----------|-------|--------|---------|
| extract_pdf | pdfPath, saveToFile | ExtractionResult | Extract single PDF |
| extract_all_pdfs | directoryPath | ProcessingReport | Batch extract PDFs |
| smart_search | query, maxResults | SearchResult[] | Search with partial matching |
| search_by_document_name | query | GuidanceDocument[] | Filter by name |
| search_by_center | centerName | GuidanceDocument[] | Filter by center |
| search_by_status | status | GuidanceDocument[] | Filter by status |
| get_document | documentName | GuidanceDocument | Get specific document |
| get_statistics | - | Statistics | Get document counts |
| load_documents | filePath | LoadResult | Load JSON into search |

### Resources

| URI | Type | Description |
|-----|------|-------------|
| fda://documents/all | JSON | All extracted documents |
| fda://statistics | JSON | Document statistics |

## Data Flow

### Extraction Flow

```
1. User places PDF in pdfs/ directory
2. User calls extract_pdf or extract_all_pdfs
3. PDF Extractor:
   a. Reads PDF file
   b. Extracts raw text using pdf-parse
   c. Applies metadata extraction patterns
   d. Applies structure parsing patterns
   e. Builds GuidanceDocument object
   f. Saves to data/DocumentName.json
   g. Updates data/all_documents.json
4. Document automatically loaded into search engine
5. Returns extraction result to user
```

### Search Flow

```
1. User calls smart_search with query
2. Search Engine:
   a. Normalizes query
   b. Generates exact and partial patterns
   c. Searches all loaded documents
   d. Scores each match
   e. Sorts by relevance
   f. Returns top N results
3. User receives ranked SearchResult[]
```

## File Storage Design

### Directory Structure

```
fda-guidance-mcp/
├── pdfs/                          # Input: PDF files
│   ├── document1.pdf
│   ├── document2.pdf
│   └── ...
├── data/                          # Output: JSON files
│   ├── all_documents.json         # Combined file
│   ├── Document_Name_1.json       # Individual files
│   ├── Document_Name_2.json
│   └── ...
└── build/                         # Compiled JavaScript
```

### JSON File Format

**Individual Document File** (`data/DocumentName.json`):
- Single GuidanceDocument object
- Fully self-contained
- Human-readable with 2-space indentation

**Combined File** (`data/all_documents.json`):
- Array of GuidanceDocument objects
- Automatically updated when documents are added
- Used by default for loading into search engine

## Error Handling

### Error Categories

1. **File System Errors**:
   - PDF file not found
   - JSON write permission denied
   - Directory creation failed

2. **PDF Processing Errors**:
   - Corrupted PDF
   - Password-protected PDF
   - Unsupported PDF encoding

3. **Extraction Warnings**:
   - No section structure detected
   - Uncertain metadata
   - Missing date or center

4. **Search Errors**:
   - No documents loaded
   - Invalid query parameters

### Error Response Format

```typescript
{
  success: false,
  errors: [
    "Error message 1",
    "Error message 2"
  ],
  warnings?: [
    "Warning message 1"
  ]
}
```

## Performance Characteristics

### Extraction Performance

| Document Size | Processing Time | Memory Usage |
|---------------|----------------|--------------|
| Small (1-10 pages) | 0.5-1 second | ~10 MB |
| Medium (10-50 pages) | 1-3 seconds | ~20 MB |
| Large (50-200 pages) | 3-10 seconds | ~50 MB |

### Search Performance

| Document Count | Search Time | Memory Usage |
|----------------|-------------|--------------|
| 1-100 documents | <50ms | ~100 MB |
| 100-500 documents | 50-200ms | ~500 MB |
| 500-1000 documents | 200-500ms | ~1 GB |

### Optimization Strategies

1. **In-Memory Search**: All documents loaded in memory for fast search
2. **Sequential PDF Processing**: Avoids memory spikes
3. **Lazy Loading**: Search engine only loads when needed
4. **Pattern Caching**: Compiled regex patterns reused

## Security Considerations

1. **Path Validation**: All file paths validated before access
2. **Input Sanitization**: User inputs sanitized for file operations
3. **No Code Execution**: JSON parsing uses safe methods
4. **Sandboxed Operation**: Server runs in isolated process
5. **No Network Access**: Fully local operation

## Scalability

### Current Limits
- Recommended: Up to 1000 documents
- Maximum: ~5000 documents (memory dependent)
- PDF size: Up to 200 pages per document

### Future Scalability Improvements
1. **Database Backend**: SQLite or PostgreSQL for large datasets
2. **Indexed Search**: Full-text search indexes
3. **Pagination**: For large result sets
4. **Streaming**: Process large PDFs in chunks
5. **Vector Search**: Semantic search using embeddings

## Implementation Details

### PDF Text Extraction

The system uses the `pdf-parse` library which:
- Extracts text from PDF files without external dependencies
- Handles most standard PDF formats
- Returns page count and metadata
- Does not perform OCR (requires text-based PDFs)

### Section Detection Algorithm

The hierarchical section detection works as follows:

1. **Line-by-line parsing**: Processes PDF text line by line
2. **Pattern matching**: Applies regex patterns to identify headers
3. **State machine**: Maintains current section/subsection context
4. **Text accumulation**: Collects text until next header found
5. **Nesting**: Subsections nested under their parent sections

**Example flow:**
```
Input text:
"I. INTRODUCTION
This guidance provides...
A. Background
The FDA has established...
B. Purpose
This document aims to..."

Parsed structure:
Section: "I. INTRODUCTION"
├─ sectionText: "This guidance provides..."
├─ Subsection: "A. Background"
│  └─ subsectionText: "The FDA has established..."
└─ Subsection: "B. Purpose"
   └─ subsectionText: "This document aims to..."
```

### SmartSearch Pattern Generation

For query "clinical trial endpoints":

1. **Split into words**: ["clinical", "trial", "endpoints"]
2. **Exact patterns**: ["clinical", "trial", "endpoints"]
3. **Partial patterns**: ["cli", "tri", "end"] (first 3 letters)
4. **Matching logic**:
   - Text contains "clinical" → exact match (+10 points)
   - Text contains word starting with "cli" → partial match (+5 points)
   - Repeat for all terms
5. **Scoring**: Sum all matches + location bonuses

### File Naming Convention

Extracted JSON files are named based on document title:
- Remove special characters except spaces and hyphens
- Replace spaces with underscores
- Truncate to 100 characters
- Add `.json` extension

**Example:**
```
Document: "Guidance for Industry: Bioequivalence Studies with PK Endpoints"
Filename: "Guidance_for_Industry_Bioequivalence_Studies_with_PK_Endpoints.json"
```

## API Reference

### PDFExtractor Class

```typescript
class PDFExtractor {
  async extractPDF(filePath: string): Promise<ExtractionResult>
  async processDirectory(dirPath: string): Promise<GuidanceDocument[]>
  async saveToJSON(document: GuidanceDocument, outputPath: string): Promise<void>
  async saveAllToJSON(documents: GuidanceDocument[], outputPath: string): Promise<void>
}
```

### SearchEngine Class

```typescript
class SearchEngine {
  loadDocuments(documents: GuidanceDocument[]): void
  smartSearch(query: string, maxResults: number): SearchResult[]
  searchByDocumentName(query: string): GuidanceDocument[]
  searchByCenter(centerName: string): GuidanceDocument[]
  searchByStatus(status: 'draft' | 'final' | 'unknown'): GuidanceDocument[]
  getAllDocuments(): GuidanceDocument[]
  getStatistics(): Statistics
}
```

## Testing Strategy

### Unit Tests
- PDF extraction patterns
- Metadata extraction
- Search algorithm
- Relevance scoring

### Integration Tests
- End-to-end extraction
- Search across multiple documents
- File I/O operations

### Test Data
- Sample FDA guidance documents
- Edge cases: malformed PDFs, unusual structures
- Performance benchmarks

## Future Enhancements

### Phase 2 Features
1. **OCR Integration**: Process scanned PDFs
2. **Table Extraction**: Preserve table structure
3. **Vector Search**: Semantic similarity search
4. **NLP Enhancement**: Better section detection
5. **Multi-format Export**: CSV, Excel, Word

### Phase 3 Features
1. **Web Interface**: Browser-based search UI
2. **API Gateway**: REST API wrapper
3. **Collaborative Features**: Annotations, notes
4. **Version Control**: Track document revisions
5. **Analytics Dashboard**: Usage statistics

## Maintenance

### Regular Maintenance Tasks
1. Update dependencies monthly
2. Review and optimize search patterns
3. Test with new FDA document formats
4. Performance profiling
5. Security audits

### Backup Strategy
- Regular backup of `data/` directory
- Version control for code
- Document extracted document inventory

## Conclusion

This design provides a robust, scalable foundation for processing and searching FDA guidance documents. The modular architecture allows for easy enhancement and maintenance while providing excellent performance for typical use cases.
