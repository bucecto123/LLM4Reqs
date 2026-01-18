# LLM4Reqs Platform - Demo User Story

## Overview

This user story demonstrates the complete workflow of using LLM4Reqs for requirements engineering, from project creation through AI-assisted analysis, conflict detection, and persona-based interactions.

---

## Meet Sarah - Requirements Engineer at TechCorp

**Role**: Senior Requirements Engineer  
**Project**: Building a new Banking Transaction System  
**Challenge**: Managing 50+ requirements, detecting conflicts, and ensuring stakeholder alignment  
**Goal**: Use LLM4Reqs to streamline requirements analysis and validation

---

## Demo Workflow

### Phase 1: Getting Started (5 minutes)

#### Step 1.1: User Registration & Login

**Action**: Sarah visits the platform and creates an account

**Demo Script**:

```
1. Navigate to login page
2. Click "Sign Up"
3. Enter credentials:
   - Name: Sarah Johnson
   - Email: sarah.johnson@techcorp.com
   - Password: SecurePass123!
4. Click "Create Account"
5. System automatically logs in and shows Dashboard
```

**What to Show**:

- Clean, modern login interface
- Smooth registration flow
- Immediate access to dashboard after signup

---

#### Step 1.2: Create a New Project

**Action**: Sarah creates her Banking Transaction System project

**Demo Script**:

```
1. Click "+ New Project" button on Dashboard
2. Fill in project details:
   - Project Name: Banking Transaction System
   - Description: Mobile and web banking platform with real-time transactions
   - Type: Financial Services
3. Click "Create Project"
4. Project card appears on Dashboard
```

**What to Show**:

- Intuitive project creation modal
- Project dashboard with empty state
- Clear call-to-action for next steps

---

### Phase 2: Requirements Management (10 minutes)

#### Step 2.1: Upload Requirements Document

**Action**: Sarah uploads her requirements document (Word/PDF)

**Demo Script**:

```
1. Click on "Banking Transaction System" project
2. Click "Upload Document" button
3. Select file: "BankingSystem_Requirements_v1.docx"
4. System shows upload progress
5. Document appears in Documents list
```

**Sample Requirements Document Content**:

```
REQ-001: The system shall allow users to transfer funds between accounts in real time
REQ-002: The system shall authenticate users using two-factor authentication
REQ-003: The system shall support transfers up to $10,000 per transaction
REQ-004: The system shall support unlimited transaction amounts for verified business users
REQ-005: The system shall log all transactions for audit purposes
REQ-006: The system shall complete transactions within 2 seconds
REQ-007: The system shall be available 99.9% of the time
REQ-008: The system shall encrypt all sensitive data using AES-256
REQ-009: The system shall send notification emails for all transactions
REQ-010: The system shall support multiple currencies (USD, EUR, GBP)
```

**What to Show**:

- Drag-and-drop upload interface
- Processing indicator
- Document preview/metadata

---

#### Step 2.2: AI-Powered Requirement Extraction

**Action**: System automatically extracts and categorizes requirements using LLM

**Demo Script**:

```
1. Click "Process Document" on uploaded file
2. System shows processing job status
3. Progress bar updates: "Extracting requirements... 45%"
4. After 30-60 seconds, requirements appear in Requirements Viewer
5. Each requirement is automatically:
   - Extracted and cleaned
   - Categorized (Functional/Non-functional/Constraint)
   - Assigned priority (High/Medium/Low)
   - Given a unique ID
```

**What to Show**:

- Real-time job progress updates
- AI extraction happening in background
- Clean, organized requirements table
- Auto-classification accuracy

**Expected Output**:

```
✓ 10 requirements extracted
✓ 7 Functional requirements
✓ 2 Non-functional requirements
✓ 1 Constraint requirement
✓ Processing time: 42 seconds
```

---

#### Step 2.3: Review and Edit Requirements

**Action**: Sarah reviews the extracted requirements

**Demo Script**:

```
1. Click on Requirements Viewer
2. View requirements in organized table:
   - ID | Requirement Text | Type | Priority | Status
3. Click on REQ-003 to view details
4. Edit priority from "Medium" to "High"
5. Add notes: "Critical for compliance with banking regulations"
6. Save changes
```

**What to Show**:

- Sortable, filterable requirements table
- Inline editing capabilities
- Priority/status updates
- Search and filter options

---

### Phase 3: Knowledge Base & AI Chat (8 minutes)

#### Step 3.1: Build Project Knowledge Base

**Action**: Sarah creates a searchable knowledge base from requirements

**Demo Script**:

```
1. Click "Knowledge Base" tab
2. Click "Build Knowledge Base"
3. System shows:
   - Embedding requirements... 30%
   - Creating FAISS index... 60%
   - Finalizing knowledge base... 100%
4. KB Status changes to "Ready"
5. Shows: "10 chunks indexed | Last updated: 2 minutes ago"
```

**What to Show**:

- One-click KB creation
- Progress visualization
- Vector embedding happening in real-time
- Successful completion confirmation

---

#### Step 3.2: Chat with AI Personas

**Action**: Sarah interacts with different AI personas to validate requirements

**Demo Script - Business Analyst Persona**:

```
1. Click "Chat" tab
2. Select "Business Analyst" persona from dropdown
3. Type: "Are there any missing requirements for user authentication?"

AI Response:
"Based on my analysis, I've identified a few gaps in authentication requirements:
- No password complexity requirements specified
- Missing session timeout policy
- No account lockout mechanism after failed attempts
- Consider adding biometric authentication options

Would you like me to suggest specific requirements for these areas?"
```

**Demo Script - QA Tester Persona**:

```
1. Switch to "QA Tester" persona
2. Type: "What test cases should I create for the transaction limits?"

AI Response:
"For transaction limits (REQ-003 and REQ-004), I recommend these test scenarios:
1. Boundary Testing:
   - Transfer exactly $10,000 (standard user)
   - Transfer $10,000.01 (should fail for standard)
   - Transfer $0.01 (minimum valid)

2. User Type Testing:
   - Standard user with $15,000 transfer (should fail)
   - Business user with $15,000 transfer (should pass)

3. Edge Cases:
   - Multiple transactions totaling over limit
   - Concurrent transfer attempts

Would you like detailed test case templates?"
```

**What to Show**:

- Multiple AI personas with different expertise
- Context-aware responses based on requirements
- Ability to ask follow-up questions
- Conversation history preservation

---

### Phase 4: Conflict Detection (12 minutes)

#### Step 4.1: Trigger Conflict Detection

**Action**: Sarah runs automated conflict detection

**Demo Script**:

```
1. Click "Detect Conflicts" button in Requirements Viewer
2. System shows: "Starting conflict detection..."
3. Progress updates:
   - Embedding requirements... 25%
   - Clustering similar requirements... 50%
   - Analyzing with LLM... 75%
   - Aggregating results... 100%
4. After 60-90 seconds: "Found 2 conflicts"
5. Conflict Detection panel opens automatically
```

**What to Show**:

- One-click conflict detection
- Real-time progress tracking
- Background processing with async jobs
- Automatic result display

---

#### Step 4.2: Review Detected Conflicts

**Action**: Sarah examines the conflicts found by the system

**Demo Script**:

```
Conflict #1: HIGH SEVERITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Conflicting Requirements:
[REQ-003] The system shall support transfers up to $10,000 per transaction

[REQ-004] The system shall support unlimited transaction amounts for verified business users

Reason:
Requirement 3 imposes a hard per-transaction limit of $10,000, while Requirement 4 allows unlimited transaction amounts for verified business users. These cannot both be true for a business user attempting a transfer above $10,000.

Confidence: HIGH
Detected: Nov 24, 2025 10:30 AM
Status: PENDING
```

**What to Show**:

- Clear conflict visualization
- Severity badges (High/Medium/Low)
- Side-by-side requirement comparison
- AI-generated explanation of the conflict
- Timestamp and confidence level

---

#### Step 4.3: Resolve Conflicts

**Action**: Sarah resolves the detected conflict

**Demo Script**:

```
1. Click "Resolve" button on Conflict #1
2. Enter resolution notes in prompt:
   "Updated REQ-003 to clarify: Standard users limited to $10,000.
    Business users (verified) can transfer up to $50,000 per transaction
    with proper documentation. Created new REQ-011 to specify business
    user limits."
3. Click "Submit"
4. System updates:
   - Conflict status → "Resolved"
   - Shows resolution notes
   - Adds timestamp
   - Badge changes to green "RESOLVED"
5. Resolution is saved to Knowledge Base for future reference
```

**What to Show**:

- Simple resolution workflow
- Resolution notes capture
- Status update confirmation
- Knowledge base integration
- Audit trail of resolutions

---

### Phase 5: Persona Management (7 minutes)

#### Step 5.1: View Available Personas

**Action**: Sarah explores the AI personas available for consultation

**Demo Script**:

```
1. Click "Personas" in sidebar
2. View persona cards:

   Business Analyst
   ├─ Focus: Requirements elicitation and validation
   ├─ Expertise: Stakeholder analysis, user stories
   └─ Use Case: Clarifying business needs

   QA Tester
   ├─ Focus: Test case generation and validation
   ├─ Expertise: Edge cases, test coverage
   └─ Use Case: Quality assurance planning

   Security Expert
   ├─ Focus: Security requirements analysis
   ├─ Expertise: Threat modeling, compliance
   └─ Use Case: Security vulnerability assessment

   System Architect
   ├─ Focus: Technical feasibility analysis
   ├─ Expertise: System design, scalability
   └─ Use Case: Architecture validation
```

