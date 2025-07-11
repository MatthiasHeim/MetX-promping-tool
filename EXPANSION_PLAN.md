
# MetX Platform Expansion: Chatbot Integration & Generation API

## 1. Vision & Introduction

This document outlines the plan to expand the MetX platform by integrating a "Metax Assistant" chatbot into the main MetX website. The primary goal is to allow users to generate complex weather dashboards using simple, natural language commands.

The expansion will be delivered in two main phases:
1.  **Dashboard Generation:** The chatbot will handle a user's request, call this platform's API to generate a complete `metx.json` dashboard, and present it to the user.
2.  **Advanced Features:** The platform will be enhanced with features for granular dashboard updates, automated quality evaluation, and streamlined production management of prompts and models.

## 2. High-Level Architecture

The end-to-end system will consist of three core components: the **Metax Assistant (Chatbot)**, the **Generation Platform (this project)**, and the **Meteomatics Frontend**.

**Workflow:**

1.  **User Interaction:** The user types a request into the chatbot widget on the MetX website (e.g., "Show me precipitation and wind over the UK").
2.  **Tool Call:** The chatbot identifies the intent to create a dashboard and makes a secure API call to the **Generation Platform**.
3.  **JSON Generation:** The Generation Platform retrieves the designated "production" prompt and model from Supabase. It calls the selected LLM to generate the dashboard layers.
4.  **Validation & Formatting:** The platform's `JsonValidator` rigorously validates, cleans, and formats the LLM's output. It then wraps the generated layers with the appropriate prefix and suffix from the database to create a complete `metx.json` file.
5.  **API Response:** The platform returns the complete and validated `metx.json` to the chatbot.
6.  **Dashboard Loading:** The chatbot receives the JSON and makes a final call to the Meteomatics frontend API/service responsible for rendering the dashboard, which then loads for the user.

![Architecture Diagram](https.i.imgur.com/example.png)  *(Placeholder for a visual diagram)*

---

## 3. Component Deep-Dive

### 3.1. Metax Assistant (Chatbot)

-   **Platform:** **VoiceFlow** is the recommended platform, meeting all stated requirements (knowledge base, easy integration, robust API capabilities).
-   **Core Responsibilities:**
    -   Manage the user-facing conversation and UX.
    -   Provide answers to general questions using its **Knowledge Base**.
    -   Orchestrate the dashboard generation process by calling the Generation Platform API.
-   **Knowledge Base Setup:** The Meteomatics API documentation website will be linked as a data source in VoiceFlow. It should be configured to re-index daily to ensure the information is always current.
-   **State Management for Future Updates:** To support future granular updates (e.g., "add a temperature layer"), the chatbot must maintain the state of the user's current dashboard.
    -   **Implementation:** When a dashboard is successfully generated, the complete `metx.json` should be stored in a session variable within VoiceFlow (e.g., `currentDashboardJSON`). When the user requests a modification, the chatbot will send this variable along with the new request to a dedicated "update" endpoint on the Generation Platform.

### 3.2. Generation Platform (This Project)

This platform will be enhanced with a production-ready API.

-   **Authentication:** A simple and secure API key system will be implemented. The chatbot will include its key in the `Authorization: Bearer <API_KEY>` header of every request. The platform will validate this key before processing any request.

-   **New API Endpoints:**

    **A. Dashboard Generation**
    `POST /api/v1/dashboard/generate`
    -   **Description:** Creates a complete `metx.json` dashboard from a natural language prompt.
    -   **Request Body:**
        ```json
        {
          "prompt": "Show me the 24-hour precipitation forecast for Central Europe and add wind barbs."
        }
        ```
    -   **Response Body (Success):**
        ```json
        {
          "status": "success",
          "metx_json": { ... } // The complete, validated metx.json object
        }
        ```
    -   **Internal Workflow:**
        1.  Authenticate the request via API key.
        2.  Query the `prompts` and `models` tables in Supabase for the records marked as `is_production = true`.
        3.  Construct the final prompt to the LLM using the user's input and the production prompt template.
        4.  Send the request to the production LLM.
        5.  Receive the LLM response (the `layers` array content).
        6.  Process the response through `JsonValidator.validateJson()`.
        7.  Retrieve the `json_prefix` and `json_suffix` from the production prompt in the database.
        8.  Combine prefix, validated layers, and suffix to form the final `metx.json`.
        9.  Return the final JSON in the response.

