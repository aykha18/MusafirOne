# Business Onboarding Strategy (Exchange + Umrah)

## Purpose

Define the recommended approach for adding currency exchanges and Umrah agencies into MusafirOne at scale without relying on chat-heavy or fully autonomous agent flows.

This document complements:
- `docs/directory-claim-onboarding-spec.md` for product and API behavior
- `docs/agent-suggestions.md` for where assistant-style features can help

## Recommended Model

Use a hybrid model:
1. Curated directory seeding
2. Owner claim onboarding
3. Ops-assisted field onboarding
4. Self-registration as fallback
5. Agent assistance for internal workflows, not as the primary source of truth

## Why This Model Wins

### 1) Faster supply bootstrap

- The app can show real businesses before owners actively sign up.
- Users immediately get value from browseable Exchange and Umrah listings.
- Claim conversion becomes easier because owners see an existing listing instead of starting from zero.

### 2) Better trust and data quality

- Claims add a verification gate before ownership changes.
- Imported records can be reviewed, deduplicated, and corrected.
- Suspicious or low-confidence listings can stay limited until validated.

### 3) Works for low-digital businesses

- Some agencies may not have a website, active email, or formal digital onboarding habits.
- Door-to-door or partner-assisted onboarding works better in these cases than expecting a self-serve signup flow.

### 4) Lower legal and operational risk

- Fully autonomous scraping without source control creates accuracy and licensing risk.
- A curated import pipeline with source tracking is easier to audit and maintain.

## What Not To Do

- Do not make an AI agent the primary workflow for publishing businesses.
- Do not allow autonomous scraping to create public listings without review.
- Do not require a long conversational flow when a short form or claim action will do.
- Do not depend on a website as a prerequisite for onboarding a business.

## Role of Agents

Agents should support operations, not replace verification and review.

### Good uses of agents

- Suggest likely businesses from allowed data sources
- Normalize names, phone numbers, cities, and categories
- Flag likely duplicates before import
- Draft claim/outreach messages for ops staff
- Recommend the best verification path for a claimant

### Bad uses of agents

- Publishing listings directly to production without review
- Deciding final ownership without OTP, documents, or in-person code
- Acting as a substitute for moderation, legal review, or source approval

## Business Acquisition Channels

### Tier 1: Best sources

- Licensed APIs
- Approved partner directories
- Trade associations
- Public registries with permitted use
- Existing internal ops spreadsheets

### Tier 2: Good supporting sources

- Manual research by ops staff
- Partner referrals
- Field sales collection
- Owner-submitted listings

### Tier 3: Use carefully

- Web-sourced data that needs stronger verification
- Third-party directories with unclear freshness

## Onboarding Paths

### Path A: Claim an existing listing

Best default path.

- Owner finds business in the directory
- Taps `Claim this business`
- Verifies via phone OTP, docs, or in-person code
- Ownership is assigned after successful verification/review

### Path B: Register a missing business

Fallback path.

- Owner submits a new business request
- System checks for duplicates
- Admin or ops reviews before activation
- Listing is created and can then be claimed or assigned

### Path C: Field-assisted onboarding

Best for low-digital agencies.

- Field rep visits agency
- Confirms business details
- Generates in-person claim code
- Owner completes claim on mobile or with rep assistance

## Recommended Rollout

### Phase 1: One-city curated launch

- Import 50 to 200 Exchange listings
- Import 50 to 200 Umrah listings
- Enable browse, report listing, and claim CTA

### Phase 2: Claim conversion

- Run WhatsApp, phone, and in-person outreach to top businesses
- Prioritize high-traffic and high-trust businesses for early claims

### Phase 3: Ops scaling

- Add repeatable import batches
- Add QA and dedupe workflows
- Track conversion from unclaimed to claimed

### Phase 4: Agent-assisted operations

- Add ingestion assistant for normalization and duplicate detection
- Add outreach assistant for claim conversion support

## Success Metrics

### Supply metrics

- Listings imported per city
- Active listings by category
- Percent of listings with phone/WhatsApp
- Percent of listings with complete address/contact metadata

### Conversion metrics

- Listing views to claim clicks
- Claim starts to claim approvals
- Average time from import to first claim
- Percent of businesses claimed within 30 days

### Quality metrics

- Duplicate rate
- Report rate per 100 listings
- Takedown/correction rate
- False-positive import rate

### Business value metrics

- Umrah leads per active listing
- Exchange profile views per listing
- Claimed business retention after 30/60/90 days

## Decision Summary

The implementation should be built around:
- seeded directory supply
- verified claim onboarding
- ops-assisted rollout
- agent-assisted internal tooling

It should not be built around an AI-first conversation flow for business creation.
