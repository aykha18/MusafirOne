# MusafirOne — Pricing + Trust Tiers (Off‑Platform Settlement)

**Context**
- Marketplace matches users for currency exchange + parcel carrying.
- **No custody** of funds initially; users settle off-platform.
- Primary payer: **Senders** (GCC ↔ South Asia corridors).

**Goal**
- Monetize **trust + speed + convenience** while keeping core marketplace usable to build liquidity.
- Keep pricing clearly below Western Union baseline fee (~AED/SAR 20–30 per transfer).

---

## Trust Tiers (visible on listings and chat)

| Tier | Name | Entry | What it unlocks |
|---|---|---|---|
| T0 | New | Account created, not phone verified | Very limited posting; cannot unlock contact; cannot boost |
| T1 | Phone Verified | OTP verified | Standard marketplace access + standard limits |
| T2 | ID Verified | Document verification approved | Higher limits + cheaper unlocks + higher ranking |
| T3 | High Trust | T2 + trust threshold + completion history | Best ranking + lowest unlock cost + premium badge |

**Trust signals shown**
- Tier badge (T0–T3), trust score, ratings, completion count, dispute indicator (penalty).

---

## Core Monetization (Phase 1)

### A) Contact Unlock (primary revenue)
**What it is**
- Sender pays to initiate direct chat or reveal direct contact (WhatsApp/phone) with a selected counterparty.

**Unlock duration**
- 7 days per pair (recommended). Re-unlock required after expiry.

**Pricing**
| Tier | Price per Unlock |
|---|---:|
| T1 | AED 7 |
| T2 | AED 5 |
| T3 | AED 3 |

**Policy**
- Unlock requires Tier 1+.
- No refunds once messages are sent.
- Refund allowed if target user is banned/suspended within 1 hour of unlock.

---

### B) Boosts (optional but fast revenue)
**What it is**
- Boost temporarily increases visibility in corridor search results/feed.

**Products**
| Product | Duration | Price |
|---|---:|---:|
| Boost Request (Currency/Parcel) | 48 hours | AED 10 |
| Boost Trip (Traveler) (optional later) | 48 hours | AED 10 |

**Eligibility**
- Tier 1+ only.
- Boosts cannot consistently outrank Tier 3 trusted listings (ranking is bounded by trust).

---

### C) Subscriptions (predictable revenue)
Subscriptions include unlock credits + higher limits + priority placement.

**Sender Plans**
| Plan | Price | Includes | Best for |
|---|---:|---|---|
| Sender Plus | AED 39/mo | 8 unlocks + priority ranking + higher limits + instant alerts | Regular senders |
| Sender Pro | AED 69/mo | 20 unlocks + higher priority + highest limits + priority support (text) | Power users |

**Traveler Plan (optional later)**
- Traveler Pro: AED 49/mo (priority visibility + higher trip posting limits)

---

### D) Verification Fee (optional / later)
- Tier 2 (ID verification): **AED 49 one-time**
- Promotions: waive fee for travelers to improve supply quality in early corridors.

---

## Limits (anti-spam + liquidity control)

**Free tier limits**
| Tier | Active items cap | Daily post cap | Boosts | Unlock |
|---|---:|---:|---|---|
| T0 | 1 | 1/day | No | No |
| T1 | 6 | 5/day | Yes | Yes |
| T2 | 12 | 15/day | Yes | Yes |
| T3 | 20 | 30/day | Yes | Yes |

**Subscription overrides**
- Sender Plus: +50% to tier limits + included unlock credits
- Sender Pro: 2× tier limits + included unlock credits

---

## Ranking Rules (keep it safe + fair)

**Base ranking signals**
- Tier (T3 > T2 > T1 > T0)
- Trust score (higher ranks)
- Completions (higher ranks)
- Dispute rate (penalty)
- Response time (penalty)
- Recency (small boost)

**Paid influence**
- Boost and subscription give bounded lifts that do not override poor trust signals.

---

## Paywall Placement (UI points)

**Currency “Browse Listings”**
- Default: show listings and allow view.
- Paywall triggers:
  - Tap “Connect” / “Message” / “Request Match” → require **Unlock** (or consume subscription credit).
  - Offer choice: “Pay AED 7” or “Subscribe (includes 8 unlocks)”.

**Parcel “Find Travelers”**
- Default: show trips and trust tier.
- Paywall triggers:
  - Tap “Request This Traveler” → allow composing request, then require **Unlock** on send or on opening chat.

**Chat**
- If chat started via unlock, keep chat open for 7 days.
- If expired, show “Renew unlock to continue”.

**Boost**
- Add a “Boost” button for active requests/trips.
- Show a preview of expected additional impressions (simple estimate).

---

## Safety & Disclaimers (required)
- MusafirOne provides matching and messaging; users settle off-platform.
- Prohibited items policy (parcels) and conduct policy (fraud, harassment).
- Dispute reporting and account suspension rules.
- Warning prompts for high-risk corridors and “first-time” users.

---

## Metrics to Track (for pricing decisions)
- Unlock conversion rate (view → unlock)
- Match-to-chat rate, chat-to-completion rate
- Repeat usage by corridor
- Dispute rate by tier (should drop as tier rises)
- Subscription conversion + churn
- CAC tests (marketing) vs ARPU from unlocks/subscriptions

---

## Suggested Rollout (90 days)
1) Weeks 1–3: Unlock (Tiered pricing) + basic subscriptions (Sender Plus)
2) Weeks 3–6: Boosts + refine ranking rules
3) Weeks 6–12: Verification monetization and/or concierge support add-on
