# MusafirOne — Manual Testing Guide

## Scope

This document lists manual test cases for the current MusafirOne mobile app and admin flows:

- Authentication (OTP, Google)
- Profile (edit City/Corridor, phone verification)
- Verification (Level 2 document submission + admin review)
- Currency Exchange (posts, matches, chat, disputes, ratings, edit)
- Parcel Delivery (trips, requests, matching, chat, disputes, ratings, edit)
- Business Directory (Exchange + Umrah)
- Business Claiming (OTP, docs, in-person code, My Claims)
- Umrah inquiries / leads
- Listing reports / takedowns
- Chat (basic messaging + visibility + composer behavior)
- Explore (feature voting board, accessed from Profile)
- Admin (Users, Disputes, Documents, Claims, Reports, Businesses)

## Environments

- Mobile app build: Android APK (Release recommended)
- Admin web app: reachable admin URL in Chrome/Edge
- Backend: reachable API base URL (prod/staging/local)

## Test Accounts / Roles

- User A: normal user (not admin)
- User B: normal user (not admin)
- User C: optional third user for capacity / duplicate interaction tests
- Admin: user with `isAdmin = true`
- Seeded business owner account: optional, for testing owner inbox / claimed business editing

## Conventions

- Unless specified, expected behavior should work in both light and dark mode.
- “Success” implies a visible confirmation and the UI reflects updated state after refresh.
- Where OTP is needed in test/staging, testers must have access to the OTP code source or mock delivery channel.
- For manual runs, record actual result, pass/fail, build number, tester name, and screenshot/video for failed cases.

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
1. Open Profile
2. Tap Explore / Feature Board

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

# 7) Business Directory, Claims, and Umrah

## DIR-01 — Browse Exchange Directory by City

**Preconditions**
- At least one exchange business exists in the directory

**Steps**
1. Open the Exchange directory/browse screen
2. Select a city filter
3. Clear the filter

**Expected**
- Only exchange businesses for the selected city are shown
- Clearing the filter restores the broader list
- Empty state renders correctly when no businesses match

## DIR-02 — Browse Umrah Directory by City

**Preconditions**
- At least one Umrah business exists in the directory

**Steps**
1. Open the Umrah tab
2. Select a city
3. Open at least one listing

**Expected**
- Umrah list loads without layout issues
- Listing cards show claim/trust badges when available
- Detail screen opens correctly

## DIR-03 — Directory Business Detail

**Steps**
1. Open any directory business detail

**Expected**
- Name, city, phone/WhatsApp, type, and badge/trust state are shown when available
- Claim / Inquiry / Report actions appear as applicable

## UML-01 — Submit Umrah Inquiry

**Preconditions**
- Logged in as a normal user
- Active Umrah business exists

**Steps**
1. Open a Umrah business
2. Tap Inquiry
3. Enter a message
4. Submit

**Expected**
- Inquiry is created successfully
- Success feedback is shown

## UML-02 — Owner Views Umrah Leads Inbox

**Preconditions**
- UML-01 completed
- Business is claimed by an owner user

**Steps**
1. Log in as the business owner
2. Open Business Dashboard for that business
3. Open Leads

**Expected**
- Submitted inquiry appears in the leads list
- Sender identity/message is visible

## CLM-01 — Claim Business via Phone OTP

**Preconditions**
- Logged in
- Business is `unclaimed` or `claim_rejected`
- Business has a phone or WhatsApp number

**Steps**
1. Open the business claim screen
2. Keep Phone OTP selected
3. Confirm the phone number
4. Tap Send OTP
5. Enter valid OTP
6. Tap Verify & Claim

**Expected**
- OTP send succeeds
- Verification succeeds
- Business becomes claimed / assigned to the user
- User is redirected back to the business context

## CLM-02 — Claim Business via Invalid OTP

**Preconditions**
- CLM-01 started and OTP input is visible

**Steps**
1. Enter an invalid OTP
2. Tap Verify & Claim

**Expected**
- Verification fails with a clear error
- Claim remains pending or unapproved
- User can retry with another code

## CLM-03 — Resend Claim OTP

**Preconditions**
- Existing pending phone OTP claim

**Steps**
1. Open the claim screen again
2. Tap Resend OTP

