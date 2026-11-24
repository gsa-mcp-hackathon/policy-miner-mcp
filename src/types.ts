/**
 * Type definitions for FDA Guidance Document Processing
 */

export interface Subsection {
  subsectionTitle: string;
  subsectionText: string;
  pageNumber?: number;
  ocrUncertain?: boolean;
}

export interface Section {
  sectionTitle: string;
  sectionText: string;
  subsections: Subsection[];
  pageNumber?: number;
  ocrUncertain?: boolean;
}

export interface GuidanceDocument {
  documentName: string;
  centerOrOfficeName: string;
  documentStatus: 'draft' | 'final' | 'unknown';
  date: string; // Format: "Month Year" e.g., "January 2024"
  sections: Section[];
  metadata?: {
    fileName: string;
    processedDate: string;
    totalPages?: number;
    extractionNotes?: string[];
  };
}

export interface SearchResult {
  documentName: string;
  documentStatus: string;
  centerOrOfficeName: string;
  date: string;
  matchLocation: string; // e.g., "Section: Title / Subsection: Title"
  matchedText: string; // Context around the match
  matchType: 'exact' | 'partial';
  relevanceScore: number;
}

export interface ExtractionResult {
  success: boolean;
  document?: GuidanceDocument;
  errors?: string[];
  warnings?: string[];
}
