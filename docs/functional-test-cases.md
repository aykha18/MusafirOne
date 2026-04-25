# MusafirOne — Functional Test Cases

## Scope

This document lists functional test cases for the MusafirOne mobile app and admin flows:

- Authentication (OTP, Google)
- Profile (edit City/Corridor, phone verification)
- Verification (Level 2 document submission + admin review)
- Currency Exchange (posts, matches, chat, disputes, ratings, edit)
- Parcel Delivery (trips, requests, matching, chat, disputes, ratings, edit)
- Chat (basic messaging + visibility)
- Explore (feature voting board)
- Admin (Users, Disputes, Documents)

## Environments

- Mobile app build: Android APK (Release recommended)
- Backend: reachable API base URL (prod/staging/local)

## Test Accounts / Roles

- User A: normal user (not admin)
- User B: normal user (not admin)
- Admin: user with `isAdmin = true`

## Conventions

- Unless specified, expected behavior should work in both light and dark mode.
- “Success” implies a visible confirmation and the UI reflects updated state after refresh.

---

# 1) Authentication

## AUTH-01 — OTP: Request OTP

**Preconditions**
- App installed, user logged out

**Steps**
1. Open app (Home/Login screen)
2. Enter phone number with country dial code
3. Tap “Request OTP”

**Expected**
- Success message “OTP sent” (or equivalent)
- OTP input becomes available

## AUTH-02 — OTP: Verify OTP and Login

**Preconditions**
- AUTH-01 completed and tester has OTP code

**Steps**
1. Enter OTP code
2. Tap “Verify”

**Expected**
- User is logged in
- Access token stored and app navigates to a main tab (e.g., Currency)
- Profile shows verification level >= 1

## AUTH-03 — OTP: Invalid OTP Code

**Steps**
1. Request OTP
2. Enter wrong OTP
3. Verify

**Expected**
- Error message: invalid code
- User remains logged out

## AUTH-04 — Google Login: Successful Login

**Preconditions**
- Google sign-in configured for the build

**Steps**
1. Tap “Sign in with Google”
2. Complete Google consent

**Expected**
- User is logged in
- Profile shows name/email if provided by Google
- If phone is placeholder, Profile shows “Phone not set”

## AUTH-05 — Google Login: Link Phone via Profile (Level 1)

**Preconditions**
- Logged in via Google (phone is placeholder)

**Steps**
1. Open Profile
2. In “Mobile Verification (Level 1)”, enter a real phone number
3. Tap “Send OTP”
4. Enter received OTP
5. Tap “Verify”

**Expected**
- Profile phone changes to the real number
- Verification level becomes at least 1
- User remains the same account (no duplicate account created)

## AUTH-06 — Logout

**Preconditions**
- Logged in

**Steps**
1. Open Profile
2. Tap Logout and confirm

**Expected**
- Tokens cleared
- App returns to login screen
- Protected tabs redirect to login if opened

---

# 2) Profile

## PROF-01 — View Profile Basics

**Preconditions**
- Logged in

**Steps**
1. Open Profile tab

**Expected**
- Shows name, phone
- Shows verification level and trust score
- Shows document verification section (Level 2)
- Shows details section with City and Corridor

## PROF-02 — Edit City and Corridor

**Preconditions**
- Logged in

**Steps**
1. Profile → Details → Tap “Edit”
2. Select a City
3. Enter Corridor text (e.g., “South Asia”)
4. Tap “Save”

**Expected**
- Success message “Profile updated” (or equivalent)
- Details show updated City and Corridor after refresh

## PROF-03 — Cancel Edit City and Corridor

**Steps**
1. Profile → Details → Tap “Edit”
2. Change values
3. Tap “Cancel”

**Expected**
- Changes are discarded
- Details revert to previous values

---

# 3) Verification (Level 2 Documents)

## VDOC-01 — Upload ID Document

**Preconditions**
- Logged in

**Steps**
1. Profile → Document Verification (Level 2)
2. Tap “Upload ID”
3. Select a valid file (PDF/JPG/PNG)

**Expected**
- “Submitted for review” confirmation
- Document appears in list with status `submitted` (or equivalent)

## VDOC-02 — Upload Selfie