**Expected**
- New OTP is requested successfully
- No duplicate claim record is created

## CLM-04 — Claim Business via In-person Code

**Preconditions**
- Admin has generated a valid in-person claim code
- Logged in as a normal user

**Steps**
1. Open claim screen
2. Select In-person code
3. Enter the valid code
4. Tap Verify Code & Claim

**Expected**
- Code verifies successfully
- Business becomes claimed by the user
- Reusing the same code is blocked after consumption

## CLM-05 — Claim Business via Docs Upload

**Preconditions**
- Logged in
- Claimable business exists

**Steps**
1. Open claim screen
2. Select Docs
3. Tap Upload Document
4. Choose a valid document
5. Tap Submit for Review

**Expected**
- File upload succeeds
- Uploaded count increments
- Claim enters pending manual review

## CLM-06 — My Claims List

**Preconditions**
- User has created at least one claim

**Steps**
1. Open Profile
2. Tap My Claims

**Expected**
- Claims list shows business name, status, method, and created time
- Opening a claimable business returns to the detailed claim screen

## CLM-07 — Claim Progress Display

**Preconditions**
- User has a pending, approved, or rejected claim

**Steps**
1. Open the business claim screen

**Expected**
- The progress card reflects the latest claim state
- “Your claim” summary matches the backend status
- Docs uploads count is shown for docs claims

## CLM-08 — Anti-abuse: Too Many Pending Claims

**Preconditions**
- User has already reached the pending claims limit

**Steps**
1. Attempt to create another claim

**Expected**
- Backend rejects the new claim
- User sees a clear limit/cooldown message

## CLM-09 — Submit Missing Business Request

**Preconditions**
- Logged in
- The business is not already present in the directory

**Steps**
1. Open Business Dashboard
2. Tap Register Missing Business
3. Enter type, name, and branch details
4. Submit for approval

**Expected**
- Request is created successfully
- New business appears in My Businesses
- New business status is pending
- User is informed that admin review is required

## CLM-10 — Prevent Duplicate Missing Business Submission

**Preconditions**
- A matching business already exists in the same city and category

**Steps**
1. Open Business Dashboard
2. Tap Register Missing Business
3. Enter a matching business name and/or same phone or WhatsApp number
4. Submit for approval

**Expected**
- Backend rejects the submission
- User sees guidance to claim the existing listing instead
- No duplicate pending business is created

## RPT-01 — Report Directory Listing

**Preconditions**
- Logged in
- Directory business detail is open

**Steps**
1. Tap Report listing
2. Enter a reason and optional details
3. Submit

**Expected**
- Report is created successfully
- User sees confirmation

---

# 8) Admin Dashboard

## ADM-01 — Admin Login and Navigation

**Preconditions**
- Admin user exists and can log in

**Steps**
1. Log in as admin
2. Open the admin app
3. Verify the left navigation

**Expected**
- Login succeeds
- Sidebar shows Dashboard, Users, Businesses, Disputes, System Logs, Claims, and Reports
- Each route opens without a blank screen or crash

## ADM-02 — Suspend/Unsuspend User

**Steps**
1. Open Users
2. Suspend a user
3. Refresh
4. Unsuspend the same user

**Expected**
- Suspension state updates immediately or after refresh
- Suspended user cannot create new posts and sees a clear error
- Unsuspended user regains access

## ADM-03 — Disputes List and Resolve

**Preconditions**
- At least one dispute exists

**Steps**
1. Open Disputes
2. Resolve one dispute as valid
3. Resolve another dispute as invalid

**Expected**
- Status changes are visible after the action
- The resolved dispute no longer appears as unresolved
- Any suspension automation tied to valid dispute thresholds works as configured

## ADM-04 — Verification Documents Review

Covered in `VDOC-04` to `VDOC-07`

## ADM-05 — Claims Queue Filter and Load

**Preconditions**
- At least one business claim exists

**Steps**
1. Open Claims
2. Verify the default pending filter
3. Switch between Pending, Approved, Rejected, and All
4. Tap Refresh

**Expected**
- Claims list loads successfully
- Filtered results match the selected status
- Each row shows business, requester, method, docs count, status, and created time

## ADM-06 — Approve Business Claim

