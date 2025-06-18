# Product Requirements Document (PRD)

## 1. Overview

A web‑based internal tool that allows Meteomatics employees to **rapidly iterate, benchmark, and rate prompts and LLM models** for generating MetX dashboard JSON. The application supports text & image inputs, multiple OpenAI models, automatic wrapping of the model output with predefined JSON prefixes/suffixes, and storage of both raw and final JSON for transparency.

## 2. Goals & Success Metrics

| Goal                                             | Metric                                                        | Target                                       |
| ------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------- |
| Enable self‑service prompt/model experimentation | % of users who successfully run a generation without dev help | ≥ 90 % in first month                        |
| Reduce time to first working dashboard           | Median time from input to usable JSON                         | < 60 s                                       |
| Contain generation cost                          | Avg. $ cost per generation                                   | ≤ 0.10 CHF                                   |
| Capture qualitative feedback                     | % of generations that receive a manual rating                 | ≥ 70 %                                       |

## 3. Stakeholders

* **Product**: Matthias Heim (Lailix)
* **Design**: TBD (internal)
* **Engineering**: Lailix dev team
* **Users**: Meteomatics solution engineers & meteorologists (expert users)

## 4. Background & Context

Customers struggle with the initial MetX setup—parameter search and layer‑stack configuration are complex. Automating JSON creation via LLMs can shorten onboarding and reduce support load.

## 5. Scope

### In‑Scope (MVP)

1. **Text & image input**: Users describe desired view and/or upload a map screenshot.
2. **Prompt library**
   * Versioned prompts; anyone can edit.
   * Fields: *template*, `json_prefix`, `json_suffix`, optional `{{output}}` placeholder.
3. **Model selection**: Multi‑select list of OpenAI models to run in parallel (checkbox UI).
4. **Generation pipeline**
   * Store raw LLM JSON and wrapped final JSON.
   * Apply prefix/suffix (or placeholder) before display/download.
5. **Results view** (per model)
   * Final JSON (download button).
   * Cost & latency.
   * Manual rating (1‑5) + comment.
   * Optional dashboard image upload.
   * Automated LLM evaluation comparing input ↔ output.
6. **User authentication & tracking**
   * Login/signup system with email/password.
   * User session management.
   * Audit trail for prompt modifications and evaluations.
   * User attribution for all actions.
7. **Welcome screen & tooltips** for guidance.
8. **Backend**: Supabase (PostgreSQL + Storage + Auth) for text & image blobs.

### Out of Scope (MVP)

* Non‑OpenAI models (future).
* Direct push of JSON into MetX (manual upload for now).

## 6. Functional Requirements

| #    | Requirement                                                                        |
| ---- | ---------------------------------------------------------------------------------- |
| F‑01 | User can enter free‑text description and optionally upload an input image.         |
| F‑02 | User can choose one or more models and a prompt template, then trigger generation. |
| F‑03 | System concatenates prefix/output/suffix (or substitutes `{{output}}`).            |
| F‑04 | System saves `raw_json`, `final_json`, cost, latency in `generation_results`.      |
| F‑05 | User can download `final_json` and later upload an output image.                   |
| F‑06 | User can submit a 1‑5 rating and a comment for each model result.                  |
| F‑07 | System runs automated evaluation when output image present and stores score.       |
| F‑08 | Prompt editor supports full version history and revert.                            |
| F‑09 | Tooltips explain every input, button, and metric.                                  |
| F‑10 | Welcome screen explains purpose, workflow, and links to documentation.             |
| F‑11 | User authentication with email/password login and session management.              |
| F‑12 | System tracks user identity for all prompt modifications and evaluations.          |
| F‑13 | Audit trail shows who made changes and when for accountability.                    |

## 7. Non‑Functional Requirements

* **Performance**: ≤ 60 s P95 generation latency for GPT‑4o on typical requests.
* **Cost guardrail**: Abort generation if projected cost > configured max_thr (default 0.20 CHF).
* **Reliability**: 99 % uptime during CET business hours.
* **Security**: RLS in Supabase; all files private by default. User authentication required. Secure session management.

