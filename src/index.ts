#!/usr/bin/env node

/**
 * FDA Guidance MCP Server
 * Main entry point for the Model Context Protocol server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { PDFExtractor } from './pdf-extractor.js';
import { SearchEngine } from './search-engine.js';
import { GuidanceDocument } from './types.js';
import fs from 'fs/promises';
import path from 'path';

class FDAGuidanceMCPServer {
  private server: Server;
  private pdfExtractor: PDFExtractor;
  private searchEngine: SearchEngine;
  private dataPath: string;
  private pdfPath: string;

  constructor() {
    this.server = new Server(
      {
        name: 'fda-guidance-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        },
      }
    );

    this.pdfExtractor = new PDFExtractor();
    this.searchEngine = new SearchEngine();

    // Default paths - can be configured via environment variables
    this.dataPath = process.env.FDA_DATA_PATH || path.join(process.cwd(), 'data');
    this.pdfPath = process.env.FDA_PDF_PATH || path.join(process.cwd(), 'pdfs');

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'extract_pdf',
          description: 'Extract structured content from a single FDA guidance PDF file',
          inputSchema: {
            type: 'object',
            properties: {
              pdfPath: {
                type: 'string',
                description: 'Path to the PDF file to extract'
              },
              saveToFile: {
                type: 'boolean',
                description: 'Whether to save the extracted data to a JSON file (default: true)'
              }
            },
            required: ['pdfPath']
          }
        },
        {
          name: 'extract_all_pdfs',
          description: 'Extract content from all PDF files in the configured PDF directory',
          inputSchema: {
            type: 'object',
            properties: {
              directoryPath: {
                type: 'string',
                description: 'Optional: Override the default PDF directory path'
              }
            }
          }
        },
        {
          name: 'smart_search',
          description: 'Search across all guidance documents using full terms or first 3 letters of each word',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (supports partial matching with first 3 letters)'
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results to return (default: 50)'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'search_by_document_name',
          description: 'Search for documents by name',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Document name or partial name to search for'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'search_by_center',
          description: 'Search for documents by center or office name',
          inputSchema: {
            type: 'object',
            properties: {
              centerName: {
                type: 'string',
                description: 'Center or office name (e.g., CDER, CBER)'
              }
            },
            required: ['centerName']
          }
        },
        {
          name: 'search_by_status',
          description: 'Search for documents by status (draft or final)',
          inputSchema: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['draft', 'final', 'unknown'],
                description: 'Document status to filter by'
              }
            },
            required: ['status']
          }
        },
        {
          name: 'get_document',
          description: 'Get a specific document by name',
          inputSchema: {
            type: 'object',
            properties: {
              documentName: {
                type: 'string',
                description: 'Exact document name'
              }
            },
            required: ['documentName']
          }
        },
        {
          name: 'get_statistics',
          description: 'Get statistics about the loaded documents',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'load_documents',
          description: 'Load extracted documents from the data directory into the search engine',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Optional: Specific JSON file to load. If not provided, loads all_documents.json'
              }
            }
          }
        }
      ]
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'fda://documents/all',
          name: 'All FDA Guidance Documents',
          description: 'Complete list of all extracted guidance documents',
          mimeType: 'application/json'
        },
        {
          uri: 'fda://statistics',
          name: 'Document Statistics',
          description: 'Statistics about loaded documents',
          mimeType: 'application/json'
        }
      ]
    }));

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri.toString();

      if (uri === 'fda://documents/all') {
        const docs = this.searchEngine.getAllDocuments();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(docs, null, 2)
          }]
        };
      }

      if (uri === 'fda://statistics') {
        const stats = this.searchEngine.getStatistics();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(stats, null, 2)
          }]
        };
      }

      throw new McpError(
        ErrorCode.InvalidRequest,
        `Unknown resource: ${uri}`
      );
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'extract_pdf':
            return await this.handleExtractPDF(args);

          case 'extract_all_pdfs':
            return await this.handleExtractAllPDFs(args);

          case 'smart_search':
            return await this.handleSmartSearch(args);

          case 'search_by_document_name':
            return await this.handleSearchByDocumentName(args);

          case 'search_by_center':
            return await this.handleSearchByCenter(args);

          case 'search_by_status':
            return await this.handleSearchByStatus(args);

          case 'get_document':
            return await this.handleGetDocument(args);

          case 'get_statistics':
            return await this.handleGetStatistics();

          case 'load_documents':
            return await this.handleLoadDocuments(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async handleExtractPDF(args: any) {
    const pdfPath = args.pdfPath as string;
    const saveToFile = args.saveToFile !== false; // Default true

    const result = await this.pdfExtractor.extractPDF(pdfPath);

    if (!result.success || !result.document) {
      return {
        content: [{
          type: 'text',
          text: `Failed to extract PDF:\n${result.errors?.join('\n')}`
        }]
      };
    }

    const doc = result.document;

    // Save to individual file
    if (saveToFile) {
      await this.ensureDataDirectory();
      const fileName = `${this.sanitizeFileName(doc.documentName)}.json`;
      const outputPath = path.join(this.dataPath, fileName);
      await this.pdfExtractor.saveToJSON(doc, outputPath);

      // Also update the all_documents.json file
      await this.updateAllDocuments(doc);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          document: doc,
          warnings: result.warnings,
          savedTo: saveToFile ? path.join(this.dataPath, `${this.sanitizeFileName(doc.documentName)}.json`) : null
        }, null, 2)
      }]
    };
  }

  private async handleExtractAllPDFs(args: any) {
    const dirPath = args.directoryPath || this.pdfPath;

    await this.ensureDataDirectory();

    const documents = await this.pdfExtractor.processDirectory(dirPath);

    // Save all documents to individual files and combined file
    for (const doc of documents) {
      const fileName = `${this.sanitizeFileName(doc.documentName)}.json`;
      const outputPath = path.join(this.dataPath, fileName);
      await this.pdfExtractor.saveToJSON(doc, outputPath);
    }

    // Save combined file
    const allDocsPath = path.join(this.dataPath, 'all_documents.json');
    await this.pdfExtractor.saveAllToJSON(documents, allDocsPath);

    // Load into search engine
    this.searchEngine.loadDocuments(documents);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          processedCount: documents.length,
          documents: documents.map(d => ({
            name: d.documentName,
            status: d.documentStatus,
            center: d.centerOrOfficeName,
            date: d.date
          })),
          savedTo: allDocsPath
        }, null, 2)
      }]
    };
  }

  private async handleSmartSearch(args: any) {
    const query = args.query as string;
    const maxResults = args.maxResults || 50;

    const results = this.searchEngine.smartSearch(query, maxResults);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query,
          resultCount: results.length,
          results
        }, null, 2)
      }]
    };
  }

  private async handleSearchByDocumentName(args: any) {
    const query = args.query as string;
    const results = this.searchEngine.searchByDocumentName(query);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query,
          resultCount: results.length,
          documents: results
        }, null, 2)
      }]
    };
  }

  private async handleSearchByCenter(args: any) {
    const centerName = args.centerName as string;
    const results = this.searchEngine.searchByCenter(centerName);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          center: centerName,
          resultCount: results.length,
          documents: results
        }, null, 2)
      }]
    };
  }

  private async handleSearchByStatus(args: any) {
    const status = args.status as 'draft' | 'final' | 'unknown';
    const results = this.searchEngine.searchByStatus(status);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status,
          resultCount: results.length,
          documents: results
        }, null, 2)
      }]
    };
  }

  private async handleGetDocument(args: any) {
    const documentName = args.documentName as string;
    const docs = this.searchEngine.searchByDocumentName(documentName);
    const doc = docs.find(d => d.documentName === documentName);

    if (!doc) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Document not found' }, null, 2)
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(doc, null, 2)
      }]
    };
  }

  private async handleGetStatistics() {
    const stats = this.searchEngine.getStatistics();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(stats, null, 2)
      }]
    };
  }

  private async handleLoadDocuments(args: any) {
    const filePath = args.filePath || path.join(this.dataPath, 'all_documents.json');

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const documents: GuidanceDocument[] = JSON.parse(content);
      this.searchEngine.loadDocuments(documents);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            loadedCount: documents.length,
            source: filePath
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }]
      };
    }
  }

  private async ensureDataDirectory() {
    try {
      await fs.access(this.dataPath);
    } catch {
      await fs.mkdir(this.dataPath, { recursive: true });
    }
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 100);
  }

  private async updateAllDocuments(newDoc: GuidanceDocument) {
    const allDocsPath = path.join(this.dataPath, 'all_documents.json');

    let documents: GuidanceDocument[] = [];

    try {
      const content = await fs.readFile(allDocsPath, 'utf-8');
      documents = JSON.parse(content);
    } catch {
      // File doesn't exist yet
    }

    // Remove existing document with same name
    documents = documents.filter(d => d.documentName !== newDoc.documentName);

    // Add new document
    documents.push(newDoc);

    // Save updated list
    await this.pdfExtractor.saveAllToJSON(documents, allDocsPath);

    // Reload into search engine
    this.searchEngine.loadDocuments(documents);
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('FDA Guidance MCP Server running on stdio');
    console.error(`PDF Path: ${this.pdfPath}`);
    console.error(`Data Path: ${this.dataPath}`);
  }
}

// Start the server
const server = new FDAGuidanceMCPServer();
server.run().catch(console.error);