**Steps**
1. Tap “Upload Selfie”
2. Select an image

**Expected**
- Selfie submission appears in list

## VDOC-03 — Upload Invalid File Type

**Steps**
1. Try uploading an unsupported format (if picker allows)

**Expected**
- Upload is rejected with a clear error
- No new document record created

## VDOC-04 — Admin: List Documents

**Preconditions**
- Admin logged in
- At least one user has uploaded docs

**Steps**
1. Admin Dashboard → Documents tab

**Expected**
- Shows uploaded documents with status, userId, and filename

## VDOC-05 — Admin: Approve Document (Level 2 Upgrade)

**Preconditions**
- A user has at least one document in `submitted` or `under_review`

**Steps**
1. Admin → Documents → select a document
2. Tap “Approve”

**Expected**
- Status becomes `approved`
- User’s verification level becomes 2 (after refresh in user profile)
- Trust score recalculates (value may change)

## VDOC-06 — Admin: Reject Document (Requires Reason)

**Steps**
1. Admin → Documents → Tap “Reject”

**Expected**
- Status becomes `rejected`
- Rejection reason is stored and visible to user in Profile document list

## VDOC-07 — Admin: Download Document

**Steps**
1. Admin → Documents → Download

**Expected**
- File downloads successfully
- File opens and matches expected content

---

# 4) Explore (Feature Voting Board)

## EXP-01 — List Feature Ideas

**Preconditions**
- Logged in

**Steps**
1. Open Explore tab

**Expected**
- List shows feature ideas with short descriptions and vote counts
- Co-Passenger is present

## EXP-02 — Upvote a Feature

**Steps**
1. Tap “Upvote” on a feature

**Expected**
- Vote count increases by 1
- Button state changes to “Upvoted”

## EXP-03 — Remove Upvote (Toggle)

**Steps**
1. Tap “Upvoted” again

**Expected**
- Vote count decreases by 1
- Button state changes back to “Upvote”

## EXP-04 — Feature Detail Screen

**Steps**
1. Tap a feature card

**Expected**
- Opens detail page with long description
- Upvote works from detail page too

---

# 5) Currency Exchange

## CUR-01 — Create Currency Post

**Preconditions**
- Logged in as User A

**Steps**
1. Currency tab → tap “Create”
2. Fill Have, Need, Amount, Preferred Rate, City
3. Tap “Submit”

**Expected**
- Post appears in Active Posts list
- Status should be active (if auto-activated)

## CUR-02 — Edit My Currency Post

**Preconditions**
- User A has an active post

**Steps**
1. Find “My Post”
2. Tap “Edit”
3. Change amount/rate/city
4. Tap “Save Changes”

**Expected**
- Post updates and displays new values after refresh

## CUR-03 — Cancel My Currency Post

**Steps**
1. Tap “Cancel Post”
2. Confirm

**Expected**
- Post no longer appears as active (or marked cancelled)
- If there are pending/accepted requests, they are cancelled and notified (if push enabled)

## CUR-04 — Request a Match

**Preconditions**
- User B sees User A’s active post

**Steps**
1. User B opens the post
2. Tap “Request Match”

**Expected**
- Request created in pending status
- User B sees it under “My Requests”

## CUR-05 — Accept Match Request

**Preconditions**
- CUR-04 completed

**Steps**
1. User A → Currency → My Requests
2. Find incoming request
3. Tap “Accept”

**Expected**
- Status becomes accepted for both users

## CUR-06 — Reject Match Request

**Steps**
1. User A rejects the incoming request

**Expected**
- Status becomes rejected

## CUR-07 — Chat From Currency

**Preconditions**
- At least one request exists OR user taps chat from post card

**Steps**
1. Tap “Chat”
2. Send messages back and forth (User A and User B)

**Expected**
- Conversation opens
- Messages appear instantly (or after refresh)
- No text visibility issues (especially in dark mode)

## CUR-08 — Complete Match + Rate

**Preconditions**
- Match accepted

**Steps**
1. Tap “Complete”
2. Tap “Rate”
3. Submit rating

**Expected**
- Rating submits successfully
- Trust score may update later (if recalculation occurs)

## CUR-09 — Raise Dispute on Match

