# Smart Campus — Feature Removal & Deprecation Log

> **Branch:** `feat/student-portal-refinements`
> **Date:** November 2026

---

## 1. Executive Summary

In accordance with product refinement requirements, the Smart Campus Student Portal was streamlined from 34 sections down to **25 canonical sections**, eliminating student-facing clutter, simulated financial/medical tracking, and experimental prompt execution panels.

---

## 2. Inventory of Removed Features

| # | Removed Feature | Old DOM ID | Reasons & Scope of Removal |
|---|---|---|---|
| 1 | **Smart Exam Schedule** | `#exam-schedule` | Duplicate exam schedule feature removed. Shared academic calendar and routine timetable retained. |
| 2 | **Certificates & Hall Ticket** | `#certificates` | Document generation and hall ticket issuance removed from student navigation; modal `#addCertificateModal` deleted. |
| 3 | **AI Engine Kernel Core / Commander** | `#kernelCommanderModal` | Unsafe experimental natural-language execution modal, `Ctrl+K` global keyboard listener, and header button removed. |
| 4 | **Health & Wellness Records** | `#health` | Out-of-scope simulated medical records removed from student navigation and DOM. |
| 5 | **Campus Wallet & Finance** | `#finance` | Out-of-scope simulated virtual top-up wallet removed; modal `#topupModal` deleted. Official fee ledger (`#fees`) retained. |
| 6 | **Hostel & Campus Help** | `#campus` | Out-of-scope hostel booking and bus pass requests removed from student navigation. |
| 7 | **Resume Builder** | `#resume` | Out-of-scope resume formatting tool removed. |
| 8 | **CGPA Predictor** | `#cgpa` | Standalone speculative grade calculator removed; official grade transcript and academic snapshot in `#profile` retained. |
| 9 | **Discussion Forum** | `#forum` | Out-of-scope forum topics and reply threads removed; modals `#newTopicModal` and `#topicDetailsModal` deleted. Real-time `#group-chat` (Community Hub) retained. |
| 10 | **Campus Social Feed** | `#social-feed` | Stale social post stream removed. Official `#notices` board retained. |
| 11 | **Webinars & Live Streams** | `#streaming` | Unused streaming video embed section removed. |
| 12 | **Project Blueprint** | `#projectBlueprintModal` | Developer technical report modal and header button removed from student portal. |

---

## 3. Global Header Action Strip Removals

As requested from UI review screenshots, the following top action strip controls were eliminated:
1. **Project Blueprint Button**: Removed `openProjectBlueprintModal()` button and all associated DOM modal elements.
2. **STUDENT Persona Dropdown**: Removed `#roleSwitcherBtn` and `#roleSwitcherDropdown`. Student identity is strictly and securely derived from authenticated JWT session.
3. **AI Engine Kernel Button & Ctrl+K Pill**: Removed `#openKernelCommander` button, modal `#kernelCommanderModal`, and global keyboard shortcut listener.
4. **Header Profile Pill**: Replaced with clean Student Profile shortcut (`showSection('profile')`) showing student avatar and first name.

---

## 4. Shared Backend & Data Safety

- **Zero Data Loss**: Database records for enrolled courses, timetable, attendance logs, and academic notices were preserved.
- **Clean Fallback**: Any legacy route call or loader for removed sections is safely stubbed or redirected to `#dashboard`.
- **Zero Console Errors**: All removed button listeners, modal triggers, and script references were sanitized.
