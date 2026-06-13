# Business Ingestion and Ops Runbook

## Purpose

Describe the operational workflow for adding, reviewing, importing, claiming, and maintaining Exchange and Umrah business listings.

This is the execution runbook for the model defined in:
- `docs/business-onboarding-strategy.md`
- `docs/directory-claim-onboarding-spec.md`

## Team Roles

### Ops Lead

- Chooses target city and category rollout order
- Approves data sources
- Monitors quality and conversion metrics

### Data Ops

- Collects raw business records
- Normalizes and enriches data
- Flags duplicates and missing fields

### QA Reviewer

- Verifies confidence of imported records
- Checks source attribution and contact accuracy
- Approves import batches

### Field/Sales Rep

- Visits offline or low-digital businesses
- Confirms ownership and contact details
- Uses in-person claim code flow where needed

### Admin Reviewer

- Reviews claims, documents, reports, and corrections
- Approves, rejects, merges, or takedowns listings

## Source Policy

### Approved source types

- Licensed API providers
- Partner-provided lists
- Public registries with permitted use
- Manual collection by staff
- Owner-submitted forms

### Required metadata per record

- `sourceType`
- `sourceName`
- `sourceUrl` when available
- `importBatchId`
- `importedAt`
- `lastSeenAt`
- `collectedBy` or team origin if manually gathered

### Minimum Record Quality

A listing should not be published unless it meets the minimum dataset:

- business name
- type: `exchange` or `umrah`
- city
- at least one contact method or clear address
- source metadata

Recommended but optional:

- WhatsApp
- branch address
- hours
- notes for QA confidence

## Intake Workflow

### Step 1: Collect

Gather raw records from approved sources into a staging format such as CSV or an internal import sheet.

### Step 2: Normalize

Standardize:
- business name formatting
- city names
- phone numbers
- WhatsApp numbers
- category mapping
- address text

### Step 3: Dedupe

Check likely duplicates using:
- name + city
- normalized phone
- normalized WhatsApp
- address similarity

Mark each pair as:
- `exact duplicate`
- `possible duplicate`
- `not duplicate`

### Step 4: QA Review

Reviewer verifies:
- source legitimacy
- business relevance to category
- minimum record quality
- duplicate status
- whether the record should be imported as `active` or `pending`

### Step 5: Import

Import approved rows into `Business` and create a default `Branch` if needed.

### Step 6: Publish

Published listings appear in the directory as:
- `unclaimed`
- `claim_requested`
- `claimed`

## Claim Conversion Workflow

### Standard claim path

1. Owner finds listing
2. Owner taps `Claim this business`
3. Owner verifies via OTP, docs, or in-person code
4. Admin review happens when required
5. Ownership is assigned

### Outreach-assisted claim path

1. Ops identifies high-value unclaimed businesses
2. Ops contacts owner via phone, WhatsApp, or field visit
3. Owner is guided to claim their listing
4. Field rep uses in-person code when necessary

## New Business Request Workflow

Use when an owner says their business is missing.

1. Owner submits new business request
2. System runs duplicate checks against existing records
3. Admin or ops reviews request
4. Listing is either:
   - merged into an existing listing candidate
   - created as a new listing
   - rejected with reason

## Ongoing Maintenance Workflow

### Corrections

Use for contact updates, renamed businesses, and address fixes.

1. Correction comes from owner, user report, or ops review
2. Admin verifies evidence
3. Listing is updated
4. Audit trail is retained

### Reports and takedowns

1. User submits `Report listing`
2. Admin reviews in Reports queue
3. Admin either resolves or rejects listing
4. Serious cases move to hidden/rejected state quickly

### Duplicate merges

1. Duplicate is identified by QA, report, or system suggestion
2. Admin chooses target and source
3. Merge moves claims, leads, and linked records
4. Source is hidden

## City Rollout Checklist

Before launch in a city:

- target city selected
- approved source list defined
- import template prepared
- dedupe rules reviewed
- claim verification channels working
- report/takedown path tested
- at least one admin reviewer assigned

After launch:

- monitor reports and claim activity daily
- review duplicates weekly
- track leads and claimed conversion
- prioritize outreach to top unclaimed listings

## Suggested Service Levels

- New report review: within 24 hours
- Claim review with docs: within 1 to 2 business days
- Takedown of clearly invalid listing: same day
- Duplicate review: within 3 business days
- Missing business request review: within 3 business days

## Internal Tooling Requirements

The ops workflow needs at least:

- import template and batch tracking
- duplicate review queue
- claims review queue
- reports/takedown queue
- merge businesses action
- claim code generation for field reps
- audit trail for source and moderation actions

## Agent Assistance Backlog

Safe uses for an internal assistant:

- normalize imported rows
- suggest category and city corrections
- surface likely duplicates with confidence scores
- propose outreach priority lists
- draft claim invitation messages

Agent actions must remain review-only until explicitly approved by ops or admin staff.
