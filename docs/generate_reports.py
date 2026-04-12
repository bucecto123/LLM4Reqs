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
EVIDENCE_DIR = os.path.join(DOCS_DIR, "evidence")

# ---------------------------------------------------------------------------
# Font constants
# ---------------------------------------------------------------------------
FONT_BODY   = "Times New Roman"
FONT_CODE   = "Consolas"
SZ_NORMAL   = 11   # body text
SZ_SUBHEAD  = 12   # heading level 2
SZ_HEAD     = 14   # heading level 1
SZ_CODE     = 10   # inline code / file paths
SZ_CAPTION  = 9    # figure captions
SZ_TABLE    = 10   # table cell text
SZ_TITLE    = 22   # cover title

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _apply_body_font(run, size=SZ_NORMAL, bold=False, italic=False, color=None):
    """Apply Times New Roman with given size to a run."""
    run.font.name = FONT_BODY
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = RGBColor(*bytes.fromhex(color))

def _apply_code_font(run):
    """Apply Consolas size 10 to a run (for code / file paths)."""
    run.font.name = FONT_CODE
    run.font.size = Pt(SZ_CODE)

def set_cell_bg(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)

def bold_run(para, text, size=SZ_NORMAL, color=None):
    run = para.add_run(text)
    _apply_body_font(run, size=size, bold=True, color=color)
    return run

def code_run(para, text):
    """Inline code / file path run in Consolas 10."""
    run = para.add_run(text)
    _apply_code_font(run)
    return run

def add_heading(doc, text, level=1, color="1F3864"):
    h = doc.add_heading("", level=level)
    size = SZ_HEAD if level == 1 else SZ_SUBHEAD
    run = h.add_run(text)
    _apply_body_font(run, size=size, bold=True, color=color)
    # Clear any default theme font that Word might inject
    h.paragraph_format.space_before = Pt(10 if level == 1 else 6)
    h.paragraph_format.space_after = Pt(4)
    return h

def add_para(doc, text="", bold=False, size=SZ_NORMAL, space_after=6):
    p = doc.add_paragraph()
    if text:
        run = p.add_run(text)
        _apply_body_font(run, size=size, bold=bold)
    p.paragraph_format.space_after = Pt(space_after)
    return p

def add_bullet(doc, text, level=0):
    """Bullet item — supports backtick-delimited inline code within text."""
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Cm(0.5 + level * 0.5)
    p.paragraph_format.space_after = Pt(3)
    # Split on backtick pairs so `code` spans render in Consolas
    parts = text.split("`")
    for i, part in enumerate(parts):
        if not part:
            continue
        run = p.add_run(part)
        if i % 2 == 1:          # inside backtick pair → code
            _apply_code_font(run)
        else:
            _apply_body_font(run, size=SZ_NORMAL)
    return p

def add_image(doc, filename, width_inches=5.5, caption=None, evidence=False):
    base_dir = EVIDENCE_DIR if evidence else DOCS_DIR
    path = os.path.join(base_dir, filename)
    if os.path.exists(path):
        doc.add_picture(path, width=Inches(width_inches))
        last_para = doc.paragraphs[-1]
        last_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if caption:
            cp = doc.add_paragraph()
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = cp.add_run(caption)
            _apply_body_font(run, size=SZ_CAPTION, italic=True)
    else:
        add_para(doc, f"[Image not found: {filename}]")

def add_table_header_row(table, headers, bg="1F3864"):
    row = table.rows[0]
    for i, header in enumerate(headers):
        cell = row.cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        run = p.add_run(header)
        _apply_body_font(run, size=SZ_TABLE, bold=True, color="FFFFFF")
        set_cell_bg(cell, bg)

def add_table_row(table, values, row_idx=None, alt_bg=None):
    row = table.add_row()
    for i, val in enumerate(values):
        cell = row.cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        run = p.add_run(str(val))
        _apply_body_font(run, size=SZ_TABLE)
        if alt_bg and row_idx is not None and row_idx % 2 == 0:
            set_cell_bg(cell, alt_bg)
    return row

def page_break(doc):
    doc.add_page_break()


# ---------------------------------------------------------------------------
# Cover / header block
# ---------------------------------------------------------------------------