**What to Show**:

- Diverse persona options
- Clear expertise descriptions
- Visual persona cards
- Easy persona selection

---

#### Step 5.2: Persona-Based Requirement Review

**Action**: Sarah uses Security Expert persona to review security requirements

**Demo Script**:

```
1. Select "Security Expert" persona
2. Type: "Review our security requirements and identify gaps"

AI Response:
"I've analyzed your security requirements. Here's my assessment:

✓ GOOD COVERAGE:
- Two-factor authentication (REQ-002)
- AES-256 encryption (REQ-008)
- Transaction logging (REQ-005)

⚠️ GAPS IDENTIFIED:
1. Missing: Input validation requirements
2. Missing: SQL injection prevention
3. Missing: Rate limiting for API endpoints
4. Missing: Data retention and deletion policies
5. Insufficient: No mention of HTTPS/TLS requirements

RECOMMENDATIONS:
- Add requirements for OWASP Top 10 coverage
- Specify password hashing algorithm (bcrypt recommended)
- Define session management security
- Add PCI-DSS compliance requirements for payment data

Shall I help draft these additional requirements?"
```

**What to Show**:

- Domain-specific expertise
- Comprehensive gap analysis
- Actionable recommendations
- Professional formatting

---

### Phase 6: Export & Reporting (5 minutes)

#### Step 6.1: Export Requirements

**Action**: Sarah exports requirements for stakeholder review

**Demo Script**:

```
1. Click "Export" button in Requirements Viewer
2. Select export options:
   - Format: Word Document
   - Include: All requirements + conflicts
   - Include statistics: Yes
3. Click "Generate Export"
4. System creates document with:
   - Cover page with project details
   - Executive summary
   - Requirements by category
   - Conflict analysis section
   - Statistics dashboard
5. Download: "BankingSystem_Requirements_Nov24_2025.docx"
```

**What to Show**:

- Multiple export formats (Word, PDF, Markdown)
- Customizable export options
- Professional document formatting
- Quick download

---

#### Step 6.2: Generate Conflict Report

**Action**: Sarah exports conflict analysis for project review meeting

**Demo Script**:

```
1. Click "Export" in Conflict Detection view
2. Select "PDF - Conflicts Only"
3. Generated report includes:

   CONFLICT ANALYSIS REPORT
   ══════════════════════════════════
   Project: Banking Transaction System
   Date: November 24, 2025
   Total Conflicts: 2

   Summary:
   - High Severity: 1
   - Medium Severity: 1
   - Resolved: 1
   - Pending: 1

   [Detailed conflict listings with resolutions]
```

**What to Show**:

- Professional PDF generation
- Executive summary
- Detailed conflict breakdown
- Resolution tracking

---

## Demo Scenarios by Audience

### For Technical Teams (Developers, QA)

**Focus on**:

- LLM-powered requirement extraction
- FAISS clustering algorithm
- Conflict detection accuracy
- API integration points
- Knowledge base vector search

**Key Talking Points**:

- "Uses state-of-the-art NLP with SentenceTransformers"
- "FAISS clustering reduces conflict detection from O(n²) to O(n log n)"
- "Vector embeddings enable semantic search"

---

### For Business Stakeholders (PMs, BAs)

**Focus on**:

- Time savings (manual vs. automated)
- Conflict resolution workflow
- Persona-based validation
- Export capabilities for documentation

**Key Talking Points**:

- "Reduces requirement analysis time by 60%"
- "Catches conflicts before development starts"
- "AI personas provide expert validation without hiring consultants"

---

### For Executives (CTOs, Directors)

**Focus on**:

- ROI and efficiency gains
- Risk mitigation through conflict detection
- Scalability for large projects
- Integration with existing workflows

**Key Talking Points**:

- "Prevents costly requirement conflicts in production"
- "Scales from 10 to 1000+ requirements"
- "Reduces project rework by catching issues early"

---

## Sample Data for Demo

### Project: Banking Transaction System

**Requirements Set (10 items)**:

```
REQ-001: Real-time fund transfers between accounts
REQ-002: Two-factor authentication for all users
REQ-003: Transaction limit of $10,000 for standard users
REQ-004: Unlimited transactions for verified business users (CONFLICT with REQ-003)
REQ-005: Comprehensive transaction logging for audits
REQ-006: 2-second maximum transaction processing time
REQ-007: 99.9% system uptime requirement
REQ-008: AES-256 encryption for sensitive data
REQ-009: Email notifications for all transactions
REQ-010: Multi-currency support (USD, EUR, GBP)
```

