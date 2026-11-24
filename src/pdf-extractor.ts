/**
 * PDF Extraction Module
 * Extracts structured content from FDA guidance documents
 */

import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import { GuidanceDocument, Section, Subsection, ExtractionResult } from './types.js';

export class PDFExtractor {

  /**
   * Extract text from PDF file
   */
  async extractPDF(filePath: string): Promise<ExtractionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);

      const fileName = path.basename(filePath);
      const rawText = pdfData.text;
      const totalPages = pdfData.numpages;

      // Extract document metadata
      const documentName = this.extractDocumentName(rawText, fileName);
      const centerOrOfficeName = this.extractCenterName(rawText);
      const documentStatus = this.extractDocumentStatus(rawText);
      const date = this.extractDate(rawText);

      // Extract sections and subsections
      const sections = this.extractSections(rawText);

      if (sections.length === 0) {
        warnings.push('No clear section structure found. Document may need manual review.');
      }

      const document: GuidanceDocument = {
        documentName,
        centerOrOfficeName,
        documentStatus,
        date,
        sections,
        metadata: {
          fileName,
          processedDate: new Date().toISOString(),
          totalPages,
          extractionNotes: warnings.length > 0 ? warnings : undefined
        }
      };

      return {
        success: true,
        document,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      errors.push(`Failed to process PDF: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        errors
      };
    }
  }

  /**
   * Extract document name from text or filename
   */
  private extractDocumentName(text: string, fileName: string): string {
    // Look for common patterns in FDA guidance documents
    const lines = text.split('\n').slice(0, 20); // Check first 20 lines

    // Pattern 1: "Guidance for Industry"
    for (const line of lines) {
      if (line.match(/Guidance for (Industry|FDA Staff)/i)) {
        const nextLines = lines.slice(lines.indexOf(line), lines.indexOf(line) + 5);
        const title = nextLines
          .filter(l => l.trim().length > 10 && !l.match(/Draft|Final|FDA|CDER|CBER|Page \d+/i))
          .map(l => l.trim())
          .join(' ')
          .slice(0, 200);
        if (title.length > 10) return title;
      }
    }

    // Pattern 2: Look for bold or all-caps title
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 20 && trimmed.length < 150 && trimmed === trimmed.toUpperCase()) {
        return trimmed;
      }
    }

    // Fallback: Use filename without extension
    return fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
  }

  /**
   * Extract center or office name
   */
  private extractCenterName(text: string): string {
    const centers = [
      'Center for Drug Evaluation and Research',
      'Center for Biologics Evaluation and Research',
      'Center for Devices and Radiological Health',
      'Center for Food Safety and Applied Nutrition',
      'Center for Veterinary Medicine',
      'Office of Regulatory Affairs',
      'CDER',
      'CBER',
      'CDRH',
      'CFSAN',
      'CVM'
    ];

    const firstPage = text.slice(0, 2000);

    for (const center of centers) {
      const regex = new RegExp(center, 'i');
      if (regex.test(firstPage)) {
        return center;
      }
    }

    return 'Unknown Center';
  }

  /**
   * Extract document status (draft or final)
   */
  private extractDocumentStatus(text: string): 'draft' | 'final' | 'unknown' {
    const firstPage = text.slice(0, 1500).toLowerCase();

    if (firstPage.includes('draft guidance')) {
      return 'draft';
    }
    if (firstPage.includes('final guidance')) {
      return 'final';
    }

    // Check for "Contains Nonbinding Recommendations" (common in final)
    if (firstPage.includes('contains nonbinding recommendations')) {
      return 'final';
    }

    return 'unknown';
  }

  /**
   * Extract date (month and year)
   */
  private extractDate(text: string): string {
    const firstPage = text.slice(0, 2000);

    // Pattern 1: "Month Year" (e.g., "January 2024")
    const monthYearPattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;
    const match1 = firstPage.match(monthYearPattern);
    if (match1) {
      return `${match1[1]} ${match1[2]}`;
    }

    // Pattern 2: "Month DD, YYYY"
    const fullDatePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(\d{4})/i;
    const match2 = firstPage.match(fullDatePattern);
    if (match2) {
      return `${match2[1]} ${match2[2]}`;
    }

    // Pattern 3: MM/YYYY or MM/DD/YYYY
    const numericPattern = /(\d{1,2})\/(\d{1,2}\/)?(\d{4})/;
    const match3 = firstPage.match(numericPattern);
    if (match3) {
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
      const monthNum = parseInt(match3[1]) - 1;
      if (monthNum >= 0 && monthNum < 12) {
        return `${months[monthNum]} ${match3[3]}`;
      }
    }

    return 'Unknown Date';
  }

  /**
   * Extract sections and subsections with hierarchical structure
   */
  private extractSections(text: string): Section[] {
    const sections: Section[] = [];
    const lines = text.split('\n');

    // Common section patterns in FDA guidance documents
    const sectionPatterns = [
      /^[A-Z][.\s]+[A-Z][^a-z]{10,100}$/,  // "I. INTRODUCTION"
      /^[IVX]+\.\s+[A-Z][A-Za-z\s]{5,100}$/,  // "I. Introduction"
      /^\d+\.\s+[A-Z][A-Za-z\s]{5,100}$/,     // "1. Introduction"
      /^[A-Z][A-Z\s]{10,100}$/                 // "INTRODUCTION"
    ];

    const subsectionPatterns = [
      /^[A-Z]\.\s+[A-Z][A-Za-z\s]{5,100}$/,   // "A. Background"
      /^\d+\.\d+\s+[A-Z][A-Za-z\s]{5,100}$/,  // "1.1 Background"
      /^[a-z]\.\s+[A-Z][A-Za-z\s]{5,100}$/    // "a. Background"
    ];

    let currentSection: Section | null = null;
    let currentSubsection: Subsection | null = null;
    let currentText: string[] = [];
    let pageNumber = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Track page numbers
      if (line.match(/^Page \d+/i) || line.match(/^\d+\s*$/)) {
        const pageMatch = line.match(/\d+/);
        if (pageMatch) {
          pageNumber = parseInt(pageMatch[0]);
        }
        continue;
      }

      // Skip empty lines
      if (line.length === 0) continue;

      // Check if this is a major section header
      const isSectionHeader = sectionPatterns.some(pattern => pattern.test(line));

      // Check if this is a subsection header
      const isSubsectionHeader = subsectionPatterns.some(pattern => pattern.test(line));

      if (isSectionHeader) {
        // Save previous section
        if (currentSection) {
          if (currentSubsection) {
            currentSubsection.subsectionText = currentText.join(' ').trim();
            currentSection.subsections.push(currentSubsection);
            currentSubsection = null;
          } else if (currentText.length > 0) {
            currentSection.sectionText = currentText.join(' ').trim();
          }
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          sectionTitle: line,
          sectionText: '',
          subsections: [],
          pageNumber
        };
        currentText = [];

      } else if (isSubsectionHeader && currentSection) {
        // Save previous subsection
        if (currentSubsection) {
          currentSubsection.subsectionText = currentText.join(' ').trim();
          currentSection.subsections.push(currentSubsection);
        } else if (currentText.length > 0) {
          currentSection.sectionText = currentText.join(' ').trim();
        }

        // Start new subsection
        currentSubsection = {
          subsectionTitle: line,
          subsectionText: '',
          pageNumber
        };
        currentText = [];

      } else {
        // Regular text content
        currentText.push(line);
      }
    }

    // Save the last section/subsection
    if (currentSection) {
      if (currentSubsection) {
        currentSubsection.subsectionText = currentText.join(' ').trim();
        currentSection.subsections.push(currentSubsection);
      } else if (currentText.length > 0) {
        currentSection.sectionText = currentText.join(' ').trim();
      }
      sections.push(currentSection);
    }

    // If no sections were found, create a single section with all content
    if (sections.length === 0 && lines.length > 0) {
      sections.push({
        sectionTitle: 'Full Document Content',
        sectionText: text.trim(),
        subsections: [],
        ocrUncertain: true
      });
    }

    return sections;
  }

  /**
   * Process all PDFs in a directory
   */
  async processDirectory(dirPath: string): Promise<GuidanceDocument[]> {
    const documents: GuidanceDocument[] = [];
    const files = await fs.readdir(dirPath);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    for (const file of pdfFiles) {
      const filePath = path.join(dirPath, file);
      console.error(`Processing: ${file}`);

      const result = await this.extractPDF(filePath);

      if (result.success && result.document) {
        documents.push(result.document);
      } else {
        console.error(`Failed to process ${file}:`, result.errors);
      }
    }

    return documents;
  }

  /**
   * Save extracted document to JSON
   */
  async saveToJSON(document: GuidanceDocument, outputPath: string): Promise<void> {
    const json = JSON.stringify(document, null, 2);
    await fs.writeFile(outputPath, json, 'utf-8');
  }

  /**
   * Save all documents to a single JSON file
   */
  async saveAllToJSON(documents: GuidanceDocument[], outputPath: string): Promise<void> {
    const json = JSON.stringify(documents, null, 2);
    await fs.writeFile(outputPath, json, 'utf-8');
  }
}
