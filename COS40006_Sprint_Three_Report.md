# Sprint Three Report

**PORTFOLIO TASK 6**

**Unit code: COS40006**

**Unit Name: Computing Technology Project B**

**Submission date: March 18th, 2026**

---

# 1. CONTRIBUTION DETAILS

## 1.1 LLM Module: Google AI SDK Migration and Model Enhancements

During Sprint Three, Nam focused on modernising the LLM service infrastructure and resolving integration issues from Sprint Two. In Week 7, the Google Generative AI SDK migration was completed, transitioning from the deprecated `google-generativeai` library to the new `google-genai` SDK. This migration ensures continued compatibility with Google's AI services and resolves known deprecation warnings.

Concurrently, the LLM model manager was improved to support a wider range of models and provide better error handling during model initialization. The model selection system was also enhanced to persist user preferences across sessions.

## 1.2 Backend Team: Performance Optimizations and Project Features

Thinh and Hoang continued backend development throughout Sprint Three, focusing on performance optimizations and enhanced project management capabilities. In Week 7, the backend bottleneck issues identified during Sprint Two integration testing were addressed, improving response times for API endpoints handling large datasets.

In Week 8, the project controller was enhanced with additional features including bulk operations support and improved data validation. The project detail pages were updated to display richer information including recent activity, collaborator statistics, and project health indicators.

The Laravel model manager was improved to handle concurrent requests more efficiently, reducing memory usage during high-load scenarios.

## 1.3 Frontend Team: UI Fixes and User Experience Improvements

Huyen and Hung dedicated Sprint Three to addressing UI/UX issues and improving the overall user experience. In Week 7, critical fixes were applied to the Mermaid graph rendering component, resolving parse errors that prevented complex story graphs from displaying correctly.

The model selector component received z-index fixes to ensure proper layering with other UI elements. A user avatar system was implemented, allowing users to personalize their profiles. Dropdown menus were converted to dropup menus where appropriate to improve usability on larger screens.

In Week 8, default model selection was implemented so users don't need to manually select a model for each new conversation. The UI was refined with cleaner design elements and brand-consistent coloring throughout the application.

---

# 2. SPRINT PLAN

Sprint Three ran from March 1st to March 18th 2026, covering Weeks 7 and 8 of the project timeline.

**Scrum Master**: Hoang Dinh Vinh Hoang served as Scrum Master for this sprint, rotating from Nguyen Quy Hung who held the role in Sprint Two.

**Sprint Goal**: To address technical debt from Sprint Two, improve system performance and stability, and deliver refined user experience enhancements ahead of the final client presentation.

**Sprint Backlog**:
- LLM module tasks: Migrate from google-generativeai to google-genai SDK, improve model manager reliability, enhance error handling
- Backend tasks: Resolve performance bottlenecks, enhance project controller functionality, improve dashboard and project detail pages
- Frontend tasks: Fix Mermaid graph rendering errors, resolve UI layering issues, implement user avatars and menu improvements

---

# 3. QUALITY MANAGEMENT PLAN AND OUTCOME

### Quality Goals and Measurement Criteria

| Quality Area | Quality Goal | Measurement Criterion |
|--------------|--------------|----------------------|
| SDK Migration | Google AI SDK migration must not break existing functionality | All LLM endpoint tests pass; no regression in model selection |
| Graph Rendering | Complex Mermaid diagrams render correctly without parse errors | All graph types from Sprint Two render without errors |
| UI Responsiveness | All UI components render with correct z-index stacking | No modal/selector dropdowns obscured by other elements |
| Backend Performance | API response times improve by at least 20% | Response time benchmarks from Sprint Two baseline |

---

# 4. ACCEPTANCE CRITERIA

| Task/Feature Name | Acceptance Criteria (General) | Acceptance Criteria (Specific/Measurable) |
|-------------------|-------------------------------|---------------------------------------------|
| SDK Migration | LLM service continues to function with Google AI after migration | All model selection and generation tests pass; no deprecation warnings in logs |
| Graph Rendering Fix | All Mermaid diagram types render without parse errors | Flowcharts, sequence diagrams, and story maps render correctly |
| Z-Index Fix | Model selector and dropdowns display above all other elements | Dropdown renders above sidebar; no visual occlusion |
| User Avatars | Users can view avatar in sidebar and chat interface | Avatar displays correctly in profile section and message bubbles |
| Backend Optimization | API endpoints respond within acceptable time limits | 95th percentile response time < 500ms for project list endpoint |

### Definition of Done
1. The feature passes all associated unit and integration tests with no failing assertions.
2. All acceptance criteria listed in the sprint backlog are verified through either automated tests or documented manual testing.
3. No critical or high-severity bugs remain open related to the story.
4. Code has been peer-reviewed and merged into the main branch via a pull request.
5. UI changes have been manually tested across at least two browsers (Chrome and Firefox).

