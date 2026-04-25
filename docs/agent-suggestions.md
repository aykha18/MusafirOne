# Agent Suggestions for MusafirOne

## Purpose

Create an in-app “Agent” that reduces user effort, increases safety, and improves match outcomes across Currency, Parcel, Chat, Verification, and Disputes.

## Principles

- Action-oriented: the Agent should do more than chat; it should guide, validate, and trigger app actions.
- Trust-aware: always factor verification level, trust score, ratings, and dispute signals into recommendations.
- Low-friction: one-tap suggestions and prefilled forms beat long conversations.
- Safety-first: warn on risky patterns and keep users in-app.

## High-Impact Agent Functions

### 1) Smart Onboarding + Profile Setup

- Guide users to set City and Corridor with a quick wizard.
- Explain verification levels (0/1/2) and what benefits they unlock.
- Nudge Level 1 (phone) and Level 2 (documents) based on feature needs (e.g., Co-Passenger companion requires higher verification).

### 2) Post Creation Assistant (Currency + Parcel)

- Validate and improve inputs:
  - Currency: rate formatting, amount sanity checks, expiry suggestion, city relevance.
  - Parcel: date window consistency, weight limits, category clarity.
- Recommend best defaults and reduce common mistakes.
- Offer templates:
  - “Quick currency post”
  - “Quick parcel request”
  - “Quick traveler trip”

### 3) Matchmaking + Suggestions

- For Currency:
  - Recommend top matches using have/need/city and trust signals.
  - Highlight “Why this match” (city proximity, high trust, recent activity).
- For Parcel:
  - Recommend trips for a request and requests for a trip (route + time window + weight).
  - Highlight constraints (date overlap, weight capacity, allowed categories).

### 4) Safety / Trust Coach

- Show a “Safety Summary” before requesting a match or starting chat:
  - verification level, trust score, ratings count, dispute indicators (high-level).
- Warn on risky behaviors/patterns:
  - brand-new account + high-value transaction
  - repeated disputes
  - suspicious language patterns
- Recommend safer next steps:
  - verify phone/docs
  - meet in public, confirm details, avoid off-platform payments

### 5) Chat Copilot (Context-Aware)

- Generate structured checklists inside chat:
  - Currency: meeting point, exact amount, agreed rate, payment method, time window, cancellation rules.
  - Parcel: item description, prohibited items confirmation, pickup/drop, weight confirmation, deadlines.
- Provide one-tap message templates:
  - “Confirm details”
  - “Share meetup location”
  - “Confirm I have checked prohibited items”

### 6) Dispute & Resolution Assistant

- For users:
  - guide dispute creation with structured prompts and required context (what happened, when, agreed terms).
  - suggest evidence types (screenshots, timestamps, agreed rate, pickup/drop details).
- For admins:
  - triage summaries: “likely valid/invalid” signals and recommended next actions.

### 7) Verification Helper

- For Level 1:
  - guide phone verification and explain why it matters (trust + match acceptance).
- For Level 2:
  - document upload guidance (readability, glare, cropping, acceptable file types).
  - explain common rejection reasons.

## Expats/Traveler Feature Ideas (Good for Explore Voting)

### Co-Passenger

Support elderly travelers, children, and first-time flyers who need assistance.

- Type A: shared-route companion
  - A traveler already flying posts itinerary; passenger needing assistance connects and coordinates.
- Type B: paid companion
  - Passenger pays companion’s tickets (to/from) plus service charge.
- Safety ideas:
  - require stronger verification for companions
  - show trust score/ratings prominently
  - itinerary confirmation and in-app chat
  - report/dispute flow

### Airport Pickup & Drop

- Match travelers with verified community members for pickup/drop.
- Include baggage count, arrival terminal, and optional child-seat requirement.

### Shared Luggage Space

- Travelers with spare baggage allowance connect with those needing extra allowance.
- Strict prohibited items rules, required receipts, verification gating.

### Travel Document Checklist

- Corridor-based checklist (origin/destination) for visas, permits, insurance, arrival requirements.
- Reminders and links to official sources.

### Scam & Safety Alerts

- Community-reported scam patterns (moderated).
- Common red flags for currency exchange, parcel handling, or pickup scams.

### Trusted Services Directory

- Community-rated services: SIM cards, remittance, housing help, onboarding support.

### Trip Buddy (Same Flight/Route)

- Meet someone on the same route to travel together or share taxis.
- Focuses on companionship rather than assistance service.

### Arrival Support

- “First-day essentials” help: directions, SIM, transit, setup, local norms.
- Can be free community help or paid time-boxed sessions.

## Recommended MVP Agent (Fastest Impact)

- Post creation assistant (Currency + Parcel) with validation and suggested defaults.
- Match suggestions with “Why this match” explanation and trust-aware ranking.
- Chat checklist generator (context-aware) with one-tap templates.

## Placement in the App

- Persistent entry point: “Ask Muhajir Assistant” button on main tabs.
- Embedded actions:
  - “Improve this post” on create/edit forms
  - “Best matches” on listing pages
  - “Generate checklist” inside chat

## Success Metrics

- Conversion: % users completing Level 1/2 after nudges.
- Match efficiency: time-to-first-reply and time-to-accepted-match.
- Safety: dispute rate per match, dispute validity rate, report frequency.
- Retention: repeat posting and repeat matching.

## Architecture Options

### Rule-Based First (Lowest Risk)

- Deterministic suggestions and checklists.
- Trust/verification gating and warnings.
- Great for MVP because it is predictable and cheap to run.

### LLM-Powered (More Flexible)

- Natural-language assistance, paraphrasing, and summarization.
- Needs guardrails:
  - strict safety policy prompts
  - no sensitive data leakage
  - no medical/legal claims
  - always keep “final actions” user-confirmed

