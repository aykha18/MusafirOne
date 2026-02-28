# Cross-Border Peer Exchange Platform – MVP Specification

## Version: 1.0
## Corridor: Single (e.g., UAE ↔ India)
## Platform: React Native (Mobile)
## Backend: NestJS
## Database: PostgreSQL
## ORM: Prisma

---

# 1. Product Overview

This platform connects verified expatriates within a defined corridor for:

1. Currency Matchmaking (no payment processing)
2. Peer-to-peer Parcel Coordination
3. Trust & Rating System

The platform does NOT:
- Process payments
- Act as courier
- Handle escrow
- Provide chat (Phase 1)

It functions only as a matching and trust layer.

---

# 2. User Roles

## Standard User
- Post currency exchange
- Post parcel trip or parcel request
- Request match
- Rate other users
- Report disputes

## Admin
- Moderate users
- Suspend accounts
- Review disputes
- Adjust verification status

---

# 3. Core Modules

---

# 3.1 Authentication Module

## Requirements

- Phone number login (OTP-based)
- JWT token authentication
- Refresh token support
- One account per phone number

## User Fields

- id (UUID)
- phone_number (unique)
- full_name
- city
- corridor
- verification_level (0,1,2)
- trust_score (integer 0-100)
- is_suspended (boolean)
- created_at
- updated_at

---

# 3.2 Currency Matchmaking Module

## Currency Post

### Fields

- id (UUID)
- user_id (FK)
- have_currency (string)
- need_currency (string)
- amount (decimal)
- preferred_rate (decimal)
- city (string)
- expiry_date (timestamp)
- status (draft, active, matched, completed, expired, cancelled)
- created_at
- updated_at

## Rules

- User can create max 3 active currency posts
- Expired posts automatically move to "expired"
- Only active posts visible in search

---

## Match Request

### Fields

- id (UUID)
- currency_post_id (FK)
- requester_id (FK)
- target_user_id (FK)
- status (pending, accepted, rejected, completed, cancelled, disputed)
- created_at
- updated_at

## State Flow

Pending → Accepted → Completed  
        → Rejected  
        → Cancelled  
        → Disputed  

---

# 3.3 Parcel Coordination Module

## Parcel Trip (Traveler)

### Fields

- id (UUID)
- user_id (FK)
- from_country
- to_country
- departure_date
- arrival_date
- max_weight_kg
- allowed_categories (array)
- status (active, matched, completed, expired, cancelled)
- created_at

---

## Parcel Request (Sender)

### Fields

- id (UUID)
- user_id (FK)
- item_type
- weight_kg
- from_country
- to_country
- flexible_from_date
- flexible_to_date
- status (active, matched, completed, expired, cancelled)
- created_at

---

# 3.4 Rating System

## Rating Fields

- id (UUID)
- match_id (FK)
- from_user_id (FK)
- to_user_id (FK)
- reliability_score (1-5)
- communication_score (1-5)
- timeliness_score (1-5)
- comment (optional)
- created_at

---

# 3.5 Trust Score Calculation

Trust Score Range: 0 – 100

Formula:

score =
(average_rating * 15)
+ (min(completed_transactions, 20) * 2)
+ verification_bonus
- (dispute_penalty)

Where:

verification_bonus:
- Level 0 = 0
- Level 1 = +10
- Level 2 = +20

dispute_penalty:
- -5 per valid dispute

Trust score recalculated after:
- New rating
- Dispute resolution
- Verification change

---

# 3.6 Dispute System

## Dispute Fields

- id (UUID)
- match_id (FK)
- raised_by_user_id
- reason
- status (open, under_review, resolved_valid, resolved_invalid)
- created_at
- resolved_at

Rules:
- 3 valid disputes → auto suspension
- Suspended users cannot create posts

---

# 4. Non-Functional Requirements

- API response < 500ms
- Pagination required on all list endpoints
- Max 20 results per page
- All state changes logged
- Soft delete only (no hard delete)

---

# 5. Security & Compliance

- OTP authentication required
- Device fingerprint tracking
- Rate limit: 5 post creations per day
- Clear disclaimer:
  - Platform does not handle money
  - Users responsible for legal compliance
  - Platform not liable for customs violations

---

# 6. Admin Capabilities

- View users
- Suspend/unsuspend users
- Review disputes
- Change verification level
- View transaction logs

---

# 7. Success Metrics (First 90 Days)

- 1,000 users
- 300 currency matches
- 100 parcel matches
- <5% dispute rate
- 30% repeat usage

---

# END OF MVP SPEC