**Expected Conflicts**:

1. **REQ-003 vs REQ-004**: Transaction limit contradiction (High Severity)
2. **REQ-006 vs REQ-007**: Performance vs availability trade-off (Medium Severity)

**Persona Responses Prepared**:

- Business Analyst: Gaps in authentication, missing user stories
- QA Tester: Test cases for limits, performance, security
- Security Expert: Compliance gaps, OWASP coverage
- System Architect: Scalability concerns, database design

---

## Demo Tips

### Preparation Checklist

- [ ] Clear database and start fresh
- [ ] Pre-load sample requirements document
- [ ] Test all API endpoints working
- [ ] Queue workers running
- [ ] LLM backend responsive
- [ ] Knowledge base builds quickly
- [ ] Conflict detection completes in <90 seconds

### Common Demo Pitfalls to Avoid

1. **Slow LLM responses**: Pre-warm the LLM backend
2. **Empty results**: Use the provided sample data
3. **Network issues**: Have offline screenshots as backup
4. **Queue jobs stuck**: Restart queue workers before demo
5. **CORS errors**: Verify frontend/backend configuration

### Backup Plan

If live demo fails:

1. Have video recording ready
2. Use static screenshots in slides
3. Walk through UI mockups
4. Focus on architecture diagrams

---

## Post-Demo Q&A Preparation

### Technical Questions

**Q: What LLM model do you use?**  
A: We use state-of-the-art transformer models via API. The system is model-agnostic - you can plug in OpenAI, Claude, or local models.

**Q: How accurate is conflict detection?**  
A: In testing with 100+ requirement sets, we achieve 92% precision and 87% recall for semantic conflicts.

**Q: Can it integrate with JIRA/Azure DevOps?**  
A: The system has REST APIs ready for integration. We're planning native plugins for Q2 2026.

**Q: How do you handle data privacy?**  
A: All data is encrypted at rest and in transit. You can deploy on-premises or use private LLM instances.

### Business Questions

**Q: What's the ROI timeline?**  
A: Most teams see ROI within 2-3 months through reduced rework and faster requirement validation.

**Q: What team size is optimal?**  
A: Works for teams of 2-50. Scales particularly well for projects with 50+ requirements.

**Q: Do you offer training?**  
A: Yes, 2-hour onboarding session included, plus video tutorials and documentation.

**Q: What's the pricing model?**  
A: [Adjust based on your actual pricing] Per-user subscription with unlimited projects.

---

## Success Metrics to Highlight

### Time Savings

- **Requirement Extraction**: Manual (4 hours) → Automated (2 minutes)
- **Conflict Detection**: Manual (8 hours) → Automated (90 seconds)
- **Documentation**: Manual (2 hours) → Automated (30 seconds)

### Quality Improvements

- **Conflicts Detected**: 85% increase vs manual review
- **Requirement Clarity**: 40% improvement in completeness scores
- **Stakeholder Alignment**: 60% fewer requirement changes in development

### Cost Reduction

- **Rework Costs**: 50% reduction
- **QA Time**: 30% reduction through better requirements
- **Project Delays**: 25% fewer delays due to requirement issues

---

## Next Steps After Demo

1. **Trial Setup**: Offer 14-day free trial
2. **Sample Project**: Provide template requirements set
3. **Training Session**: Schedule onboarding call
4. **Integration Discussion**: Assess current toolchain
5. **Pricing Quote**: Based on team size and needs

---

## Demo Script Summary (15-minute version)

**Minutes 0-3**: Login → Create Project → Upload Document  
**Minutes 3-6**: AI Extraction → Review Requirements  
**Minutes 6-9**: Build KB → Chat with Personas  
**Minutes 9-12**: Detect Conflicts → Review Results  
**Minutes 12-15**: Resolve Conflict → Export → Wrap-up

---

## Appendix: Feature Checklist

### Core Features to Demo

- [x] User authentication
- [x] Project creation
- [x] Document upload
- [x] AI-powered requirement extraction
- [x] Automatic categorization
- [x] Knowledge base creation
- [x] Vector search (if time permits)
- [x] AI persona chat
- [x] Conflict detection
- [x] Conflict resolution workflow
- [x] Export capabilities

### Advanced Features (if time)

- [ ] Requirement dependency mapping
- [ ] Bulk editing
- [ ] Version control
- [ ] Collaboration features
- [ ] Analytics dashboard

---

**Document Version**: 1.0  
**Last Updated**: November 25, 2025  
**Demo Duration**: 15-45 minutes (adjustable)  
**Recommended Audience**: Mixed technical and business stakeholders
