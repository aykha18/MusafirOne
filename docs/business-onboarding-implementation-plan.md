# Business Onboarding Implementation Plan

## Purpose

Turn the business onboarding strategy into an execution plan for product, backend, mobile, admin, and operations.

This plan assumes the product direction already captured in:
- `docs/directory-claim-onboarding-spec.md`
- `docs/business-onboarding-strategy.md`
- `docs/business-ingestion-ops-runbook.md`

## Scope

Build a repeatable system to:
- seed Exchange and Umrah listings by city
- let owners claim businesses
- support offline/field onboarding
- review claims, reports, and duplicates
- scale imports through ops workflows and later agent assistance

## Workstreams

### 1) Product

- Finalize listing states and business badges
- Finalize owner entry points: claim existing, register missing
- Finalize rules for verified badge and claimed owner controls

### 2) Backend

- Directory endpoints
- Claim endpoints and verification flows
- Report listing flow
- Merge duplicate businesses
- Import metadata and batch support

### 3) Mobile

- Exchange directory browse
- Umrah directory browse and inquiry funnel
- Business detail screens
- Claim screens and My Claims
- Missing business submission flow

### 4) Admin

- Claims review
- Reports queue
- Businesses filter and merge
- Claim code generation
- Import batch visibility later if needed

### 5) Operations

- Source approval process
- Import template and QA workflow
- City launch playbook
- Outreach workflow for claim conversion

## Phased Plan

### Phase 0: Finalize Rules and Templates

### Goals

- Lock the operating model before more code changes
- Define import templates and QA rules

### Deliverables

- Approved source policy
- CSV/import schema
- duplicate decision rules
- city launch checklist
- claim conversion playbook

### Acceptance criteria

- Ops can describe the end-to-end flow without ambiguity
- Team agrees which source types are allowed
- One sample import batch is prepared for a pilot city

### Phase 1: Seeded Directory Foundation

### Backend

- Ensure `GET /directory/businesses`
- Ensure `GET /directory/businesses/:id`
- Ensure import metadata fields are present and used

### Mobile

- Exchange and Umrah tabs show seeded businesses
- Business cards show status and trust badges correctly
- Business detail supports report and claim entry point

### Admin/Ops

- Manual import for the first city
- QA review process active before publish

### Acceptance criteria

- Users can browse both categories in the pilot city
- Listings show correct `type`, `status`, and `claimStatus`
- Import metadata is stored for every seeded record

### Phase 2: Claim Conversion

### Backend

- Claim create flow
- OTP verification flow
- docs verification flow
- in-person code verification flow
- `GET /me/claims`

### Mobile

- Claim screen supports available methods
- My Claims screen works
- claim progress is visible

### Admin

- Claims queue lists pending, approved, rejected
- Approve and reject actions work
- claim documents can be downloaded

### Acceptance criteria

- A seeded business can be successfully claimed
- Rejected claims show a reason/state to the user
- Ownership assignment is reflected in business state and dashboard access

### Phase 3: Moderation and Data Integrity

### Backend/Admin

- Reports queue works
- Reject listing flow works
- duplicate merge works
- business filtering works by type and status

### Ops

- Standard operating procedure for reports, corrections, and merges

### Acceptance criteria

- Invalid listings can be removed quickly
- duplicate businesses can be merged without losing operational data
- admins can manage active, pending, and rejected records reliably

### Phase 4: Missing Business Submission

### Product

- Add `Business not listed?` entry point

### Backend

- create missing-business request endpoint or staged listing workflow
- run duplicate checks before approval

### Mobile

- simple owner form for missing business
- success and review states

### Admin/Ops

- review queue for new business requests

### Acceptance criteria

- Owner can submit a missing business without creating duplicate public listings
- admin can approve, merge, or reject the request

### Phase 5: Field Ops Enablement

### Admin/Ops

- claim code generation already available and operationalized
- rep instructions and scripts prepared
- simple tracking for field-assisted claims

### Acceptance criteria

- field reps can onboard businesses with no website or weak digital literacy
- in-person claim completion rate can be measured

### Phase 6: Agent-Assisted Internal Tooling

### Internal only

- import normalization assistant
- duplicate suggestion assistant
- outreach prioritization assistant

### Guardrails

- no autonomous publish
- no autonomous ownership assignment
- all suggested actions remain human-approved

### Acceptance criteria

- ops time per import batch decreases
- duplicate detection improves without raising false positives too much

## Delivery Backlog

### Must-have

- seeded directory
- claim workflows
- claims admin review
- reports queue
- duplicate merge
- in-person code generation
- import QA workflow

### Should-have

- missing business submission
- import batch visibility in admin
- outreach tracking

### Later

- AI-assisted normalization
- AI duplicate confidence scoring
- source health scoring
- automated refresh jobs for approved sources

## Dependencies

- stable business schema
- claim verification channels
- file upload storage for docs claims
- admin access control
- pilot city source data

## Risks and Mitigations

### Duplicate explosion

- Mitigation: dedupe rules, merge tooling, review queue

### Low claim conversion

- Mitigation: outreach playbook, WhatsApp follow-up, field onboarding

### Low data quality

- Mitigation: minimum record quality rules, batch QA, report/takedown flow

### Scraping or licensing issues

- Mitigation: source policy and source metadata retention

### Ops overload

- Mitigation: city-by-city rollout and later internal agent assistance

## Suggested Milestones

### Milestone A

- one pilot city live with seeded Exchange and Umrah listings

### Milestone B

- claims working end to end with admin review

### Milestone C

- moderation and merge workflows stable

### Milestone D

- missing business and field ops flow active

### Milestone E

- internal assistant supports ingestion at scale

## KPIs

- businesses imported per city
- percent claimed
- average time to claim approval
- duplicate rate
- report rate
- takedown turnaround time
- Umrah leads per listing
- claimed business weekly active rate

## Recommended Build Order

1. Pilot-city import and seeded listings
2. Claim conversion end to end
3. Reports and duplicate management
4. Missing business submission
5. Field ops process
6. Internal assistant for ops efficiency
