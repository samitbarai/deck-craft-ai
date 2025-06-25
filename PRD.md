## Product Name

**DeckCraft AI** — An AI-powered pitch ingestion and slide-generation tool that learns from your existing Juspay pitch decks to craft tailored presentations via Figma templates.

## Document Control

- **Version:** 1.1
- **Date:** June 26, 2025
- **Author:** Samit Barai

---

## 1. Executive Summary

DeckCraft AI focuses on two core pillars:

1. **Automated Ingestion & Research Acceleration** — Rapidly ingest historical PDF decks and, based on industry and geography metadata, generate a content strategy outline for a new merchant.
2. **Programmatic Slide Generation** — Populate Figma slide templates automatically with AI-drafted content, minimizing manual slide creation.

By combining these, BD teams cut research time and slide-build effort in half, while ensuring consistency and relevance.

## 2. Goals & Objectives

- **Accelerate BD Research**: From uploaded decks and merchant context (industry, region), auto-suggest pitch structure and content themes.
- **Automate Slide Creation**: Generate ready-to-review Figma slides with draft text and placeholder visuals.
- **Maintain Brand Consistency**: Use standardized Figma templates.
- **Enable Feedback Loop**: Capture edits to refine AI outputs.

## 3. User Personas

1. **BD Executive:** Wants quick content outlines and draft slides based on merchant profile.
2. **Design Lead:** Reviews generated Figma slides for brand alignment.
3. **Product Owner:** Tracks ingestion volumes and slide-generation metrics; iterates templates.

## 4. Use Cases & User Stories

- **Use Case 1:** As a BD Executive, I upload PDF decks and input merchant industry/geography; I receive slide-wise content strategy and Figma deck draft.
- **Use Case 2:** As a Design Lead, I review AI-populated Figma files, tweak as needed, and approve.
- **Use Case 3:** As a Product Owner, I monitor time saved on research vs. manual creation and slide adoption rates.

## 5. Functional Requirements

### 5.1 Ingestion & Contextual Strategy

- **Batch PDF Import:** Upload multiple pitch PDFs containing text and images.
- **Metadata Tagging:** Capture merchant industry and geography inputs.
- **Content Outline API:** `/generateOutline` returns section breakdown and key themes per slide based on merchant context.

### 5.2 Image Extraction & Reuse

- **Image Parsing:** Detect and extract images (e.g., charts, logos, diagrams) from PDFs using an OCR- and vision-based pipeline.
- **Asset Catalog:** Store extracted images in an asset repository (S3 or equivalent) with tags for slide section, context, and visual type.
- **Image Retrieval API:** `/retrieveAssets` returns recommended images for a given slide section, industry, or geography.
- **Figma Image Insertion:** Populate Figma templates with placeholder frames linked to retrieved image URLs; allow BD to swap or approve assets.

### 5.3 Slide Generation via Figma

- **Figma Template Library:** Predefined slide frames in Figma with style tokens.
- **Populate Content API:** `/createFigmaSlides` accepts outline + merchant info + asset references → generates a Figma file with text layers and image frames populated.
- **Manual Edit Hooks:** Expose editable text nodes and image slots for quick BD adjustments.

## 6. Tech Stack. Tech Stack

- **Frontend:** Vite (React + TypeScript) for the review dashboard.
- **Backend:** Node.js with Express; Postgres for relational data.
- **Vector Database:** Vespa for slide-chunk embeddings and RAG retrieval
  **Embedding Model:** OpenAI’s text-embedding-ada-002 for generating high-quality embeddings
- **LLM Provider:** OpenAI GPT-4 via API.
- **Slide Hosting:** Figma REST API for file creation and updates.

## 7. Non-Functional Requirements

- **Performance:** Outline generation < 3s; Figma slide creation < 5s.
- **Scalability:** Support 500 concurrent ingestion jobs; 50 parallel Figma exports.
- **Security:** OAuth2 for Figma; encrypt merchant data in Postgres.
- **Reliability:** 99.5% uptime for ingestion and export endpoints.

## 8. RAG Explained (Layman’s Terms)

Retrieval-Augmented Generation (RAG) works by:

1. **Remembering Examples:** We store bits of your past decks in Vespa so the AI has concrete examples.
2. **Finding the Best Fit:** When you request a new slide, we search Vespa for the most relevant past slides (based on your merchant’s profile).
3. **Smart Writing:** We feed those examples to GPT-4 along with your request, so it writes new content that matches your style and the merchant’s context.

Think of RAG like a chef who tastes your past dishes first, then crafts a new recipe tailored to a new guest’s palate.

## 9. Data Flow

1. **Upload & Tag:** User uploads PDFs + chooses industry/geography.
2. **Embed & Index:** Backend extracts text chunks → embeds → stores in Vespa.
3. **Outline Request:** Frontend calls `/generateOutline` → retrieves top-k slide examples from Vespa → GPT-4 drafts outline.
4. **Slide Creation:** Frontend calls `/createFigmaSlides` → populates templates via Figma API.

## 10. Roadmap & Milestones

| Sprint | Deliverable                                     |
| ------ | ----------------------------------------------- |
| 1      | PDF ingestion service + Vespa indexing          |
| 2      | `/generateOutline` API with template-backed RAG |
| 3      | Figma template library & `/createFigmaSlides`   |
| 4      | Frontend review dashboard (Vite)                |
| 5      | Feedback capture + iteration                    |

## 11. Success Metrics

- **Research Time Saved:** ≥ 50% reduction in BD prep.
- **Draft Accuracy:** ≥ 70% first-draft approval rate.
- **Adoption:** 75% BD use within 2 months.
- **Technical SLA:** 95th percentile endpoint latency < 5s.

---

_Ready for review and next-step alignment!_
