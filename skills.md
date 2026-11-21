# Skills & Operational Playbooks: PlotFlow

This document provides exact commands, operational playbooks, and troubleshooting guides for developing, building, testing, and deploying **PlotFlow (Multi-Tenant Real Estate Broker CRM)** across Web and Android runtimes.

---

## 1. Development & Build Commands

### Initial Setup
```bash
# Navigate to project root
cd /Users/mohamedibrahim/Projects/estate-broker-crm

# Install dependencies
npm install
```

### Local Development (Web PWA)
```bash
# Launch development server with live reload on port 4200
npm start
# or
ng serve --port 4200 --host 0.0.0.0
```

### Production Web Build
```bash
# Build optimized Ahead-of-Time (AOT) static bundle in dist/
npm run build
# or
ng build --configuration production
```

---

## 2. Capacitor & Android Native Workflows

### Native Sync
Whenever web code changes or new Capacitor plugins are installed, sync the `dist/` bundle to the Android native project:
```bash
# 1. Build production web bundle
npm run build

# 2. Sync to Android directory
npx cap sync android
```

### Launch in Android Studio
```bash
npx cap open android
```

### Build Android APK via Terminal (Without Android Studio GUI)
```bash
# Build Debug APK
cd android
./gradlew assembleDebug
# Generated APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk

# Build Release APK
./gradlew assembleRelease
# Generated APK will be at:
# android/app/build/outputs/apk/release/app-release-unsigned.apk
cd ..
```

### Native Permissions Verification (`AndroidManifest.xml`)
Ensure the following permissions are present in `android/app/src/main/AndroidManifest.xml`:
```xml
<!-- Network & Offline -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Camera & Photo Gallery -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

<!-- Local Push Reminders -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
```

---

## 3. Firebase Deployment & Configuration

### Prerequisites
Make sure Firebase CLI is logged in:
```bash
firebase login
```

### Deploy Firestore Security Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Firebase Storage Security Rules
```bash
firebase deploy --only storage
```

### Deploy Web Application to Firebase Hosting
```bash
# 1. Build production bundle
npm run build

# 2. Deploy hosting
firebase deploy --only hosting
```

---

## 4. Verification & Testing Playbooks

### Playbook A: Multi-Tenant Data Isolation Test
1. Log in as Agency Admin A (`tenant_alpha`).
2. Create Property `Luxury Villa 101` and Lead `John Doe`.
3. Open an Incognito window and log in as Agency Admin B (`tenant_beta`).
4. Verify:
   - Neither `Luxury Villa 101` nor `John Doe` appears in the inventory, search bar, or lead pipeline of `tenant_beta`.
   - Direct Firestore document fetches for `tenants/tenant_alpha/properties/...` fail with `permission-denied`.

### Playbook B: Offline Resilience Test
1. Open PlotFlow on mobile or Chrome DevTools.
2. In Network tab, toggle **Offline**.
3. Navigate to **Properties** and **Leads**:
   - Verify previously cached properties remain visible and searchable.
   - Add a new note to a Lead: verify it is saved locally to IndexedDB without UI crash.
4. Toggle Network back to **Online**:
   - Verify the note syncs seamlessly to Firestore.

### Playbook C: Client-Side Brochure Generation Test
1. Select any property in the inventory.
2. Click **"Share Brochure"**.
3. Verify:
   - On Desktop: Branded PDF downloads immediately with agency logo, RERA number, amenities, and agent contact (and owner contact is excluded).
   - On Android: The native Share sheet opens with WhatsApp and Gmail options pre-attached.

### Playbook D: Deal Commission Calculator Test
1. In Deals module, create a new closing:
   - Deal Value: `₹1,00,00,000` (1 Crore)
   - Buyer Brokerage: `2%` (`₹2,00,000`)
   - Seller Brokerage: `2%` (`₹2,00,000`)
   - GST: `18%`
   - Agent Commission: `25%` of net brokerage
2. Verify:
   - Gross Brokerage: `₹4,00,000`
   - GST Deducted: `₹72,000`
   - Net Brokerage: `₹3,28,000`
   - Agent Commission Payout: `₹82,000`
   - Net Agency Profit: `₹2,46,000`

