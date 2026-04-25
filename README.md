# MusafirOne

A Cross-Border Peer Exchange Platform connecting verified expatriates for currency exchange and parcel delivery.

## Overview

MusafirOne is a mobile-first platform designed to help expatriates:
1.  **Exchange Currency**: Find peers to exchange currency safely without middlemen.
2.  **Send Parcels**: Connect with travelers to send parcels securely.
3.  **Build Trust**: A robust trust system with verification levels and user ratings.

**Note:** The platform does NOT process payments or handle money directly. It acts as a matching and trust layer.

## Key Features

### 💱 Currency Exchange
*   **Create Posts**: List currency you have and need (e.g., AED to INR).
*   **Edit Posts**: Update your active/draft post details (amount/rate/city).
*   **Matchmaking**: Browse available posts and request matches.
*   **Negotiation**: Chat with matched users to agree on terms.
*   **Status Tracking**: Track requests from Pending -> Accepted -> Completed.
*   **Disputes & Ratings**: Raise disputes and submit ratings after completion.

### 📦 Parcel Delivery
*   **Travelers (Trips)**: Post your travel plans (From/To countries, Date, Available Weight).
*   **Senders (Requests)**: Post parcel delivery requests (Item type, Weight, Flexible dates).
*   **Smart Matching**: Automatically find trips that match your parcel request criteria.
*   **Edit Trips/Requests**: Update active trips and requests.
*   **Disputes & Ratings**: Raise disputes and submit ratings.

### 💬 Real-time Chat
*   **Integrated Chat**: Secure, real-time messaging for matched users.
*   **Context Aware**: Chat screens show transaction details (Currency amount or Parcel weight) at the top.
*   **Privacy**: Chat is created from in-app actions (Currency/Parcel flows) and stays in-app.

### 🛡️ Trust & Safety
*   **User Verification**:
    *   **Level 0**: Unverified.
    *   **Level 1**: Basic verification (Phone).
    *   **Level 2**: Identity verification (Documents).
*   **Trust Score**: A dynamic score (0-100) based on completed transactions, ratings, and disputes.
*   **Dispute System**: Report issues with transactions. 3 valid disputes lead to automatic account suspension.
*   **Document Review**: Admins can approve/reject verification documents (Level 2).

### 🧭 Explore (Feature Voting)
*   **Feature Board**: Explore potential features and upvote to validate demand.
*   **Feature Details**: Tap to read full descriptions (e.g., Co-Passenger).

### 👮 Admin Dashboard
*   **User Management**: View all users, search by phone/name.
*   **Stats**: View user activity (Currency Posts, Parcel Trips, Requests).
*   **Moderation**: Suspend/Unsuspend users, Verify/Unverify users manually.
*   **Disputes**: Review and resolve disputes.
*   **Verification Docs**: Review Level 2 verification submissions.

## Tech Stack

### Mobile App (Frontend)
*   **Framework**: React Native (Expo)
*   **Language**: TypeScript
*   **Navigation**: Expo Router
*   **Styling**: React Native StyleSheet with Themed Components
*   **API Client**: Custom fetch wrapper with JWT handling

### Backend API
*   **Framework**: NestJS
*   **Language**: TypeScript
*   **Database**: PostgreSQL
*   **ORM**: Prisma
*   **Real-time**: Socket.io (Gateway)
*   **Authentication**: JWT & OTP-based (Simulated for MVP)

## Project Structure

```
muhajirOne/
├── admin/            # Admin web dashboard (React/Vite)
├── backend/          # NestJS Backend API
│   ├── src/
│   │   ├── auth/     # Authentication & Guards
│   │   ├── chat/     # Chat Gateway & Service
│   │   ├── currency/ # Currency Exchange Module
│   │   ├── parcel/   # Parcel Delivery Module
│   │   ├── verification/ # Level 2 document verification
│   │   ├── features/ # Explore feature voting APIs
│   │   ├── users/    # User Management
│   │   └── ...
│   └── prisma/       # Database Schema
│
├── mobile/           # React Native Expo App
│   ├── app/          # Expo Router Screens
│   │   ├── (tabs)/   # Main Tab Navigation
│   │   ├── admin/    # Admin Dashboard
│   │   └── ...
│   ├── components/   # Reusable UI Components
│   └── api/          # API Client
│
└── docs/             # Product + QA docs
```

## Setup Instructions

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL
*   Expo CLI

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Run Database Migrations
npx prisma migrate dev

# Seed sample data (optional)
npm run seed

# Start the server
npm run start:dev
```

The backend runs on `http://localhost:3000`.

#### Production/Hosted DB migrations

```bash
cd backend
npx prisma migrate deploy
```

### 2. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo
npx expo start
```

*   Use **Expo Go** on your physical device or an Android/iOS Emulator.
*   **Note**: Ensure your mobile device and computer are on the same Wi-Fi network. Update `mobile/api/client.ts` with your computer's local IP address if necessary.

## Local Android APK Build (Windows)

Recommended for sharing with testers (Release):

```powershell
cd mobile
npx expo prebuild -p android --clean --no-install
cd android
.\gradlew.bat clean :app:assembleRelease
```

APK output:

```text
mobile\android\app\build\outputs\apk\release\app-release.apk
```

Smaller install for users (AAB):

```powershell
cd mobile\android
.\gradlew.bat clean :app:bundleRelease
```

AAB output:

```text
mobile\android\app\build\outputs\bundle\release\app-release.aab
```

## Development Notes

*   **Soft Delete**: All core entities (Users, Posts, Trips) use soft delete (`deletedAt`) to preserve data integrity.
*   **Admin Access**: Users with `isAdmin: true` in the database can access the Admin Dashboard from the mobile app.

## Documentation

*   QA test cases: [docs/functional-test-cases.md](docs/functional-test-cases.md)
*   Agent/assistant ideas: [docs/agent-suggestions.md](docs/agent-suggestions.md)
