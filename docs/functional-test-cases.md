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

## CUR-10 — Browse Posts + Filters (Have/Need/City)

**Preconditions**
- User A has an active post

**Steps**
1. User B opens Currency tab
2. Set filters (Have, Need, City)
3. Clear filters

**Expected**
- Filtered list shows only matching posts
- Clearing filters returns to full list
- Empty state is shown when no results match

## CUR-11 — View Post Details

**Steps**
1. Open a post from the list

**Expected**
- Post details match the list values (have/need, amount, rate, city)
- Owner info/trust indicators (if shown) are visible

## CUR-12 — Request Match: Prevent Requesting Own Post

**Preconditions**
- User A created the post

**Steps**
1. User A opens their own post from browse list
2. Attempt to request a match

**Expected**
- UI prevents the action (or backend rejects)
- Clear message shown (cannot request your own post)

## CUR-13 — Request Match: Prevent Duplicate Pending Requests

**Preconditions**
- CUR-04 completed (a pending request exists)

**Steps**
1. User B tries to request a match again on the same post

**Expected**
- Duplicate request is blocked (UI or backend)
- User B is directed to existing request/thread

## CUR-14 — Cancel Sent Match Request (Requester)

**Preconditions**
- User B has a pending sent request

**Steps**
1. User B opens Currency → My Requests
2. Cancel the pending request

**Expected**
- Status becomes cancelled for both users
- Request no longer appears as actionable

## CUR-15 — Post Owner Cancels Post With Pending Requests

**Preconditions**
- User A has an active post
- At least one pending request exists for the post

**Steps**
1. User A cancels the post
2. User B refreshes My Requests

**Expected**
- Post becomes cancelled/inactive
- Pending requests are cancelled/rejected automatically (as per system rules)
- Users see a clear state in UI

## CUR-16 — Accept Flow: Both Users See Consistent Status

**Preconditions**
- CUR-05 completed

**Steps**
1. User A refreshes Currency screens
2. User B refreshes Currency screens

**Expected**
- Both users see the same accepted status
- Chat entry point is available (if chat is gated to accepted)

## CUR-17 — Complete Match Rules + Idempotency

**Preconditions**
- Request accepted

**Steps**
1. Complete the match from the UI
2. Refresh both users’ screens
3. Attempt to complete again

**Expected**
- Status becomes completed once
- Second completion attempt is blocked or no-ops safely

## CUR-18 — Rating Rules

**Preconditions**
- Match is completed

**Steps**
1. Submit rating
2. Attempt to submit rating again

**Expected**
- Rating is stored successfully the first time
- Duplicate rating is blocked

## CUR-19 — Dispute Rules

**Steps**
1. Try to raise a dispute on a pending request
2. Raise a dispute on an accepted or completed request

**Expected**
- Pending requests cannot be disputed
- Accepted/completed requests can be disputed and show correct status

## CUR-20 — Live “Today’s Rate” Display (You Send / They Receive)

**Steps**
1. Currency screen: set You Send and They Receive currencies
2. Observe Today’s rate and timestamp
3. Toggle to a different pair

**Expected**
- Today’s rate loads for the selected pair
- Loading and failure states are handled (shows unavailable when endpoint fails)

## CUR-21 — Suspended User Restrictions (Admin)

**Preconditions**
- Admin can suspend users

**Steps**
1. Admin suspends User B
2. User B tries: create post, request match, accept/reject, chat

**Expected**
- Restricted actions are blocked
- Clear error shown and state remains unchanged

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

## PAR-10 — Browse Trips (Public / Logged Out)

**Preconditions**
- At least one active trip exists

**Steps**
1. Log out
2. Open Parcel tab
3. Browse available trips

**Expected**
- Trips list loads without requiring login
- Traveler name/trust badge (if shown) renders

## PAR-11 — Logged Out: Request This Traveler Requires Login

**Steps**
1. While logged out, tap “Request This Traveler”

**Expected**
- User is prompted to log in
- No request is created

## PAR-12 — Request This Traveler: Create Request With Details

**Preconditions**
- Logged in as Parcel Sender (User B)

**Steps**
1. Browse trips
2. Tap “Request This Traveler”
3. Choose item type, enter description, weight, declared value
4. Submit

**Expected**
- Request is created and tied to the selected trip
- Request status becomes pending (or matched/pending per rules)
- Sender can see the request in their activity

## PAR-13 — Traveler Sees Incoming Requests (Trip Owner)

**Preconditions**
- PAR-12 completed

**Steps**
1. Log in as the traveler who owns the trip (User A)
2. Open Parcel → My Trips
3. Open the trip card/details

**Expected**
- Incoming request appears with sender identity
- Request details (item type/description/weight/value) are visible

## PAR-14 — Traveler Accepts Request

**Preconditions**
- Incoming request exists

**Steps**
1. Traveler accepts the request
2. Sender refreshes

**Expected**
- Status becomes accepted/matched for both users
- Chat entry point is available (if chat is gated to accepted)

## PAR-15 — Traveler Rejects Request (Capacity Restores)

**Preconditions**
- Trip has limited capacity
- A pending request exists

**Steps**
1. Traveler rejects the request
2. Sender refreshes
3. Observe trip remaining capacity

**Expected**
- Request status becomes rejected
- Remaining capacity returns/increases accordingly

## PAR-16 — Capacity Enforcement: Prevent Oversubscription

**Preconditions**
- Trip max weight is small (e.g., 4kg)
- At least one pending/accepted request reserves capacity

**Steps**
1. Sender attempts to request weight greater than remaining capacity

**Expected**
- UI blocks the submission or backend rejects with a clear error
- No request is created/updated

## PAR-17 — Cannot Request Own Trip

**Steps**
1. Trip owner tries “Request This Traveler” on their own trip

**Expected**
- Action is blocked with a clear error

## PAR-18 — Trip Not Active / Past Departure

**Preconditions**
- Trip is not active or departure date is in the past

**Steps**
1. Attempt to request that trip

**Expected**
- Action is blocked (UI or backend)
- Clear error shown

## PAR-19 — Route/Date Compatibility Rules

**Preconditions**
- Create requests/trips with mismatched routes or non-overlapping date windows

**Steps**
1. Attempt to match/request traveler anyway

**Expected**
- Incompatible matches are not offered or are rejected

## PAR-20 — Multiple Senders Competing for Capacity

**Preconditions**
- Trip max weight set
- User B requests some weight
- User C requests remaining weight

**Steps**
1. Traveler accepts one request
2. Traveler accepts another request until capacity is full

**Expected**
- Acceptance is blocked once capacity is exhausted
- UI shows “Full” / remaining 0kg

## PAR-21 — Sender Cancels Pending Parcel Request

**Preconditions**
- Sender has a pending request

**Steps**
1. Sender cancels the request
2. Traveler refreshes

**Expected**
- Status becomes cancelled
- Remaining capacity restores

## PAR-22 — Parcel Notifications (If Push Enabled)

**Steps**
1. Sender creates a request
2. Traveler accepts/rejects

**Expected**
- Traveler receives “new incoming request” notification
- Sender receives accept/reject notification

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
- CUR-01 + CUR-04 + CUR-05 (create post + request match + accept)
- CUR-17 + CUR-18 (complete + rate)
- PAR-10 + PAR-12 + PAR-13 (public browse trips + request traveler + traveler sees incoming)
- PAR-14 + PAR-16 (accept + capacity enforcement)
- CHAT-02 (dark mode message visibility)
- VDOC-01 (upload doc) + VDOC-05 (admin approve)

