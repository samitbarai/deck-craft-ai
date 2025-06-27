# DeckCraft AI PRD

**Version:** 1.2
**Date:** June 26, 2025
**Author:** Samit Barai

---

## 1. Executive Summary

**DeckCraft AI** is an AI-driven platform that ingests existing Juspay pitch decks—PDFs containing both text and images—and automatically generates drafts of new slides in Figma templates. By combining rapid content outline generation with programmatic slide creation, it empowers Business Development (BD) teams to reduce research and design time by at least 50%, while maintaining brand consistency.

## 2. Goals & Objectives

1. **Accelerate BD Research:** Analyze uploaded decks plus merchant-specific metadata (industry, geography) to auto-generate a content strategy outline.
2. **Automate Slide Creation:** Populate Figma templates with AI-drafted text and relevant images.
3. **Ensure Brand Consistency:** Leverage a centralized Figma template library.
4. **Enable Continuous Improvement:** Capture user edits for ongoing AI refinement.

## 3. User Personas

* **BD Executive:** Quickly produces tailored outlines and draft slides for new prospects.
* **Design Lead:** Reviews and fine-tunes AI-generated decks for visual and stylistic alignment.
* **Product Owner:** Monitors system usage, time savings, and draft acceptance rates.

## 4. Use Cases & User Stories

* **UC1:** *As a BD Executive*, I upload PDFs and enter merchant details so I can receive a structured outline and Figma draft within minutes.
* **UC2:** *As a Design Lead*, I review the generated Figma file to ensure it matches brand guidelines, adjusting text or images as needed.
* **UC3:** *As a Product Owner*, I track key metrics—such as time saved per pitch and first-draft approval rate—to measure ROI.

## 5. Functional Requirements

### 5.1 Ingestion & Contextual Strategy

* **Batch PDF Import:** Upload multiple pitch decks containing text and images.
* **Metadata Tagging:** Input merchant industry and geography.
* **Outline Generation API (`/generateOutline`):** Returns slide-by-slide section headings and key themes based on merchant context.

### 5.2 Image Extraction & Reuse

* **Image Parsing:** Use OCR and vision libraries to detect and extract charts, diagrams, and logos.
* **Asset Catalog:** Store visuals in a tagged repository (e.g., S3) by slide section and content type.
* **Asset Retrieval API (`/retrieveAssets`):** Suggests suitable images for each slide section.
* **Figma Insertion:** Populate image frames in templates with retrieved assets, allowing manual swaps.

### 5.3 Slide Generation via Figma

* **Template Library:** Prebuilt Figma slide frames with standardized style tokens.
* **Content & Asset API (`/createFigmaSlides`):** Consumes outline, merchant metadata, and asset references to generate a complete Figma deck.
* **Editable Hooks:** Expose text nodes and image placeholders for quick BD adjustments.

## 6. Tech Stack

* **Frontend:** Vite (React + TypeScript) for the review dashboard.
* **Backend:** Node.js with Express; PostgreSQL for relational data storage.
* **Vector Database:** Vespa, indexed with embeddings for RAG retrieval.
* **Embedding Model:** OpenAI’s text-embedding-ada-002.
* **LLM Provider:** OpenAI GPT-4.
* **Slide Hosting:** Figma REST API for file creation and updates.

## 7. Non-Functional Requirements

* **Performance:** Outline generation under 3 seconds; slide creation under 5 seconds.
* **Scalability:** Support 500 concurrent ingestion jobs and 50 parallel exports.
* **Security:** Encrypt sensitive data at rest and in transit; OAuth2 for Figma authentication.
* **Reliability:** 99.5% uptime for core services.

## 8. RAG Explained (Layman’s Terms)

Retrieval-Augmented Generation (RAG) combines two steps:

1. **Retrieve Examples:** We store segments of your historical decks in Vespa. When you request new content, Vespa finds the most relevant past slides based on your merchant’s profile.
2. **Generate Text:** We feed these examples and your request into GPT-4, which then writes new slide content that mirrors your style and addresses your prospect’s needs.

*Analogy:* Imagine a chef who reviews past favorite dishes before crafting a custom menu for a special guest—RAG ensures your AI-driven pitches taste just right.

## 9. Data Flow

1. **Upload & Tag:** User imports PDFs and enters merchant metadata.
2. **Extract & Index:** Backend extracts text and images, generates embeddings, and stores everything in Vespa.
3. **Outline Request:** Frontend calls `/generateOutline`; Vespa retrieves examples; GPT-4 drafts the outline.
4. **Slide Creation:** Frontend calls `/createFigmaSlides`; Figma API populates templates with text and assets.

## 10. Roadmap & Milestones

| Sprint | Deliverable                                 |
| ------ | ------------------------------------------- |
| 1      | PDF ingestion + Vespa indexing              |
| 2      | Outline API with RAG-based retrieval        |
| 3      | Figma template library + Slide creation API |
| 4      | Frontend review dashboard                   |
| 5      | Feedback capture & AI refinement            |

## 11. Success Metrics

* **Time Saved:** ≥ 50% reduction in research and slide-building time.
* **Draft Approval:** ≥ 70% of slides approved without edits.
* **Adoption Rate:** 75% of BD team usage within two months.
* **Latency:** 95th percentile API response < 5 seconds.

---

*Final polish applied—grammar, consistency, and clarity ensured.*
