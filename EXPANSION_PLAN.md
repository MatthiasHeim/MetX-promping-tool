
# MetX Platform Expansion: Chatbot Integration & Generation API

## 1. Vision & Introduction

This document outlines the proposal for implementing dashboard creation capabilities into the MetX platform. The primary goal is to provide a comprehensive AI-powered prompting tool that allows users to generate complex weather dashboards using natural language commands, with robust evaluation and production deployment capabilities.

### Key Proposal Components:
- **Chatbot Integration** with access to MetX documentation (updated daily from website)
- **MetX Prompting Tool** for prompt evaluation and model deployment to production
- **Advanced JSON Processing** with parsing and validation ensuring all required dashboard fields
- **Production Deployment** on Vercel with Supabase database
- **Turnkey Solution** with repository delivery for self-hosted deployment
- **Usage Credits** including 50 CHF for LLM usage (sufficient for months of user testing)

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
        3.  **Parallel Processing:** Execute two simultaneous LLM calls:
            -   **Layer Generation:** Construct the final prompt using the user's input and production prompt template. Send to the production LLM to generate the `layers` array content.
            -   **Location Extraction:** Send the user's prompt to a location extraction LLM (optimized for geographic reasoning) to extract coordinates and zoom level.
        4.  Process the layer generation response through `JsonValidator.validateJson()`.
        5.  Process the location extraction response and validate coordinates. If location extraction fails or has low confidence, fall back to a sensible default viewport (e.g., Central Europe).
        6.  Retrieve the `json_prefix` and `json_suffix` from the production prompt in the database.
        7.  Inject the extracted (or default) viewport configuration into the appropriate section of the JSON prefix.
        8.  Combine prefix (with viewport), validated layers, and suffix to form the final `metx.json`.
        9.  **Enhanced JSON Validation:** Ensure dashboard contains all required fields for MetX compatibility.
        10. Return the final JSON in the response.

### 3.3. Meteomatics Frontend

-   **Role:** The existing Meteomatics web application will need a mechanism to accept a `metx.json` object and render it as a dashboard. This is likely a function call or a simple API endpoint on the frontend service.
-   **Integration:** The chatbot will trigger this mechanism after receiving the `metx.json` from the Generation Platform. This provides a seamless UX where the user interacts with the chatbot, and the dashboard appears to be generated directly from that interaction.
-   **Dashboard Loading API:** Direct integration capability where dashboards can be sent in the current session and loaded immediately without requiring separate save/load operations.

---

## 4. Implementation Plan & New Features

### Phase 1: Core Dashboard Generation

1.  **Create API Endpoint:** Implement the `POST /api/v1/dashboard/generate` endpoint as specified above. This will involve creating the necessary routing and controller logic within the application.

2.  **Implement Parallel Location Extraction:**
    -   **Location Service:** Create a new `LocationService` class to handle geographic extraction from natural language prompts.
    -   **LLM Configuration:** Configure a separate, optimized LLM call for location extraction (e.g., GPT-4o-mini with temperature=0 for deterministic geographic results).
    -   **Caching Strategy:** Implement location caching for common geographic queries to reduce costs and improve performance.
    -   **Fallback Logic:** Define sensible default viewports for when location extraction fails (e.g., Central Europe at zoom level 4).
    -   **Validation:** Add coordinate validation to ensure extracted locations are within valid geographic bounds.

3.  **Add "Production" Selection to UI:**
    -   **Database:** Add a new boolean column, `is_production`, to the `prompts` and `models` tables in Supabase. Ensure only one prompt and one model can be marked as production at any given time using database constraints or application logic.
    -   **UI:** In the frontend, add a button or toggle next to each prompt and model in their respective lists. This control will allow an admin user to set a specific prompt/model combination as the "production" version. This action should trigger an API call to update the `is_production` flags in the database.

4.  **Enhanced JSON Processing & Validation:**
    -   **Advanced JSON Parser:** Implement robust LLM output parsing to handle various response formats
    -   **Comprehensive Validation:** Ensure all required MetX dashboard fields are present and correctly formatted
    -   **Error Recovery:** Implement fallback mechanisms for malformed JSON responses

5.  **Documentation Integration:**
    -   **Daily Documentation Sync:** Automated system to download latest MetX documentation from website daily
    -   **Knowledge Base Integration:** Structured documentation storage for chatbot access


## 5. Location Extraction Technical Details

### 5.1. Location Extraction LLM Prompt Template