**Preconditions**
- A pending business claim exists

**Steps**
1. Open Claims
2. Find a pending claim
3. Click Approve
4. Confirm the action

**Expected**
- Claim status changes to approved
- Business ownership is assigned to the requester
- Business claim status updates to claimed in subsequent lists/details

## ADM-07 — Reject Business Claim with Reason

**Preconditions**
- A pending business claim exists

**Steps**
1. Open Claims
2. Find a pending claim
3. Click Reject
4. Enter an optional rejection reason
5. Confirm the action

**Expected**
- Claim status changes to rejected
- Rejection reason is stored
- The requester sees the rejection state in My Claims / claim progress

## ADM-08 — Download Claim Documents

**Preconditions**
- A docs-based claim exists with at least one uploaded file

**Steps**
1. Open Claims
2. Locate a docs claim
3. Click Download on each attached file

**Expected**
- Each file downloads successfully
- Downloaded file names are correct
- Downloaded files open and match the uploaded content

## ADM-09 — Reports Queue Resolve

**Preconditions**
- At least one open business report exists

**Steps**
1. Open Reports
2. Keep the filter on Open
3. Click Resolve on a report
4. Confirm the action

**Expected**
- Report status changes to resolved
- The report disappears from the Open filter
- The business remains unchanged when only Resolve is used

## ADM-10 — Reject Listing from Reports

**Preconditions**
- At least one open business report exists for an active listing

**Steps**
1. Open Reports
2. Click Reject listing on a report
3. Confirm the action

**Expected**
- The related business is rejected
- The report is resolved in the same workflow
- Refreshing Reports and Businesses reflects the new state

## ADM-11 — Businesses Filter by Status and Type

**Preconditions**
- Businesses exist across different statuses and types

**Steps**
1. Open Businesses
2. Switch status between Active, Pending, Rejected, and All
3. Switch type between All Types, Exchange, and Umrah
4. Tap Refresh

**Expected**
- Filters update the table correctly
- Result counts update correctly
- Each row shows name, type, status, claim status, owner, and business ID

## ADM-12 — Generate In-person Claim Code

**Preconditions**
- A claimable business exists

**Steps**
1. Open Businesses
2. Enter the business ID in the In-person Claim Code section
3. Click Generate Code
4. Confirm the action

**Expected**
- A new code is generated successfully
- The latest code is displayed
- The code can be used by the mobile in-person claim flow

## ADM-13 — Merge Duplicate Businesses

**Preconditions**
- Target and source businesses exist and are confirmed duplicates

**Steps**
1. Open Businesses
2. Enter the target business ID
3. Enter the source business ID
4. Click Merge
5. Confirm the action

**Expected**
- Merge completes successfully
- Source listing is hidden/replaced by the target record
- Related operational data is preserved under the target business

## ADM-14 — System Logs Load

**Steps**
1. Open System Logs
2. Refresh the page if needed

**Expected**
- Logs page loads without error
- Recent entries are visible when logs exist

## ADM-15 — Review Missing Business Submission

**Preconditions**
- A user has submitted a missing business request

**Steps**
1. Open Businesses
2. Keep the status filter on Pending
3. Find the newly submitted business
4. Review the row details and location
5. Click Approve or Reject

**Expected**
- Pending business request is visible in the review table
- Admin can approve or reject directly from the row
- Status changes are reflected after refresh/reload

## ADM-16 — Businesses Filter by Source and Import Batch

**Preconditions**
- Businesses exist from at least two different sources or batches

**Steps**
1. Open Businesses
2. Change Source filter between Owner Submitted, Manual Import, API Import, Partner Import, and Other Import
3. Enter a valid import batch ID
4. Click Apply Batch
5. Click Clear Batch

**Expected**
- Source filter limits the list correctly
- Batch filter returns only businesses from the requested batch
- Clear Batch removes the batch restriction
- Source column shows source name/type, batch, imported time, and last seen time where available

## ADM-17 — Duplicate Suggestions and Prefill Merge

**Preconditions**
- A pending business request has one or more likely duplicates

**Steps**
1. Open Businesses
2. Find a pending business with duplicate suggestions
3. Review the suggested duplicate entries and reasons
4. Click Prefill merge on one suggestion

