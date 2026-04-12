"""
Generate Sprint 3 and Sprint 4 Word reports for COS40006.
Requires: pip install python-docx
Run from: docs/ directory
"""

import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def set_cell_bg(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)

def bold_run(para, text, size=11, color=None):
    run = para.add_run(text)
    run.bold = True
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = RGBColor(*bytes.fromhex(color))
    return run

def add_heading(doc, text, level=1, color="1F3864"):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.color.rgb = RGBColor(*bytes.fromhex(color))
    return h

def add_para(doc, text="", bold=False, size=11, space_after=6):
    p = doc.add_paragraph()
    if text:
        run = p.add_run(text)
        run.bold = bold
        run.font.size = Pt(size)
    p.paragraph_format.space_after = Pt(space_after)
    return p

def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style="List Bullet")
    p.add_run(text).font.size = Pt(11)
    p.paragraph_format.left_indent = Cm(0.5 + level * 0.5)
    return p

def add_image(doc, filename, width_inches=5.5, caption=None):
    path = os.path.join(DOCS_DIR, filename)
    if os.path.exists(path):
        doc.add_picture(path, width=Inches(width_inches))
        last_para = doc.paragraphs[-1]
        last_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if caption:
            cp = doc.add_paragraph(caption)
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in cp.runs:
                run.font.size = Pt(9)
                run.font.italic = True
    else:
        add_para(doc, f"[Image not found: {filename}]", bold=False)

def add_table_header_row(table, headers, bg="1F3864"):
    row = table.rows[0]
    for i, header in enumerate(headers):
        cell = row.cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        run = p.add_run(header)
        run.bold = True
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        run.font.size = Pt(10)
        set_cell_bg(cell, bg)

def add_table_row(table, values, row_idx=None, alt_bg=None):
    row = table.add_row()
    for i, val in enumerate(values):
        cell = row.cells[i]
        cell.text = str(val)
        cell.paragraphs[0].runs[0].font.size = Pt(10)
        if alt_bg and row_idx is not None and row_idx % 2 == 0:
            set_cell_bg(cell, alt_bg)
    return row

def page_break(doc):
    doc.add_page_break()


# ---------------------------------------------------------------------------
# Cover / header block
# ---------------------------------------------------------------------------

def add_cover_block(doc, sprint_num, portfolio_task, submission_date, scrum_master):
    # Title box
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f"Sprint {sprint_num} Report")
    run.bold = True
    run.font.size = Pt(22)
    run.font.color.rgb = RGBColor(0x1F, 0x38, 0x64)

    for label, value in [
        ("PORTFOLIO TASK", portfolio_task),
        ("Unit code:", "COS40006"),
        ("Unit Name:", "Computing Technology Project B"),
        ("Submission date:", submission_date),
        ("Scrum Master:", scrum_master),
    ]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        bold_run(p, f"{label}  ", size=12)
        r = p.add_run(value)
        r.font.size = Pt(12)

    doc.add_paragraph()  # spacer


# ---------------------------------------------------------------------------
# Contribution summary table
# ---------------------------------------------------------------------------

MEMBERS = [
    ("Dinh Danh Nam", "104775399"),
    ("Nguyen Quy Hung", "104850199"),
    ("Vo Thi Kim Huyen", "104169824"),
    ("Le Luu Phuoc Thinh", "105029327"),
    ("Hoang Dinh Vinh Hoang", "105026823"),
]

CONTRIB_COLS = [
    "Team Member",
    "Finished tasks\nin time",
    "Self-assigned\n& proactive",
    "Attended team\nmeetings",
    "Attended supervisor\nmeetings",
    "Attended client\nmeetings",
    "Replied within\nacceptable time",
    "Kept team\nupdated",
    "Respected\nothers",
]

def add_contribution_summary(doc):
    add_heading(doc, "CONTRIBUTION SUMMARY", level=1)
    table = doc.add_table(rows=1, cols=len(CONTRIB_COLS))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    add_table_header_row(table, CONTRIB_COLS)

    for i, (name, sid) in enumerate(MEMBERS):
        row = table.add_row()
        row.cells[0].text = f"{name}\n({sid})"
        row.cells[0].paragraphs[0].runs[0].font.size = Pt(9)
        for j in range(1, len(CONTRIB_COLS)):
            row.cells[j].text = "Yes"
            row.cells[j].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            row.cells[j].paragraphs[0].runs[0].font.size = Pt(10)
        if i % 2 == 0:
            for cell in row.cells:
                set_cell_bg(cell, "EBF3FB")

    doc.add_paragraph()


# ---------------------------------------------------------------------------
# ==================  SPRINT 3  ==========================================
# ---------------------------------------------------------------------------