```
Extract geographic location and appropriate zoom level for this weather dashboard request:
"${userPrompt}"

Return JSON format:
{
  "location_found": true/false,
  "center_lat": 46.8182,
  "center_lng": 8.2275, 
  "zoom": 7,
  "confidence": "high/medium/low",
  "reasoning": "User requested Switzerland, centered on geographic center"
}

Zoom level guidelines:
- Country level: 4-5 (e.g., "France", "Germany")
- Regional level: 6-7 (e.g., "Central Europe", "Swiss Alps")
- City/local level: 8-10 (e.g., "Zurich", "Paris")

If no clear location is mentioned, return location_found: false.
If location is ambiguous (e.g., "Paris"), choose the most prominent/likely option and note in reasoning.
```

### 5.2. Error Handling & Fallbacks

1. **Parallel Execution Failures:**
   - If location extraction fails but layer generation succeeds → Use default viewport
   - If layer generation fails but location extraction succeeds → Rerun layer generation.
   - If both fail → Return comprehensive error message

2. **Default Viewport Configuration:**
   ```json
   {
     "kind": "ViewportFull",
     "center_lng": 10.0,
     "center_lat": 50.0,
     "zoom": 4,
     "reasoning": "Default Central Europe viewport"
   }
   ```

## 6. Deployment & Infrastructure

### 6.1. Production Deployment
- **Platform:** Vercel hosting with optimized build configuration
- **Database:** Supabase with production-grade performance and security
- **API Configuration:** Secure API endpoints with authentication and rate limiting
- **Monitoring:** Comprehensive logging and performance monitoring

### 6.2. Turnkey Solution Delivery
- **Repository Access:** Complete source code with deployment instructions
- **Self-Hosted Option:** Configuration for deployment on customer infrastructure
- **Documentation:** Comprehensive setup and maintenance guides
- **Support:** Initial setup assistance and troubleshooting

### 6.3. Usage & Costs
- **Initial Credits:** 50 CHF for LLM usage included
- **Testing Duration:** Sufficient credits for several months of user testing
- **Production Scaling:** Integration with OpenRouter or Google Vertex AI for long-term usage
- **Cost Monitoring:** Built-in usage tracking and budget alerts

## 7. Scope & Limitations

### 7.1. Current Scope
- **Dashboard Generation:** Create complete dashboards from natural language prompts
- **Location Intelligence:** Automatic location extraction and viewport configuration
- **JSON Validation:** Comprehensive validation ensuring MetX compatibility
- **Production Deployment:** Ready-to-use system with monitoring and scaling

### 7.2. Explicitly Out of Scope
- **Dashboard Updates:** Modifying existing dashboards (future enhancement)
- **Real-time Collaboration:** Multi-user editing capabilities
- **Advanced Analytics:** Usage analytics beyond basic monitoring
- **Custom Integrations:** Specific third-party integrations beyond standard APIs

### 7.3. Future Expansion Opportunities
- **Dashboard Modification:** "Add temperature layer" or "Change to satellite view"
- **Collaborative Features:** Shared dashboards and team workspaces
- **Advanced Analytics:** Usage patterns and optimization recommendations
- **Multi-tenant Support:** Enterprise-grade user management

## 8. Recommended UX Flow (Chatbot)

**Objective:** Ensure the user feels in control and the generation process is transparent.

**Example Conversation:**

> **User:** "Hi, can you create a weather map for me?"

> **Metax Assistant:** "Of course! I can help with that. What would you like to see on the map, and for which location?"

> **User:** "Show me the forecast for rain and wind in France for the next 48 hours."

> **Metax Assistant:** "Got it. Generating a dashboard with precipitation and wind for France. One moment..." *(At this point, the chatbot calls the Generation Platform API)*

> *(After receiving the JSON and successfully calling the Meteomatics frontend API)*

> **Metax Assistant:** "All set! Your new dashboard is ready and has been loaded. You can ask me to make changes, like adding new layers or changing the location."

**Enhanced Location Processing Example:**

> **User:** "I want a dashboard for a wind farm in Northern Germany"

> **Metax Assistant:** "I'll create a dashboard optimized for wind farm operations in Northern Germany. Processing both the weather layers and the specific location..." *(Parallel processing of layer generation and location extraction)*

> **Metax Assistant:** "Your dashboard is ready! I've focused on Northern Germany with wind-specific layers including wind speed, direction, and turbulence data. The viewport is optimized for the region you specified."