**Steps**
1. On accepted/completed request, tap “Dispute”
2. Enter reason and submit

**Expected**
- Dispute created with status open/under_review
- Admin can see it in disputes list

---

# 6) Parcel Delivery

## PAR-01 — Create Trip

**Preconditions**
- Logged in as User A

**Steps**
1. Parcel → “New trip”
2. Fill from/to, dates, max weight, allowed categories
3. Create

**Expected**
- Trip appears in list as “My Trip”

## PAR-02 — Edit Trip (Active)

**Preconditions**
- User A has an active trip

**Steps**
1. Open trip card
2. Tap “Edit”
3. Adjust dates/weight/categories
4. Tap “Save trip”

**Expected**
- Trip updates and is visible after refresh

## PAR-03 — Create Parcel Request

**Preconditions**
- Logged in as User B

**Steps**
1. Parcel → “New request”
2. Choose item type, weight, from/to, flexible window
3. Create

**Expected**
- Request appears as “My Request”

## PAR-04 — Edit Parcel Request (Active)

**Preconditions**
- User B has an active request

**Steps**
1. Request card → Tap “Edit”
2. Update item type/weight/dates
3. Tap “Save request”

**Expected**
- Request updates after refresh

## PAR-05 — Match Request to Trip

**Preconditions**
- Trip exists (User A) and request exists (User B) with compatible route/window

**Steps**
1. From request card, tap “Find Traveler” / “Carry this Package”
2. Select matching trip
3. Confirm match

**Expected**
- Request moves to pending status
- Trip owner sees pending request inside trip card

## PAR-06 — Accept/Reject Parcel Match (Trip Owner)

**Preconditions**
- PAR-05 completed

**Steps**
1. Trip owner opens trip card
2. Accept or Reject

**Expected**
- Status updates accordingly
- Chat button available when applicable

## PAR-07 — Parcel Chat

**Steps**
1. Tap Chat from parcel request/trip context
2. Exchange messages

**Expected**
- Messages show with correct visibility in dark mode
- Context banner (if shown) matches parcel request details

## PAR-08 — Complete Trip/Request + Rate

**Preconditions**
- Parcel match completed or delivered

**Steps**
1. Complete flow in UI
2. Submit ratings

**Expected**
- Rating stored
- Trust score may update

## PAR-09 — Raise Dispute on Parcel

**Steps**
1. Tap “Dispute”
2. Provide reason

**Expected**
- Dispute created and visible to admin

---

# 7) Admin Dashboard

## ADM-01 — Admin Login

**Preconditions**
- Admin user exists and can log in

**Steps**
1. Log in as admin
2. Open Admin dashboard

**Expected**
- Tabs: Users, Disputes, Documents

## ADM-02 — Suspend/Unsuspend User

**Steps**
1. Users tab
2. Suspend a user
3. Refresh
4. Unsuspend same user

**Expected**
- Suspension state updates
- Suspended user cannot create new posts (currency/parcel) and gets clear errors

## ADM-03 — Disputes List + Resolve

**Preconditions**
- At least one dispute created by a user

**Steps**
1. Disputes tab
2. Resolve as valid
3. Resolve another as invalid

**Expected**
- Status changes reflected
- If 3 valid disputes rule is in place, user auto-suspension triggers after threshold

## ADM-04 — Documents Review

Covered in VDOC-04 to VDOC-07

---

# 8) Chat

## CHAT-01 — Basic Messaging

**Steps**
1. Create a conversation from Currency or Parcel
2. Send messages both ways

**Expected**
- Messages show immediately
- Timestamp visible

## CHAT-02 — Dark Mode Visibility

**Steps**
1. Enable dark mode
2. Send message

**Expected**
- Outgoing message text is readable (no white-on-white)

---

# 9) Regression / Smoke Suite

Run these quickly after each build:

- AUTH-02 (OTP login) or AUTH-04 (Google login)
- PROF-02 (edit city/corridor)
- EXP-02 (upvote)
- CUR-01 + CUR-02 (create + edit currency post)
- PAR-01 + PAR-02 (create + edit trip)
- CHAT-02 (dark mode message visibility)
- VDOC-01 (upload doc) + VDOC-05 (admin approve)