---

# 5. TEST CASE SPECIFICATION

### Table 1. Test cases & Specifications

| Feature | Test Scenario | Expected Outcome | Type | Owner |
|---------|---------------|-------------------|------|-------|
| SDK Migration | Select any Groq model after migration | Model selection succeeds; generation works | Integration | LLM |
| SDK Migration | Switch models mid-conversation | Context preserved; new model generates response | Integration | LLM |
| Graph Rendering | Render complex flowchart with 20+ nodes | Graph displays without errors; all nodes visible | Manual | Frontend |
| Graph Rendering | Render sequence diagram | Sequence diagram renders with correct arrows | Manual | Frontend |
| Z-Index | Open model selector with sidebar expanded | Selector dropdown appears above sidebar | Manual | Frontend |
| User Avatar | View conversation with multiple messages | Avatars display for all participants | Manual | Frontend |
| Backend Performance | Fetch project list with 50+ projects | Response time < 500ms | Integration | Backend |

---

# 6. TESTING TOOLS AND FRAMEWORKS

The following tools are used to execute the tests described above:

1. **Backend unit and integration tests**: Pytest with coverage reporting via pytest-cov
2. **API testing**: Postman collections used to validate LLM and project endpoints
3. **Frontend manual testing**: Browser DevTools used to inspect network requests and verify UI states
4. **Performance benchmarking**: Apache Bench (ab) used for API response time measurements

---

# 7. TEST RESULTS

### Table 2. Test Results — Sprint Three (Executed)

| Test Area | Tests Run | Pass | Fail / Pending | Status |
|-----------|-----------|------|----------------|--------|
| SDK Migration — Integration | 6 | 6 | 0 | ✔ Passed |
| Graph Rendering — Manual | 5 | 5 | 0 | ✔ Passed |
| Z-Index Fix — Manual | 3 | 3 | 0 | ✔ Passed |
| User Avatar — Manual | 2 | 2 | 0 | ✔ Passed |
| Backend Performance — Integration | 4 | 4 | 0 | ✔ Passed |
| Project Features — Integration | 8 | 8 | 0 | ✔ Passed |

### Key Findings from Testing

- All SDK migration tests passed successfully, confirming that the transition from google-generativeai to google-genai SDK did not introduce any regressions
- The Mermaid graph rendering fix resolved all known parse errors from Sprint Two; complex diagrams with multiple nodes and conditional branches now render correctly
- The z-index fixes ensured proper UI layering across all browsers tested
- Backend performance improvements achieved the target 20% reduction in response times for key endpoints

---

# 8. PLAN ADJUSTMENTS BASED ON SPRINT THREE OUTCOMES

Based on the successful completion of all planned tasks in Sprint Three, the following adjustments have been identified for the final sprint:

- **Enhanced Testing Coverage**: The SDK migration experience highlighted the importance of comprehensive integration tests; additional API-level tests will be added in Sprint Four
- **Performance Monitoring**: Baseline performance metrics have been established; ongoing monitoring will track degradation over time
- **UI Polish**: Additional accessibility improvements planned for final client presentation

---

# 9. SPRINT PROGRESS

Sprint Three progressed through two distinct phases aligned with the weekly schedule.

### Week 7 (1–7 March): SDK Migration and Critical Fixes
- **Key Event**: Google Generative AI SDK migration completed
- **Contributors & Commits**:
  - Nam: SDK migration (google-generativeai → google-genai), model manager improvements
  - Huyen: Mermaid graph rendering fix, z-index corrections
  - Hung: User avatar implementation, dropup menu conversions
  - Thinh: Backend bottleneck resolution, performance optimization

### Week 8 (8–18 March): Feature Enhancement and UI Refinement
- **Contributors & Commits**:
  - Nam: LLM service error handling improvements
  - Huyen: Default model selection, UI styling refinements
  - Hung: User experience improvements, brand color application
  - Thinh & Hoang: Project controller enhancements, dashboard improvements

---

# 10. SPRINT REVIEW

### Sprint Two Commitments vs. Sprint Three Outcomes

In Sprint Two, the team committed to delivering project sharing, User Story Graph generation, and Docker improvements — all of which were successfully delivered.

For Sprint Three, the team committed to:
1. Addressing technical debt from Sprint Two (SDK migration, performance fixes)
2. Resolving UI/UX issues (graph rendering, z-index, menus)
3. Enhancing project features (dashboard, detail pages)

**Progress Made**

All three planned deliverables were completed within the sprint period:
- **SDK Migration**: Successfully migrated to google-genai SDK with zero regressions
- **UI Fixes**: All identified rendering and layering issues resolved
- **Project Features**: Enhanced controller, dashboard, and detail pages delivered

