# FDA Guidance MCP Server - Usage Examples

This document provides practical examples of using the FDA Guidance MCP Server.

## Table of Contents
1. [Extraction Examples](#extraction-examples)
2. [Search Examples](#search-examples)
3. [Integration Examples](#integration-examples)
4. [Advanced Use Cases](#advanced-use-cases)

## Extraction Examples

### Example 1: Extract Single PDF

**Scenario:** You have a new FDA guidance document on bioequivalence studies.

**Input (via Claude):**
```
Please extract the PDF file at pdfs/bioequivalence-guidance-2024.pdf
```

**Tool Call:**
```json
{
  "tool": "extract_pdf",
  "arguments": {
    "pdfPath": "C:/Users/SMITHLO/Downloads/fda-guidance-mcp/pdfs/bioequivalence-guidance-2024.pdf",
    "saveToFile": true
  }
}
```

**Output:**
```json
{
  "success": true,
  "document": {
    "documentName": "Guidance for Industry: Bioequivalence Studies with Pharmacokinetic Endpoints for Drugs Submitted Under an ANDA",
    "centerOrOfficeName": "Center for Drug Evaluation and Research",
    "documentStatus": "final",
    "date": "December 2013",
    "sections": [
      {
        "sectionTitle": "I. INTRODUCTION",
        "sectionText": "This guidance provides recommendations to applicants on the design of in vivo bioequivalence (BE) studies with pharmacokinetic (PK) endpoints...",
        "subsections": [],
        "pageNumber": 3
      },
      {
        "sectionTitle": "II. BACKGROUND",
        "sectionText": "The Federal Food, Drug, and Cosmetic Act (the FD&C Act) requires...",
        "subsections": [
          {
            "subsectionTitle": "A. Statutory and Regulatory Framework",
            "subsectionText": "Section 505(j) of the FD&C Act establishes an abbreviated approval pathway...",
            "pageNumber": 4
          },
          {
            "subsectionTitle": "B. Scientific Considerations",
            "subsectionText": "Bioequivalence is established when two products show comparable bioavailability...",
            "pageNumber": 5
          }
        ],
        "pageNumber": 4
      }
    ],
    "metadata": {
      "fileName": "bioequivalence-guidance-2024.pdf",
      "processedDate": "2024-01-15T14:30:00.000Z",
      "totalPages": 25
    }
  },
  "savedTo": "C:/Users/SMITHLO/Downloads/fda-guidance-mcp/data/Guidance_for_Industry_Bioequivalence_Studies.json"
}
```

### Example 2: Batch Extract All PDFs

**Scenario:** You have 10 FDA guidance documents to process.

**Input (via Claude):**
```
Please extract all PDF files from the pdfs directory
```

**Tool Call:**
```json
{
  "tool": "extract_all_pdfs",
  "arguments": {}
}
```

**Output:**
```json
{
  "success": true,
  "processedCount": 10,
  "documents": [
    {
      "name": "Guidance for Industry: Bioequivalence Studies",
      "status": "final",
      "center": "Center for Drug Evaluation and Research",
      "date": "December 2013"
    },
    {
      "name": "Guidance for Industry: Bioanalytical Method Validation",
      "status": "draft",
      "center": "Center for Drug Evaluation and Research",
      "date": "September 2013"
    },
    {
      "name": "Clinical Trial Endpoints for Approval of Cancer Drugs",
      "status": "final",
      "center": "Center for Drug Evaluation and Research",
      "date": "May 2018"
    }
  ],
  "savedTo": "C:/Users/SMITHLO/Downloads/fda-guidance-mcp/data/all_documents.json"
}
```

### Example 3: Extract with Warnings

**Scenario:** Processing a PDF with unclear structure.

**Output:**
```json
{
  "success": true,
  "document": {
    "documentName": "Quality Considerations in Demonstrating Biosimilarity",
    "centerOrOfficeName": "Center for Drug Evaluation and Research",
    "documentStatus": "draft",
    "date": "Unknown Date",
    "sections": [
      {
        "sectionTitle": "Full Document Content",
        "sectionText": "Quality Considerations in Demonstrating Biosimilarity to a Reference Product...",
        "subsections": [],
        "ocrUncertain": true
      }
    ],
    "metadata": {
      "fileName": "biosimilarity-quality.pdf",
      "processedDate": "2024-01-15T15:00:00.000Z",
      "totalPages": 15,
      "extractionNotes": [
        "No clear section structure found. Document may need manual review."
      ]
    }
  },
  "warnings": [
    "No clear section structure found. Document may need manual review."
  ]
}
```

## Search Examples

### Example 4: SmartSearch - Exact Match

**Scenario:** Looking for guidance on clinical trial endpoints.

**Input (via Claude):**
```
Search for "clinical trial endpoints" in the guidance documents
```

**Tool Call:**
```json
{
  "tool": "smart_search",
  "arguments": {
    "query": "clinical trial endpoints",
    "maxResults": 50
  }
}
```

**Output:**
```json
{
  "query": "clinical trial endpoints",
  "resultCount": 8,
  "results": [
    {
      "documentName": "Clinical Trial Endpoints for Approval of Cancer Drugs and Biologics",
      "documentStatus": "final",
      "centerOrOfficeName": "Center for Drug Evaluation and Research",
      "date": "May 2018",
      "matchLocation": "Document Name",
      "matchedText": "Clinical Trial Endpoints for Approval of Cancer Drugs and Biologics",
      "matchType": "exact",
      "relevanceScore": 55
    },
    {
      "documentName": "Clinical Trial Endpoints for Approval of Cancer Drugs and Biologics",
      "documentStatus": "final",
      "centerOrOfficeName": "Center for Drug Evaluation and Research",
      "date": "May 2018",
      "matchLocation": "Section: I. INTRODUCTION",
      "matchedText": "...This guidance describes the clinical trial endpoints that FDA considers acceptable to support approval of cancer treatment drugs...",
      "matchType": "exact",
      "relevanceScore": 40
    },
    {
      "documentName": "Guidance for Industry: Alzheimer's Disease",
      "documentStatus": "draft",
      "centerOrOfficeName": "Center for Drug Evaluation and Research",
      "date": "February 2018",
      "matchLocation": "Section: III. CLINICAL TRIALS / Subsection: A. Endpoints",
      "matchedText": "...Selection of appropriate clinical trial endpoints is critical for demonstrating efficacy...",
      "matchType": "exact",
      "relevanceScore": 32
    }
  ]
}
```

### Example 5: SmartSearch - Partial Match

**Scenario:** Searching with abbreviations or shortcuts.

**Input (via Claude):**
```
Search for "bio met val" (shorthand for bioanalytical method validation)
```

**Tool Call:**
```json
{
  "tool": "smart_search",
  "arguments": {
    "query": "bio met val",
    "maxResults": 50
  }
}
```

**How it works:**
- Query words: "bio", "met", "val"
- Exact patterns: ["bio", "met", "val"]
- Partial patterns (first 3 letters): ["bio", "met", "val"]
- Matches words starting with these letters: "bioanalytical", "method", "validation"

**Output:**
```json
{
  "query": "bio met val",
  "resultCount": 5,
  "results": [
    {
      "documentName": "Guidance for Industry: Bioanalytical Method Validation",
      "documentStatus": "draft",
      "centerOrOfficeName": "Center for Drug Evaluation and Research",
      "date": "September 2013",
      "matchLocation": "Document Name",
      "matchedText": "Guidance for Industry: Bioanalytical Method Validation",
      "matchType": "partial",
      "relevanceScore": 35
    },
    {
      "documentName": "Guidance for Industry: Bioanalytical Method Validation",
      "documentStatus": "draft",
      "centerOrOfficeName": "Center for Drug Evaluation and Research",
      "date": "September 2013",
      "matchLocation": "Section: I. INTRODUCTION",
      "matchedText": "...This guidance provides recommendations on bioanalytical method validation for studies...",
      "matchType": "partial",
      "relevanceScore": 28
    }
  ]
}
```

### Example 6: Search by Document Name

**Input (via Claude):**
```
Find all guidance documents about bioequivalence
```

**Tool Call:**
```json
{
  "tool": "search_by_document_name",
  "arguments": {
    "query": "bioequivalence"
  }
}
```

**Output:**
```json
{
  "query": "bioequivalence",
  "resultCount": 3,
  "documents": [
    {
      "documentName": "Guidance for Industry: Bioequivalence Studies with Pharmacokinetic Endpoints",
      "centerOrOfficeName": "Center for Drug Evaluation and Research",
      "documentStatus": "final",
      "date": "December 2013",
      "sections": [
        {
          "sectionTitle": "I. INTRODUCTION",
          "sectionText": "...",
          "subsections": []
        }
      ]
    },
    {
      "documentName": "Bioequivalence Recommendations for Specific Products",
      "centerOrOfficeName": "Center for Drug Evaluation and Research",
      "documentStatus": "final",
      "date": "Various",
      "sections": []
    }
  ]
}
```

### Example 7: Search by Center

**Input (via Claude):**
```
Show me all guidance from CBER
```

**Tool Call:**
```json
{
  "tool": "search_by_center",
  "arguments": {
    "centerName": "CBER"
  }
}
```

**Output:**
```json
{
  "center": "CBER",
  "resultCount": 5,
  "documents": [
    {
      "documentName": "Potency Testing for Cellular and Gene Therapy Products",
      "centerOrOfficeName": "Center for Biologics Evaluation and Research",
      "documentStatus": "final",
      "date": "January 2011",
      "sections": []
    },
    {
      "documentName": "Chemistry, Manufacturing, and Control (CMC) Information for Human Gene Therapy",
      "centerOrOfficeName": "Center for Biologics Evaluation and Research",
      "documentStatus": "draft",
      "date": "April 2020",
      "sections": []
    }
  ]
}
```

### Example 8: Search by Status

**Input (via Claude):**
```
Show me all draft guidance documents
```

**Tool Call:**
```json
{
  "tool": "search_by_status",
  "arguments": {
    "status": "draft"
  }
}
```

**Output:**
```json
{
  "status": "draft",
  "resultCount": 12,
  "documents": [
    {
      "documentName": "Guidance for Industry: Bioanalytical Method Validation",
      "centerOrOfficeName": "Center for Drug Evaluation and Research",
      "documentStatus": "draft",
      "date": "September 2013"
    }
  ]
}
```

### Example 9: Get Statistics

**Input (via Claude):**
```
What statistics do you have about the loaded documents?
```

**Tool Call:**
```json
{
  "tool": "get_statistics",
  "arguments": {}
}
```

**Output:**
```json
{
  "totalDocuments": 25,
  "draftCount": 12,
  "finalCount": 13,
  "unknownCount": 0,
  "centerCounts": {
    "Center for Drug Evaluation and Research": 15,
    "Center for Biologics Evaluation and Research": 7,
    "Center for Devices and Radiological Health": 3
  }
}
```

## Integration Examples

### Example 10: Research Workflow

**Scenario:** Researching FDA requirements for bioequivalence studies.

**Conversation with Claude:**

```
User: I need to understand FDA requirements for bioequivalence studies. 
Can you help me search the guidance documents?

Claude: I'll search for bioequivalence-related guidance documents.

[Uses smart_search tool with "bioequivalence"]

I found 3 highly relevant guidance documents:

1. "Guidance for Industry: Bioequivalence Studies with Pharmacokinetic Endpoints"
   - Final guidance from CDER (December 2013)
   - Covers study design, statistical analysis, and special populations

2. "Bioequivalence Recommendations for Specific Products"
   - Final guidance from CDER
   - Product-specific bioequivalence recommendations

Would you like me to get the full details of any of these documents?

User: Yes, please show me the full content of the first one.

Claude: [Uses get_document tool]

Here's the complete structure of that guidance:

**Document:** Guidance for Industry: Bioequivalence Studies with PK Endpoints

**Sections:**
I. INTRODUCTION
II. BACKGROUND
   A. Statutory and Regulatory Framework
   B. Scientific Considerations
III. GENERAL CONSIDERATIONS FOR BE STUDIES
   A. Study Design
   B. Study Population
   C. Reference Product

Would you like me to focus on any particular section?

User: What does it say about study design?

Claude: Looking at Section III.A "Study Design", the guidance recommends:

- BE studies should generally be single-dose, two-treatment, two-period, 
  two-sequence crossover designs
- Crossover design minimizes variability
- Washout period should be adequate to prevent carryover effects
- Specific recommendations for different drug formulations
```

### Example 11: Comparative Analysis

**Scenario:** Comparing draft vs. final versions of guidance.

**Conversation:**

```
User: Are there any draft guidances on clinical trial endpoints?

Claude: [Uses smart_search + search_by_status]

I found draft guidance documents mentioning clinical trial endpoints:

1. "Guidance for Industry: Alzheimer's Disease" (Draft, February 2018)
   - Section on clinical trial endpoints for Alzheimer's trials
   
2. "Guidance for Industry: Multiple Sclerosis" (Draft, May 2015)
   - Discusses acceptable endpoints for MS trials

There's also a final guidance on this topic:
"Clinical Trial Endpoints for Approval of Cancer Drugs" (Final, May 2018)

Would you like me to compare the draft and final recommendations?
```

### Example 12: Finding Specific Requirements

**Scenario:** Looking for specific regulatory requirements.

**Input:**
```
What does FDA guidance say about statistical methods for bioequivalence?
```

**Process:**
1. Search for "statistical methods bioequivalence"
2. Claude filters results to most relevant sections
3. Extracts specific requirements and recommendations

**Output:**
```
I found several relevant sections across 3 guidance documents:

From "Bioequivalence Studies with PK Endpoints" (CDER, Final):
Section IV.C - Statistical Methods:
- Use 90% confidence interval approach
- Bioequivalence is established when the 90% CI for the ratio 
  falls within 80.00-125.00%
- For highly variable drugs, may consider reference-scaled approaches

From "Statistical Approaches to Establishing Bioequivalence" (CDER, Draft):
- Provides detailed statistical procedures
- Addresses handling of outliers
- Discusses replicate designs
```

## Advanced Use Cases

### Example 13: Cross-Reference Analysis

**Scenario:** Finding all guidance that references a specific topic across different centers.

**Multi-step approach:**

```
1. Search for "bioequivalence"
2. Group results by center
3. Analyze which centers have related guidance
```

**Analysis Output:**
```
Bioequivalence Guidance Across FDA Centers:

CDER: 8 documents
- 6 final, 2 draft
- Topics: Generic drugs, ANDAs, complex products

CBER: 2 documents  
- 1 final, 1 draft
- Topics: Biosimilars, biological products

CDRH: 1 document
- 1 final
- Topics: In vitro diagnostics

Common themes:
- Study design requirements (10 mentions)
- Statistical analysis (8 mentions)
- Product-specific recommendations (7 mentions)
```

### Example 14: Timeline Analysis

**Scenario:** Understanding how guidance on a topic evolved over time.

**Approach:**
```
1. Search for "clinical trial endpoints"
2. Sort results by date
3. Analyze changes in recommendations
```

**Analysis:**
```
Evolution of Clinical Trial Endpoint Guidance:

2013: "Bioequivalence Studies"
- Focus: Traditional pharmacokinetic endpoints
- Key requirement: 90% CI approach

2015: "Patient-Reported Outcomes"
- Expansion: Patient experience measures
- New focus: PRO instrument development

2018: "Cancer Drug Endpoints"
- Addition: Biomarkers and surrogate endpoints
- Flexibility: Real-world evidence considerations

2020: "Adaptive Designs"
- Innovation: Interim analyses
- Modern: Digital health technologies

Trend: Increasing acceptance of novel endpoint types
```

### Example 15: Quality Assurance Check

**Scenario:** Identifying documents that may need re-extraction.

**Query:**
```
Which extracted documents have quality warnings?
```

**Result:**
```json
{
  "documentsWithWarnings": 5,
  "details": [
    {
      "documentName": "Quality Considerations for Biosimilarity",
      "issue": "No clear section structure found",
      "recommendation": "Manual review recommended"
    },
    {
      "documentName": "In Vitro Diagnostic Devices",
      "issue": "Uncertain section headings on pages 15-20",
      "recommendation": "Verify section boundaries"
    },
    {
      "documentName": "Adaptive Design Clinical Trials",
      "issue": "Complex table structure not preserved",
      "recommendation": "Review tables separately"
    }
  ]
}
```

## Tips for Effective Use

### 1. Search Strategy

**Broad to Narrow:**
```
Step 1: Search "clinical trials" → 50 results
Step 2: Filter by center (CDER) → 30 results
Step 3: Search "endpoints" within results → 8 results
```

**Use Partial Matching:**
```
Full query: "bioequivalence pharmacokinetic endpoints"
Shorthand: "bio pha end"
Result: Same matches, faster to type
```

**Combine Methods:**
```
1. smart_search("diabetes") → Find all diabetes guidance
2. search_by_status("final") → Filter to final only
3. Review most recent by date
```

### 2. Extraction Best Practices

**Batch Processing:**
```
✅ Good: Extract all 50 PDFs at once
❌ Avoid: Extract PDFs one at a time
```

**Verify Quality:**
```
1. Run extract_all_pdfs
2. Check for warnings in output
3. Review documents with ocrUncertain flag
4. Re-download problematic PDFs if needed
```

### 3. Data Management

**Backup Strategy:**
```
Weekly: Copy data/ folder to backup location
Monthly: Archive with date (data_2024_01/)
Before re-extraction: Save current data/
```

**Organization:**
```
pdfs/
├── CDER/
├── CBER/
└── CDRH/

Or by topic:
pdfs/
├── bioequivalence/
├── clinical-trials/
└── manufacturing/
```

### 4. Common Search Patterns

**Finding Requirements:**
```
Query: "must" OR "shall" OR "required"
Purpose: Identify mandatory requirements
```

**Finding Recommendations:**
```
Query: "should" OR "recommend" OR "consider"
Purpose: Identify non-binding recommendations
```

**Finding Examples:**
```
Query: "example" OR "for instance"
Purpose: Find illustrative examples
```

**Finding Definitions:**
```
Query: "defined as" OR "means"
Purpose: Extract terminology definitions
```

## Real-World Workflows

### Workflow 1: Regulatory Compliance

```
Task: Ensure compliance with current FDA guidance

Steps:
1. Extract all relevant guidance documents
2. Filter by status = "final" (binding)
3. Search for specific requirements in your area
4. Create compliance checklist
5. Cross-reference with internal procedures
```

### Workflow 2: Research & Development

```
Task: Design a new clinical trial

Steps:
1. Search for "clinical trial" + your indication
2. Review endpoint recommendations
3. Search for "statistical methods"
4. Extract study design requirements
5. Compile into protocol template
```

### Workflow 3: Regulatory Strategy

```
Task: Prepare regulatory submission strategy

Steps:
1. Search by product type
2. Identify all applicable guidance
3. Search for "submission" requirements
4. Extract timelines and milestones
5. Build submission roadmap
```

### Workflow 4: Monitoring Updates

```
Task: Stay current with new guidance

Steps:
1. Periodically extract new PDFs
2. Compare with previous extractions
3. Identify new or updated documents
4. Review changes in recommendations
5. Update internal procedures
```

## Performance Tips

**Optimize Search Results:**
```
✅ Use maxResults parameter wisely
   - Quick scan: maxResults = 10
   - Comprehensive: maxResults = 50
   - Full corpus: maxResults = 100+

✅ Load documents once per session
   - Run load_documents at start
   - Keep session open for multiple searches
```

**Handle Large Result Sets:**
```
If getting too many results:
1. Add more specific terms to query
2. Filter by center or status first
3. Use exact phrases in quotes (if supported)
4. Narrow date range
```

---

These examples demonstrate the full capabilities of the FDA Guidance MCP Server. Adapt them to your specific research and compliance needs!
