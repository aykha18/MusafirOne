# Directory Seeding + Claim Onboarding (Exchange + Umrah)

## Goal
Bootstrap supply for two business categories:
- Currency exchange agencies (`Business.type = exchange`)
- Umrah agencies (`Business.type = umrah`)

Do this by:
1) Seeding an “unclaimed directory” for each city
2) Letting owners “claim” the listing
3) Converting claimed listings into fully managed businesses (branches, offers, leads)
4) Enabling door-to-door onboarding for agencies without a website

This document defines the product spec and an implementation plan aligned with the current codebase (NestJS + Prisma + Expo RN).

## Principles
- Owners should never need a website to be onboarded.
- Unclaimed listings are visible but clearly marked and limited.
- Claim must have a verification step (phone, document, or in-person code).
- Keep imports auditable: store data source + timestamps, support takedown requests.

## Non-Goals (initial)
- Fully automated scraping of Google Maps without an approved API/license.
- Full KYC/compliance automation (can be phased).
- Complex geospatial ranking (location-related changes are intentionally excluded).

---

## User Stories

### End Users
- As a user, I can browse exchange agencies in my city and see basic contact details.
- As a user, I can browse Umrah agencies and submit an inquiry/lead.
- As a user, I can trust verified businesses more than unverified ones.

### Business Owners
- As an owner, I can search for my business and claim it.
- As an owner, I can register a new business if it’s not listed.
- As an owner, I can manage branches, hours, contact, and offers (exchange).
- As an owner, I can view inquiries/leads (Umrah + Exchange).

### Admin/Ops
- As an admin, I can review claim requests and approve/reject.
- As an admin, I can merge duplicates and manage imported sources.
- As an admin, I can mark businesses “verified”.

---

## Directory Model (Product)

### Listing states
Use existing `Business.status` plus a new claim state:
- `status = pending | active | rejected` (existing)
- `claimStatus = unclaimed | claim_requested | claimed | claim_rejected` (new)
- `isVerified = boolean` (existing)

Behavior:
- **Unclaimed**: visible in directory, limited features, no “verified” badge.
- **Claim requested**: visible, show “Claim in review”.
- **Claimed**: owner can manage in Business Dashboard.
- **Claim rejected**: visible, claim CTA remains available after cooldown.

### What users see for unclaimed listings
- Name, city, address (text), phone/WhatsApp (if available)
- “Unclaimed” badge
- “Claim this business” CTA (owner-only action)

### What owners get after claim
- Ownership assigned to `ownerUserId`
- Ability to edit business details + branches
- Exchange owners can create offers; Umrah owners can manage inquiry settings

---

## Claim Flow (Spec)

### Entry points
- Public listing page: “Claim this business”
- Business Dashboard: “Find my business” / “Register business”

### Claim methods (support all, choose based on available data)
1) **Phone verification** (preferred when business phone exists)
   - Send OTP to business phone/WhatsApp
   - Owner enters OTP to verify claim
2) **Document verification**
   - Upload trade license / agency license
   - Admin reviews and approves
3) **In-person code (door-to-door)**
   - Sales rep generates one-time code
   - Owner enters code to complete claim

### Abuse/Spam rules
- One user may have only N pending claims at a time.
- Claim attempts for the same business are rate-limited.
- Claims require auth; capture audit trail (IP/device optional).

---

## Data Ingestion (“Scraping Agent”) Approach

### Recommended approach
Build an internal ingestion pipeline that produces a curated import dataset:
- Collector: official APIs (where licensed), public registries, partner lists, manual input
- Normalizer: phone normalization, dedupe (name + city + phone), standardization
- Review: human QA queue
- Importer: inserts/updates `Business` and a default `Branch`

### What to store per imported listing
- `sourceType` (enum): `manual | api | partner | other`
- `sourceName` (string): provider identifier
- `sourceUrl` (string, optional)
- `importBatchId` (string)
- `importedAt` (datetime)
- `lastSeenAt` (datetime) for refresh cycles

### Takedown / corrections
- “Report listing” link
- Admin tool to hide/remove listing quickly

---

## Backend Spec (API)

### Public directory endpoints (existing pattern: `/exchanges`)
Add parallel Umrah directory endpoints (or reuse a generic businesses directory endpoint):
- `GET /directory/businesses?type=exchange|umrah&city=...`
- `GET /directory/businesses/:id`