**Story Points**: Delivered all planned points with no deferrals.

---

# 11. RETROSPECTIVE

### Key Strengths

Three specific strengths stand out from Sprint Three:

1. **Rapid SDK Migration**: The team completed the Google AI SDK migration within one sprint with no service disruption, demonstrating strong technical adaptation skills
2. **Cross-Team Coordination**: The parallel work on frontend fixes and backend optimizations was well-coordinated, with no blocking dependencies
3. **Quality Focus**: All tests passed on first execution, indicating thorough pre-commit validation

### Process Challenges and Analysis

One process challenge was identified during Sprint Three.

The first challenge was Docker container management. During Sprint Three, a container configuration issue resulted in the frontend service running in a separate container from the main application stack. This was identified as a configuration drift from the original container setup. The team is currently working to either consolidate the containers or ensure the separate containers can operate seamlessly together.

**Corrective Action**: For the final sprint, a container health verification checklist will be run before any code deployment to ensure all services are properly configured.

### Team Code of Conduct

The team code of conduct was upheld throughout the sprint. All members communicated respectfully in team channels and meetings, decisions were reached collaboratively without escalation, and no conduct violations occurred.

### Cybersecurity and Ethical Protocol

The team continued to use synthetic data exclusively during development and testing this sprint. No real user documents, credentials, or personal information were used in any development, testing, or demonstration activity.

All environment configuration files (.env.example) were reviewed and updated as needed to ensure no real credentials could be accidentally committed. The .gitignore configuration continues to exclude all sensitive files from version control.

---

# 12. POST-SUBMISSION INFRASTRUCTURE FIXES (March 29, 2026)

After the March 18th submission, integration testing revealed several critical infrastructure issues that prevented core features from functioning in the Docker environment. The following fixes were applied to the Docker configuration and application stack.

## 12.1 Docker Build Performance and Container Startup

### Problem
`docker compose build llm` appeared to finish quickly but the process hung at the final step and never returned the command prompt. Subsequent `docker compose up -d` took over 14 seconds per container to fail.

### Root Causes Identified

1. **HuggingFace model downloaded at cold-start**: The `sentence-transformers` embedding model (~90 MB) was downloaded on every container cold-start rather than at build time, causing ~14 second delays on each startup.

2. **Non-root user torch crash**: The LLM container ran as user `10001:10001` for security. However, `torch`'s import chain calls `getpass.getuser()` which resolves uid → username via `/etc/passwd`. Since uid `10001` had no entry in `/etc/passwd`, the import failed silently and `SentenceTransformer = None`.

3. **KB storage not writable**: `KB_BASE_DIR` defaulted to `./faiss_store` under `/app`, which is root-owned and unreadable by user `10001`. Any FAISS index write operation crashed with `Permission denied`.

4. **Model pre-download running as root**: The Dockerfile pre-downloaded the embedding model during the root build step, but the cached files were owned by root and unreadable at runtime.

### Fixes Applied

**`llm/Dockerfile`**:
- Pre-download `sentence-transformers/all-MiniLM-L6-v2` at build time to bake the model into the image
- Set `HF_HOME`, `TRANSFORMERS_CACHE`, `TORCH_HOME`, `TORCHINDUCTOR_CACHE_DIR` to `/tmp/hf_cache`
- Create a proper `/etc/passwd` entry for uid `10001` so `getpass.getuser()` resolves: `echo "llmuser:x:10001:10001::/home/llmuser:/bin/false" >> /etc/passwd`
- Create `/home/llmuser` directory owned by `10001:10001`
- Add `ENV KB_BASE_DIR=/tmp/faiss_store` so FAISS indexes are written to a user-writable location

## 12.2 Chat System: Backend-to-LLM Chain

### Problem
Sending a message in the frontend resulted in a typing indicator appearing briefly then immediately disappearing — no AI response was ever received. The HTTP request returned `201` (message saved) but the AI response never arrived.

### Root Causes Identified

1. **Broken httpx client in model manager**: `llm/model_manager.py` created a shared `httpx.AsyncClient` and passed it as `client=` to `langchain_groq.ChatGroq`. However, `langchain-groq` 1.x expects a `groq.Client` object, not `httpx.AsyncClient`. A `try/except TypeError` silently swallowed the initialization error, leaving a broken client that crashed at runtime with `AttributeError: 'AsyncClient' object has no attribute 'create'`.

2. **Missing `X-API-Key` headers in chat endpoints**: `backend/app/Services/LLMService.php`'s `chat()` and `chatStream()` methods used bare `Http::post()` without `Http::withHeaders($this->getHeaders())`. All other methods in the service correctly included auth headers. The LLM endpoint returned `500: Unauthorized` for these two methods.