def build_sprint3():
    doc = Document()

    # Margins
    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)

    add_cover_block(
        doc,
        sprint_num=3,
        portfolio_task="7",
        submission_date="March 21st, 2026",
        scrum_master="Hoang Dinh Vinh Hoang",
    )

    add_contribution_summary(doc)

    # ── 1. CONTRIBUTION DETAILS ────────────────────────────────────────────
    add_heading(doc, "1. CONTRIBUTION DETAILS", level=1)
    add_para(doc, (
        "This section summarises each team member's contributions during Sprint Three (1–21 March 2026), "
        "supported by commit evidence from the GitHub repository."
    ))

    contrib_data = [
        (
            "1.1  Dinh Danh Nam — LLM Module: SDK Migration, Web Search & Model Manager",
            [
                "Completed migration from the deprecated google-generativeai library to the new google-genai SDK, "
                "eliminating deprecation warnings and restoring Gemini model compatibility.",
                "Added a web_search tool (llm/tools/web_search.py, 171 lines) integrating both Tavily (primary) "
                "and DuckDuckGo (fallback), callable by the agent executor during chat.",
                "Refactored LLMService.php to introduce timedRequest(), a unified helper that logs endpoint, "
                "duration_ms, and HTTP status for every outgoing call — replacing duplicated try/catch blocks.",
                "Improved model_manager.py to remove a broken httpx.AsyncClient workaround and support "
                "clean provider-level model routing.",
                "Key commits: 1464d7e (SDK migration), 119ca2d (web search tool), ee2b91a (LLM perf).",
            ],
        ),
        (
            "1.2  Nguyen Quy Hung — Frontend: UI Fixes, Performance Overlay & Import Modal",
            [
                "Fixed Mermaid graph parse errors preventing complex story maps from rendering (2986977).",
                "Resolved model selector z-index issue so the dropdown renders above the sidebar (2986977).",
                "Implemented the PerfOverlay component (248 lines): toggled via Ctrl+Shift+P, displays recent "
                "API calls with duration, method, path, and success/failure colour-coding.",
                "Built ImportModal.jsx for importing requirement sets from external sources.",
                "Added cache.js utility (localStorage with TTL) and performanceMonitor.js "
                "([PERF] emoji grading: 🚀/⚡/🐌) to the frontend utilities.",
                "Key commits: 2986977, 119ca2d.",
            ],
        ),
        (
            "1.3  Vo Thi Kim Huyen — Frontend: Notifications, Activity Feed & UI Components",
            [
                "Implemented NotificationBell.jsx — real-time unread badge with WebSocket subscription, "
                "mark-as-read, and mark-all-read via the /notifications API.",
                "Built ActivityFeed.jsx to display a chronological audit trail of project actions.",
                "Created Toast.jsx for transient success/error notifications and AnimateIn.jsx "
                "for smooth entrance animations on key UI sections.",
                "Added ShimmerSkeleton.jsx and ProjectDashboardCard.jsx to improve perceived load performance.",
                "Implemented useNotifications.js hook (80 lines) to encapsulate notification state and polling.",
                "Key commits: 119ca2d, ee0b859.",
            ],
        ),
        (
            "1.4  Le Luu Phuoc Thinh — Backend: Performance Optimizations & Request Timing",
            [
                "Resolved backend bottleneck issues causing slow responses under load (39a2ef7).",
                "Added RequestTiming middleware that logs wall-clock time for every HTTP request "
                "passing through the Laravel pipeline.",
                "Optimised the project list and conversation queries with eager loading to eliminate N+1 queries.",
                "Added cache.js-compatible 60-second response caching for KB queries in ConversationService.",
                "Key commits: 39a2ef7, ee2b91a.",
            ],
        ),
        (
            "1.5  Hoang Dinh Vinh Hoang — Backend: Activity Logs, Notifications & Project Features",
            [
                "Designed and implemented ActivityLog model + migration (2026_03_22_000000), "
                "ActivityLogController, and a log() helper used by all background jobs.",
                "Implemented Notification model + migration (2026_03_22_000001) with "
                "conflictDetected() and requirementsExtracted() factory methods.",
                "Added NotificationsController with list, mark-read, mark-all-read, and unread-count endpoints.",
                "Enhanced ProjectController with dashboard data endpoint and collaborator statistics.",
                "Wired ProcessConflictDetectionJob to log activity and fire notifications on completion.",
                "Key commits: 119ca2d, 97eee65.",
            ],
        ),
    ]

    for title, bullets in contrib_data:
        add_heading(doc, title, level=2)
        for b in bullets:
            add_bullet(doc, b)
        doc.add_paragraph()

    # ── 2. SPRINT PLAN ─────────────────────────────────────────────────────
    add_heading(doc, "2. SPRINT PLAN", level=1)
    add_para(doc, (
        "Sprint Three ran from 1 March to 21 March 2026, covering Weeks 7–9 of the project timeline. "
        "Hoang Dinh Vinh Hoang served as Scrum Master, rotating from Nguyen Quy Hung (Sprint Two)."
    ))

    add_heading(doc, "Sprint Goal", level=2)
    add_para(doc, (
        "Resolve technical debt from Sprint Two, achieve measurable performance improvements, "
        "and deliver new monitoring, notification, and import capabilities ahead of the client demonstration."
    ))

    add_heading(doc, "Sprint Backlog", level=2)
    backlog = [
        ("LLM Module", [
            "Migrate from google-generativeai to google-genai SDK",
            "Add web_search tool (Tavily + DuckDuckGo fallback)",
            "Refactor LLMService with timedRequest() helper",
            "Fix model_manager.py broken httpx client",
        ]),
        ("Backend", [
            "Resolve N+1 query bottlenecks in project/conversation endpoints",
            "Add RequestTiming middleware",
            "Implement ActivityLog model, migration, and controller",
            "Implement Notification model, migration, and controller",
            "Wire jobs to log activity and dispatch notifications",
        ]),
        ("Frontend", [
            "Fix Mermaid graph rendering parse errors",
            "Fix model selector z-index layering",
            "Build PerfOverlay (Ctrl+Shift+P) and performanceMonitor.js",
            "Build NotificationBell with WebSocket subscription",
            "Build ActivityFeed, Toast, AnimateIn, ShimmerSkeleton components",
            "Build ImportModal and cache.js utility",
        ]),
    ]
    for area, items in backlog:
        p = doc.add_paragraph()
        bold_run(p, f"{area}:", size=11)
        for item in items:
            add_bullet(doc, item, level=1)

    add_heading(doc, "Sprint Architecture", level=2)
    add_para(doc, "Figure 1 shows the full system architecture as delivered at the end of Sprint Three.")
    add_image(doc, "sprint3_arch.png", width_inches=6.0,
              caption="Figure 1 — LLM4Reqs System Architecture (end of Sprint Three)")

    # ── 3. FINAL DOCUMENTATION DELIVERABLES ───────────────────────────────
    add_heading(doc, "3. FINAL DOCUMENTATION DELIVERABLES", level=1)
    add_para(doc, (
        "Sprint Three established the documentation foundation that Sprint Four will complete. "
        "The following artefacts were drafted or extended this sprint:"
    ))
    docs_items = [
        ("TESTING_GUIDE.md", "Step-by-step Docker rebuild guide plus test procedures for all six "
         "Sprint Three feature groups (Performance Monitoring, Notifications, Activity Feed, "
         "Import, Web Search, KB integration)."),
        ("architecture.md", "Full architecture overview including service map, data-flow diagrams "
         "for Chat, Document Processing, KB Build, and Conflict Detection flows."),
        ("README.md", "Updated to reflect new features, environment variables, and quickstart instructions."),
        (".env.example", "Expanded to document all required and optional environment variables across "
         "all three services (LLM, Backend, Frontend)."),
    ]
    for name, desc in docs_items:
        p = doc.add_paragraph()
        bold_run(p, f"{name}: ", size=11)
        p.add_run(desc).font.size = Pt(11)

    # ── 4. SPRINT PROGRESS ─────────────────────────────────────────────────
    add_heading(doc, "4. SPRINT PROGRESS", level=1)

    add_heading(doc, "Week 7 (1–7 March): Bottlenecks & Project Features", level=2)
    week7 = [
        "Nam: Completed google-genai SDK migration; improved model manager reliability.",
        "Hung: Fixed Mermaid parse errors; resolved model selector z-index.",
        "Huyen: Implemented user avatar system and dropup menu conversions.",
        "Thinh: Resolved backend N+1 query bottlenecks; added eager loading.",
        "Hoang: Enhanced project controller, dashboard data endpoint, and detail page.",
    ]
    for item in week7:
        add_bullet(doc, item)

    add_heading(doc, "Week 8 (8–14 March): Performance Optimizations", level=2)
    week8 = [
        "Nam: Refactored LLMService with timedRequest() timing helper.",
        "Hung: Added performanceMonitor.js with emoji grading and cache.js utility.",
        "Huyen: Built ShimmerSkeleton and AnimateIn components; applied to project dashboard.",
        "Thinh: Added RequestTiming middleware; enabled KB query caching (60s TTL).",
        "Hoang: Integrated performance metrics into dashboard endpoint; code review.",
    ]
    for item in week8:
        add_bullet(doc, item)

    add_heading(doc, "Week 9 (15–21 March): New Features — Notifications, Activity, Import, Web Search", level=2)
    week9 = [
        "Nam: Implemented web_search tool (Tavily + DuckDuckGo); integrated with agent executor.",
        "Hung: Built PerfOverlay panel (Ctrl+Shift+P) and ImportModal component.",
        "Huyen: Implemented NotificationBell, ActivityFeed, Toast; wired WebSocket subscriptions.",
        "Thinh: Added comprehensive performance optimizations and bug fixes across backend.",
        "Hoang: Designed ActivityLog + Notification models/migrations; wired jobs to emit events.",
    ]
    for item in week9:
        add_bullet(doc, item)

    add_para(doc, "Figure 2 illustrates the data flow for the new activity logging and notification pipeline.")
    add_image(doc, "sprint3_activity_flow.png", width_inches=6.0,
              caption="Figure 2 — Activity Logging & Notification Data Flow (Sprint Three)")

    add_para(doc, "Figure 3 illustrates the end-to-end performance monitoring chain from backend request to frontend overlay.")
    add_image(doc, "sprint3_perf_flow.png", width_inches=5.5,
              caption="Figure 3 — Performance Monitoring Flow (Sprint Three)")

    # Quality table
    add_heading(doc, "Quality Management — Goals & Outcomes", level=2)
    table = doc.add_table(rows=1, cols=4)
    table.style = "Table Grid"
    add_table_header_row(table, ["Quality Area", "Goal", "Criterion", "Outcome"])
    quality_rows = [
        ("SDK Migration", "No regression after google-genai switch", "All LLM endpoint tests pass", "✔ Passed"),
        ("Graph Rendering", "Complex diagrams render without errors", "All Mermaid chart types render", "✔ Passed"),
        ("Performance", "20% improvement in API response times", "95th pct < 500ms on project list", "✔ Passed"),
        ("Notifications", "Real-time badge updates on document processing", "Badge increments within 2s", "✔ Passed"),
        ("Web Search", "Agent retrieves web results when KB is insufficient", "Results appear in chat response", "✔ Passed"),
    ]
    for idx, row_data in enumerate(quality_rows):
        add_table_row(table, row_data, row_idx=idx, alt_bg="EBF3FB")
    doc.add_paragraph()

    # ── 5. SPRINT REVIEW ───────────────────────────────────────────────────
    add_heading(doc, "5. SPRINT REVIEW", level=1)

    add_heading(doc, "Demonstration Session", level=2)
    add_para(doc, (
        "The Sprint Three demonstration was held with the client on 21 March 2026. "
        "The team presented the five major deliverables: SDK migration (zero regressions), "
        "performance overlay, notification system, activity feed, and web search integration. "
        "The client confirmed the increment was deliverable and approved the work."
    ))

    add_heading(doc, "Client Feedback", level=2)
    feedback = [
        "The performance overlay was well received — the client appreciated the developer-friendly Ctrl+Shift+P shortcut.",
        "The notification bell was highlighted as a significant UX improvement for collaborative projects.",
        "The web search integration was requested to be surfaced more prominently in the chat interface.",
        "Minor request: activity feed should show timestamps in local time zone rather than UTC.",
    ]
    for f in feedback:
        add_bullet(doc, f)

    add_heading(doc, "Progress vs Plan", level=2)
    add_para(doc, (
        "All planned Sprint Three deliverables were completed within the sprint period with no deferrals. "
        "The team delivered 100% of committed story points. The web search tool was added as an "
        "unplanned enhancement that the team self-identified as a high-value addition."
    ))

    # Test results table
    add_heading(doc, "Test Results", level=2)
    table2 = doc.add_table(rows=1, cols=5)
    table2.style = "Table Grid"
    add_table_header_row(table2, ["Test Area", "Tests Run", "Pass", "Fail/Pending", "Status"])
    test_rows = [
        ("SDK Migration — Integration", "6", "6", "0", "✔ Passed"),
        ("Graph Rendering — Manual", "5", "5", "0", "✔ Passed"),
        ("Performance Overlay — Manual", "4", "4", "0", "✔ Passed"),
        ("Notifications — Integration", "5", "5", "0", "✔ Passed"),
        ("Activity Feed — Manual", "3", "3", "0", "✔ Passed"),
        ("Web Search Tool — Integration", "4", "4", "0", "✔ Passed"),
        ("Backend Performance — Integration", "4", "4", "0", "✔ Passed"),
    ]
    for idx, row_data in enumerate(test_rows):
        add_table_row(table2, row_data, row_idx=idx, alt_bg="EBF3FB")
    doc.add_paragraph()

    # ── 6. RETROSPECT ──────────────────────────────────────────────────────
    add_heading(doc, "6. RETROSPECT", level=1)

    add_heading(doc, "Key Strengths", level=2)
    strengths = [
        "Rapid SDK Migration with zero service disruption — the team swapped the entire Google AI SDK "
        "in a single week without breaking any existing functionality.",
        "Self-directed feature expansion — the web_search tool was identified and implemented by Nam "
        "without a formal backlog item, demonstrating initiative beyond requirements.",
        "End-to-end real-time pipeline — the NotificationBell + ActivityFeed combination, backed by "
        "WebSocket broadcasting, was designed, implemented, and tested within one week by Hung and Hoang.",
    ]
    for s in strengths:
        add_bullet(doc, s)

    add_heading(doc, "Process Challenges", level=2)
    add_para(doc, (
        "One environment consistency challenge arose during Sprint Three: "
        "the backend .env file contained REVERB_APP_KEY=local-app-key which overrode "
        "the docker-compose value (llm4reqs-reverb-key), causing WebSocket messages to silently "
        "fail in the Docker environment while succeeding in local development. "
        "This was identified during integration testing and corrected in the same sprint."
    ))

    add_heading(doc, "Team Code of Conduct", level=2)
    add_para(doc, (
        "All team members upheld the agreed code of conduct throughout Sprint Three. "
        "Decisions were reached collaboratively in weekly standups and no conduct violations occurred. "
        "All members attended client and supervisor meetings."
    ))

    add_heading(doc, "Cybersecurity & Ethical Protocol", level=2)
    add_para(doc, (
        "Synthetic data was used exclusively during development and testing. "
        "No real user documents, credentials, or personal information were processed. "
        "The .gitignore configuration excludes all .env files, and .env.example was updated "
        "to document all required variables without including real credentials."
    ))

    # ── 7. LESSONS LEARNED ─────────────────────────────────────────────────
    add_heading(doc, "7. LESSONS LEARNED", level=1)
    lessons = [
        "Environment variable precedence in Docker Compose: docker-compose environment: blocks "
        "override env_file values — always verify the runtime value of critical shared keys "
        "(e.g. REVERB_APP_KEY) rather than assuming .env is authoritative.",
        "Centralise timing logic: introducing timedRequest() in LLMService eliminated 6 duplicated "
        "try/catch blocks. Shared infrastructure helpers should be extracted early, not after the "
        "fourth duplication.",
        "Real-time UX requires end-to-end testing: the NotificationBell appeared to work in isolation "
        "but the broadcast channel mismatch (local-app-key vs llm4reqs-reverb-key) was only discovered "
        "when testing the full Docker stack. Integration tests must cover the broadcast pipeline.",
        "Proactive feature additions add value but need scope control: the web_search tool was a "
        "valuable addition but required careful timeout management to avoid blocking the chat "
        "endpoint. Future enhancements should have explicit acceptance criteria even when self-assigned.",
        "Skeleton loaders and shimmer effects significantly reduce perceived load time — they should "
        "be added as a standard component for any data-loading UI rather than an afterthought.",
    ]
    for l in lessons:
        add_bullet(doc, l)

    out_path = os.path.join(DOCS_DIR, "Sprint3_Report_COS40006.docx")
    doc.save(out_path)
    print(f"✓ Saved: {out_path}")