## 8. Data Model (Supabase)

### Tables

* **prompts**
  * `id (uuid)`
  * `name, description`
  * `template_text`
  * `json_prefix`, `json_suffix`, `use_placeholder (bool)`
  * `version, created_by (references auth.users), created_at, updated_at`

* **models** (config)
  * `id, name, provider, price_per_1k_tokens`

* **user_inputs**
  * `id, user_id (references auth.users), text, input_image_url, created_at`

* **generation_results**
  * `id, user_input_id, prompt_id, model_id, user_id (references auth.users)`
  * `raw_json, final_json`
  * `cost_chf, latency_ms`
  * `output_image_url`
  * `manual_score, manual_comment`
  * `auto_score, auto_rationale`
  * `created_at`

* **audit_logs**
  * `id, user_id (references auth.users), action, entity_type, entity_id`
  * `old_values, new_values, created_at`

### Storage Buckets

* `input_images/`  (uploads)
* `output_images/` (dashboard screenshots)

## 9. UX Flow Summary

1. **Login/Signup Screen → Welcome → Start Testing**
2. **Input Screen**
   * Enter text ↔ upload image ↔ pick prompt ↔ pick model(s) ↔ Run.
3. **Loading**: Progress cards per model.
4. **Results View** (cards)
   * JSON, metrics, download, rating form, image upload.
5. **Prompt Library**: List → Edit → Save new version (with user tracking).
6. **User Profile**: Logout, view activity history.

## 10. Milestones & Timeline (est.)

| Milestone                  | Owner       | ETA     |
| -------------------------- | ----------- | ------- |
| Schema & infra setup       | Eng         | +1 wk   |
| Core generation pipeline   | Eng         | +2 wk   |
| Prompt editor & versioning | Eng         | +1 wk   |
| Results UI + rating        | Eng         | +1 wk   |
| Automated evaluation       | Eng         | +1 wk   |
| Welcome & tooltips polish  | Design      | +0.5 wk |
| Internal QA                | Eng/Product | +0.5 wk |
| Soft launch to Meteomatics | Product     | +0.5 wk |

## 11. Risks & Mitigations

| Risk                      | Mitigation                                                                  |
| ------------------------- | --------------------------------------------------------------------------- |
| Model latency/cost spikes | Default to cheaper fast model for quick preview; allow canceling slow runs. |
| Prompt edits break output | Versioning & rollback; keep working default prompt.                         |
| Supabase storage limits   | Periodic cleanup job for old images.                                        |

## 12. Technical Specifications

Based on requirements clarification:

* **LLM Models**: GPT-4.1, o3, GPT-4o (OpenAI)
* **Frontend**: React + TypeScript + shadcn/ui components
* **Testing**: Vitest framework
* **Deployment**: Vercel hosting
* **Authentication**: Supabase Auth with email/password
* **Concurrent Users**: Max 3 users (impacts Supabase tier selection)
* **Automated Evaluation**: Numeric scoring for weather parameter completeness
  * Compare input image (if provided) vs output image (user uploaded)
  * Validate generated JSON contains weather parameters described in user prompt
  * Score completeness and accuracy of weather data representation

### Color Palette

* **Primary Dark Color**: `#0d1f2d` - for backgrounds, headers, and strong contrast elements
* **Accent Gold**: `#c5a95a` - for highlights, buttons, or decorative elements
* **Soft Beige**: `#e8d7bd` - for backgrounds, cards, or light UI elements
* **Muted Purple**: `#e7a4e7` - for secondary buttons, links, or accent highlights
* **Lightest Neutral**: `#f0ede4` - for background sections, dividers, or text contrast

---

**Prepared by:** Product (Matthias H.), Design (TBD), Engineering (Lailix)

*Last updated: 17 Jun 2025, CET*