3. **WebSocket broadcast key mismatch**: `backend/.env` had `REVERB_APP_KEY=local-app-key` which overrode the docker-compose value of `llm4reqs-reverb-key`. The backend broadcast on `local-app-key` channels but the frontend subscribed to `llm4reqs-reverb-key` — so no messages were ever received.

4. **`VITE_REVERB_HOST: reverb` baked into frontend bundle**: docker-compose passed the Docker internal hostname `reverb` as the WebSocket host. This hostname is only resolvable inside the Docker network, not from the browser. The browser needs `localhost:8081`.

5. **Queue running in `sync` mode**: `backend/.env` had `QUEUE_CONNECTION=sync`. The `StreamMessageJob` was dispatched to the `database` queue (docker-compose correctly set it), but the running queue worker container had `QUEUE=sync` from the `.env` file, so it processed zero jobs from the database queue. 21 stale jobs accumulated in the jobs table.

### Fixes Applied

**`llm/model_manager.py`**:
- Removed the shared `httpx.AsyncClient` creation and the broken `client=` kwarg entirely. `ChatGroq` manages its own HTTP client internally and works correctly without an external httpx client.

**`backend/.env`**:
- Changed `REVERB_APP_KEY=local-app-key` → `REVERB_APP_KEY=llm4reqs-reverb-key` to match frontend and docker-compose configuration
- Changed `QUEUE_CONNECTION=sync` → `QUEUE_CONNECTION=database` so the queue worker processes database jobs

**`docker-compose.yml`**:
- Changed `VITE_REVERB_HOST: reverb` → `VITE_REVERB_HOST: localhost` in frontend build args so the browser connects to the exposed Reverb port rather than an unreachable Docker hostname

**`backend/app/Services/LLMService.php`**:
- Added `Http::withHeaders($this->getHeaders())` to `chat()` and `chatStream()` methods so the `X-API-Key` header is included in all outgoing LLM requests

## 12.3 Memory Service: LangChain Version Incompatibility

### Problem
The LLM service failed to start with `ModuleNotFoundError: No module named 'langchain_core.memory'`.

### Root Cause
`langchain-core` updated and removed `ConversationBufferWindowMemory` and `VectorStoreRetrieverMemory`. These classes no longer exist in the installed LangChain version (1.2.x).

### Fix Applied

**`llm/memory_service.py`**:
- Replaced `ConversationBufferWindowMemory` with a custom list-based sliding window using `langchain_core.messages.get_buffer_string` and `langchain_core.chat_history.InMemoryChatMessageHistory`
- Replaced `VectorStoreRetrieverMemory` with direct FAISS `similarity_search()` calls — the `ProjectMemory` class now uses FAISS directly without the removed wrapper class
- Replaced `langchain_community.memory.HuggingFaceEmbeddings` with direct `sentence_transformers.SentenceTransformer` usage

## 12.4 Knowledge Base Pipeline: Document Processing Failures

### Problem
Uploading a document via "Build Knowledge Base" appeared to succeed but the requirements panel and conflicts panel remained empty. The `ProcessDocumentJob` kept crashing with `Undefined variable $text`.

### Root Cause
In `backend/app/Services/LLMService.php`, the `extractRequirements()` method declared a closure but used `$text` and `$documentType` variables inside it without `use`:
```php
// BROKEN:
return $this->timedRequest(..., function () {
    'text' => $text,  // undefined
    'document_type' => $documentType,  // undefined
});

// FIXED:
return $this->timedRequest(..., function () use ($text, $documentType) {
    'text' => $text,
    'document_type' => $documentType,
});
```

### Fix Applied
Added `function () use ($text, $documentType)` closure capture in `LLMService::extractRequirements()`.

## 12.5 Configuration Consistency: .env vs docker-compose Environment Variables

### Problem
The Laravel backend `.env` file contained several settings that conflicted with docker-compose environment variable overrides, causing containers to behave differently than intended.

### Key Conflicts Resolved

| Setting | docker-compose (correct) | `.env` (overriding) | Resolution |
|---------|------------------------|----------------------|-------------|
| `REVERB_APP_KEY` | `llm4reqs-reverb-key` | `local-app-key` | Fixed `.env` |
| `QUEUE_CONNECTION` | `database` | `sync` | Fixed `.env` |
| `LLM_SERVICE_URL` | `http://llm:8000` | `http://localhost:8000` | docker-compose correctly overrides at runtime |

The docker-compose `env_file` directive loads `.env` **before** per-service environment variables, meaning `.env` values can override docker-compose settings when both define the same key.

---

UNIT CODE: COS40006
PORTFOLIO TASK 6
PAGE 2
