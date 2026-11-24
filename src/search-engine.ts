/**
 * Search Engine Module
 * Provides SmartSearch capability across all guidance documents
 */

import { GuidanceDocument, SearchResult } from './types.js';

export class SearchEngine {
  private documents: GuidanceDocument[] = [];

  /**
   * Load documents into the search engine
   */
  loadDocuments(documents: GuidanceDocument[]): void {
    this.documents = documents;
  }

  /**
   * SmartSearch: Search using full term or first 3 letters of each word
   * @param query - The search query
   * @param maxResults - Maximum number of results to return (default: 50)
   */
  smartSearch(query: string, maxResults: number = 50): SearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const results: SearchResult[] = [];
    const normalizedQuery = query.toLowerCase().trim();

    // Generate search patterns
    const searchPatterns = this.generateSearchPatterns(normalizedQuery);

    // Search through all documents
    for (const doc of this.documents) {
      // Search in document name
      this.searchInText(
        doc.documentName,
        searchPatterns,
        doc,
        'Document Name',
        results
      );

      // Search in center/office name
      this.searchInText(
        doc.centerOrOfficeName,
        searchPatterns,
        doc,
        'Center/Office Name',
        results
      );

      // Search in sections
      for (const section of doc.sections) {
        // Search in section title
        this.searchInText(
          section.sectionTitle,
          searchPatterns,
          doc,
          `Section: ${section.sectionTitle}`,
          results
        );

        // Search in section text
        this.searchInText(
          section.sectionText,
          searchPatterns,
          doc,
          `Section: ${section.sectionTitle}`,
          results
        );

        // Search in subsections
        for (const subsection of section.subsections) {
          // Search in subsection title
          this.searchInText(
            subsection.subsectionTitle,
            searchPatterns,
            doc,
            `Section: ${section.sectionTitle} / Subsection: ${subsection.subsectionTitle}`,
            results
          );

          // Search in subsection text
          this.searchInText(
            subsection.subsectionText,
            searchPatterns,
            doc,
            `Section: ${section.sectionTitle} / Subsection: ${subsection.subsectionTitle}`,
            results
          );
        }
      }
    }

    // Sort by relevance score (highest first)
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Return top results
    return results.slice(0, maxResults);
  }

  /**
   * Generate search patterns from query
   * Creates both exact match and "first 3 letters" patterns
   */
  private generateSearchPatterns(query: string): {
    exact: string[];
    partial: string[];
  } {
    const words = query.split(/\s+/).filter(w => w.length > 0);

    const exact = words.map(w => w.toLowerCase());

    // For partial match, use first 3 letters of each word
    const partial = words.map(w => {
      if (w.length >= 3) {
        return w.slice(0, 3).toLowerCase();
      }
      return w.toLowerCase();
    });

    return { exact, partial };
  }

  /**
   * Search for patterns in text and add matches to results
   */
  private searchInText(
    text: string,
    patterns: { exact: string[]; partial: string[] },
    doc: GuidanceDocument,
    location: string,
    results: SearchResult[]
  ): void {
    if (!text) return;

    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    // Check for exact matches
    let exactMatches = 0;
    let partialMatches = 0;

    for (const exactPattern of patterns.exact) {
      if (lowerText.includes(exactPattern)) {
        exactMatches++;
      }
    }

    // Check for partial matches (first 3 letters)
    if (exactMatches < patterns.exact.length) {
      for (const partialPattern of patterns.partial) {
        for (const word of words) {
          if (word.startsWith(partialPattern)) {
            partialMatches++;
            break;
          }
        }
      }
    }

    // If we have matches, create a result
    if (exactMatches > 0 || partialMatches > 0) {
      const matchType = exactMatches === patterns.exact.length ? 'exact' : 'partial';

      // Calculate relevance score
      const relevanceScore = this.calculateRelevance(
        exactMatches,
        partialMatches,
        patterns.exact.length,
        location,
        text
      );

      // Extract context around the match
      const matchedText = this.extractContext(text, patterns.exact[0] || patterns.partial[0], 150);

      results.push({
        documentName: doc.documentName,
        documentStatus: doc.documentStatus,
        centerOrOfficeName: doc.centerOrOfficeName,
        date: doc.date,
        matchLocation: location,
        matchedText,
        matchType,
        relevanceScore
      });
    }
  }

  /**
   * Calculate relevance score for a match
   */
  private calculateRelevance(
    exactMatches: number,
    partialMatches: number,
    totalTerms: number,
    location: string,
    text: string
  ): number {
    let score = 0;

    // Exact matches are worth more
    score += exactMatches * 10;

    // Partial matches are worth less
    score += partialMatches * 5;

    // Boost for matching all terms
    if (exactMatches === totalTerms) {
      score += 20;
    }

    // Boost for matches in titles
    if (location.includes('Document Name')) {
      score += 15;
    } else if (location.includes('Section:') && !location.includes('/')) {
      score += 10;
    } else if (location.includes('Subsection:')) {
      score += 7;
    }

    // Penalize very long text (likely less specific)
    if (text.length > 1000) {
      score -= 5;
    }

    return Math.max(0, score);
  }

  /**
   * Extract context around a match
   */
  private extractContext(text: string, term: string, contextLength: number): string {
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();

    const index = lowerText.indexOf(lowerTerm);

    if (index === -1) {
      // If exact match not found, return beginning of text
      return text.slice(0, contextLength) + (text.length > contextLength ? '...' : '');
    }

    // Calculate start and end positions for context
    const start = Math.max(0, index - Math.floor(contextLength / 2));
    const end = Math.min(text.length, index + term.length + Math.floor(contextLength / 2));

    let context = text.slice(start, end);

    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }

  /**
   * Search by document name
   */
  searchByDocumentName(query: string): GuidanceDocument[] {
    const lowerQuery = query.toLowerCase();
    return this.documents.filter(doc =>
      doc.documentName.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Search by center/office
   */
  searchByCenter(centerName: string): GuidanceDocument[] {
    const lowerCenter = centerName.toLowerCase();
    return this.documents.filter(doc =>
      doc.centerOrOfficeName.toLowerCase().includes(lowerCenter)
    );
  }

  /**
   * Search by status
   */
  searchByStatus(status: 'draft' | 'final' | 'unknown'): GuidanceDocument[] {
    return this.documents.filter(doc => doc.documentStatus === status);
  }

  /**
   * Search by date range
   */
  searchByDateRange(startDate: string, endDate: string): GuidanceDocument[] {
    // This is a simple implementation - could be enhanced with proper date parsing
    return this.documents.filter(doc => {
      return doc.date >= startDate && doc.date <= endDate;
    });
  }

  /**
   * Get all documents
   */
  getAllDocuments(): GuidanceDocument[] {
    return this.documents;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalDocuments: number;
    draftCount: number;
    finalCount: number;
    unknownCount: number;
    centerCounts: Record<string, number>;
  } {
    const stats = {
      totalDocuments: this.documents.length,
      draftCount: 0,
      finalCount: 0,
      unknownCount: 0,
      centerCounts: {} as Record<string, number>
    };

    for (const doc of this.documents) {
      if (doc.documentStatus === 'draft') stats.draftCount++;
      else if (doc.documentStatus === 'final') stats.finalCount++;
      else stats.unknownCount++;

      stats.centerCounts[doc.centerOrOfficeName] =
        (stats.centerCounts[doc.centerOrOfficeName] || 0) + 1;
    }

    return stats;
  }
}