**Expected**
- Duplicate suggestions are shown for the pending business
- Each suggestion shows candidate identity and match reasons
- Merge form is prefilled with target and source IDs
- Admin can proceed to merge with fewer manual steps

## ADM-18 — Outreach Tracking for Unclaimed Businesses

**Preconditions**
- At least one active or pending business is still unclaimed
- Admin user has access to Businesses

**Steps**
1. Open Businesses
2. Find an unclaimed business without an owner
3. Review the Outreach column
4. Click Log outreach
5. Enter a valid channel and outcome
6. Optionally enter note and next follow-up datetime
7. Save and refresh the list if needed

**Expected**
- Outreach entry is saved successfully
- Outreach column shows urgency/status chips such as Never Contacted, Follow-up Due, Follow-up Upcoming, or No Follow-up when applicable
- Outreach column shows latest outcome, channel, last contact time, and total outreach count
- Next follow-up is shown when provided
- Claimed or owner-linked businesses do not show outreach logging controls

## ADM-19 — Outreach Follow-up Filter and History

**Preconditions**
- At least one unclaimed business has a due or upcoming outreach follow-up
- At least one outreach log exists for a business

**Steps**
1. Open Businesses
2. Change the follow-up filter between All Follow-up, Follow-up Due, Follow-up Upcoming, and No Follow-up
3. Confirm the table result count changes appropriately
4. Click View history on a business with outreach activity
5. Confirm the outreach workspace opens
6. Review the outreach history section
7. Optionally start a new outreach entry from the same workspace
8. Close the workspace

**Expected**
- Follow-up filter narrows the table based on the latest scheduled outreach follow-up
- Businesses with no next follow-up appear under No Follow-up
- Outreach workspace loads for the selected business
- History section loads outreach entries for the selected business
- Each history entry shows outcome, channel, timestamp, and optional note/follow-up
- Admin can log a new outreach update without leaving the same workspace
- Closing the workspace returns focus to the Businesses table

---

# 9) Chat

## CHAT-01 — Basic Messaging

**Steps**
1. Create or open a conversation from Currency or Parcel
2. Send messages from both participants

**Expected**
- Messages appear immediately
- Timestamps are visible
- New messages remain in chronological order

## CHAT-02 — Auto-scroll to Latest Message

**Preconditions**
- Conversation has enough messages to require scrolling

**Steps**
1. Open the conversation away from the latest message
2. Tap the composer
3. Send a new message

**Expected**
- The view scrolls toward the latest message, not upward into older history
- Sending a message keeps the newest content visible

## CHAT-03 — Composer Visibility with Keyboard

**Steps**
1. Open a conversation on Android and iPhone if available
2. Tap the message composer
3. Type a long message
4. Dismiss and reopen the keyboard

**Expected**
- Composer remains visible above the keyboard
- User can see what they are typing
- No bottom navigation overlap covers the composer

## CHAT-04 — Dark Mode Visibility

**Steps**
1. Enable dark mode
2. Open a conversation
3. Send a message

**Expected**
- Outgoing and incoming message text remain readable
- Composer, placeholders, and timestamps remain visible

---

# 10) Regression / Smoke Suite

Run these quickly after each build:

- `AUTH-02` (OTP login) or `AUTH-04` (Google login)
- `PROF-02` (edit profile basics)
- `EXP-02` (upvote from Explore / Feature Board)
- `CUR-01` + `CUR-04` + `CUR-05` (create post, request match, accept)
- `CUR-17` + `CUR-18` (complete exchange and rate)
- `PAR-10` + `PAR-14` + `PAR-16` (browse trips, accept traveler, enforce capacity)
- `DIR-01` or `DIR-02` (directory browse)
- `UML-01` (submit Umrah inquiry)
- `CLM-01` or `CLM-05` + `CLM-06` (start claim and verify My Claims visibility)
- `CLM-09` (submit missing business request)
- `RPT-01` (report listing)
- `ADM-05` + `ADM-09` + `ADM-11` + `ADM-16` + `ADM-18` + `ADM-19` (claims, reports, businesses admin pages)
- `CHAT-02` + `CHAT-03` (auto-scroll and composer visibility)
- `VDOC-01` + `VDOC-05` (upload and approve verification document)