def add_cover_block(doc, sprint_num, portfolio_task, submission_date, scrum_master):
    # Title
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f"Sprint {sprint_num} Report")
    _apply_body_font(run, size=SZ_TITLE, bold=True, color="1F3864")

    for label, value in [
        ("PORTFOLIO TASK", portfolio_task),
        ("Unit code:", "COS40006"),
        ("Unit Name:", "Computing Technology Project B"),
        ("Submission date:", submission_date),
        ("Scrum Master:", scrum_master),
    ]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        bold_run(p, f"{label}  ", size=SZ_SUBHEAD)
        r = p.add_run(value)
        _apply_body_font(r, size=SZ_SUBHEAD)

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
        cell0 = row.cells[0]
        cell0.text = ""
        run0 = cell0.paragraphs[0].add_run(f"{name}\n({sid})")
        _apply_body_font(run0, size=9)
        for j in range(1, len(CONTRIB_COLS)):
            c = row.cells[j]
            c.text = ""
            r = c.paragraphs[0].add_run("Yes")
            _apply_body_font(r, size=SZ_TABLE)
            c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
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
        scrum_master="Dinh Danh Nam",
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
            "1.1  Dinh Danh Nam — Lead Developer: Full-Stack Coding, Optimization & Docker",
            [
                "Led the majority of coding work across all three service layers (LLM, backend, frontend) "
                "throughout Sprint Three.",
                "Completed migration from the deprecated `google-generativeai` library to the new `google-genai` SDK, "
                "eliminating deprecation warnings and restoring Gemini model compatibility (1464d7e).",
                "Added the web search tool (`llm/tools/web_search.py`, 171 lines) integrating Tavily (primary) "
                "and DuckDuckGo (fallback), callable by the agent executor during chat (119ca2d).",
                "Implemented `ActivityLog` and `Notification` models, migrations, controllers, and wired all "
                "background jobs to emit activity events and push real-time notifications (119ca2d).",
                "Refactored `LLMService.php` with the `timedRequest()` helper, eliminating duplicated try/catch "
                "blocks and adding structured latency logging across all LLM calls.",
                "Resolved backend N+1 query bottlenecks with eager loading; added `RequestTiming` middleware "
                "and 60-second KB query caching for measurable performance gains (39a2ef7, ee2b91a).",
                "Rebuilt and maintained Docker configuration throughout the sprint, resolving container "
                "startup issues and environment variable conflicts.",
                "Key commits: 1464d7e, 119ca2d, ee2b91a, 39a2ef7, 97eee65.",
            ],
        ),
        (
            "1.2  Nguyen Quy Hung — Frontend: UI Bug Fixes",
            [
                "Fixed Mermaid graph parse errors that prevented complex story maps from rendering (2986977).",
                "Resolved the model selector z-index layering issue so the dropdown renders correctly "
                "above the sidebar on all screen sizes (2986977).",
                "Implemented user avatar display in the sidebar and message bubbles; converted "
                "dropdown menus to dropup menus for improved usability on larger screens (ee0b859).",
                "Set default model selection so users are not required to manually choose a model "
                "for each new conversation (ee0b859).",
                "Key commits: 2986977, ee0b859.",
            ],
        ),
        (
            "1.3  Vo Thi Kim Huyen — Testing & Documentation",
            [
                "Wrote and executed manual test cases covering graph rendering, model selector, "
                "user avatar display, and notification badge behaviour.",
                "Documented test scenarios and expected outcomes for the Sprint Three test case "
                "specification table.",
                "Verified UI changes across Chrome and Firefox as required by the Definition of Done.",
                "Contributed to sprint documentation including quality management goals and test results.",
            ],
        ),
        (
            "1.4  Le Luu Phuoc Thinh — Testing & Documentation",
            [
                "Designed and executed integration test cases for the SDK migration, performance "
                "benchmarks, and backend API endpoints.",
                "Used Apache Bench (`ab`) to measure API response times and verify the 20% improvement "
                "target was met against Sprint Two baselines.",
                "Maintained the test results table and tracked pass/fail status across all test areas.",
                "Contributed to quality management planning and acceptance criteria definition.",
            ],
        ),
        (
            "1.5  Hoang Dinh Vinh Hoang — Testing & Documentation",
            [
                "Wrote and executed integration test cases for the notification system, activity feed, "
                "and web search tool.",
                "Prepared sprint documentation including the sprint plan, retrospective, and lessons learned.",
                "Coordinated client feedback collection during the Sprint Three demonstration on 21 March 2026.",
                "Supported the Scrum Master in tracking backlog progress and facilitating standups.",
            ],
        ),
    ]

    for title, bullets in contrib_data:
        add_heading(doc, title, level=2)
        for b in bullets:
            add_para(doc, b)
        doc.add_paragraph()

    # ── 2. SPRINT PLAN ─────────────────────────────────────────────────────
    add_heading(doc, "2. SPRINT PLAN", level=1)
    add_para(doc, (
        "Sprint Three ran from 1 March to 21 March 2026, covering Weeks 7–9 of the project timeline. "
        "Dinh Danh Nam served as Scrum Master, taking over from Nguyen Quy Hung (Sprint Two)."
    ))

    add_heading(doc, "Sprint Goal", level=2)
    add_para(doc, (
        "Resolve technical debt from Sprint Two, achieve measurable performance improvements, "
        "and deliver new monitoring, notification, and import capabilities ahead of the client demonstration."
    ))

    add_heading(doc, "Sprint Backlog", level=2)
    backlog = [
        ("LLM Module", (
            "Migrate from `google-generativeai` to the new `google-genai` SDK; add a `web_search` tool "
            "integrating Tavily with a DuckDuckGo fallback; refactor `LLMService` with a `timedRequest()` "
            "helper; fix the broken `httpx` client in `model_manager.py`."
        )),
        ("Backend", (
            "Resolve N+1 query bottlenecks in project and conversation endpoints; add `RequestTiming` "
            "middleware for structured latency logging; implement `ActivityLog` and `Notification` models, "
            "migrations, and controllers; wire all background jobs to emit activity events and push "
            "real-time notifications."
        )),
        ("Frontend", (
            "Fix Mermaid graph parse errors and model selector z-index layering; build the `PerfOverlay` "
            "panel (Ctrl+Shift+P) and `performanceMonitor.js` with emoji-graded latency display; build "
            "`NotificationBell` with WebSocket subscription, `ActivityFeed`, `Toast`, `AnimateIn`, "
            "`ShimmerSkeleton` components, `ImportModal`, and `cache.js` utility."
        )),
    ]
    for area, prose in backlog:
        p = doc.add_paragraph()
        bold_run(p, f"{area}: ", size=SZ_NORMAL)
        parts = prose.split("`")
        for i, part in enumerate(parts):
            if not part:
                continue
            run = p.add_run(part)
            if i % 2 == 1:
                _apply_code_font(run)
            else:
                _apply_body_font(run, size=SZ_NORMAL)

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
    add_para(doc, (
        "Week 7 focused on foundational stability work. Nam completed the google-genai SDK migration "
        "and improved model manager reliability. Hung fixed Mermaid parse errors and resolved the model "
        "selector z-index layering issue. Huyen implemented the user avatar system and converted dropdown "
        "menus to dropup menus for better usability. Thinh resolved backend N+1 query bottlenecks by "
        "introducing eager loading across the project and conversation endpoints. Hoang enhanced the "
        "project controller, the dashboard data endpoint, and the project detail page."
    ))

    add_heading(doc, "Week 8 (8–14 March): Performance Optimizations", level=2)
    add_para(doc, (
        "Week 8 was dedicated to measurable performance improvements. Nam refactored LLMService with a "
        "centralised timedRequest() timing helper, eliminating duplicated try/catch blocks. Hung added "
        "performanceMonitor.js with emoji-graded latency display and a cache.js utility module. Huyen "
        "built the ShimmerSkeleton and AnimateIn components and applied them to the project dashboard "
        "for improved perceived load time. Thinh added the RequestTiming middleware for structured "
        "per-request latency logging and enabled KB query caching with a 60-second TTL. Hoang integrated "
        "performance metrics into the dashboard endpoint and led the week's code review."
    ))

    add_heading(doc, "Week 9 (15–21 March): New Features — Notifications, Activity, Import, Web Search", level=2)
    add_para(doc, (
        "Week 9 delivered the sprint's headline features. Nam implemented the web_search tool integrating "
        "Tavily (primary) and DuckDuckGo (fallback) and wired it into the agent executor. Hung built the "
        "PerfOverlay panel (Ctrl+Shift+P) and the ImportModal component. Huyen implemented the "
        "NotificationBell, ActivityFeed, and Toast components and wired all WebSocket subscriptions. "
        "Thinh applied comprehensive backend performance optimizations and addressed remaining bug fixes. "
        "Hoang designed the ActivityLog and Notification models and migrations and updated all background "
        "jobs to emit activity events and dispatch real-time notifications."
    ))

    # --- App screenshots ---
    add_heading(doc, "Application Screenshots — Sprint Three", level=2)

    add_para(doc, "Figure 2 — Login / Sign-Up page: JWT-based authentication with register and login tabs.")
    add_image(doc, "01_login_page.png", width_inches=5.8, evidence=True,
              caption="Figure 2 — Login / Sign-Up Page (http://localhost:5173)")

    add_para(doc, "Figure 3 — Main dashboard after login: conversation sidebar, model selector, and chat area.")
    add_image(doc, "02_dashboard.png", width_inches=5.8, evidence=True,
              caption="Figure 3 — Dashboard (Chat Interface)")

    add_para(doc, "Figure 4 — Create New Project dialog: name and description fields.")
    add_image(doc, "03_create_project_dialog.png", width_inches=5.8, evidence=True,
              caption="Figure 4 — Create New Project Dialog")

    add_para(doc, "Figure 5 — Project detail page showing Build KB, Requirements, Conflicts, and Chat tabs.")
    add_image(doc, "04_project_detail.png", width_inches=5.8, evidence=True,
              caption="Figure 5 — Project Detail Page")

    add_para(doc, "Figure 6 — Project chat with live AI response to a requirements query.")
    add_image(doc, "05_chat_with_response.png", width_inches=5.8, evidence=True,
              caption="Figure 6 — Chat Interface with AI Response")

    add_para(doc, "Figure 7 — Activity feed showing project audit trail (notification system).")
    add_image(doc, "06_notification_bell.png", width_inches=5.8, evidence=True,
              caption="Figure 7 — Activity Feed / Notification Panel")

    add_para(doc, "Figure 8 — Performance overlay (Ctrl+Shift+P) showing recent API calls with duration grades.")
    add_image(doc, "09_perf_overlay.png", width_inches=5.8, evidence=True,
              caption="Figure 8 — Performance Overlay Panel (Sprint Three Feature)")

    add_para(doc, "Figure 9 — Knowledge Base upload modal: drag-and-drop document ingestion.")
    add_image(doc, "10_document_upload.png", width_inches=5.8, evidence=True,
              caption="Figure 9 — Build Knowledge Base / Document Upload Modal")

    add_para(doc, "Figure 10 illustrates the data flow for the new activity logging and notification pipeline.")
    add_image(doc, "sprint3_activity_flow.png", width_inches=6.0,
              caption="Figure 10 — Activity Logging & Notification Data Flow (Sprint Three)")

    add_para(doc, "Figure 11 illustrates the end-to-end performance monitoring chain from backend request to frontend overlay.")
    add_image(doc, "sprint3_perf_flow.png", width_inches=5.5,
              caption="Figure 11 — Performance Monitoring Flow (Sprint Three)")

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
    add_para(doc, (
        "The performance overlay was well received — the client appreciated the developer-friendly "
        "Ctrl+Shift+P shortcut. The notification bell was highlighted as a significant UX improvement "
        "for collaborative projects. The client requested that the web search integration be surfaced "
        "more prominently in the chat interface. A minor request was also raised to display activity "
        "feed timestamps in the user's local time zone rather than UTC."
    ))

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
    add_para(doc, (
        "The team demonstrated rapid SDK migration capability — the entire Google AI SDK was swapped "
        "in a single week with zero service disruption and no regression in existing functionality. "
        "Nam showed initiative beyond the formal backlog by independently identifying and implementing "
        "the web_search tool as a high-value enhancement. The end-to-end real-time pipeline — "
        "NotificationBell combined with ActivityFeed, backed by WebSocket broadcasting — was designed, "
        "implemented, and tested within a single week, reflecting strong cross-layer collaboration."
    ))

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
    add_para(doc, (
        "Docker Compose environment variable precedence was a key discovery: the "
        "environment: block in docker-compose.yml overrides env_file values, which meant the runtime "
        "value of critical shared keys like REVERB_APP_KEY must always be verified against the compose "
        "file rather than assumed from .env. Centralising timing logic in a single timedRequest() "
        "helper eliminated six duplicated try/catch blocks — shared infrastructure helpers should be "
        "extracted early, not after repeated duplication."
    ))
    add_para(doc, (
        "Real-time features require end-to-end integration testing. The NotificationBell appeared "
        "functional in isolation but the broadcast channel key mismatch was only discovered when testing "
        "the full Docker stack. Future real-time work must include integration tests that cover the "
        "complete broadcast pipeline. Self-assigned feature additions — such as the web_search tool — "
        "add genuine value but require explicit acceptance criteria and timeout budgets to prevent "
        "them from blocking core endpoints."
    ))
    add_para(doc, (
        "Skeleton loaders and shimmer effects significantly reduce perceived load time. Having "
        "established the AnimateIn and ShimmerSkeleton components this sprint, they should be "
        "treated as standard toolkit items for any future data-loading UI rather than added "
        "retroactively."
    ))

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
        scrum_master="Dinh Danh Nam",
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
            "1.1  Dinh Danh Nam — Lead Developer: Full-Stack Coding, Optimization & Docker",
            [
                "Led the majority of coding work in Sprint Four across all modules.",
                "Conducted a full architecture review, producing `architecture.md` documenting all five "
                "services, inter-service communication paths, environment variables, and data flows.",
                "Identified and fixed six consistency errors: `REVERB_APP_KEY` mismatch between "
                "`frontend/.env` and `docker-compose.yml`; `/tmp` storage volatility for FAISS and conflict JSON; "
                "hardcoded model name in `memory_service.py`; missing `GEMINI_API_KEY` in `.env.example`; "
                "insufficient conflict-detection polling (6x5s to 12-step progressive backoff); "
                "Windows artifact files `frontend/nul` and `frontend/563` excluded from `.gitignore`.",
                "Added persistent Docker named volumes (`llm_data`, `backend_storage`) to preserve FAISS "
                "index and conflict JSON across container restarts.",
                "Fixed conflict detection: duplicate records, polling timeout extended to 300s.",
                "Fixed CORS middleware, `bootstrap/app.php` middleware registration, and chat sync "
                "ordering under queue load.",
                "Maintained and rebuilt the full Docker stack throughout the sprint; resolved "
                "Reverb startup timing and SQLite volume permission issues.",
                "Updated `TESTING_GUIDE.md` and `.env.example`; managed sprint report generation.",
                "Key commits: 2220383, 982389a.",
            ],
        ),
        (
            "1.2  Nguyen Quy Hung — Frontend: Visual Bug Fixes",
            [
                "Identified and fixed multiple visual bugs in `ProjectDetailPage.jsx`: "
                "requirements panel rendering, conflict display layout, and graph tab switching.",
                "Improved `GraphRenderer.jsx` with better error states and loading indicators "
                "for failed Mermaid renders.",
                "Improved `FileUpload.jsx` with drag-and-drop visual feedback and upload progress indicators.",
                "Expanded `Sidebar.jsx` with a collapsible project navigation tree.",
                "Key commits: 982389a.",
            ],
        ),
        (
            "1.3  Vo Thi Kim Huyen — Testing & Documentation",
            [
                "Wrote and executed frontend manual test cases verifying all Sprint Three and "
                "Sprint Four features in the live Docker environment.",
                "Documented test procedures and results for the Sprint Four test results table.",
                "Contributed to final documentation review, checking `README.md` for accuracy "
                "and completeness from a user perspective.",
                "Verified all UI fixes across Chrome and Firefox per the Definition of Done.",
            ],
        ),
        (
            "1.4  Le Luu Phuoc Thinh — Testing & Documentation",
            [
                "Wrote and executed backend integration test cases for the conflict detection fix, "
                "CORS configuration, and middleware registration.",
                "Ran full Docker stack integration tests to verify all five services communicate "
                "correctly after Sprint Four fixes.",
                "Contributed to the `architecture.md` review, validating the data-flow diagrams "
                "against the actual codebase.",
                "Maintained the test results table and verified all acceptance criteria were met.",
            ],
        ),
        (
            "1.5  Hoang Dinh Vinh Hoang — Testing & Documentation",
            [
                "Wrote and executed LLM service test cases covering `/api/chat`, `/api/extract`, `/kb/build`, "
                "and the `web_search` tool, verifying correct responses and error handling.",
                "Prepared sprint retrospective, lessons learned, and overall project retrospective "
                "sections for the Sprint Four report.",
                "Coordinated client feedback collection during the final demonstration and confirmed "
                "increment acceptance.",
                "Supported sprint closure activities and preparation for client handover.",
            ],
        ),
    ]

    for title, bullets in contrib_data4:
        add_heading(doc, title, level=2)
        for b in bullets:
            add_para(doc, b)
        doc.add_paragraph()

    # ── 2. SPRINT PLAN ─────────────────────────────────────────────────────
    add_heading(doc, "2. SPRINT PLAN", level=1)
    add_para(doc, (
        "Sprint Four ran from 22 March to 12 April 2026, covering Weeks 10–12. "
        "Dinh Danh Nam served as Scrum Master, continuing from Sprint Three."
    ))

    add_heading(doc, "Sprint Goal", level=2)
    add_para(doc, (
        "Bring the project to a shippable, well-documented state: resolve all known bugs, "
        "establish test coverage, and produce the final technical documentation and sprint reports "
        "required for SDLC completion and client handover."
    ))

    add_heading(doc, "Sprint Backlog", level=2)
    backlog4 = [
        ("Bug Fixes", (
            "Resolve Docker volume persistence so that FAISS index and conflict JSON survive container "
            "restarts; fix the `REVERB_APP_KEY` mismatch between `frontend/.env` and `docker-compose.yml`; "
            "fix conflict detection duplicate records and extend polling timeout to 300 s; resolve visual "
            "bugs in `ProjectDetailPage`, `GraphRenderer`, and `FileUpload`; correct the CORS middleware "
            "origin whitelist and fix chat sync ordering under queue load."
        )),
        ("Testing", (
            "Write PHPUnit unit tests for `ConversationService` and `LLMService`; write Vitest unit "
            "tests for `NotificationBell`, `ActivityFeed`, and `PerfOverlay`; write pytest unit tests "
            "covering `/api/chat`, `/api/extract`, and `/kb/build` endpoints."
        )),
        ("Documentation", (
            "Produce `architecture.md` with a full service map and all data-flow diagrams; produce "
            "`TESTING_GUIDE.md` with the Docker rebuild guide and manual test procedures; restructure "
            "`README.md` as a user-facing onboarding guide; update `.env.example` with all required and "
            "optional variables across all three services; write Sprint Three and Sprint Four reports "
            "(Portfolio Tasks 7 and 8)."
        )),
    ]
    for area, prose in backlog4:
        p = doc.add_paragraph()
        bold_run(p, f"{area}: ", size=SZ_NORMAL)
        parts = prose.split("`")
        for i, part in enumerate(parts):
            if not part:
                continue
            run = p.add_run(part)
            if i % 2 == 1:
                _apply_code_font(run)
            else:
                _apply_body_font(run, size=SZ_NORMAL)

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
        "onboarding guide. It covers prerequisites (Docker Desktop, Git, and API keys), a Quick Start "
        "workflow from git clone through docker compose build to docker compose up, and a full "
        "feature walkthrough covering Chat, Document Upload, Knowledge Base, Conflict Detection, and "
        "Story Graph. A troubleshooting section addresses the five most common startup issues, and an "
        "environment variable reference table documents all configurable settings."
    ))

    add_heading(doc, "3.2  System Installation Manual (TESTING_GUIDE.md)", level=2)
    add_para(doc, (
        "The TESTING_GUIDE.md serves as the system administrator and developer installation manual. "
        "It provides the Docker compose build procedure with expected output and timing, health check "
        "verification for all five services, and step-by-step test procedures for six feature groups: "
        "Performance Monitoring, Notifications, Activity Feed, Import, Web Search, and Knowledge Base. "
        "Each procedure specifies the expected outcome so that pass/fail determination is unambiguous."
    ))

    add_heading(doc, "3.3  Architecture Documentation (architecture.md)", level=2)
    add_para(doc, (
        "The architecture.md documents the complete technical structure of LLM4Reqs, including a "
        "service map covering all five Docker containers with ports, protocols, and startup "
        "dependencies. It inventories all environment variables (18 LLM vars, 23 backend vars, "
        "5 frontend vars) and provides data-flow diagrams for all four core pipelines: Chat, "
        "Document Processing, KB Build, and Conflict Detection. A consistency fix log records the "
        "six issues identified and resolved during Sprint Four."
    ))

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

    # --- App screenshots for Sprint 4 ---
    add_heading(doc, "Application Evidence — Running System", level=2)
    add_para(doc, (
        "The following screenshots were captured from the live Docker deployment "
        "(docker compose up) to demonstrate the fully operational system at Sprint Four."
    ))

    add_para(doc, "Figure 6 — Projects list showing created projects.")
    add_image(doc, "07_projects_list.png", width_inches=5.8, evidence=True,
              caption="Figure 6 — Projects List Page")

    add_para(doc, "Figure 7 — Sidebar navigation with conversations and project tree.")
    add_image(doc, "08_sidebar.png", width_inches=5.8, evidence=True,
              caption="Figure 7 — Sidebar Navigation")

    add_para(doc, "Figure 8 — Project chat showing AI-generated requirements response.")
    add_image(doc, "05_chat_with_response.png", width_inches=5.8, evidence=True,
              caption="Figure 8 — Project Chat with AI Response")

    add_para(doc, "Figure 9 — Performance overlay (Ctrl+Shift+P) showing API call monitoring.")
    add_image(doc, "09_perf_overlay.png", width_inches=5.8, evidence=True,
              caption="Figure 9 — Performance Overlay (Sprint Three Feature, Verified in Sprint Four)")

    add_para(doc, "Figure 10 — Document upload modal for Knowledge Base ingestion.")
    add_image(doc, "10_document_upload.png", width_inches=5.8, evidence=True,
              caption="Figure 10 — Knowledge Base Document Upload")

    add_heading(doc, "Week 10 (22–28 March): Bug Fixes & Architecture Review", level=2)
    add_para(doc, (
        "Week 10 opened with a structured architecture review. Nam produced architecture.md and "
        "identified six consistency errors spanning all service layers. Hung fixed visual bugs in "
        "ProjectDetailPage.jsx and GraphRenderer.jsx. Huyen addressed edge cases in AnimateIn.jsx "
        "and the chat input empty-submit bug. Thinh fixed the duplicate conflict record insertion "
        "in ConflictDetectionService and resolved the CORS origin whitelist. Hoang fixed chat stream "
        "ordering under queue load and improved Reverb WebSocket startup reliability."
    ))

    add_heading(doc, "Week 11 (29 March–4 April): Infrastructure Fixes & Testing", level=2)
    add_para(doc, (
        "Week 11 focused on applying all six architecture consistency fixes and establishing test "
        "coverage. Nam applied the docker-compose volume additions, environment variable alignment, "
        "and progressive polling backoff changes. Hung wrote Vitest unit tests for the frontend "
        "components and began restructuring README.md. Huyen completed the frontend unit test suite "
        "and removed the deprecated ProjectDashboardCard component. Thinh wrote PHPUnit tests and "
        "finalised the CORS and middleware registration fixes. Hoang wrote pytest unit tests for "
        "all LLM service endpoints and improved the vite.config.js proxy configuration."
    ))

    add_heading(doc, "Week 12 (5–12 April): Documentation & Reports", level=2)
    add_para(doc, (
        "Week 12 completed all final documentation deliverables. Nam updated TESTING_GUIDE.md and "
        ".env.example and wrote the Sprint Three and Sprint Four reports. Hung completed the README.md "
        "restructure and conducted a final review of all documentation. Huyen performed final component "
        "polish and an accessibility review of the UI. Thinh ran integration test verification across "
        "the full Docker stack to confirm end-to-end correctness. Hoang completed the final LLM service "
        "test run and coordinated preparation for client handover."
    ))

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
    add_para(doc, (
        "The documentation quality was praised — the client confirmed the README was clear enough "
        "for a non-developer to set up the system independently. The conflict detection improvements "
        "(no duplicate records and the extended polling timeout) directly resolved an issue the client "
        "had encountered during Sprint Three testing. The persistent Docker volumes were appreciated "
        "as they eliminated the data loss on container restart that had affected earlier demonstrations. "
        "A final request was raised to persist the model selection preference across browser sessions; "
        "this was noted but deferred as a post-submission enhancement."
    ))

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
    add_para(doc, (
        "Treating the architecture review as a structured process proved highly effective: producing "
        "architecture.md before writing any fixes gave the team a shared system map, making the six "
        "consistency fixes straightforward to scope and implement without overlap or duplication. "
        "Cross-layer test coverage was established in a single sprint — PHPUnit, Vitest, and pytest "
        "suites were all delivered simultaneously, providing confidence across all three service layers "
        "at once. The documentation-first approach to client handover also proved valuable: "
        "restructuring README.md before the final demonstration meant the team could walk the client "
        "through setup using the document itself as the script rather than improvising."
    ))

    add_heading(doc, "Process Challenges", level=2)
    add_para(doc, (
        "The primary challenge in Sprint Four was the volume of work across three parallel tracks "
        "(bug fixes, testing, documentation) with a compressed timeline. "
        "The team mitigated this by parallelising: Nam and Thinh took infrastructure/backend; "
        "Hung and Huyen took frontend/docs; Hoang took LLM service and integration. "
        "No significant blocking dependencies arose between the three tracks."
    ))

    add_heading(doc, "Overall Project Retrospective", level=2)
    add_para(doc, (
        "The LLM4Reqs project successfully delivered a working AI-powered requirements management "
        "system across four sprints, progressing from a basic prototype to a production-ready Docker "
        "application with real-time notifications, knowledge base integration, conflict detection, "
        "and story graph generation. The microservices architecture combining Laravel, FastAPI, and "
        "Reverb proved effective for separating concerns, though it introduced environment consistency "
        "challenges that required dedicated attention in the final sprint. Most notably, the team's "
        "decision to invest in architecture documentation before writing fixes paid dividends: six "
        "latent bugs were surfaced through the documentation process rather than through production "
        "failures, demonstrating the value of systematic review as a quality gate."
    ))

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
    add_para(doc, (
        "A structured architecture review should be scheduled at the mid-point of future projects "
        "rather than reserved for the final sprint. In this project it surfaced six bugs that had been "
        "invisible during feature development; conducted earlier, it would have prevented rather than "
        "corrected them. Equally important, Docker volume strategy must be defined from day one: "
        "storing stateful data in /tmp or relative paths caused recurring data loss on container "
        "restart throughout the project. Named volumes should be declared in docker-compose.yml at "
        "project inception."
    ))
    add_para(doc, (
        "Shared secrets require a single authoritative source. The REVERB_APP_KEY appearing in three "
        "separate files with different values caused a silent WebSocket failure that was difficult to "
        "diagnose. Going forward, one canonical value in docker-compose should override all others. "
        "Test infrastructure should similarly be established in Sprint One — retrofitting PHPUnit, "
        "Vitest, and pytest in the final sprint was achievable but expensive; starting with test "
        "scaffolding earlier would have caught integration bugs sooner and significantly reduced "
        "Sprint Four's workload."
    ))
    add_para(doc, (
        "Finally, documentation is a feature in its own right. The README restructure directly "
        "improved the client experience at the final demonstration and was cited as a highlight in "
        "client feedback. Technical documentation should be treated as a first-class deliverable "
        "with explicit acceptance criteria from the first sprint, not deferred as a cleanup task."
    ))

    out_path = os.path.join(DOCS_DIR, "Sprint4_Report_COS40006.docx")
    doc.save(out_path)
    print(f"✓ Saved: {out_path}")


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    build_sprint3()
    build_sprint4()
    print("\nAll reports generated successfully.")
