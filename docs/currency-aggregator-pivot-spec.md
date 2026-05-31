# Currency Exchange Aggregator Pivot (V2) — Specs & Implementation Plan

## 1. Summary

Pivot the current “P2P currency exchange matchmaking” into a “local currency exchange aggregator” to establish trust via verified businesses and measurable transaction success. After sustained traction (e.g., 10k completed transactions), re-introduce P2P as an additional option.

This doc defines:
- Product spec for the aggregator phase
- How it maps onto the current codebase
- A phased implementation plan (backend + mobile + admin)

## 2. Current Codebase Snapshot (What Exists Today)

**Backend (NestJS + Prisma + Postgres)**
- P2P currency module: posts + match requests + state machine  
  - [currency.controller.ts](file:///c:/Users/Ayub/muhajirOne/backend/src/currency/currency.controller.ts)  
  - [currency.service.ts](file:///c:/Users/Ayub/muhajirOne/backend/src/currency/currency.service.ts)
- Parcel module (already “offline coordination” style): trips/requests/matching  
  - [parcel.controller.ts](file:///c:/Users/Ayub/muhajirOne/backend/src/parcel/parcel.controller.ts)  
  - [parcel.service.ts](file:///c:/Users/Ayub/muhajirOne/backend/src/parcel/parcel.service.ts)
- Trust primitives: ratings + disputes + admin actions (suspend/verify)  
  - [ratings.controller.ts](file:///c:/Users/Ayub/muhajirOne/backend/src/ratings/ratings.controller.ts)  
  - [disputes.controller.ts](file:///c:/Users/Ayub/muhajirOne/backend/src/disputes/disputes.controller.ts)  
  - [users.controller.ts](file:///c:/Users/Ayub/muhajirOne/backend/src/users/users.controller.ts)
- “Explore” feature ideas + voting (already a community prioritization pattern)  
  - [features.controller.ts](file:///c:/Users/Ayub/muhajirOne/backend/src/features/features.controller.ts)  
  - [features.service.ts](file:///c:/Users/Ayub/muhajirOne/backend/src/features/features.service.ts)  
  - [schema.prisma](file:///c:/Users/Ayub/muhajirOne/backend/prisma/schema.prisma#L105-L130)

**Mobile (Expo / React Native / expo-router)**
- Currency tab is currently P2P-oriented: create posts, browse, request/accept/complete  
  - [currency.tsx](file:///c:/Users/Ayub/muhajirOne/mobile/app/(tabs)/currency.tsx)
- Explore tab already uses backend-driven content + voting  
  - [explore.tsx](file:///c:/Users/Ayub/muhajirOne/mobile/app/(tabs)/explore.tsx)
- Chat exists and is tied to transactions, but can be reused later for agency messaging  
  - [chat/[id].tsx](file:///c:/Users/Ayub/muhajirOne/mobile/app/chat/%5Bid%5D.tsx)

**Key observation:** the codebase already supports “offline coordination” flows (Parcel) and trust primitives (ratings/disputes/admin verification). The aggregator pivot mainly introduces a new “business listing + offers + reviews + contact leads” domain.

## 3. Product Goals & Non-Goals

### Goals
- Let an individual user compare local exchange agencies by:
  - best rate (buy/sell)
  - distance/area and “open now”
  - verification badge + reviews
- Encourage real usage and measurable trust:
  - contact → confirmed transaction → review
  - aggregate “successful transactions” as the platform’s credibility metric
- Support business onboarding (exchange agencies, Umrah agencies) with admin verification.

### Non-Goals (V2 aggregator)
- No payment processing / escrow / wallet
- No guarantees on rate execution (rates can be “indicative” unless agency updates them)
- No automated FX feeds required (optional later)
- No full “marketplace logistics” (keep it lightweight)

## 4. Roles

### Individual User
- Browse and compare offers
- Contact an agency (call/WhatsApp/in-app message later)
- Confirm a completed exchange
- Leave a review
- Favorite agencies and create rate alerts

### Business Owner (Exchange Agency / Umrah Agency)
- Create and manage business profile
- Add branches (location + hours)
- Publish offers (pairs + buy/sell + fees/spread notes)
- View leads and (optionally) mark “fulfilled”

### Admin
- Approve business profiles and verification documents
- Moderate reviews and disputes
- Suspend abusive accounts

## 5. Core User Flows (Aggregator)

### 5.1 Browse → Compare → Contact
1. User selects corridor/city/area (existing “corridor” concept can stay).
2. User chooses currency pair and amount (e.g., SAR → INR, amount 1,000 SAR).
3. App shows list of agencies with:
   - computed “effective rate” for the amount (sell/buy direction)
   - distance + open/closed
   - verification badge
   - review score + review count
4. User opens details:
   - branch info, map, hours
   - contact actions (call/WhatsApp/directions/share)
5. App records a “lead” (for analytics + trust funnel).

### 5.2 Confirm Transaction → Review (Trust Layer)
1. After contacting, user can tap “I completed this exchange” and submit:
   - agency branch
   - pair + amount
   - optional proof (receipt photo) OR a simple confirmation checkbox initially
2. Agency can optionally confirm (later), but V1 can accept user-side confirmation only.
3. User leaves review:
   - rate fairness
   - service quality
   - speed
   - optional comment
4. The system increments “completed transactions” stats for the app and for that agency.

## 6. Core Business Flows

### 6.1 Business Registration
- A user selects “Register as Business” → chooses type:
  - currency exchange agency
  - Umrah travel agency
- Provides:
  - name, address, license/registration number, contact, social links
  - at least one branch with lat/lng + hours
- Status: pending → (admin approved) → active

### 6.2 Publish Offers (Currency Exchange Agencies)
Each branch publishes offers:
- Currency pair
- Buy rate / sell rate (or one “offer rate” with direction)
- Fees/spread notes
- Last updated time (visible to users)

## 7. Data Model (Proposed)

Keep existing P2P tables in place for later reintroduction. Add new tables for aggregator.

### 7.1 Business & Branches
- `Business`
  - `id`, `ownerUserId`, `type` (exchange | umrah), `name`, `description`
  - `phone`, `whatsapp`, `website`, `isVerified`, `status` (pending/active/rejected)
  - `trialEndsAt` (for Umrah “free 6 months”)
- `BusinessBranch`
  - `id`, `businessId`, `city`, `address`, `lat`, `lng`
  - `hoursJson` (or normalized hours table later)
  - `isActive`

### 7.2 Offers & Rates
- `ExchangeOffer`
  - `id`, `branchId`
  - `fromCurrency`, `toCurrency`
  - `direction` (buy/sell) OR store both buy/sell fields
  - `rate`, `minAmount`, `maxAmount`, `feeNote`
  - `updatedAt`

### 7.3 Leads & Confirmations
- `ExchangeLead`
  - `id`, `userId`, `branchId`, `fromCurrency`, `toCurrency`, `amount`, `createdAt`
  - `channel` (call/whatsapp/directions/share)
- `ExchangeConfirmation`
  - `id`, `userId`, `branchId`, `offerId?`, `amount`, `rateObserved?`
  - `status` (user_confirmed | business_confirmed | disputed)
  - `proofMediaPath?` (optional later)

### 7.4 Reviews
- `BusinessReview`
  - `id`, `userId`, `businessId`, `branchId?`, `confirmationId?`
  - `rateFairnessScore` (1–5)
  - `serviceScore` (1–5)
  - `speedScore` (1–5)
  - `comment?`, `createdAt`
  - moderation fields (hidden/flagged) later

## 8. API Spec (Proposed)

### Public / Authenticated (Mobile)
- `GET /exchanges` (query: city, pair, amount, openNow, sort=bestRate|nearby|topRated)
- `GET /exchanges/:id`
- `GET /exchanges/:id/offers`
- `POST /exchanges/:branchId/leads` (records contact intent; returns lead id)
- `POST /exchanges/:branchId/confirmations` (user confirms completed exchange)
- `POST /exchanges/:businessId/reviews` (requires confirmation OR at least lead depending on policy)
- `GET /me/favorites/exchanges` + `POST/DELETE /me/favorites/exchanges/:businessId`

### Business Owner
- `POST /businesses` (create; pending)
- `PATCH /businesses/:id` (edit; pending rules)
- `POST /businesses/:id/branches`
- `PATCH /branches/:id`
- `POST /branches/:id/offers` + `PATCH /offers/:id` + `DELETE /offers/:id`
- `GET /businesses/:id/leads`
- `POST /confirmations/:id/confirm` (optional later)

### Admin
- `GET /admin/businesses?status=pending`
- `POST /admin/businesses/:id/approve`
- `POST /admin/businesses/:id/reject`
- `PATCH /admin/businesses/:id/verify` (toggle verified badge)
- `GET /admin/reviews` + moderation actions

## 9. Mobile UX Spec (Aggregator Mode)

Replace the current Currency tab behavior with:
- Search header: From/To currency, amount, city/area, open-now toggle
- List screen:
  - card: agency name, best rate, distance, open/closed, verified badge, rating summary
  - quick actions: call, WhatsApp, directions
- Details screen:
  - branch selector (if multiple)
  - offers table + “last updated”
  - reviews list
  - “I completed a transaction” CTA → confirmation → review

Keep the existing P2P Currency screen behind a feature flag for later.

## 10. Trust & Anti-Abuse Policies (Recommended Defaults)

### Review eligibility (start simple)
V1 policy:
- A user can review a business only after creating a confirmation (self-confirmed).

Later policy:
- Require business confirmation OR receipt upload OR repeated confirmations over time.

### Fake review mitigation
- One review per user per business per X days (e.g., 30) OR tie review to a confirmationId (unique).
- Admin can hide reviews and ban users for abuse.

## 11. Migration & Feature Flag Strategy

### Keep existing P2P system intact
Do not delete:
- `CurrencyPost`, `CurrencyMatchRequest`, associated endpoints.

### Introduce “Currency Mode”
- `AGGREGATOR_MODE=1` (backend config) determines whether new endpoints are enabled.
- Mobile uses a remote-config-like value (can be backend `GET /app-config`) to decide:
  - show aggregator screens (default)
  - hide P2P entry points

## 12. Implementation Plan (Phased)

### Phase A — Foundation (Backend-first)
1. Add new Prisma models (Business/Branch/Offer/Lead/Confirmation/Review).
2. Add admin moderation endpoints to approve/verify businesses.
3. Add read endpoints to support:
   - list agencies for a pair + city
   - show details + offers + review summary
4. Seed sample data for a corridor to validate UX quickly.

### Phase B — Mobile Aggregator UX (MVP)
1. Replace Currency tab UI with:
   - list + filters + details screen
2. Implement contact actions:
   - call / WhatsApp deep links / maps directions
   - record `ExchangeLead` on tap
3. Add “confirm transaction” + “leave review”

### Phase C — Business Onboarding (Self-serve)
1. Add “Register as Business” flow in mobile:
   - business profile + branches + offers
   - status: pending until admin approval
2. Add business dashboard:
   - leads
   - update offers

### Phase D — Trust Hardening
1. Rate freshness indicator + “stale offers” warnings
2. Review moderation + basic spam detection
3. Optional: require proof for high-volume reviewers or new users

### Phase E — Re-introduce P2P (Post trust milestone)
1. Turn on P2P for verified/high-trust users (gate by trustScore + history).
2. Let agencies also participate as liquidity providers (optional hybrid).
3. Keep aggregator as the default discovery path.

## 13. Open Decisions (Capture Before Coding)

- Currency offer data model: store buy/sell both vs directional rows.
- Geo strategy: lat/lng numeric with simple distance sorting vs adding PostGIS later.
- Review eligibility: confirmation-only vs allow “lead-only” reviews.
- Umrah agencies: scope (directory only vs inquiry leads + package listings).