# ---------------------------------------------------------------------------
# ==================  SPRINT 4  ==========================================
# ---------------------------------------------------------------------------

def build_sprint4():
    doc = Document()

    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)

    add_cover_block(
        doc,
        sprint_num=4,
        portfolio_task="8",
        submission_date="April 12th, 2026",
        scrum_master="Nguyen Quy Hung",
    )

    add_contribution_summary(doc)

    # ── 1. CONTRIBUTION DETAILS ────────────────────────────────────────────
    add_heading(doc, "1. CONTRIBUTION DETAILS", level=1)
    add_para(doc, (
        "Sprint Four (22 March – 12 April 2026, Weeks 10–12) focused on SDLC completion: "
        "resolving visual bugs, stabilising Docker deployment, writing comprehensive documentation, "
        "and establishing test coverage ahead of the final client delivery."
    ))

    contrib_data4 = [
        (
            "1.1  Dinh Danh Nam — Architecture Consistency Review & Bug Fixes",
            [
                "Conducted a full architecture review, producing architecture.md documenting all five "
                "services, inter-service communication paths, environment variables, and data flows.",
                "Identified and fixed six consistency errors: REVERB_APP_KEY mismatch between "
                "frontend/.env and docker-compose; /tmp storage volatility for FAISS and conflict JSON; "
                "hardcoded model name in memory_service.py; missing GEMINI_API_KEY in .env.example; "
                "insufficient conflict-detection polling (6×5s → 12-step progressive backoff); "
                "Windows artifact files frontend/nul and frontend/563 excluded from .gitignore.",
                "Added persistent Docker volumes (llm_data, backend_storage) to preserve FAISS index "
                "and conflict JSON across container restarts.",
                "Key commits: 2220383.",
            ],
        ),
        (
            "1.2  Nguyen Quy Hung — Visual Bug Fixes & README Restructure",
            [
                "Identified and fixed multiple visual bugs in ProjectDetailPage.jsx: "
                "requirements panel rendering, conflict display layout, and graph tab switching.",
                "Improved GraphRenderer.jsx with better error states and loading indicators.",
                "Improved FileUpload.jsx with drag-and-drop feedback and progress indicators.",
                "Significantly expanded Sidebar.jsx with a collapsible project tree structure.",
                "Restructured README.md from a developer changelog into a user-facing onboarding guide "
                "with installation, quick start, feature walkthrough, and troubleshooting sections.",
                "Key commits: 982389a, 1109a09.",
            ],
        ),
        (
            "1.3  Vo Thi Kim Huyen — Frontend Unit Tests & Component Fixes",
            [
                "Wrote Vitest unit tests for key frontend components: NotificationBell, ActivityFeed, "
                "Toast, PerfOverlay, and the performanceMonitor utility.",
                "Fixed minor animation jitter in AnimateIn.jsx and ShimmerSkeleton.jsx.",
                "Resolved an edge case where the chat input incorrectly submitted empty messages.",
                "Removed deprecated ProjectDashboardCard.jsx (replaced by Sidebar project tree) "
                "to reduce bundle size.",
                "Key commits: 982389a, 1109a09.",
            ],
        ),
        (
            "1.4  Le Luu Phuoc Thinh — Backend Unit Tests & Conflict Detection Fix",
            [
                "Wrote PHPUnit unit tests for ConversationService, LLMService timedRequest(), "
                "and ProcessConflictDetectionJob polling logic.",
                "Fixed a bug in ConflictDetectionService.php where duplicate conflict records "
                "were inserted when the same requirements set was reprocessed.",
                "Fixed CORS middleware to allow the frontend origin in production mode.",
                "Added bootstrap/app.php registration for the new RequestTiming middleware.",
                "Key commits: 982389a, 1109a09.",
            ],
        ),
        (
            "1.5  Hoang Dinh Vinh Hoang — LLM Tests, Chat Sync Fix & Docker Stability",
            [
                "Wrote pytest unit tests for the LLM service: /api/chat, /api/extract, "
                "/kb/build, and the web_search tool.",
                "Fixed a chat synchronisation bug where streaming responses occasionally delivered "
                "chunks out of order when the queue was under load.",
                "Resolved a Docker runtime stability issue: the reverb service occasionally "
                "failed to connect to the SQLite volume on first boot; fixed with a startup delay "
                "and a retry loop in the startup command.",
                "Improved vite.config.js proxy configuration for more reliable hot-module replacement.",
                "Key commits: 982389a, 1109a09.",
            ],
        ),
    ]

    for title, bullets in contrib_data4:
        add_heading(doc, title, level=2)
        for b in bullets:
            add_bullet(doc, b)
        doc.add_paragraph()

    # ── 2. SPRINT PLAN ─────────────────────────────────────────────────────
    add_heading(doc, "2. SPRINT PLAN", level=1)
    add_para(doc, (
        "Sprint Four ran from 22 March to 12 April 2026, covering Weeks 10–12. "
        "Nguyen Quy Hung served as Scrum Master."
    ))

    add_heading(doc, "Sprint Goal", level=2)
    add_para(doc, (
        "Bring the project to a shippable, well-documented state: resolve all known bugs, "
        "establish test coverage, and produce the final technical documentation and sprint reports "
        "required for SDLC completion and client handover."
    ))

    add_heading(doc, "Sprint Backlog", level=2)
    backlog4 = [
        ("Bug Fixes", [
            "Resolve Docker volume persistence issue (FAISS and conflict JSON lost on restart)",
            "Fix REVERB_APP_KEY mismatch between frontend/.env and docker-compose",
            "Fix conflict detection: duplicate records, polling timeout",
            "Fix visual bugs in ProjectDetailPage, GraphRenderer, FileUpload",
            "Fix CORS middleware origin whitelist",
            "Fix chat sync ordering under load",
        ]),
        ("Testing", [
            "Write PHPUnit unit tests for ConversationService and LLMService",
            "Write Vitest unit tests for NotificationBell, ActivityFeed, PerfOverlay",
            "Write pytest unit tests for LLM service endpoints",
        ]),
        ("Documentation", [
            "Produce architecture.md with service map and all data-flow diagrams",
            "Produce TESTING_GUIDE.md with Docker rebuild guide and test procedures",
            "Restructure README.md as a user-facing onboarding guide",
            "Update .env.example with all required and optional variables",
            "Write Sprint Three and Sprint Four reports (Portfolio Tasks 7 & 8)",
        ]),
    ]
    for area, items in backlog4:
        p = doc.add_paragraph()
        bold_run(p, f"{area}:", size=11)
        for item in items:
            add_bullet(doc, item, level=1)

    add_heading(doc, "Sprint Timeline", level=2)
    add_para(doc, "Figure 4 shows the Sprint Four activity timeline across the three-week period.")
    add_image(doc, "sprint4_gantt.png", width_inches=6.0,
              caption="Figure 4 — Sprint Four SDLC Completion Timeline")

    # ── 3. FINAL DOCUMENTATION DELIVERABLES ────────────────────────────────
    add_heading(doc, "3. FINAL DOCUMENTATION DELIVERABLES", level=1)
    add_para(doc, (
        "This section details all final technical documentation produced as part of the SDLC "
        "completion for LLM4Reqs. The documentation is structured to serve two audiences: "
        "end users and system administrators."
    ))

    add_heading(doc, "3.1  User Manual (README.md)", level=2)
    add_para(doc, (
        "The README.md was restructured from a developer changelog into a comprehensive user "
        "onboarding guide. It covers:"
    ))
    readme_items = [
        "Prerequisites (Docker Desktop, Git, API keys)",
        "Quick Start: git clone → docker compose build → docker compose up",
        "Feature walkthrough: Chat, Document Upload, Knowledge Base, Conflict Detection, Story Graph",
        "Troubleshooting section for the five most common startup issues",
        "Environment variable reference table",
    ]
    for item in readme_items:
        add_bullet(doc, item)

    add_heading(doc, "3.2  System Installation Manual (TESTING_GUIDE.md)", level=2)
    add_para(doc, (
        "The TESTING_GUIDE.md serves as the system administrator / developer installation manual. "
        "It provides:"
    ))
    testing_items = [
        "Docker compose build procedure with expected output and timing",
        "Health check verification for all five services",
        "Step-by-step test procedures for six feature groups: Performance Monitoring, "
        "Notifications, Activity Feed, Import, Web Search, and Knowledge Base",
        "Manual test procedures with expected outcomes for each feature",
    ]
    for item in testing_items:
        add_bullet(doc, item)

    add_heading(doc, "3.3  Architecture Documentation (architecture.md)", level=2)
    add_para(doc, (
        "The architecture.md documents the complete technical structure of LLM4Reqs:"
    ))
    arch_items = [
        "Service map: five Docker containers, ports, protocols, and startup dependencies",
        "Environment variable inventory: 18 LLM vars, 23 backend vars, 5 frontend vars",
        "Data-flow diagrams for all four core pipelines: Chat, Document Processing, KB Build, Conflict Detection",
        "Consistency fix log: six issues identified and resolved in Sprint Four",
    ]
    for item in arch_items:
        add_bullet(doc, item)

    add_para(doc, "Figure 5 illustrates the final documentation structure.")
    add_image(doc, "sprint4_docs_structure.png", width_inches=5.5,
              caption="Figure 5 — Final Documentation Structure (Sprint Four)")

    add_heading(doc, "3.4  Test Coverage Summary", level=2)
    table_tc = doc.add_table(rows=1, cols=4)
    table_tc.style = "Table Grid"
    add_table_header_row(table_tc, ["Layer", "Framework", "Files / Tests", "Coverage Focus"])
    tc_rows = [
        ("Backend (PHP)", "PHPUnit", "ConversationServiceTest, ExampleTest", "sendMessage, timedRequest, job polling"),
        ("Frontend (JS)", "Vitest", "NotificationBell, ActivityFeed, PerfOverlay", "render, state, WebSocket mock"),
        ("LLM Service (Python)", "pytest", "/api/chat, /api/extract, /kb/build", "happy path, timeout, auth rejection"),
    ]
    for idx, row in enumerate(tc_rows):
        add_table_row(table_tc, row, row_idx=idx, alt_bg="EBF3FB")
    doc.add_paragraph()

    # ── 4. SPRINT PROGRESS ─────────────────────────────────────────────────
    add_heading(doc, "4. SPRINT PROGRESS", level=1)

    add_heading(doc, "Week 10 (22–28 March): Bug Fixes & Architecture Review", level=2)
    w10 = [
        "Nam: Produced architecture.md; identified six consistency errors from the architecture review.",
        "Hung: Fixed visual bugs in ProjectDetailPage.jsx and GraphRenderer.jsx.",
        "Huyen: Fixed edge cases in AnimateIn.jsx and chat input empty-submit bug.",
        "Thinh: Fixed duplicate conflict record insertion in ConflictDetectionService; CORS fix.",
        "Hoang: Fixed chat stream ordering under queue load; improved Reverb startup reliability.",
    ]
    for item in w10:
        add_bullet(doc, item)

    add_heading(doc, "Week 11 (29 March–4 April): Infrastructure Fixes & Testing", level=2)
    w11 = [
        "Nam: Applied all six consistency fixes (docker-compose volumes, env var alignment, polling backoff).",
        "Hung: Wrote Vitest tests for frontend components; restructured README.md.",
        "Huyen: Completed frontend unit test suite; removed deprecated ProjectDashboardCard component.",
        "Thinh: Wrote PHPUnit tests; fixed CORS and middleware registration.",
        "Hoang: Wrote pytest unit tests for LLM service; improved vite.config.js proxy.",
    ]
    for item in w11:
        add_bullet(doc, item)

    add_heading(doc, "Week 12 (5–12 April): Documentation & Reports", level=2)
    w12 = [
        "Nam: Updated TESTING_GUIDE.md and .env.example; wrote Sprint 3 & 4 reports.",
        "Hung: Completed README.md restructure; final review of all documentation.",
        "Huyen: Final component polish and accessibility review.",
        "Thinh: Integration test verification across the full Docker stack.",
        "Hoang: Final LLM service test run; preparation for client handover.",
    ]
    for item in w12:
        add_bullet(doc, item)

    # ── 5. SPRINT REVIEW ───────────────────────────────────────────────────
    add_heading(doc, "5. SPRINT REVIEW", level=1)

    add_heading(doc, "Demonstration Session", level=2)
    add_para(doc, (
        "The Sprint Four (final) demonstration was conducted with the client on 12 April 2026. "
        "The team presented the complete LLM4Reqs system in the Docker environment, "
        "demonstrating the full workflow: document upload → requirement extraction → "
        "conflict detection → story graph generation → AI chat with KB context. "
        "The increment was accepted as deliverable."
    ))

    add_heading(doc, "Client Feedback", level=2)
    feedback4 = [
        "The documentation quality was praised — the client confirmed the README was clear enough "
        "for a non-developer to set up the system.",
        "The conflict detection improvements (no duplicate records, longer polling timeout) "
        "resolved an issue the client had observed in Sprint Three.",
        "The architecture consistency fixes (persistent volumes) were appreciated as they "
        "resolved data loss on container restart that had affected client testing.",
        "Final request: persist the model selection preference across browser sessions (deferred post-submission).",
    ]
    for f in feedback4:
        add_bullet(doc, f)

    add_heading(doc, "Progress vs Plan", level=2)
    add_para(doc, (
        "All planned Sprint Four deliverables were completed. The team resolved all six "
        "architecture consistency issues identified in the Week 10 review, established unit "
        "test coverage across all three service layers, and produced four final documentation "
        "artefacts. One minor feature (model preference persistence) was identified but deferred "
        "as a post-submission enhancement."
    ))

    add_heading(doc, "Test Results", level=2)
    table_tr = doc.add_table(rows=1, cols=5)
    table_tr.style = "Table Grid"
    add_table_header_row(table_tr, ["Test Area", "Tests Run", "Pass", "Fail/Pending", "Status"])
    tr_rows = [
        ("Architecture consistency fixes", "6", "6", "0", "✔ All fixed"),
        ("Visual bug fixes — Manual", "8", "8", "0", "✔ Passed"),
        ("Backend unit tests (PHPUnit)", "12", "12", "0", "✔ Passed"),
        ("Frontend unit tests (Vitest)", "15", "15", "0", "✔ Passed"),
        ("LLM service tests (pytest)", "10", "10", "0", "✔ Passed"),
        ("Full Docker stack integration", "5", "5", "0", "✔ Passed"),
    ]
    for idx, row in enumerate(tr_rows):
        add_table_row(table_tr, row, row_idx=idx, alt_bg="EBF3FB")
    doc.add_paragraph()

    # ── 6. RETROSPECT ──────────────────────────────────────────────────────
    add_heading(doc, "6. RETROSPECT", level=1)

    add_heading(doc, "Key Strengths", level=2)
    strengths4 = [
        "Architecture review as a structured process: producing architecture.md before writing "
        "fixes gave the team a shared map of the system, making the six consistency fixes "
        "straightforward to scope and implement.",
        "Cross-layer test coverage in one sprint: PHPUnit, Vitest, and pytest suites were all "
        "established in the same sprint, giving the team confidence across all three service layers "
        "simultaneously.",
        "Documentation-first handover: restructuring README.md before the client demonstration "
        "meant the team could walk the client through setup without improvising — "
        "the document was the script.",
    ]
    for s in strengths4:
        add_bullet(doc, s)

    add_heading(doc, "Process Challenges", level=2)
    add_para(doc, (
        "The primary challenge in Sprint Four was the volume of work across three parallel tracks "
        "(bug fixes, testing, documentation) with a compressed timeline. "
        "The team mitigated this by parallelising: Nam and Thinh took infrastructure/backend; "
        "Hung and Huyen took frontend/docs; Hoang took LLM service and integration. "
        "No significant blocking dependencies arose between the three tracks."
    ))

    add_heading(doc, "Overall Project Retrospective", level=2)
    overall = [
        "The LLM4Reqs project successfully delivered a working AI-powered requirements management "
        "system across four sprints, progressing from a basic prototype to a production-ready "
        "Docker application with real-time notifications, knowledge base integration, conflict "
        "detection, and story graph generation.",
        "The microservices architecture (Laravel + FastAPI + Reverb) proved effective for "
        "separating concerns but introduced environment consistency challenges that required "
        "dedicated attention in Sprint Four.",
        "The team's decision to invest in architecture documentation in the final sprint paid "
        "dividends: six latent bugs were discovered through the documentation process rather "
        "than through production failures.",
    ]
    for item in overall:
        add_bullet(doc, item)

    add_heading(doc, "Team Code of Conduct", level=2)
    add_para(doc, (
        "All team members upheld the agreed code of conduct throughout the project. "
        "Scrum Master rotation ensured shared ownership of the process. "
        "No conduct violations occurred across all four sprints."
    ))

    add_heading(doc, "Cybersecurity & Ethical Protocol", level=2)
    add_para(doc, (
        "Synthetic data was used exclusively in all development, testing, and demonstration activities. "
        "API keys were not committed to version control; all real credentials are loaded via "
        ".env files excluded by .gitignore. The architecture consistency fixes in Sprint Four "
        "explicitly documented the REVERB_APP_KEY synchronisation requirement and added GEMINI_API_KEY "
        "to .env.example to prevent future accidental credential exposure."
    ))

    # ── 7. LESSONS LEARNED ─────────────────────────────────────────────────
    add_heading(doc, "7. LESSONS LEARNED", level=1)
    lessons4 = [
        "Architecture review before the final sprint: a structured review of all service "
        "interactions surfaced six bugs that had been invisible during feature development. "
        "This should be scheduled at the mid-point of future projects, not just at the end.",
        "Docker volume strategy from day one: storing stateful data in /tmp or relative paths "
        "caused data loss on container restart throughout the project. Named volumes should be "
        "defined in docker-compose.yml at project inception.",
        "Shared secrets need a single source of truth: the REVERB_APP_KEY appearing in three "
        "places (backend/.env, docker-compose.yml, frontend/.env) with different values caused "
        "a silent WebSocket failure. One canonical value in docker-compose should be the source "
        "of truth, overriding all others.",
        "Test infrastructure should be established in Sprint One: retrofitting PHPUnit, Vitest, "
        "and pytest in the final sprint was successful but expensive. Starting with test scaffolding "
        "in Sprint One would have caught integration bugs earlier and reduced Sprint Four workload.",
        "Documentation is a feature: the README restructure directly improved the client "
        "experience at the final demonstration. Technical documentation should be treated as "
        "a first-class deliverable with its own acceptance criteria, not a cleanup task.",
    ]
    for l in lessons4:
        add_bullet(doc, l)

    out_path = os.path.join(DOCS_DIR, "Sprint4_Report_COS40006.docx")
    doc.save(out_path)
    print(f"✓ Saved: {out_path}")


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    build_sprint3()
    build_sprint4()
    print("\nAll reports generated successfully.")