### 3.3. Meteomatics Frontend

-   **Role:** The existing Meteomatics web application will need a mechanism to accept a `metx.json` object and render it as a dashboard. This is likely a function call or a simple API endpoint on the frontend service.
-   **Integration:** The chatbot will trigger this mechanism after receiving the `metx.json` from the Generation Platform. This provides a seamless UX where the user interacts with the chatbot, and the dashboard appears to be generated directly from that interaction.

---

## 4. Implementation Plan & New Features

### Phase 1: Core Dashboard Generation

1.  **Create API Endpoint:** Implement the `POST /api/v1/dashboard/generate` endpoint as specified above. This will involve creating the necessary routing and controller logic within the application.
2.  **Add "Production" Selection to UI:**
    -   **Database:** Add a new boolean column, `is_production`, to the `prompts` and `models` tables in Supabase. Ensure only one prompt and one model can be marked as production at any given time using database constraints or application logic.
    -   **UI:** In the frontend, add a button or toggle next to each prompt and model in their respective lists. This control will allow an admin user to set a specific prompt/model combination as the "production" version. This action should trigger an API call to update the `is_production` flags in the database.

### Phase 2: Advanced Evaluation & Updates

1.  **Automated Evaluation Framework:** Implement a system to test prompt/model changes against a set of predefined test cases.
    -   **Database Schema:**
        -   Create a `test_cases` table: `id`, `name`, `user_prompt`, `expected_json`.
        -   Create a `evaluation_results` table: `id`, `test_case_id`, `prompt_id`, `model_id`, `generated_json`, `score`, `differences`, `created_at`.
    -   **Evaluation Workflow:**
        1.  A user initiates an evaluation run from the UI.
        2.  The system iterates through all entries in `test_cases`.
        3.  For each case, it generates a `metx.json` using the prompt/model being tested.
        4.  It then makes a second LLM call to a "judge" model (e.g., GPT-4o). The judge prompt will ask it to compare the `generated_json` against the `expected_json` and provide a similarity score (e.g., 1-10) and a textual description of any discrepancies.
        5.  The results are stored in the `evaluation_results` table.
    -   **UI:** Create a new section in the application to manage test cases and view a dashboard of evaluation results, comparing different prompts/models side-by-side.

2.  **Granular Update Endpoint:**
    `POST /api/v1/dashboard/update`
    -   **Description:** Modifies an existing dashboard JSON.
    -   **Request Body:**
        ```json
        {
          "modification_prompt": "add a layer for 2-meter temperature",
          "current_dashboard": { ... } // The full metx.json of the current dashboard
        }
        ```
    -   **Implementation:** This endpoint will require a more sophisticated prompt that instructs the LLM to act as an editor rather than a generator, taking the existing JSON and the modification instruction as input and outputting a new, complete `metx.json`.

## 5. Recommended UX Flow (Chatbot)

**Objective:** Ensure the user feels in control and the generation process is transparent.

**Example Conversation:**

> **User:** "Hi, can you create a weather map for me?"

> **Metax Assistant:** "Of course! I can help with that. What would you like to see on the map, and for which location?"

> **User:** "Show me the forecast for rain and wind in France for the next 48 hours."

> **Metax Assistant:** "Got it. Generating a dashboard with precipitation and wind for France. One moment..." *(At this point, the chatbot calls the Generation Platform API)*

> *(After receiving the JSON and successfully calling the Meteomatics frontend API)*

> **Metax Assistant:** "All set! Your new dashboard is ready and has been loaded. You can ask me to make changes, like adding new layers or changing the location."