### Claim endpoints (new)
Authenticated:
- `POST /businesses/:id/claim` (create claim request; chooses method)
- `POST /businesses/:id/claim/verify-otp` (if phone method)
- `POST /businesses/:id/claim/submit-docs` (if docs method)
- `POST /businesses/:id/claim/verify-code` (if in-person code)
- `GET /me/claims` (list my claim requests)

Admin:
- `GET /admin/claims?status=...`
- `PATCH /admin/claims/:id/approve`
- `PATCH /admin/claims/:id/reject`
- `POST /admin/businesses/:id/merge` (optional)

Notes:
- Approval assigns `Business.ownerUserId` (existing ownership pattern).
- If the business is `pending`, admin approval can also flip it to `active`.

---

## Database Spec (Prisma)

### New model: BusinessClaim
Minimal fields:
- `id`
- `businessId`
- `requesterUserId`
- `status` (`pending|approved|rejected`)
- `method` (`phone_otp|docs|in_person_code`)
- `phoneToVerify` (optional)
- `docsJson` (optional; list of uploaded file refs)
- `createdAt`, `updatedAt`, `reviewedAt`

### Business additions
- `claimStatus` (`unclaimed|claim_requested|claimed|claim_rejected`)
- `claimedAt` (nullable)
- `claimedByUserId` (nullable, optional)
- Import metadata fields (sourceType/sourceName/sourceUrl/importBatchId/importedAt/lastSeenAt)

---

## Mobile UI Spec

### Tabs / Navigation
- Umrah tab shows Umrah directory + inquiry CTA.
- Explore remains accessible from Profile (and optionally Home card).

### Directory listing cards
For both Exchange and Umrah:
- Consistent card style (match Exchange cards)
- Badge row: Verified / Unclaimed / Pending
- Primary CTA:
  - Exchange: View offers / Contact / Leads (depending on role)
  - Umrah: Send inquiry

### Claim UX
On business detail:
- If unclaimed: show “Claim this business” button
- Claim screen:
  - Choose method (phone/docs/code) based on available data
  - Show claim status timeline

### Owner conversion
After claim approved:
- Deep link into Business Dashboard for that business

---

## Implementation Plan (Phased)

### Phase 1 — Seed directory (MVP)
Backend:
- Add import metadata fields to `Business`
- Add `GET /directory/businesses` + `GET /directory/businesses/:id`
Mobile:
- Umrah tab uses the directory endpoint to list agencies
Ops:
- Manual import (CSV → script) for 1 city to validate UX

Deliverable:
- Users can browse unclaimed Exchange/Umrah listings

### Phase 2 — Claim request + admin review
Backend:
- Add `BusinessClaim` model + endpoints for requesting claim
- Add admin endpoints to approve/reject claims
Mobile:
- “Claim business” CTA + claim status screen
Admin:
- Minimal admin review UI (could be web or internal-only)

Deliverable:
- Owners can claim and become `ownerUserId`

### Phase 3 — Verification + trust signals
Backend:
- Verified badge rules (admin-controlled initially)
- Rate-limit/anti-abuse for claim attempts
Mobile:
- Verified/unclaimed badges and explanations

Deliverable:
- Stronger trust layer for directory

### Phase 4 — Umrah inquiry funnel
Backend:
- `POST /umrah/leads` (or reuse lead model with businessType)
Mobile:
- Inquiry form + owner inbox for Umrah leads

Deliverable:
- Umrah marketplace actually generates leads

### Phase 5 — Ingestion pipeline (“agent”)
Separate internal tool (not inside the mobile app):
- Pull from licensed APIs/partners
- Dedupe + normalization
- Human QA queue
- Import into DB with batch tracking

Deliverable:
- Repeatable city-by-city rollout

---

## Rollout Strategy
- Start with 1 city → 50–200 listings per category.
- Enable claim + door-to-door codes for agencies without reliable phone numbers.
- Measure:
  - Listing views → claim clicks → claim approvals
  - Leads per listing (Umrah) and offers per business (Exchange)

## Risks and Mitigations
- Duplicate listings: add merge tooling + dedupe rules.
- Incorrect data: show “Report listing” + fast admin takedown.
- Scraping/ToS risk: prefer licensed sources; keep source attribution.

