# Trydood 2.0 — Vendor Panel API Documentation

**Version:** 1.2.0
**Base URL (Local):** `http://localhost:8080/trydood/v1`
**Base URL (Staging):** `https://staging-api.trydood.com/trydood/v1`
**Framework:** Express.js (Node.js, CommonJS)
**Database:** MongoDB (Mongoose ODM)
**Scope:** Vendor / brand panel ke **81 endpoints**
**Last verified:** live run against current code · Platform ke **216 routes** me se vendor-category ke ([endpoints_category.md](./endpoints_category.md))

> ✅ **v1.2.0 se ye doc live API ke against verify ho chuka hai** — sirf code padhkar nahi likha gaya. Har endpoint ek chalte hue server pe seeded fixtures ke saath run kiya gaya: **125 requests, 292 assertions, 0 failed, aur 125/125 par live-captured example.** Voucher Claims, Refunds aur Settlements pehli baar is run me chale — pehle wo teen folders generator me the hi nahi. Collection: [`postman/trydood-vendor.postman_collection.json`](../postman/trydood-vendor.postman_collection.json)
>
> Jahan behaviour buggy ya adhoora hai, wahan ⚠️ (ya 🔴, agar wo cheez tod deti hai) marker hai.

### 🆕 2026-10-07 — upload audit

Vendor panel (`stage` branch) ke har upload ko backend se milaya gaya. **Frontend
team ke liye poori list:** [Uploads — frontend action items](#-uploads--frontend-action-items-2026-10-07).

| | |
|---|---|
| 🔴 Panel me toote hue | Showcase video add, video replace, "Show in Video Clips" toggle · voucher edit me 1 image · Business Hours save |
| 🆕 Backend messages | Showcase add-media poster ka message galat field (`"thumbnail"`) batata tha → ab `"thumbnails"`. Voucher banner messages ab presigned field ka naam bhi batate hain |
| 📄 Doc theek kiye | #48 errors + poster pairing, #49 response shape, #54 multipart example (`bannerType`/`bannerImage` hata), #54 response, #94/#95 CORS + `uploadId` umar |
| ⏳ Backend pending | Poster pairing, batch ke beech fail par rollback, confirm par `uploadId` ki umar — har ek ka panel-side bachav list me |

### 🆕 v1.2.0 me kya naya

Live run ne **teen** aise bugs pakde jo code padhkar nahi dikhte the — teeno ab fix hain:

| Bug | Kya hota tha |
|---|---|
| 🔴 `GET /brands/verifications/history` **500** | `isVendor is not defined` — ek `ReferenceError`. Security round me per-role scoping add karte waqt uski declaration hat gayi thi par pipeline me do reads reh gaye. Har vendor request marti thi ([#33](#33-get-brandsverificationshistory)) |
| 🔴 `PUT /showcase/section/:brandId/reorder` **500** | Service `item.sectionId` padhti thi, validator `id` bhejta hai → `undefined.toString()`. **Endpoint kabhi kaam hi nahi kiya** ([#47](#47-put-showcasesectionbrandidreorder)) |
| 🔴 `PUT /showcase/section/:sectionId/media/reorder` **500** | Wahi bug (`item.mediaId` vs `id`). **Ye bhi kabhi kaam nahi kiya** ([#51](#51-put-showcasesectionsectionidmediareorder)) |

Aur do response shapes doc me galat likhi thi:

| Fix | Kya galat tha |
|---|---|
| Section detail ka `media` block | Doc me flat `medias[]` + top-level pagination tha. Asli me **nested** hai — `data.media.data[]` ([#44](#44-get-showcasesectiongetsectionid)) |
| Reorder responses | Dono `updated` return karte hain, `modified` nahi |

### v1.1.0 me kya badla tha

Ye **re-verification round** tha — har endpoint ka gate code se dobara nikala gaya, hand-check nahi kiya.

| Change | Detail |
|---|---|
| **81 → 78 endpoints** | Password flow (`set-password`, `forgot-password`, `reset-password`) ab **admin-only** hai — [#7–9](#79-password-flow---ab-vendor-ke-liye-nahi) dekhein |
| **25 Access lines stale thi** ✅ | Doc `"Any authenticated"` claim kar raha tha un routes pe jo ab properly gated hain — brands, locations, showcase, brand features, voucher versions. Sab code se regenerate ki gayi |
| **Ownership markers** | Jin 24 routes pe service ownership resolve karti hai (`resolveActorBrand` / `resolveSectionForActor`), unpe ab `+ ownership` likha hai — gate kehta hai *"koi vendor"*, ownership kehti hai *"**yahi** vendor"* |
| **`FIXED` discount ab kaam karta hai** ✅ | Pehle enum me tha par calculate nahi hota tha |
| **Voucher banner fields** | `bannerType` + `bannerUrl` customer-facing responses me |

> **Vendor-reachable vs vendor-intended:** teen customer voucher endpoints (`/vouchers/customer/*`) sirf `verifyJwtToken` pe hain, to vendor token unpe technically pahunch jaata hai. Wo vendor panel ke liye nahi hain — [Appendix A](#appendix-a--not-for-vendor-panel) me hain.

---

## Table of Contents

**Foundation**
1. [Overview](#overview)
2. [Vendor Journey](#vendor-journey)
3. [Authentication](#authentication)
4. [Standard Response Format](#standard-response-format)
5. [Pagination](#pagination)
6. [HTTP Status Codes](#http-status-codes)
7. [Common Errors](#common-errors)
8. [Subscription Gate](#subscription-gate)
9. [Enums Reference](#enums-reference)

**Endpoints**

10. [Auth APIs](#auth-apis) — 7 *(password flow admin-only ho gaya)*
11. [User Profile APIs](#user-profile-apis) — 3
12. [Push Notification APIs](#push-notification-apis) — 4
13. [Notification Feed APIs](#notification-feed-apis) — 2
14. [Onboarding APIs](#onboarding-apis) — 15
15. [KYC Verification APIs](#kyc-verification-apis) — 3
16. [Brand APIs](#brand-apis) — 3
17. [Outlet / Sub-Brand APIs](#outlet--sub-brand-apis) — 3
18. [Work Hours APIs](#work-hours-apis) — 1
19. [Location APIs](#location-apis) — 5
20. [Showcase APIs](#showcase-apis) — 11
21. [Voucher APIs](#voucher-apis) — 11
22. [Brand Feature APIs](#brand-feature-apis) — 5
23. [Subscription Plan APIs](#subscription-plan-apis) — 3
24. [My Subscription APIs](#my-subscription-apis) — 2
25. [Payment APIs](#payment-apis) — 4
26. [Master Data APIs](#master-data-apis) — 4
27. [Legal APIs](#legal-apis) — 4

**Reference**

28. [Appendix A — Not For Vendor Panel](#appendix-a--not-for-vendor-panel)
29. [Appendix B — Known Issues](#appendix-b--known-issues)
30. 🆕 [Uploads — frontend action items (2026-10-07)](#-uploads--frontend-action-items-2026-10-07)
31. [Frontend Integration Checklist](#frontend-integration-checklist)

---

## Overview

Vendor panel 22 functional areas cover karta hai:

| # | Area | Endpoints | Kya karta hai |
|---|---|---:|---|
| 1 | Auth | 10 | WhatsApp/Email/Mobile OTP login + password set/forgot/reset + logout |
| 2 | User Profile | 3 | Profile fetch, update, delete |
| 3 | Push Notifications | 4 | Device register/unregister, my devices, test |
| 4 | Notification Feed | 4 | In-app notifications, mark read, aur email/push/WhatsApp toggles ([#19a](#19a-get-notificationspreferences-), [#19b](#19b-put-notificationspreferences-)) |
| 5 | Onboarding | 8 | Business details → PAN → GST → Bank → system verify → partnership → acknowledge |
| 6 | KYC Verification | 3 | Live PAN / GST / Bank verification (CGPey) |
| 7 | Brand | 3 | Brand detail, update, verification history |
| 8 | Outlets / Sub-Brands | 3 | Outlet signup, list, update |
| 9 | Work Hours | 1 | Weekly timings upsert |
| 10 | Locations | 5 | Brand + outlet addresses |
| 11 | Showcase | 11 | Photo/video gallery — sections + media |
| 12 | Vouchers | 7 | Create, update, submit for review, publish, versions, banner |
| 13 | Brand Features | 5 | USP / highlight points |
| 14 | Subscription Plans | 2 | Available plans browse |
| 15 | My Subscription | 2 | Current plan + history |
| 16 | Payments | 4 | Checkout preview, order, verify, invoice |
| 17 | Master Data | 4 | Categories + sub-categories |
| 18 | Legal | 4 | Terms & Conditions, Privacy Policy |
| 19 | Voucher Claims | 5 | Read-only — claims, payments, aur counter par code verify ([#82](#82-get-voucher-claims--mere-brand-ki-claims)–[#86](#86-get-voucher-claimscodeclaimcode--counter-par-verify)) |
| 20 | Refunds | 4 | Worklist, approve, reject, detail ([#87](#87-get-refunds--mere-brand-ki-refunds)–[#90](#90-get-refundsrequestid--ek-refund)) |
| 21 | Settlements | 3 | Payouts, legs, statement lines ([#91](#91-get-settlements--mere-payouts)–[#93](#93-get-settlementssettlementidtransactions--statement-lines)) |
| 22 | Email Verification | 2 | 🆕 Address confirm ya change ([#19c](#19c-post-authemailsend-verification-), [#19d](#19d-post-authemailverify-)) — har role ke liye ek hi flow |

**Important architecture notes:**

- **Do alag sawaal, do alag jagah.** Route ka gate poochta hai *kya aap is tarah ke caller ho* (`isVendorOrAdmin`, `isBrandSideOrAdmin`); service poochti hai *ye cheez aapki hai* — `resolveActorBrand`, `resolveSectionForActor`, `resolveLocationTarget`. Gate akela kabhi kaafi nahi: wo batata hai ki aap **ek** vendor ho, ye nahi ki **is** brand ke. Ab dono har vendor-write par hain → [Appendix B](#appendix-b--known-issues)
- **Ownership `resolveActorBrand` se enforce hoti hai** — 11 services isko use karte hain. Vendor sirf apna brand touch kar sakta hai, aur wo check brand ke apne `userId` se hota hai, token ke cached `brandId` se nahi
- **Paid features subscription gate ke peeche hain** — outlets, vouchers, showcase sections ke liye active plan chahiye → [Subscription Gate](#subscription-gate)
- **Soft delete pattern** — kuch bhi actually delete nahi hota, `isDeleted: true` set hota hai
- **Lowercase normalization** — brand names, addresses DB me lowercase store hote hain. UI pe capitalize karna frontend ka kaam hai

---

## Vendor Journey

> ✅ **Onboarding v2 stage pe live (2026-11-19), prod pe abhi nahi.** Poora flow, screen-by-screen: [brand_onboarding_v2_vendor_panel_guide.md](./brand_onboarding_v2_vendor_panel_guide.md). Neeche wahi flow hai jo stage pe chal raha hai (P0–P8).

Screen sirf **server** badalta hai (`user.currentScreen`). Panel kabhi `currentScreen` nahi bhejta — routing ke liye `GET /brands/onboarding/status` (#20a) padhein.

```
1. SIGNUP
   POST /auth/loginOrSignUp-with-whatsapp  { role: "VENDOR" }   → User + Brand, currentScreen: BRAND_NAME
   POST /auth/verify-otp-whatsapp                                → JWT (screen khaali ho to BRAND_NAME)
   GET  /brands/onboarding/status                                → currentScreen, sidebar groups, progress

2. BASIC DETAILS
   POST /brands/onboarding/add-basic-details { step: BRAND_NAME, brandName }                     → BUSINESS_CATEGORY
   POST /brands/onboarding/add-basic-details { step: BUSINESS_CATEGORY, categoryId, subCategoryIds } → REGISTRATION_STATUS
   POST /brands/onboarding/add-basic-details { step: REGISTRATION_STATUS, kycPath }
        kycPath GST          → GST_VERIFICATION
        kycPath NO_GST       → PAN_VERIFICATION
        kycPath UNREGISTERED → OWNER_VERIFICATION   (entity apne aap PROPRIETORSHIP)

3. BUSINESS VERIFICATION — har paid check: verify (jawab server pe) → save { verificationId }
   GST path:    verify-gst → add-gst-details → PAN_VERIFICATION
                verify-pan → add-pan-details → REGISTRATION_ENTITY_TYPE
                add-basic-details { step: REGISTRATION_ENTITY_TYPE, businessEntityType } → KYC_DOCUMENTS
   NO_GST path: verify-pan → add-pan-details → REGISTRATION_ENTITY_TYPE → (entity) → KYC_DOCUMENTS
   UNREGISTERED: verify-pan → owner-verification { method: PAN, verificationId }
                 ya owner-verification { method: ID_DOCUMENT, idType, file | uploadId } → KYC_DOCUMENTS
   KYC_DOCUMENTS: GET/POST/PUT/DELETE /brands/onboarding/documents (titled list, private files)
                  → POST /brands/onboarding/continue (≥ 1 document) ya POST /brands/onboarding/skip → BANK_VERIFICATION

4. PAYOUT
   verify-bank → add-bank-details { verificationId }  → PARTNERSHIP_DEED   (ya skip { screen: BANK_VERIFICATION })

5. AGREEMENT & PLAN
   PUT  /brands/onboarding/accept-partnership          → SUBSCRIBE_PLAN (plan pehle se live → BRAND_BASIC_DETAILS)
        (P5: admin ne offline deed record ki ho → status.deed.requiresDeedConfirmation = true →
         login pe blocking popup → wahi PUT, kisi bhi screen se, screen nahi hilti)
   GET  /brands/billing-address · PUT /brands/billing-address   (billing address — preview ka suggestedAddress prefill)
   GET  /subscriptions/getAll · POST /transactions/subscribe/preview
   POST /transactions/subscribe/create-order           (SUBSCRIBE_PLAN se pehle → 409; billing address nahi → 422)
   POST /transactions/subscribe/verify-transaction     → BRAND_BASIC_DETAILS (admin grant se bhi)

6. BRAND OUTLET — data apne APIs se, aage sirf continue / skip se
   BRAND_BASIC_DETAILS:        PUT /brands/update (logo, cover, description, email, mobile) → POST /brands/onboarding/continue
                               (logo + email + mobile zaroori → BRAND_PROFESSIONAL_DETAILS)
   BRAND_PROFESSIONAL_DETAILS: showcase + brandFeatures APIs → continue ya skip { screen: BRAND_PROFESSIONAL_DETAILS } → OUTLET_DETAILS
   OUTLET_DETAILS:             POST /subBrands/signUp-with-whatsapp → manager OTP → POST /locations/create → POST /workHours/upsert
                               → continue (har live outlet verified + location + hours) → ONBOARDING_REVIEW

7. SUBMIT — POST /brands/onboarding/submit (#24) → UNDER_REVIEW
   GET /brands/onboarding/status ka systemChecks review page pe pehle se dikhta hai (kabhi block nahi karta)
   Submit ke baad: sirf "add" (kami wali cheez jodna) — badalna 409 ONBOARDING_LOCKED (admin decision tak)

8. ADMIN APPROVAL (vendor waits)
   Admin: PUT /brands/admin/verifications/:brandId/review  { action: "APPROVED" }
   PUT /brands/onboarding/acknowledge-approval          → DASHBOARD

9. OPERATE
   Showcase · Vouchers · Brand features · More outlets
```

**Galat screen se koi step** → `409 ONBOARDING_SCREEN_MISMATCH`, `details.currentScreen` mein vendor ki asli screen. Peeche ki screen dobara save (back-edit / preview) → data save, screen wahi.

⚠️ **Rejection ka raasta:** sirf **admin** ka reject / revoke legal sections dobara kholta hai (system ka kam score nahi). Screen nahi hilti; vendor theek karke `POST /brands/onboarding/submit` se resubmit karta hai (wahi screen). Poora remediation flow → [brand_rejection_remediation_design.md](./brand_rejection_remediation_design.md).

**Submit ke baad (P3):** admin decision pending ho tab sirf **add** — jo khaali hai ya skip hua tha (bank, documents, NO_GST pe GST, khaali logo / description, naye album / feature / outlet). Pehle se di hui cheez badalna → `409 ONBOARDING_LOCKED`. Approve ke baad: legal fields (naam, category, status, entity, PAN / GST / bank) admin ke — `409 LEGAL_FIELD_LOCKED` / `DETAIL_ALREADY_PROVIDED`; kami wala item ek baar jod sakte hain; UNREGISTERED → GST / NO_GST upgrade allowed. Billing address hamesha editable.

---

## Authentication

Login ke baad har protected request me JWT bhejna hai:

```http
Authorization: Bearer <token>
```

**Token kahan se milta hai:** `POST /auth/verify-otp-whatsapp` (ya email/mobile variant) ke response me `data.token`

**JWT payload:**
```json
{
  "id": "68f1a2b3c4d5e6f7a8b9c0d1",
  "role": "VENDOR",
  "name": "cafe mocha",
  "email": "hello@cafemocha.in",
  "whatsappNumber": "9812345678",
  "mobile": "9812345678",
  "iat": 1755820800,
  "exp": 1758412800
}
```

**Expiry:** `JWT_EXPIRY` env variable se. Expire hone pe `401` + `"Your session has expired. Please log in again."` → login screen.

⚠️ **Logout server-side token invalidate nahi karta.** Client ko locally token delete karna hoga, aur push ke liye `PUT /deviceTokens/unregister` bhi call karna hoga.

### `req` context jo backend set karta hai

Middleware ke baad har handler ko ye milta hai — samajhna useful hai kyunki kai endpoints `brandId` optional rakhte hain:

| Field | Kab set hota hai |
|---|---|
| `req.userId` | Hamesha |
| `req.role` | Hamesha — `VENDOR` |
| `req.brandId` | Sirf `VENDOR` role pe — vendor ka apna brand |

Isliye vendor ke liye `brandId` zyadatar endpoints pe **optional** hai (token se resolve ho jaata hai), jabki admin ke liye **mandatory**.

---

## Standard Response Format

**Success:**
```json
{
  "success": true,
  "message": "Brand details fetched successfully",
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Brand not found!"
}
```

Kabhi-kabhi error me extra `details` field bhi aati hai.

⚠️ **Ek exception:** `DELETE /users/delete` standard envelope use **nahi** karta — raw `{ "message": "..." }`, `success` field ke bina.

---

## Pagination

List endpoints ka `data` ye shape me aata hai:

```json
{
  "success": true,
  "message": "Outlets/Sub-Brands fetched successfully",
  "data": {
    "total": 12,
    "totalPages": 2,
    "page": 1,
    "limit": 10,
    "data": [ ]
  }
}
```

`data.data` nested hai — outer `data` envelope ka, inner `data` actual array.

### ⚠️ Empty list = 404, empty array nahi

`pagination` utility jab koi record nahi milta to **404 throw** karti hai:

```json
{ "success": false, "message": "No any subbrand found" }
```

**404 ko error treat na karein** in list endpoints pe — wo "koi data nahi hai" ka matlab hai. Empty-state UI dikhayein, error toast nahi.

Har list endpoint ka exact 404 message alag hai — har endpoint ke section me diya hai.

**Exceptions (ye 404 nahi dete):**
- `GET /deviceTokens/get-mine` → `devices: []`
- `GET /subscribeds/get` → `null` ya `{ subscribed: null }`
- Naye modules (`notifications`, `subscribeds`, `transactions`) apna khud ka pagination use karte hain — wo empty pe `200` + `[]` dete hain

### `search` — plain text, pattern nahi

Har list ka `search` (aur `title` / `name` filter) **jaisa likha waisa** dhoondhta hai — case-insensitive,
kahin bhi match; `(`, `.`, `*` literal. 🔧 2026-10-26 (live 2026-11-04): plans, categories, sub-categories,
terms, privacy, brand features, promo codes, banners, tickers aur verification lists pehle input ko regex
maan lete the — `search=(` par `500`. Outlets, locations aur voucher versions pehle se aise hi the.

---

## HTTP Status Codes

| Code | Meaning | Kab |
|---|---|---|
| `200` | OK | Successful GET/PUT/POST |
| `201` | Created | Voucher create, media upload, work hours upsert, admin grant |
| `400` | Bad Request | Business rule fail |
| `401` | Unauthorized | Token missing / expired, ya galat current password |
| `403` | Forbidden | Role not permitted, **subscription required**, **limit reached**, bad token (`TOKEN_INVALID`). Deactivated account = `401` (neeche) |
| `404` | Not Found | Resource nahi mila **ya empty list** |
| `409` | Conflict | Duplicate (jaise showcase section title) |
| `413` | Payload Too Large | Uploaded file platform ki max size se badi |
| `422` | Unprocessable Entity | Joi validation fail, invalid ObjectId, missing `brandId` for admin |
| `500` | Server Error | Unexpected failure |

---

## Common Errors

Ye kisi bhi protected endpoint pe aa sakte hain — har endpoint pe repeat nahi kiye:

| Status | Message | Kab |
|---|---|---|
| `401` | `Access Denied! Missing authorization token` | `Authorization` header nahi bheja · `details.code: TOKEN_MISSING` 🆕 |
| `403` | `Access Denied! Invalid authorization token format` | `Bearer <token>` format nahi · `TOKEN_INVALID` 🆕 |
| `401` | `Your session has expired. Please log in again.` | Token expired → **login screen** · `TOKEN_EXPIRED` 🆕 |
| `401` | `Your session has expired. Please log in again.` | 🆕 v1.13: admin ki max login age (VENDOR / SUB_VENDOR) ya idle logout → **login screen** · `SESSION_EXPIRED` |
| `401` | `Your account is deactivated. Please contact support.` | Admin ne account band kiya → **login screen** · `ACCOUNT_DEACTIVATED` |
| `401` | `Your session has ended. Please log in again.` | Admin ka "logout everyone" / reactivation → **login screen** · `SESSION_INVALIDATED` |
| `403` | `Invalid or malformed token. Please log in again.` | Token corrupt / galat secret · `TOKEN_INVALID` 🆕 |
| `403` | `Token not active yet. Please try again later.` | `nbf` future me (rare) · `TOKEN_INVALID` 🆕 |
| `403` | `Access Denied! Invalid token` | Decode hua par payload empty · `TOKEN_INVALID` 🆕 |
| `401` | `Unauthorized access! User not found.` | Token valid, account nahi · `ACCOUNT_NOT_FOUND` 🆕. ✏️ Pehle `404 Access Denied! User not found` likha tha — galat tha |
| `403` | `Forbidden: You do not have permission to perform this action.` | Role allowlist me nahi |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | `resolveActorBrand` — dusre brand pe operate karne ki koshish |
| `404` | `No brand is linked to your account` | Vendor ke paas brand hi nahi |
| `404` | `Brand not found!` | brandId ka brand nahi ya deleted |
| `500` | `Authentication failed due to an unexpected error.` | JWT verify me unknown error |
| `422` | *(field-wise Joi message)* | Request validation fail |
| `413` | `File is too large. The maximum upload size is 100 MB.` | Kisi bhi file upload par — niche dekho |
| `404` | `Invalid API` | Galat endpoint path |
| `409` | *(add only while under review)* | 🆕 Onboarding v2 P3 (D78): brand submit ho chuka aur admin decision baaki — kisi **pehle se di hui** cheez ko badalna / hatana (showcase album ya media, feature, outlet, outlet ka address / work hours, profile field) → `details.code: ONBOARDING_LOCKED`. Naya add hamesha chalta hai; brand ka billing address hamesha editable. Admin pe ye rule nahi lagta |
| `409` | *(legal field after approval)* | 🆕 P3: approve ke baad legal field (naam, category, status, entity) → `LEGAL_FIELD_LOCKED`; saved PAN / GST / bank / document badalna → `DETAIL_ALREADY_PROVIDED` |

### File upload limits

Do alag layer hain, aur vendor ko aam taur par sirf doosri wali dikhti hai:

| Layer | Limit | Response |
|---|---|---|
| **Platform ceiling** | `MAX_UPLOAD_SIZE_MB` (aaj **100 MB**) | `413` — **upload beech me hi kat jaata hai** |
| **Per-surface rule** | Showcase: **10 MB** image / **50 MB** video (`Setting` se, admin badal sakta hai) | `400` with the surface named |

⚠️ `413` ka behaviour baaki errors se alag hai: connection **turant band** ho
jaata hai, poori file bheji nahi jaati. Ek 500 MB ki file par client ko lagbhag
100 MB bhejne ke baad hi jawab mil jaata hai — poora upload nahi hota. Client ko
`XHR`/`fetch` ke abort ko error ki tarah handle karna chahiye aur `413` ka body
padhna chahiye.

Baaki surfaces (logo, voucher images, banner, ticker, category image, profile
photo) par abhi sirf platform ceiling lagta hai.

### Validation errors ka format

Joi errors ek string me join hote hain (`, ` se), field names human-readable ban jaate hain:

```json
{
  "success": false,
  "message": "Legal Business Name is required, Current Screen is required"
}
```

**Unknown fields silently drop ho jaate hain** (`stripUnknown: true`) — extra field bhejne pe error nahi, chup-chaap ignore.

---

## Subscription Gate

Vendor ke **paid features** active subscription ke peeche hain. Ye gate `assertActiveSubscription` helper se lagta hai.

### Kaunse features gated hain

| Feature | Bucket | Endpoint |
|---|---|---|
| Outlets | `subBrands` | `POST /subBrands/signUp-with-whatsapp` |
| Franchises | `franchises` | Same endpoint, `outletType: "FRANCHISE"` |
| Vouchers | `vouchers` | `POST /vouchers/create` |
| Showcase sections | `showcase` | `POST /showcase/section/add` |

Har bucket **independent pool** hai — ek doosre se nahi kharchta.

### Gate ke errors

| Status | Message | Kab |
|---|---|---|
| `403` | `Access denied. This feature requires an active subscription. Please subscribe to continue.` | Koi active plan nahi |
| `403` | `Your current plan does not include outlets. Please upgrade your subscription to add outlets.` | Bucket ka `limit: 0` — plan me feature hai hi nahi |
| `403` | `Outlet/Sub-brand limit reached — 3 of 3 used on your current plan. Please upgrade your subscription to add more.` | Pool khatam |
| `403` | `Your current BASIC plan does not include deal pack. Please upgrade your subscription to use this feature.` | Flag feature off hai |
| `404` | `The subscription plan for this brand no longer exists.` | Plan delete ho gaya (data issue) |

Messages me bucket ka label plural/singular ke hisaab se badalta hai — `outlet`/`outlets`, `franchise`/`franchises`, `voucher`/`vouchers`, `showcase section`/`showcase sections`.

### Subscription kab "active" hai

**`Brand.isSubscribed` pe bharosa mat karo** — wo sirf denormalized cache hai. Actual truth:

```
Subscribed.status === "ACTIVE"  AND  Subscribed.endDate > now
```

Backend self-healing hai: agar koi doc `ACTIVE` claim kare par `endDate` nikal chuki ho, wo read pe hi expire ho jaata hai. Ek background job (`expireSubscriptions`, default har 60 min) bhi chalta hai, par correctness uspe depend nahi karti.

**Expire hone pe kya hota hai:** naya kuch create nahi kar sakte (saare limits `0`), par **existing rows kabhi touch nahi hote** — outlets, vouchers, showcase sab bache rehte hain.

Poori design → [subscription_lifecycle_design.md](./subscription_lifecycle_design.md)

---

## Enums Reference

Saare enum values **UPPERCASE** hain (payment gateway values ke alawa).

### ROLES
`ADMIN` · `VENDOR` · `SUB_VENDOR` · `CUSTOMER`
> Vendor panel hamesha `VENDOR` bhejega auth calls me. Outlet accounts `SUB_VENDOR` role pe bante hain — ⚠️ un pe abhi koi route kaam nahi karta

### SCREENS — `currentScreen` onboarding tracker (onboarding v2, P1)
`BRAND_NAME` · `BUSINESS_CATEGORY` · `REGISTRATION_STATUS` · `GST_VERIFICATION` · `PAN_VERIFICATION` · `REGISTRATION_ENTITY_TYPE` · `OWNER_VERIFICATION` · `KYC_DOCUMENTS` · `BANK_VERIFICATION` · `PARTNERSHIP_DEED` · `SUBSCRIBE_PLAN` · `BRAND_BASIC_DETAILS` · `BRAND_PROFESSIONAL_DETAILS` · `OUTLET_DETAILS` · `ONBOARDING_REVIEW` · `UNDER_REVIEW` · `DASHBOARD`

> Hata diye: `BUSINESS_NAME`, `SYSTEM_VERIFICATION`, `OUTLET_PAGE`. Purane rows mein ye abhi bhi ho sakte hain jab tak v2 ki migration (P9) unhe nayi screen pe na le jaaye — naya code kabhi nahi likhta.

### KYC_PATH — `REGISTRATION_STATUS` ka jawab (`brand.onboarding.kycPath`)
`GST` ("I have GST") · `NO_GST` ("Registered, no GST") · `UNREGISTERED`

### BUSINESS_REGISTRATION_STATUS
`REGISTERED` · `UNREGISTERED`

### BUSINESS_ENTITY_TYPE
`PROPRIETORSHIP` · `PARTNERSHIP` · `LLP` · `PRIVATE_LIMITED` · `PUBLIC_LIMITED` · `ONE_PERSON_COMPANY` · `TRUST` · `NGO` · `SOCIETY` · `OTHERS`

### PAN_TYPES
`INDIVIDUAL` · `COMPANY` · `FIRM` · `LLP` · `HUF` · `TRUST` · `AOP` · `BOI` · `GOVERNMENT` · `ARTIFICIAL_JURIDICAL_PERSON` · `LOCAL_AUTHORITY` · `FOREIGN_COMPANY`

### BANK_ACCOUNT_TYPES
`SAVINGS` · `CURRENT` · `NRE` · `NRO` · `OD` · `CC` · `OTHER`

### GST_TAXPAYER_TYPE
`REGULAR` · `COMPOSITION` · `SEZ_UNIT` · `SEZ_DEVELOPER` · `INPUT_SERVICE_DISTRIBUTOR` · `TAX_DEDUCTOR` · `TAX_COLLECTOR` · `CASUAL_TAXABLE_PERSON` · `NON_RESIDENT_TAXABLE_PERSON` · `GOVERNMENT_DEPARTMENT` · `UN_BODY` · `EMBASSY` · `OIDAR` · `REGISTERED_PERSON` · `UNKNOWN`

### GST_REGISTRATION_STATUS
`SUCCESS` · `CANCELLED` · `SUSPENDED` · `PROVISIONAL` · `MIGRATED` · `INACTIVE` · `PENDING_CANCELLATION` · `FAILED` · `UNKNOWN`

### PRIMARY_VERIFICATION_STATUSES
`PENDING` · `IN_PROGRESS` · `SUCCESS` · `FAILED` · `REJECTED`

### PRIMARY_VERIFICATION_PROVIDERS
`CGPEY` *(default)* · `ZOOP` · `SIGNZY` · `SUREPASS` · `CASHFREE` · `OTHER`

### SYSTEM_VERIFICATION_STATUS
`PENDING` · `APPROVED` · `MANUAL_REVIEW` · `UNDER_REVIEW` · `REJECTED` · `REVOKED`
> `REVOKED` = approval milne ke baad admin ne wapas li. `REJECTED` se alag — wo matlab kabhi approve hua hi nahi tha.

### BRAND_VERIFICATION_ACTION — audit trail events
`SYSTEM_VERIFIED` · `RESUBMITTED` · `REVIEWED` · `UNREVIEWED` · `APPROVED` · `REJECTED` · `REVOKED` · `APPROVAL_ACKNOWLEDGED` · `REMEDIATION_UPDATED` · 🆕 `DETAIL_ADDED` · `BILLING_ADDRESS_CHANGED` · `DOCUMENT_REVIEWED` · `DEED_ACCEPTED` · `DEED_CONFIRMED` · `BADGE_GRANTED` · `BADGE_REMOVED` · `LEGAL_EDIT_BY_ADMIN`

### BRAND_VERIFICATION_ACTOR
`SYSTEM` · `ADMIN` · `VENDOR`

### OUTLET_TYPES
`OUTLET` *(default)* · `FRANCHISE`
> ⚠️ Ye alag-alag plan pools se kharchte hain — `subBrands` aur `franchises`

### SUBSCRIBED_STATUS
`PENDING` · `SCHEDULED` · `ACTIVE` · `EXPIRED` · `UPGRADED` · `DOWNGRADED` · `CANCELLED`
> **Source of truth.** `Brand.isSubscribed` sirf "live plan" ka cache hai — `ACTIVE + endDate > now`, **ya** `SCHEDULED` jiska `startDate` aa chuka (promote hone se pehle bhi live gina jaata hai)
>
> `SCHEDULED` = paid, chalu plan ke **peeche queued** (`mode: AFTER_CURRENT`). Chalu plan ke `endDate` par khud `ACTIVE` ho jaata hai — expiry job, har gated request ka read-heal, aur har sync teeno promote karte hain, to beech me ek pal bhi plan ke bina nahi. Ek brand par max **ek** queued.

### SUBSCRIPTION_MODE — plan kab shuru ho (checkout par vendor chunta hai)
| Value | Naya plan | Chalu plan | Bache din |
|---|---|---|---|
| `IMMEDIATE` *(default)* | abhi `ACTIVE` | abhi khatam (`UPGRADED` / `DOWNGRADED` / `EXPIRED`) | forfeit (record hote hain) |
| `AFTER_CURRENT` | `SCHEDULED`, start = chalu plan ka `endDate` | **bilkul nahi chhuta** | koi nahi jaata |
> `AFTER_CURRENT` ke liye chalu plan chahiye (warna `422`) aur queue khaali (warna `409`). Preview ka `availableModes` batata hai abhi kaunse chal sakte hain.

### SUBSCRIPTION_ACTION — checkout pe kya ho raha hai
| Value | Kab |
|---|---|
| `NEW` | Koi active plan nahi |
| `RENEW` | **Tier barabar** — wahi plan, ya same tier alag length (Basic 1 saal → Basic 3 saal) |
| `UPGRADE` | **Tier upar** — price kuch bhi ho |
| `DOWNGRADE` | **Tier neeche** — ⚠️ vendor self-downgrade nahi kar sakta (`allowVendorDowngrade: false`) |

> Plan ka `tier` admin deta hai (Basic 1, Pro 2, …) aur chalu plan ka tier **kharidte waqt freeze** hota hai. Price se tay nahi hota — 3 saal Basic (₹30,000) se 1 saal Premium (₹15,000) `UPGRADE` hai. Jin purane plans par tier nahi, wahan purana price rule chalta hai.

### Upgrade credit — chalu plan ki bachi value (sirf `IMMEDIATE`)
Chalu plan `IMMEDIATE` badalne par (upgrade / renew / downgrade) uski **bachi value credit** hoti hai — agar chalu plan ka term **≥ 12 mahine** ho (`Setting.vendor.subscription.upgradeCredit.minCurrentPlanMonths`).
- Credit = jo vendor ne asal me diya (GST se pehle, discount / promo ke baad) × bacha hissa (`remaining / term`).
- Bill me order: list price → plan discount → promo → **credit** → GST. Order summary me alag row `PRORATION_CREDIT` *"Unused value of current plan"*.
- Credit bill se zyada ho → payable ₹0, bacha credit naye plan ke **extra din** (naye plan ki per-day price par, 15 saal cap tak). Cap se aage → forfeit (`CAP_EXCEEDED`).
- Term chhota (`TERM_TOO_SHORT`) ya credit band (`CREDIT_DISABLED`) → purana rule: bache din forfeit (record hote hain, admin compensate kar sakta hai).
- `AFTER_CURRENT` me credit ki zarurat hi nahi — chalu plan poora chalta hai.

### ZERO_VALUE_REASON — kuch pay nahi karna
`TRIAL` · `CREDIT` (credit ne bill cover kiya) · `PROMO` (100% promo) · `ROUND_OFF` (₹1 se kam → ₹0) — in par **Razorpay nahi khulta**, order usi request me settle hota hai (`requiresPayment: false`). `FREE_PLAN` (non-trial ₹0 plan) checkout par **nahi** bikta — admin grant karta hai.

### Trial
Plan par `isTrial: true` (price hamesha ₹0). Sirf jiske paas koi plan nahi, aur **ek brand ek baar, hamesha** — purana trial expire ho gaya ho tab bhi dobara nahi.

### SUBSCRIPTION_SOURCE
`PAYMENT` (vendor ne khud pay kiya) · `ADMIN_PAYMENT` (admin ne vendor ke liye pay karaya) · `ADMIN_MANUAL` (admin grant, bina payment)

### SUBSCRIPTION_TYPES — plan ka **label**, duration se derive
`WEEKLY` (7 DAY) · `MONTHLY` (1 MONTH) · `QUARTERLY` (3 MONTH) · `HALF_YEARLY` (6 MONTH) · `YEARLY` (12 MONTH / 1 YEAR) · `CUSTOM` (baaki sab)
> Length `durationValue` + `durationUnit` batate hain. `DAY` exact 24-ghante ke din; `MONTH` / `YEAR` IST calendar par usi ghante tak (31 Jan + 1 month = 28/29 Feb).

### DURATION_UNITS
`DAY` · `MONTH` · `YEAR`

### SUBSCRIPTION_HISTORY_ACTION
`ORDER_CREATED` · `ACTIVATED` · `RENEWED` · `UPGRADED` · `DOWNGRADED` · `EXPIRED` · `CANCELLED` · `ADMIN_GRANTED` · `SCHEDULED` · `SCHEDULE_STARTED` · `SCHEDULE_MOVED` · `SCHEDULE_CANCELLED` · `PLAN_TERMS_APPLIED`
> `SCHEDULED` = queued plan (`AFTER_CURRENT`) paid · `SCHEDULE_STARTED` = queued plan live hua · `SCHEDULE_MOVED` = ek turant wala plan aage aaya, queued uske peeche khisak gaya · `SCHEDULE_CANCELLED` = admin cancel ke saath gaya · `PLAN_TERMS_APPLIED` = Trydood team ne plan ki nayi limits aapke chalu term par lagayi (`snapshot.changes` = from → to)

### ENTITLEMENT_BUCKETS — metered pools
`subBrands` · `franchises` · `vouchers` · `showcase`
> Har ek independent hai. Shape: `{ limit, isUnlimited }`. `limit: 0` + `isUnlimited: false` = feature plan me hai hi nahi
>
> 🔒 Limits **kharidte waqt freeze** hoti hain — plan baad me edit ho to bhi aapke chalu term par wahi limits jo aapne khareedi. Badalti sirf tab hain jab Trydood team unhe aapke term par lagaye (`SUBSCRIPTION_TERMS_UPDATED` notification), ya aap naya plan / renew lein.

### VOUCHER_STATUSES
`DRAFT` · `UNDER_REVIEW` · `APPROVED` · `PUBLISHED` · `REJECTED` · `EXPIRED` · `PAUSED` · `ARCHIVED`

### VOUCHER_DISCOUNT_TYPES
`PERCENTAGE` · `FLAT` · ~~`FIXED`~~
> ⚠️ `FIXED` enum me hai par calculation me handle nahi hota — aisa offer customer ko kabhi apply nahi hoga. `PERCENTAGE` ya `FLAT` hi use karein → [Appendix B](#appendix-b--known-issues)

### VOUCHER_USAGE_TYPE
`ONCE_PER_USER` · `MULTIPLE`
> ✅ **Database enforce karta hai** — `VoucherClaim` par `{voucherId, customerId, offerId}`
> ka unique partial index (`partialFilterExpression: {holdsUsageSlot: true}`,
> [VoucherClaim.js:165](../models/VoucherClaim.js#L165)). Slot **per offer** hai:
> customer ne 20%-off liya to free-dessert offer abhi bhi khula hai. Claim fail,
> cancel ya refund ho to `holdsUsageSlot: false` ho jaata hai — slot chhoot jaata
> hai, row rehti hai.

### DISCOUNT_APPLICABLE_ON
`SUBTOTAL` *(default)* · `FINAL_BILL`
> ⚠️ Calculation me use nahi hota — sirf display/terms ke liye

### VOUCHER_SORT_BY
`DISTANCE` · `NEWEST` · `EXPIRING_SOON` · `RELEVANCE`

### VOUCHER_BANNER_TYPE
`IMAGE` · `VIDEO` · `GIF`
> ⚠️ Ye sirf **response** me `media.kind` jaisa label hai — request me ab nahi jaata. Upload field ek hi hai: `media` (ya `bannerUploadId`), aur video ho to `poster` (ya `bannerPosterUploadId`). ~~`bannerImage` / `bannerVideo` / `bannerGif`~~ V-4 me hat chuke.

### SHOWCASE_SECTION_TYPE
`CUSTOM` *(default)* · `SYSTEM`

### SHOWCASE_MEDIA_TYPE
`PHOTO` · `VIDEO`

### SHOWCASE_MEDIA_CONFIG — per-section limits
| Limit | Value |
|---|---:|
| Max items | 15 |
| Max images | 15 |
| Max videos | 5 |
| Min items per section | 3 🆕 |
| Max image size | 10 MB |
| Max GIF size | 15 MB 🆕 |
| Max video size | 50 MB |

Allowed images: `image/jpeg` · `image/jpg` · `image/png` · `image/webp` · 🆕 `image/gif`
Allowed videos: `video/mp4` · `video/webm` · `video/quicktime`

> ⚠️ **GIF ka apna cap hai** — 15 MB, image ka 10 MB nahi. Animated GIF har frame
> poora store karta hai, to usi tasveer ka GIF photo se kai guna bhaari hota hai.
> Error message wahi limit bolta hai jo lagi hai:
> `<file> exceeds maximum GIF size of 15 MB.`
>
> 🆕 **Min items** ek floor hai, ceiling nahi: jis section me itni visible media
> na ho, wo customer ko dikhta hi nahi. Admin ise badal sakta hai — badhane par
> chhote sections turant chhup jaate hain (aur admin switch `requireShowcase` ON ho
> to jis brand ka aakhri album isse neeche gira, wo poora brand customer se chhup
> jaata hai — #31 Note 8).

### DEVICE_PLATFORMS
`ANDROID` · `IOS` · `WEB`

### NOTIFICATION_TYPES — vendor ko ye dikhte hain
`SUBSCRIPTION_ACTIVATED` · `SUBSCRIPTION_RENEWED` · `SUBSCRIPTION_UPGRADED` · `SUBSCRIPTION_DOWNGRADED` · `SUBSCRIPTION_GRANTED` · `SUBSCRIPTION_EXPIRING` · `SUBSCRIPTION_EXPIRED` · `SUBSCRIPTION_CANCELLED` · `SUBSCRIPTION_TERMS_UPDATED` · `LIMIT_REACHED` · `ANNOUNCEMENT` · 🆕 `BRAND_DOCUMENT_REVIEWED` · 🆕 `BRAND_DETAILS_UPDATED_BY_ADMIN` · 🆕 `OUTLET_ON_OLD_OWNER_NUMBER` · `BRAND_UNDER_REVIEW` · `BRAND_RESUBMITTED` · `BRAND_APPROVED` · `BRAND_REJECTED` · `BRAND_APPROVAL_REVOKED`

> **Brand review ke notices** (🔧 doc mein 2026-11-21 jode — code pehle se bhejta tha; vendor panel ne stage pe pakda). `helpers/notifications/brandVerificationNotices.js`:
>
> | Type | Kab | `deepLink` (path) | Panel kahan le jaaye |
> |---|---|---|---|
> | `BRAND_UNDER_REVIEW` | Pehla submit | `onboarding/status` | Under-review page |
> | `BRAND_RESUBMITTED` | Reject / revoke ke baad dobara submit | `onboarding/status` | Under-review page |
> | `BRAND_APPROVED` | Admin ne approve kiya | `dashboard` | `status` dekho: `isApprovalAcknowledged: false` → congrats, warna dashboard |
> | `BRAND_REJECTED` | Admin ne reject kiya (`reason` saath) | `onboarding/review` | Remediation (review) page |
> | `BRAND_APPROVAL_REVOKED` | Admin ne approval wapas li (`reason` saath) | `onboarding/review` | Dashboard ka revoke banner / remediation page |
>
> ⚠️ `deepLink` ka path **logical** hai, panel ka exact route nahi. Panel apne route map se resolve kare, aur hamesha `GET /brands/onboarding/status` se final screen tay kare. `BRAND_DETAILS_UPDATED_BY_ADMIN` aur `BRAND_DOCUMENT_REVIEWED` ka path bhi `onboarding/status` hai.

> 🆕 `BRAND_DOCUMENT_REVIEWED` (onboarding v2 P3) — admin ne ek KYC document (owner ID bhi) accept / reject kiya. `meta: { documentId, status, reason }`; reject pe reason dikhao aur naya upload karwao. In-app + push + email (WhatsApp nahi).
>
> 🆕 `BRAND_DETAILS_UPDATED_BY_ADMIN` (P6b) — admin ne submit ke baad brand ki legal details badli. `meta: { section, fields, brandName }`, deepLink onboarding status. In-app + push + email (WhatsApp nahi).
>
> 🆕 `OUTLET_ON_OLD_OWNER_NUMBER` (P8, WARNING) — owner ka WhatsApp number badla par kuch outlets abhi purane number pe hain. `meta: { oldNumber, newNumber, subBrandIds, outletUniqueIds }`, deepLink outlets — outlet manager ka number update karwao. Kuch block nahi hota. In-app + push + email (WhatsApp nahi).

> `SUBSCRIPTION_TERMS_UPDATED` — *"Your plan's limits have been updated"*: admin ne plan ki nayi limits aapke chalu / queued term par lagayi. `meta.changes[]` = `{ key, from, to }`, plan dates same. Email + push + in-app.
>
> Admin-only types (`WEBHOOK_FAILED`, `PAYMENT_DISPUTED`, `BRAND_SUBSCRIPTION_LAPSED`, `PROMO_LIMIT_EXCEEDED`, `SUBSCRIPTION_CREDIT_REUSED`, 🆕 `BRAND_DETAIL_ADDED`, `BRAND_OUTLETS_ON_OLD_OWNER_NUMBER`) vendor ko nahi dikhte

### NOTIFICATION_CHANNELS
`IN_APP` (hamesha) · `EMAIL` · `PUSH` · `WHATSAPP` *(reserved — Meta template approval pending)*

### NOTIFICATION_SEVERITY
`INFO` · `WARNING` · `CRITICAL`

### ADDRESS_TYPES
`HOME` · `WORK` · `OTHER` — default `HOME`

### GENDERS
`MALE` · `FEMALE` · `OTHER`

### LOGIN_TYPES
`EMAIL` · `MOBILE` · `USERNAME` · `WHATSAPP` · `GOOGLE` · `PASSWORD` · `FACEBOOK` · `OTHER`

### ZIP code validation (country-wise)
`zipcode` ka format `country` field pe depend karta hai:

| Country | Pattern | Example |
|---|---|---|
| `IN` / india *(default)* | 6 digits, first 1-9 | `452001` |
| `US` | 5 digits ya ZIP+4 | `90210` |
| `CA` | A1A 1A1 | `K1A 0B1` |
| `UK` | SW1A 1AA style | `SW1A 1AA` |
| `AU` | 4 digits | `2000` |
| `DE`/`FR`/`IT`/`ES` | 5 digits | `10115` |
| `BR` | 12345-678 | `01310-100` |
| `RU` | 6 digits | `101000` |

---

# Auth APIs

Vendor 3 tarah se login kar sakta hai — WhatsApp OTP (primary), Email OTP, ya Mobile OTP.

⚠️ **Password login vendor ke liye hai hi nahi.** `POST /auth/login` aur poora password
set/reset flow ab ADMIN-only hai — [#7–9](#79-password-flow---ab-vendor-ke-liye-nahi)
dekhein. Vendor ke paas password banane ka koi raasta nahi, isliye login karne ka bhi nahi.

## 1. POST /auth/loginOrSignUp-with-whatsapp

Vendor ka primary login. Naya number → `User` + `Brand` dono auto-create.

**Access:** Intended: Vendor + Customer · Enforced: **Public**

### Body
| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `whatsappNumber` | string | ✅ | – | 10 digits, first `6-9`. `+91` / `91` / spaces / dashes bhi chalenge - server strip kar deta hai |
| `role` | string | ⚠️ | `CUSTOMER` | **Vendor panel ko `"VENDOR"` bhejna zaruri hai** — default customer hai |

```json
{ "whatsappNumber": "9812345678", "role": "VENDOR" }
```

### Success — `200`
```json
{
  "success": true,
  "message": "OTP sent to your whatsapp number successfully.",
  "data": {
    "isFirst": true,
    "user": {
      "_id": "68f1a2b3c4d5e6f7a8b9c0d1",
      "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
      "role": "VENDOR",
      "loginType": "WHATSAPP",
      "whatsappNumber": "9812345678",
      "uniqueId": "TDU000078",
      "referralCode": "MOCHA7X2K",
      "isWhatsappVerified": false,
      "isMobileVerified": false,
      "isOnBoardingCompleted": false,
      "isActive": true,
      "createdAt": "2026-08-22T10:15:30.000Z"
    }
  }
}
```

**`isFirst`:**
- `true` → naya vendor. `Brand` doc bhi ban gaya (`uniqueId` + `merchantId` ke saath). Onboarding start karo
- `false` → existing vendor. Verify ke baad `GET /brands/onboarding/status` (#20a) se resume karo
- ⚠️ Routing `isFirst` pe mat karo: admin ka banaya vendor (v2 P6) bhi `isFirst: true` dikha sakta hai jabki kuch steps bhare hon

### Errors
| Status | Message | Kab |
|---|---|---|
| `401` | `Your account is deactivated. Please contact support.` | `isActive: false` · `details.code: ACCOUNT_DEACTIVATED` → login screen (✏️ pehle `403` likha tha — galat) |
| `422` | `WhatsApp number is required` | Missing |
| `422` | `Please enter a valid 10 digit WhatsApp number` | Pattern fail |
| `422` | `Invalid role` | Enum me nahi |

### ⚠️ Notes

**1. `role: "VENDOR"` bhejna mandatory hai.** Default `CUSTOMER` hai — na bhejo to vendor ke bajaye customer account ban jayega. Same number dono roles me alag accounts rakh sakta hai.

**2. OTP actually jaata hai** ✅ (2026-09-23 se). Pehle ye line commented thi aur testing me koi bhi 6-digit chal jaata tha. Ab throttle bhi live hai — ek number pe **60 second me ek code, 5 per hour**. `429` pe `details.retryAfterSeconds` aata hai; resend button use dikha kar disable rakhein.

**3. Naya vendor banne pe:** `User` + `Brand` dono create, `user.brandId` link, `Brand.uniqueId` + `Brand.merchantId` auto-generate.

**3a. 🆕 Pending account (P10.3, live 2026-11-04).** Naya vendor OTP tak `user.accountState: "PENDING"` (+ `lastOtpSentAt`)
rehta hai, verify par `"ACTIVE"` + `firstVerifiedAt`. `pendingAccountDays` (admin setting, default 7) tak OTP
na aaye to pending account aur uska khaali `Brand` hat jaate hain (soft delete); wahi number dobara bilkul naye
vendor jaisa chalta hai. Purane vendors par ye fields nahi hote. **Panel ko kuch nahi karna** — flow aur
`isFirst` wahi. [Design](./verified_signup_outlet_plan.md#31-account-user--naye-fields)

**4. Response me `password` hash aa sakta hai** — agar vendor ne pehle password set kiya ho. Is field ko store/log na karein.

---

## 2. POST /auth/verify-otp-whatsapp

OTP verify → JWT.

**Access:** Intended: Vendor + Customer · Enforced: **Public**

### Body
| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `whatsappNumber` | string | ✅ | – | 10 digits, first `6-9`; `+91`/`91` prefix strip ho jaata hai |
| `otp` | string | ✅ | – | Exactly 6 characters |
| `role` | string | ⚠️ | `CUSTOMER` | **`"VENDOR"` bhejein** |

```json
{ "whatsappNumber": "9812345678", "otp": "123456", "role": "VENDOR" }
```

### Success — `200`
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "_id": "68f1a2b3c4d5e6f7a8b9c0d1",
      "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
      "role": "VENDOR",
      "whatsappNumber": "9812345678",
      "uniqueId": "TDU000078",
      "currentScreen": "BRAND_NAME",
      "isWhatsappVerified": true,
      "isMobileVerified": false,
      "isActive": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Invalid Whatsapp number, user not found!` | Is number + role ka user nahi — pehle step 1 |
| `422` | `OTP is required` / `OTP must be 6 digits` | Format |

### ⚠️ Notes

**1. OTP ab sach me verify hota hai** ✅ (2026-09-23 se). Pehle ye line commented thi aur koi bhi 6-digit chal jaata tha. Ye errors handle karna ab zaroori hai:
- `401 "Invalid OTP! Please try again."` — galat code, dobara try kar sakte hain
- `401 "Please resend OTP! OTP is expired or missing"` — 5 min nikal gaye, **ya code pehle hi use ho chuka**
- `403 "Max attempts exceeded! Please try again later."` — 5 galat try (default — admin setting `security.otp.maxVerifyAttempts`, P12.0, live 2026-11-04), code **delete** ho gaya, naya mangwana padega

⚠️ **Code ek hi baar chalta hai** — success pe turant consume ho jaata hai. Verify call pe network retry lagaya to wo retry hamesha `401` dega.

**2. `currentScreen` ab body mein nahi liya jaata** (onboarding v2, P1 — design D2). Pehle koi bhi string chal jaati thi (galat value Mongoose pe `422`, sahi value — `DASHBOARD` bhi — waisi hi save). Ab bheja to chupchaap hat jaata hai; screen sirf server badalta hai. Jis vendor ki screen khaali ho (purana account), use yahan `BRAND_NAME` mil jaata hai.

**3. Login ke baad `GET /brands/onboarding/status` (#20a) se route karein** — vendor wahin resume hoga jahan chhoda tha.

---

## 3. POST /auth/login-with-email

Email pe OTP bhejta hai.

**Access:** Intended: Vendor + Admin · Enforced: **Public**

### Body
| Field | Type | Required | Default |
|---|---|---|---|
| `email` | string | ✅ | – |
| `role` | string | ⚠️ | **`ADMIN`** |

⚠️ Is flow ka `role` default **`ADMIN`** hai (WhatsApp flow me `CUSTOMER` hai). Vendor panel ko `"VENDOR"` explicitly bhejna hoga.

```json
{ "email": "hello@cafemocha.in", "role": "VENDOR" }
```

### Success — `200`
```json
{ "success": true, "message": "OTP sent to your email successfully.", "data": { } }
```

### Errors
| Status | Message |
|---|---|
| `404` | *(user not found)* |
| `403` 🆕 | `This email address has not been verified yet. Sign in another way and confirm it first...` — `details.code: IDENTITY_NOT_VERIFIED` |

> ### 🔴 Unverified email se ab login nahi hota
>
> `email` ek **login identity** hai: ye endpoint account dhoondh kar us pate par code
> bhej deta hai. Matlab kisi ka email likh dena hi uske account me ghusne ka raasta
> tha — aur likhna sirf khud us insaan tak seemit nahi hai: admin kisi ka bhi set kar
> sakta hai, vendor apne outlet managers ka.
>
> Ab ek key **tabhi** sign-in identity banti hai jab uska apna OTP use confirm kar de.
> Tab tak wo bas ek stored value hai.
>
> ⚠️ **Isse koi bahar nahi hota.** `verify-otp-email` ne hamesha har kaamyaab login par
> ye flag `true` kiya hai — to jisne bhi kabhi email se login kiya hai wo pehle se
> verified hai aur is check tak pahunchta hi nahi. Jo ruk te hain wo theek wahi rows
> hain jinse kabhi login hua hi nahi — yaani wahi jo kisi **aur** ne likhi ho sakti hain.
>
> Har account ke paas doosra darwaza hai: vendor/customer/outlet manager ke liye
> WhatsApp OTP, admin ke liye password. Ek baar `POST /auth/email/verify` chala lene par
> ye raasta khul jaata hai.
| `422` | `Email is required` / `Please enter a valid email address` |
| `422` | `Invalid role` |

### ⚠️ Note
Email OTP flow me verification **intact** hai (WhatsApp ke ulta) — actual OTP mail jaata hai aur verify hota hai.

---

## 4. POST /auth/verify-otp-email

**Access:** Intended: Vendor + Admin · Enforced: **Public**

### Body
| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `email` | string | ✅ | – | Valid email |
| `otp` | string | ✅ | – | Exactly 6 digits (`/^\d{6}$/`) |
| `role` | string | ⚠️ | `ADMIN` | `"VENDOR"` bhejein |

> `currentScreen` ab nahi liya jaata (onboarding v2, P1) — bheja to chupchaap hat jaata hai. Screen khaali vendor ko `BRAND_NAME` milta hai.

### Success — `200`
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": { "user": { }, "token": "eyJ..." }
}
```

### Errors
| Status | Message |
|---|---|
| `401` | `Please resend OTP! OTP is expired or missing` |
| `403` | `Max attempts exceeded! Please try again later.` |
| `401` | `Invalid OTP! Please try again.` |
| `422` | `OTP must be a 6 digit number` |

---

## 5. POST /auth/login-with-mobile

**Access:** Intended: Vendor + Admin · Enforced: **Public**

### Body
| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `mobile` | string | ✅ | – | 10 digits, first `6-9`. `+91` / `91` prefix bhi chalega — server strip kar deta hai |
| `role` | string | ⚠️ | `ADMIN` | `"VENDOR"` bhejein |

### Success — `200`
```json
{ "success": true, "message": "OTP sent to your mobile successfully.", "data": { "sessionId": "abc-123" } }
```

> Mobile flow `sessionId` return karta hai — verify step me wahi bhejna hoga.

### Errors
| Status | Message |
|---|---|
| `422` | `Please enter a valid 10 digit mobile number` / `Mobile number is required` |
| `403` 🆕 | `This mobile number has not been verified yet...` — `details.code: IDENTITY_NOT_VERIFIED` |

> ⚠️ **Pehle ye `/^\d{10}$/` tha**, yaani `0123456789` bhi pass ho jaata — jabki
> `User.mobile` ka Mongoose validator `[6-9]` maangta hai. To endpoint aisa number
> le leta jise database phir refuse kar deta. Ab dono ek hi niyam par hain.

> 🔴 **Unverified mobile se ab login nahi hota** — bilkul wahi wajah jo
> [#3](#3-post-authlogin-with-email) me likhi hai. `verify-otp-mobile` hamesha se is
> flag ko `true` karta aaya hai, to jisne kabhi mobile se login kiya hai uspe koi
> farq nahi padta.

---

## 6. POST /auth/verify-otp-mobile

**Access:** Intended: Vendor + Admin · Enforced: **Public**

### Body
| Field | Type | Required | Notes |
|---|---|---|---|
| `mobile` | string | ✅ | 10 digits |
| `sessionId` | string | ✅ | **Step 5 ke response se** — sirf is flow me hai |
| `otp` | string | ✅ | 6 digits |
| `role` | string | ⚠️ | Default `ADMIN` — `"VENDOR"` bhejein |

> `currentScreen` ab nahi liya jaata (onboarding v2, P1) — bheja to chupchaap hat jaata hai. Screen khaali vendor ko `BRAND_NAME` milta hai.

### Success — `200`
```json
{ "success": true, "message": "OTP verified successfully", "data": { "user": { }, "token": "eyJ..." } }
```

### Errors
| Status | Message |
|---|---|
| `422` | `Session ID is required` |
| `401` | `Invalid OTP! Please try again.` |

---

## 7–9. Password flow — ⛔ ab vendor ke liye nahi

`POST /auth/set-password` · `POST /auth/forgot-password` · `POST /auth/reset-password`

**Access:** Intended: ADMIN · Enforced: **ADMIN**

Ye teeno pehle is doc me the. **Ab vendor inhe use nahi kar sakta** — password
sign-in ek product decision se admin-only kar diya gaya.

### Kyun

Vendor WhatsApp OTP se sign in karta hai. Uspe password rakhne ka matlab sirf ek
aur credential hai jo chori ho sakta hai — koi naya access nahi milta. To wo
option hata diya gaya.

### Enforcement kahan hai

| Endpoint | Kaise block hota hai |
|---|---|
| `/auth/set-password` | Route pe `isAdmin` — vendor token pe `403` |
| `/auth/forgot-password` | Route public hai, par validator me `role` sirf `ADMIN` allow karta hai |
| `/auth/reset-password` | Wahi — validator me `role` sirf `ADMIN` |

Baad wale do public hi rehte hain (unhe sign-in ki zarurat nahi), par
`role: "VENDOR"` bhejne pe **`422`** aata hai:

```json
{
  "success": false,
  "message": "Password sign-in is only available for admin accounts. Customers and vendors sign in with a WhatsApp OTP."
}
```

Message deliberately actionable hai — bare "Invalid role" ke bajaye ye batata hai
ki karna kya hai.

### Vendor ke liye sign-in ke raaste

| Flow | Endpoints |
|---|---|
| WhatsApp OTP *(primary)* | [#1](#1-post-authloginorsignup-with-whatsapp) → [#2](#2-post-authverify-otp-whatsapp) |
| Email OTP | [#3](#3-post-authlogin-with-email) → [#4](#4-post-authverify-otp-email) |
| Mobile OTP | [#5](#5-post-authlogin-with-mobile) → [#6](#6-post-authverify-otp-mobile) |

⚠️ **Vendor `POST /auth/login` (password login) bhi use nahi kar sakta** — uska
validator bhi `role` ko `ADMIN` tak seemit karta hai. Isliye wo endpoint is doc
me kabhi tha hi nahi.

> Numbering 7–9 isliye chhodi nahi gayi ki doc ke baaki links tootein na. Agla
> endpoint #10 hai.

---

## 10. POST /auth/logout

**Access:** Intended: All roles · Enforced: **Any authenticated — suspended account bhi** (`verifyJwtTokenEvenIfDeactivated`)

### Body
Koi nahi.

### Success — `200`
```json
{ "success": true, "message": "Logout successful", "data": {} }
```

### ⚠️ Notes

**1. Server-side kuch nahi hota** — token blacklist nahi hota, `isLoggedIn` update nahi hota, device token deactivate nahi hota.

**2. Sahi logout sequence:**
```
PUT  /deviceTokens/unregister  { token }     ← warna push aati rahegi
POST /auth/logout
→ local token + cache clear
```

---

# User Profile APIs

## 11. GET /users/get

**Access:** Intended: All roles · Enforced: **Any authenticated**

### Query Params
| Param | Type | Required | Notes |
|---|---|---|---|
| `userId` | ObjectId | ❌ | ⚠️ **Kabhi na bhejein** — kisi bhi user ka profile mil jaata hai ([Appendix B](#appendix-b--known-issues)) |

### Success — `200`
```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c0d1",
    "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
    "customerId": null,
    "name": "rahul sharma",
    "dob": "1985-04-12T00:00:00.000Z",
    "role": "VENDOR",
    "loginType": "WHATSAPP",
    "email": "hello@cafemocha.in",
    "whatsappNumber": "9812345678",
    "uniqueId": "TDU000078",
    "referralCode": "MOCHA7X2K",
    "passwordSetAt": "2026-08-22T12:00:00.000Z",
    "currentScreen": "DASHBOARD",
    "image": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/profile/abc.jpg",
    "isEmailVerified": false,
    "isWhatsappVerified": true,
    "isMobileVerified": false,
    "isOnBoardingCompleted": true,
    "isActive": true,
    "createdAt": "2026-03-15T00:00:00.000Z",
    "updatedAt": "2026-08-22T12:00:00.000Z"
  }
}
```

**Excluded:** `password`, `otp`, `isDeleted`

> `customerId` vendor ke liye `null` rahega — wo sirf CUSTOMER role pe populate hota hai.

### Errors
| Status | Message |
|---|---|
| `401` | `Unauthorized access! User not found.` |
| `422` | `Invalid ID` |

### ⚠️ Notes

**1. Onboarding routing ke liye `GET /brands/onboarding/status` (#20a) padhein** — wahi `currentScreen` ke saath sidebar groups aur progress deta hai. Yahan ka `currentScreen` same value hai.

**2. `passwordSetAt` vendor panel me ignore karein.** Field response me aati hai, par vendor password set kar hi nahi sakta ([#7–9](#79-password-flow---ab-vendor-ke-liye-nahi)) — to vo hamesha `null` rahegi. "Set password" screen mat banayein.

---

## 12. PUT /users/update

**Access:** Intended: All roles · Enforced: **Any authenticated**

### Query Params
| Param | Type | Required | Notes |
|---|---|---|---|
| `userId` | ObjectId | ❌ | ⚠️ **Kabhi na bhejein** — IDOR |

### Body — sab optional
| Field | Type | Validation | Notes |
|---|---|---|---|
| `fullName` | string | 2–100 chars | Lowercase me store |
| `email` | string | Valid email | Change pe `isEmailVerified` reset |
| `dob` | string | ISO date | |
| `appliedReferralCode` | string | Max 20 chars | |
| `image` | file | – | **Multipart**, field name `image` |
| `uploadId` | ObjectId 🆕 | – | Presigned raasta — purpose `USER_AVATAR`. `image` ke saath **nahi** |

🔴 **Kram: upload → save → tab purani photo delete.** Pehle delete save se pehle hota tha, yaani ek fail hua save aapki purani photo le jaata aur row usi dead URL par reh jaati.

### Success — `200`
```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": { "_id": "...", "name": "rahul sharma", "email": "new@cafemocha.in", "isEmailVerified": false }
}
```

### Errors
| Status | Message |
|---|---|
| `404` | `User not found` |
| `400` | `Email already exists with another user` |
| `422` | `Name should have at least 2 characters` / `Name should not exceed 100 characters` |
| `422` | `Please enter a valid email address` |
| `422` | `Date of birth must be a valid date in ISO format (YYYY-MM-DD)` |

### ⚠️ Notes

**1. Ye personal profile hai, brand nahi.** Brand ka naam/logo/description ke liye `PUT /brands/update` use karein (endpoint #32).

**2. Email uniqueness role-scoped hai** — same email VENDOR aur CUSTOMER dono me ho sakta hai.

**3. `mobile` / `whatsappNumber` yahan se update nahi hote.** `mobile` validator me
commented hai aur uska apna flow hai (`POST /auth/mobile/verify`); `whatsappNumber`
login identity hai, to wo **sirf** `POST /auth/whatsapp/verify` se badalta hai —
koi bhi doosra raasta `422` deta hai.

**3b. 🆕 `email` ab role collection me bhi jaata hai.** Pehle ye sirf CUSTOMER ke
`Customer.email` par copy hota tha; VENDOR aur SUB_VENDOR ke liye kuch nahi hota tha,
to `Brand.email` — jo invoice aur approval mail padhti hai — purane pate par atka
rehta tha. Ab teeno roles ka mirror saath chalta hai, aur `isEmailVerified` `false`
ho jaata hai (saath me email notifications bhi band, jab tak verify na ho).

**4. Ye endpoint `validateSchema` middleware use nahi karta** — controller ke andar manual validation hai, isliye error format thoda different (field names raw camelCase me).

---

## 13. DELETE /users/delete — ✅ v1.12 (live 2026-11-04): sirf customer (vendor token → 403)

**Access:** 🔒 **Sirf CUSTOMER** (`isCustomer`) — vendor / outlet token par `403`.

✅ **v1.12 (prod par live 2026-11-04):** pehle ye har role ke liye no-op stub tha (`200 "User deleted
successfully"`, kuch delete nahi). Ab ye customer ka asli self-delete hai —
[customer doc #6](./customer_mobile_api_doc.md).

**Vendor panel:** "Delete account" button **mat dikhayein** — vendor account deletion abhi scope me nahi
([account_deletion_plan.md](./account_deletion_plan.md) Appendix A); vendor support se band karwata hai.

---

# Push Notification APIs

Role-agnostic module — vendor ka browser/phone bilkul customer jaise register hota hai.
Global middleware: `router.use(verifyJwtToken)`

## 14. POST /deviceTokens/register

**Access:** Intended: All roles · Enforced: **Any authenticated**

### Body
| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `token` | string | ✅ | 20–4096 chars | FCM registration token |
| `platform` | string | ✅ | `ANDROID` \| `IOS` \| `WEB` | Vendor panel web hai to `WEB` |
| `deviceId` | string | ❌ | Max 128 | **Bhejein** — reinstall pe purana token retire ho jaata hai |
| `deviceName` | string | ❌ | Max 128 | |
| `appVersion` | string | ❌ | Max 32 | |

```json
{
  "token": "fMEp8kQ2S0aBcDeFgHiJkL:APA91bH...",
  "platform": "WEB",
  "deviceId": "chrome-macbook-01",
  "deviceName": "Chrome on MacBook"
}
```

### Success — `200`
```json
{
  "success": true,
  "message": "Device registered for push notifications",
  "data": {
    "device": {
      "_id": "68f1a2b3c4d5e6f7a8b9d001",
      "userId": "68f1a2b3c4d5e6f7a8b9c0d1",
      "role": "VENDOR",
      "platform": "WEB",
      "deviceId": "chrome-macbook-01",
      "isActive": true,
      "lastSeenAt": "2026-08-22T12:00:00.000Z",
      "failureCount": 0
    },
    "activeDevices": 2
  }
}
```

### Errors
| Status | Message |
|---|---|
| `401` | `Authentication is required to register a device.` |
| `422` | `token is required` / `token does not look like a valid push token` |
| `422` | `platform must be one of: ANDROID, IOS, WEB` |

### ⚠️ Notes

**1. Idempotent** — `token` pe upsert hota hai, baar-baar safe hai.

**2. Token ownership transfer handle hota hai** — `token` unique hai, `(userId, token)` nahi. Ek install haath badal sakta hai (shared machine, logout-login as someone else), isliye already-registered token **reassign** ho jaata hai.

**3. `role` denormalize hota hai aur har register pe refresh** — isse role-targeted broadcasts fast rehte hain.

**4. Login ke baad register karein** — taaki `role` sahi user pe map ho.

---

## 15. PUT /deviceTokens/unregister

**Access:** Intended: All roles · Enforced: **Any authenticated — suspended account bhi** (`verifyJwtTokenEvenIfDeactivated`)

### Body
| Field | Type | Required | Default |
|---|---|---|---|
| `token` | string | ⚠️ | – |
| `allDevices` | boolean | ⚠️ | `false` |

⚠️ Dono me se **ek dena mandatory** hai (`.or("token", "allDevices")`).

### Success — `200`
```json
{ "success": true, "message": "Device unregistered from push notifications", "data": { "deactivated": 1, "activeDevices": 1 } }
```

### Errors
| Status | Message |
|---|---|
| `422` | `Provide a token, or set allDevices to true.` |

### ⚠️ Notes

**1. Self-scoped** — filter hamesha `userId` carry karta hai, *"so one user cannot silence another's device."*

**2. `deactivated: 0` error nahi hai** — us filter pe koi active row nahi mili.

**3. Logout pe zaruri hai** — `/auth/logout` push ko touch nahi karta.

---

## 16. GET /deviceTokens/get-mine

**Access:** Intended: All roles · Enforced: **Any authenticated**

### Query Params
| Param | Type | Default | Notes |
|---|---|---|---|
| `includeInactive` | boolean\|string | `false` | Retired devices bhi dikhane ke liye |

### Success — `200`
```json
{
  "success": true,
  "message": "Registered devices fetched successfully",
  "data": {
    "devices": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9d001",
        "role": "VENDOR",
        "platform": "WEB",
        "deviceName": "Chrome on MacBook",
        "isActive": true,
        "lastSeenAt": "2026-08-22T12:00:00.000Z",
        "lastPushAt": "2026-08-22T11:30:00.000Z",
        "failureCount": 0,
        "tokenTail": "…APA91bH"
      }
    ],
    "activeDevices": 1,
    "total": 1
  }
}
```

### ⚠️ Notes
**Poora `token` kabhi nahi aata** — sirf `tokenTail` (aakhri 8 chars). *"Enough to identify the row, not enough to send with."*
**Empty pe 404 nahi** — `devices: []`.

---

## 17. POST /deviceTokens/test

**Access:** Intended: All roles · Enforced: **Any authenticated**

### Body — dono optional
| Field | Type | Default | Validation |
|---|---|---|---|
| `title` | string | `"Test notification"` | Max 160 |
| `body` | string | `"If you can read this, push notifications are working."` | Max 1000 |

### Success — `200`
```json
{
  "success": true,
  "message": "Test push dispatched",
  "data": { "devices": 2, "sent": 2, "failed": 0, "delivered": true }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `422` | `Push credentials were rejected by the provider: <reason>` | Server ka FCM setup galat — aapki galti nahi |
| `404` | `You have no active devices registered. Call POST /deviceTokens/register from the app first.` | Pehle register karo |

### ⚠️ Note
**`delivered` flag dekho, `success` nahi.** *"The interesting answer is not 'did the request succeed' but 'did a phone light up', and those are different things."*

🆕 `delivered: false` par `reason` bhi aata hai — `"UNREGISTERED ×1: …"` = browser ka token dead, panel dobara register kare; `"SENDER_ID_MISMATCH ×1: …"` = panel ki web Firebase config (aur `firebase-messaging-sw.js`) server ki key se alag Firebase project ki hai — panel build config theek karni hai, aapki galti nahi.

---

# Notification Feed APIs

Vendor apne brand ki in-app notifications padhta hai. Vendor `resolveActorBrand` se apne brand tak scoped rehta hai.

## 18. GET /notifications/get-all

**Access:** Intended: All roles · Enforced: **Any authenticated — suspended account bhi** (`verifyJwtTokenEvenIfDeactivated`) · scope service me (`notificationScope`): vendor apne brand ki, admin kisi bhi brand ki, customer apni; outlet manager `403`

### Query Params
| Param | Type | Required | Default | Validation |
|---|---|---|---|---|
| `page` | number | ❌ | `1` | Integer ≥ 1 |
| `limit` | number | ❌ | `20` | Integer 1–100 |
| `brandId` | ObjectId | ❌ | token ka brand | **Vendor ke liye optional** — apna brand auto. Dusre brand ka bhejne pe `403` |
| `type` | string | ❌ | – | NOTIFICATION_TYPES enum |
| `isRead` | boolean\|string | ❌ | – | `true` / `false` |

> 🆕 **Chaar naye vendor types (P10.4 / P10.7, live 2026-11-04)** — in-app + push (aakhri wala sirf in-app), email / WhatsApp nahi (D12);
> `meta.deepLink` = `outlets`, `meta.subBrandId`, `meta.uniqueId`:
>
> | `type` | Kab | Severity |
> |---|---|---|
> | `OUTLET_HOLD_EXPIRING` | Unverified outlet ka hold `outletHoldReminderHours` (default 24) me khatam hoga — `meta.expiresAt`. Har hold par ek baar | `WARNING` |
> | `OUTLET_HOLD_EXPIRED` | Hold khatam, outlet cancel, slot wapas, number free | `INFO` |
> | `OUTLET_REVERIFY_REQUIRED` | Admin ne outlet manager ka number badla — outlet customer se chhupa jab tak manager OTP na de | `WARNING` |
> | 🆕 `OUTLET_VERIFICATION_REQUIRED` (P10.7) | Release se pehle bana outlet, manager kabhi verify nahi hua — release ki flag script ne chhupaya + edits band (`409 OUTLET_NOT_VERIFIED`). Hold / auto-cancel nahi. Har outlet par ek baar, **sirf in-app** (push nahi) | `WARNING` |

```http
GET /notifications/get-all?isRead=false&limit=20
```

### Success — `200`
```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": {
    "total": 8,
    "totalPages": 1,
    "unreadCount": 3,
    "page": 1,
    "limit": 20,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9e001",
        "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
        "type": "SUBSCRIPTION_ACTIVATED",
        "title": "Your PREMIUM plan is active",
        "body": "Valid until 22 Sep 2026. You can now add up to 10 outlets.",
        "severity": "INFO",
        "channels": ["IN_APP", "EMAIL", "PUSH"],
        "isRead": false,
        "meta": { "subscribedId": "68f1a2b3c4d5e6f7a8b9f001", "deepLink": "/dashboard/subscription" },
        "createdAt": "2026-08-22T10:00:00.000Z"
      },
      {
        "_id": "68f1a2b3c4d5e6f7a8b9e002",
        "type": "LIMIT_REACHED",
        "title": "Outlet limit reached",
        "body": "You have used 3 of 3 outlets on your BASIC plan.",
        "severity": "WARNING",
        "channels": ["IN_APP"],
        "isRead": true,
        "createdAt": "2026-08-20T14:00:00.000Z"
      }
    ]
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | Dusre brand ka `brandId` |
| `404` | `No brand is linked to your account` | Vendor ka brand nahi |
| `422` | `Invalid brandId` | Format |
| `422` | `type must be one of: SUBSCRIPTION_ACTIVATED, …` | Invalid enum |

### ⚠️ Notes

**1. Vendor ko `brandId` bhejne ki zarurat nahi** — token se resolve hota hai. Bhejna chaho to sirf apna hi chalega.

**2. `unreadCount` badge ke liye ready hai** — alag call ki zarurat nahi.

**3. Admin-only types kabhi nahi dikhte** — `WEBHOOK_FAILED`, `PAYMENT_DISPUTED`, `BRAND_SUBSCRIPTION_LAPSED`, `PROMO_LIMIT_EXCEEDED`, `SUBSCRIPTION_CREDIT_REUSED` sirf admin audience ke hain.

**4. `channels` batata hai kahan-kahan bheja gaya** — `IN_APP` hamesha, baaki tab jab destination ho aur channel enabled ho.

**5. `meta.deepLink` tap pe kahan jaana hai** — client route. ⚠️ `meta` ke **andar** aata hai, top-level `deepLink` nahi (`helpers/notifications/notify.js` ise `meta` mein likhta hai; P10 audit fix — pehle ka sample galat tha). Kuch types pe ye ek token hota hai (jaise `outlets`), path nahi — panel token → route map rakhe.

**6. Paging:** `total`, `totalPages`, `page`, `limit` aate hain (`pagination`); khaali inbox `200` + `data: []`. Mark read: #19 `{ notificationIds }` ya `{ markAll: true }`. Vendor ke liye "clear all" / delete ka koi route nahi hai.

---

## 19. PUT /notifications/mark-read

**Access:** Intended: All roles · Enforced: **Any authenticated** (`verifyJwtToken`) · sirf apne scope ki notifications (#18 jaisa)

### Body
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `notificationIds` | ObjectId[] | ⚠️ | – | Min 1 item |
| `markAll` | boolean | ⚠️ | `false` | Sab read kar do |
| `brandId` | ObjectId | ❌ | token ka brand | Vendor ke liye optional |

⚠️ **`notificationIds` ya `markAll` — ek dena mandatory hai.**

```json
{ "notificationIds": ["68f1a2b3c4d5e6f7a8b9e001"] }
```
```json
{ "markAll": true }
```

### Success — `200`
```json
{
  "success": true,
  "message": "Notifications marked as read",
  "data": { "modified": 3, "unreadCount": 0 }
}
```

### Errors
| Status | Message |
|---|---|
| `422` | `Provide notificationIds or set markAll to true.` |
| `422` | `Provide at least one notificationId` |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` |

### ⚠️ Note
Response ka `unreadCount` fresh hai — badge directly update kar sakte hain.

---

## 19a. GET /notifications/preferences 🆕

**Access:** ⚪ **Har role** — Vendor, Sub-vendor, Customer, Admin

Teen channel — email, push, WhatsApp — **ek doosre se independent**. Id token se
aati hai, to ye endpoint kisi aur ko address nahi kar sakta.

### Success — `200`
```jsonc
{
  "success": true,
  "message": "Notification preferences fetched successfully",
  "data": {
    "userId": "68f1a2b3c4d5e6f7a8b9c001",
    "role": "VENDOR",
    "audience": "VENDOR",
    "channels": {
      "email":    { "preference": true,  "effective": true,  "blockedBy": null },
      "push":     { "preference": true,  "effective": true,  "blockedBy": null },
      "whatsapp": { "preference": true,  "effective": false, "blockedBy": "PLATFORM" }
    },
    "updatedBy": null,
    "updatedAt": null
  }
}
```

### ⚠️ `preference` alag hai, `effective` alag

`preference` = vendor ne kya chuna. `effective` = abhi actually kuch jaata hai ya
nahi. Ek platform-wide switch vendor ke choice ko rok sakta hai, aur us haalat me
sirf `preference: true` dikhana panel ka jhooth bolna hota.

Aaj **WhatsApp platform-wide off hai** (Meta template pending), to
`blockedBy: "PLATFORM"` normal case hai. `blockedBy`: `null` · `"PREFERENCE"` ·
`"PLATFORM"`.

### ⚠️ Sub-vendor ka toggle apna alag hai

Brand ke notifications brand ke **owner** ko jaate hain. Outlet manager alag
`User` hai apni toggles ke saath. Owner ki band karne se counter par baitha banda
chup nahi hota.

### ⚠️ In-app feed in teen me nahi hai

Notification **row hamesha** likhi jaati hai — ye toggles sirf bahar jaane wali
delivery tay karte hain.

## 19b. PUT /notifications/preferences 🆕

**Access:** ⚪ Har role — apni hi.

### Body
| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | boolean | ⚠️ | |
| `push` | boolean | ⚠️ | |
| `whatsapp` | boolean | ⚠️ | |

⚠️ **Kam se kam ek** chahiye. **Partial hai** — sirf jo bheja wahi badalta hai.
Poora object bhejne se paanch minute purani screen doosre device ka change palat
degi.

```json
{ "whatsapp": false }
```

### Errors
| Status | Message |
|---|---|
| `422` | `Send at least one of email, push or whatsapp to change.` |

### ⚠️ Chhe notifications band nahi hoti

Wo jinme chup rehna padhne wale ka hi nuksaan hai — jaise `BRAND_DEACTIVATED`,
jismein vendor sign in hi nahi kar sakta, to in-app row uski pahunch se bahar hai
aur email/WhatsApp hi ek raasta bachta hai. Poori list aur rule:
[`docs/notification_preferences.md`](./notification_preferences.md).

⚠️ **OTP ismein nahi aata** — koi apne hi login code ko silence na kar paye.

---


> ### 🔴 Ek channel tabhi chalta hai jab uski key **verified** ho
>
> Preference on hona kaafi nahi — us channel ki key ka OTP se confirm hona bhi
> zaroori hai. `email` sirf `isEmailVerified` walon ko, WhatsApp sirf
> `isWhatsappVerified` walon ko. `push` aur in-app row is niyam se bahar hain.
>
> **Read me:** unverified channel `effective: false` aur
> `blockedBy: "UNVERIFIED"` ke saath aata hai — to toggle ko tap hone se *pehle*
> greyed out dikhaya ja sakta hai.
>
> **Write me:** `{ "email": true }` bhejne par `422` —
> `details.code: IDENTITY_NOT_VERIFIED`. Band karne par koi rok nahi; mana karna
> hamesha allowed hai, sirf "aayega" ka waada kisi cheez par tika hona chahiye.
>
> ⚠️ Ye `ALWAYS_DELIVER` notices ko bhi rokta hai. Wo list kisi ki *marzi* ko
> override karti hai; unverified marzi nahi hai — wo "pata kiska hai, ye hume
> maloom nahi" hai. Aise pate par refund notice bhejna kisi ajnabi ke inbox me
> asli customer ka detail daalna hai.
>
> ⚠️ **Key badalne par us channel ki preference bhi `false` ho jaati hai.** Sirf
> guard hota to verify karte hi email apne aap chalu ho jaata — bina unke maange.
> Verify karna *"ye pata mera hai"* hai, *"yahan bhejo"* nahi.

## 19c. POST /auth/email/send-verification 🆕

**Access:** 🔒 `verifyJwtToken` — **har role**: vendor, outlet manager, customer, admin. Koi role gate nahi.

`User.isEmailVerified` sabke paas tha aur **koi bhi use set nahi kar sakta tha**. Email edit karne par flag `false` ho jaata tha aur wapas `true` karne ka koi endpoint hi nahi tha — badge sirf ek taraf ja sakta tha. Yahi wo gap hai jo *"Known Gaps #5"* me likha tha.

### Verify aur change ek hi jodi hai

`email` **dono call par optional** hai:

| Bheja | Kya hota hai |
|---|---|
| kuch nahi | Account par jo address hai wahi confirm hota hai |
| naya address | Us par switch — par **verify hone tak account nahi badalta** |

Do alag endpoints ka matlab hota client pehle decide kare ki address badla hai ya nahi — aur wo faisla server ke paas pehle se hai.

```jsonc
{ }                                  // account ka apna email confirm karo
{ "email": "billing@cafemocha.in" }  // is address par switch karo
```

### Response — `200`

```jsonc
{
  "success": true,
  "message": "We have sent a code to bi***g@cafemocha.in.",
  "data": {
    "sentTo": "bi***g@cafemocha.in",   // ⚠️ hamesha masked
    "isChange": true                    // true = address badla ja raha hai
  }
}
```

> ### ⚠️ Code hamesha **naye** address par jaata hai
>
> Purane mailbox par code bhejna sirf ye sabit karta hai ki insaan purana mailbox padh leta hai. Sawal wo hai hi nahi — sawal ye hai ki naya address unka hai ya nahi.

⚠️ **`sentTo` masked hai** kyunki ye endpoint chori hui session se bhi chal sakta hai, aur poora address us haath me nayi jaankari hoti.

⚠️ **Uniqueness `{ email, role }` par hai.** Ek hi address ka VENDOR aur CUSTOMER account rakhna supported hai — vendor apne hi platform par khareedari kar sakta hai. Collision sirf **usi role** ke andar hai.

### Throttle

`sendOtp` ke andar — **60 second gap, 5 per hour**, **target address** par keyed, IP par nahi. Route par rakhna matlab agla OTP endpoint bina protection ke chala jaata, aur bhoolne par **koi error hi nahi aata** — bas ek khula endpoint jo har request par paisa kharch karta hai.

| Code | Kab |
|---|---|
| `200` | Code chala gaya |
| `409` | Ye address pehle se verified hai (aur badla bhi nahi ja raha) |
| `409` | Wo address kisi aur ke **usi role** ke account par hai |
| `422` | Account par email hai hi nahi, aur aapne bheja bhi nahi |
| `429` | Throttle — 60s ke andar dobara, ya ghante me chhathi baar |

---

## 19d. POST /auth/email/verify 🆕

> 🔧 **Fix (2026-11-17):** account par **pehle se pada** email / mobile / WhatsApp confirm karne par (body me value na bhejo, ya wahi bhejo)
> pehle code check ho jaata tha, response `…Verified: true` kehta tha, par DB me flag `false` hi rehta tha — sirf *naya* value verify
> hone par flag `true` hota tha. Profile me email badal kar verify karna isi wajah se kabhi kaam nahi karta tha. Ab teeno keys par
> flag DB me bhi `true` hota hai (`helpers/users/applyIdentityChange.js`; test `contactConfirmOnFile`). Request / response same.
> Server par deploy ke baad lagu.

**Access:** 🔒 `verifyJwtToken` — har role.

```jsonc
{ "otp": "482913" }                                        // apna address confirm
{ "otp": "482913", "email": "billing@cafemocha.in" }       // switch confirm
```

> ⚠️ **Address badalte waqt verify me wahi `email` dobara bhejein** jo send me bheja tha. Sirf `{ "otp" }` bheja to server **purane** address
> par code dhoondhta hai aur `401 "Please resend OTP! OTP is expired or missing"` deta hai — address nahi badalta. Ye OTP screen ka `401`
> hai (`details.code` nahi): message dikhao, **logout mat karo**.

### Response — `200`

```jsonc
{
  "success": true,
  "message": "Email address updated and verified.",
  "data": { "email": "billing@cafemocha.in", "isEmailVerified": true, "wasChange": true }
}
```

⚠️ **Address likhna aur verified mark karna ek hi save me** hota hai. Do step me karne par ek pal aisa banta jahan naya address padha hota aur `isEmailVerified: false` — theek wahi haalat jisse nikalne ka raasta ye feature de raha hai.

⚠️ **Uniqueness yahan dobara check hoti hai.** Dono call ke beech minute nikalte hain, aur utni der me koi aur wo address le sakta hai. Sirf bhejte waqt check karna aapko ek verified duplicate de deta.

⚠️ **`loginType` nahi badalta.** `verifyEmailOTP` use `EMAIL` karta hai kyunki wo ek sign-in hai; ye nahi — aapke paas pehle se token hai. Yahan badalna ek WhatsApp vendor ka record sirf isliye badal deta ki usne apna address confirm kiya.

⚠️ **Code consume ho jaata hai** — wahi code dobara nahi chalega, warna ek purana code baad me address phir se badal sakta tha.

| Code | Kab |
|---|---|
| `200` | Verified |
| `401` | Code galat, expire, ya pehle se use ho chuka |
| `403` | Attempts khatam — naya code maangna padega |
| `409` | Wo address is beech me kisi aur ne le liya |
| `422` | `otp` nahi bheja, ya email ka format galat |

> ⚠️ **Iska success example Postman me capture nahi hua** — code ek asli inbox me jaata hai aur collection use padh nahi sakti. Saved example wahi refusal hai jo khaali code par aata hai; upar wala `200` shape code se likha gaya hai.

---

## 19e. POST /auth/mobile/send-verification 🆕

**Access:** `verifyJwtToken` — koi bhi signed-in role

Email wala hi shape: `mobile` **optional** hai. Na bhejo to account par jo number hai wahi
confirm hota hai; bhejo to us par switch shuru hota hai.

```jsonc
{}                              // jo number hai use confirm karo
{ "mobile": "9876543210" }      // is par switch karo
```

### Response — `200`

```jsonc
{
  "success": true,
  "message": "We have sent a code to ******3210. Enter it to switch to this number.",
  "data": { "step": "CONFIRM_NEW", "isChange": true, "sentTo": "******3210", "sessionId": "abc-123" }
}
```

⚠️ **`sessionId` wapas bhejna hoga.** Mobile ka code hamara nahi hai — 2factor banata aur
rakhta hai, aur `sessionId` se hi use verify karta hai. Isi wajah se mobile ke calls me ye
field hai aur email/WhatsApp ke calls me nahi.

⚠️ **Ab throttled hai.** Pehle **kisi bhi** mobile OTP path par koi limit nahi thi —
`sendOtp` ka throttle sirf WhatsApp aur email ke liye chalta hai, aur mobile seedha 2factor
ko call karta tha. Ab 60 second ka cooldown aur 5 per hour lagte hain, `Setting.security.otp`
se tunable, aur `429` me `retryAfterSeconds` aata hai — wahi shape jo baaki dono channels ka
hai.

⚠️ **`+91 98765 43210` bhi chalega** — server normalise karke 10 digit bana deta hai, to wo
account par pade number se compare hota hai. Iske bina apna hi number confirm karna "change"
lagta aur bewajah code chala jaata.

| Code | Kab |
|---|---|
| `200` | Code chala gaya |
| `409` | Ye number pehle se verified hai (aur aap badal nahi rahe) |
| `409` | Number kisi aur account par hai (same role) |
| `422` | Account par koi number hai hi nahi aur aapne bheja bhi nahi |
| `429` | Cooldown — `details.retryAfterSeconds` dekhein |

---

## 19f. POST /auth/mobile/verify 🆕

**Access:** `verifyJwtToken`

```jsonc
{ "otp": "482913", "sessionId": "abc-123" }
{ "otp": "482913", "sessionId": "abc-123", "mobile": "9876543210" }
```

### Response — `200`

```jsonc
{
  "success": true,
  "message": "Mobile number updated and verified.",
  "data": { "step": "DONE", "mobile": "9876543210", "isMobileVerified": true, "wasChange": true }
}
```

⚠️ **Number likhna aur `isMobileVerified: true` ek hi save me** — aur usi save me role
collection (`Customer` / `Brand` / `SubBrand`) par mirror bhi. Do step me karne par ek pal
aisa banta jahan naya number padha hai aur verified nahi.

⚠️ **Uniqueness yahan dobara check hoti hai** — dono call ke beech minute nikalte hain.

| Code | Kab |
|---|---|
| `200` | Verified |
| `401` | `Invalid OTP` |
| `409` | Wo number is beech me kisi aur ne le liya |
| `422` | `sessionId` nahi bheja, ya `otp` nahi |

---

## 19g. POST /auth/whatsapp/send-verification 🆕

**Access:** `verifyJwtToken`

```jsonc
{}                                      // jo number hai use confirm karo
{ "whatsappNumber": "9998887770" }      // is par switch karo
```

### 🔴 Ye ek **step-up** hai — email/mobile se yahi farq hai

`whatsappNumber` customer, vendor aur outlet manager — teeno ka **login identity** hai. Agar
code sirf **naye** number par jaata, to jiske paas bhi ek chura hui session hai wo apna number
daal kar, apne phone par code paa kar, account hamesha ke liye le leta — aur asli maalik ke
paas wapas aane ka koi raasta nahi bachta.

To ek **verified** number badalne par:

```jsonc
// Step 1 ka response — code PURANE number par gaya hai
{
  "success": true,
  "message": "To change your WhatsApp number we first need to confirm the one you have now. We have sent a code to ******3210.",
  "data": { "step": "CONFIRM_CURRENT", "sentTo": "******3210", "isChange": true }
}
```

⚠️ **Naya number *add* karna single-step hai.** Agar account ka number kabhi verified hua hi
nahi, to step up karne ke liye kuch hai hi nahi — aur us par code maangna user se aisi cheez
ka saboot maangna hota jiska dava account ne kabhi kiya hi nahi.

| Code | Kab |
|---|---|
| `200` | Code chala gaya — `step` dekh kar decide karein kaunsa screen |
| `409` | Ye number pehle se verified hai (aur aap badal nahi rahe) |
| `409` | Number kisi aur account par hai (same role) |
| `429` | Cooldown |

---

## 19h. POST /auth/whatsapp/verify 🆕

**Access:** `verifyJwtToken`

Step-up me ye **do baar** call hota hai.

```jsonc
// 1 — purane number ka code. Ye kuch badalta nahi; sirf naye number par code bhejne ka haq deta hai.
{ "otp": "111111", "whatsappNumber": "9998887770" }

// 2 — naye number ka code. Yahi wo call hai jo likhti hai.
{ "otp": "222222", "whatsappNumber": "9998887770" }
```

### Response — step 1 ke baad

```jsonc
{
  "success": true,
  "message": "Thanks — that is confirmed. We have now sent a code to ******7770. Enter it to finish the change.",
  "data": { "step": "CONFIRM_NEW", "sentTo": "******7770", "isChange": true, "wasChange": false }
}
```

### Response — step 2 ke baad

```jsonc
{
  "success": true,
  "message": "WhatsApp number updated and verified. You have been signed out everywhere else.",
  "data": {
    "step": "DONE",
    "whatsappNumber": "9998887770",
    "isWhatsappVerified": true,
    "wasChange": true,
    "sessionsEnded": true
  }
}
```

🔴 **`sessionsEnded: true` par app ko sign-out handle karna hoga.** Number badalne par
`sessionInvalidatedAt` set hota hai, yaani **is se pehle ke saare JWT mar jaate hain** —
current wala bhi. Wajah: agar change kisi chor ne apni session se kiya tha, to uska token bhi
usi waqt mar jaata hai, aur asli maalik — jiske paas purana number hai aur jiska code is flow
me zaroori tha — wapas aa sakta hai.

⚠️ **`mobile` par aisa nahi hota.** Wo secondary key hai aur account WhatsApp se reachable
rehta hai, to sabko sign out karne se kuch milta nahi.

🆕 **P8 (D87) — vendor ke outlets purane number pe:** VENDOR ka number badla aur brand ke
kuch outlets abhi bhi purane number pe hain → vendor ko `OUTLET_ON_OLD_OWNER_NUMBER` notice
(admins ko bhi). Kuch block nahi hota; outlet manager ka number #34a se update karwao. Admin
ka `PATCH /users/admin/:userId/contact` bhi yahi notice bhejta hai.

⚠️ **`whatsappNumber` ka koi plain write nahi hai.** `PUT /users/update`, `PUT /brands/update`
aur `PUT /subBrands/update` — teeno me se koi bhi ise chhoo nahi sakta; koshish par `422
WHATSAPP_REQUIRES_VERIFICATION`. Sirf ye flow, aur admin ka
`PATCH /users/admin/:userId/contact` (jo value badalta hai par flag `false` par girata hai).

| Code | Kab |
|---|---|
| `200` | `step: "CONFIRM_NEW"` (pehla leg) ya `step: "DONE"` (ho gaya) |
| `401` | Code galat, expire, ya use ho chuka |
| `403` | Attempts khatam |
| `409` | Wo number is beech me kisi aur ne le liya |
| `422` | `otp` nahi bheja, ya number ka format galat |

> ⚠️ **Inke success examples Postman me capture nahi hue** — code ek asli phone par jaata
> hai aur collection use padh nahi sakti. Saved examples wahi refusals hain jo khaali/galat
> code par aate hain; upar wale `200` shapes code se likhe gaye hain.

---

# Onboarding APIs

> Onboarding v2 (design: [brand_onboarding_v2_design.md](./brand_onboarding_v2_design.md), panel guide: [brand_onboarding_v2_vendor_panel_guide.md](./brand_onboarding_v2_vendor_panel_guide.md)). **Screen sirf server badalta hai** — har step save hone par response / `GET /brands/onboarding/status` naya `currentScreen` deta hai. Panel apne hisaab se agli screen nahi sochta.

**Gate:** saare onboarding routes **`isVendorOrAdmin`** hain (admin `?brandId=` ke saath, owner ki screen + locks pe — P6). Sirf `PUT accept-partnership` (#25) aur `PUT acknowledge-approval` (#26) `isVendor` hain. Vendor ka `?brandId=` onboarding writes pe ignore hota hai (apna brand hi).

**Har step ka guard (P1):**

| Step kahan hai | Kya hota hai |
|---|---|
| Vendor ki apni screen | Save + server agli screen pe le jaata hai |
| Peeche ki screen (back-edit / sidebar preview) | Save, screen **wahi** rehti hai |
| Aage ki screen, ya brand ke path pe hai hi nahi | `409 ONBOARDING_SCREEN_MISMATCH`, `details.currentScreen` = asli screen |
| Admin ka reject / revoke (REMEDIATION) | Saare legal steps khule, screen kabhi nahi hilti |
| Admin decision pending | Kami wala item jod sakte hain (PAN / GST / bank / owner verification / document); diya hua badalna → `409 ONBOARDING_LOCKED` ya `DETAIL_ALREADY_PROVIDED` |
| Brand approved | Legal edit → `409 LEGAL_FIELD_LOCKED`; kami wala item ek baar jod sakte hain; UNREGISTERED → GST / NO_GST upgrade allowed |

Do log (vendor ke do tabs, ya admin + vendor) ek saath same step save karein to screen **ek hi baar** aage badhti hai; doosre ko `409 ONBOARDING_SCREEN_MISMATCH` milta hai.

## 20a. GET /brands/onboarding/status

Onboarding ka **ek hi routing read** (onboarding v2, P1). Login ke baad aur panel kholte hi isi se route karein — `isFirst` pe nahi.

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`**. Vendor ko apna brand; admin `?brandId=` bhejta hai (bina `brandId` → `422`). Vendor doosre brand ka `brandId` bheje → `403`.

### Query
| Field | Type | Required | Notes |
|---|---|---|---|
| `brandId` | ObjectId | Admin ✅ · Vendor ❌ | Admin ke liye zaroori |

### Success — `200`
```json
{
  "success": true,
  "message": "Onboarding status fetched successfully.",
  "data": {
    "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
    "currentScreen": "PAN_VERIFICATION",
    "editMode": "FIRST_PASS",
    "editLock": null,
    "kycPath": "GST",
    "isOnBoardingCompleted": false,
    "groups": [
      { "key": "BASIC_DETAILS", "state": "DONE", "screens": [
        { "screen": "BRAND_NAME", "status": "DONE" },
        { "screen": "BUSINESS_CATEGORY", "status": "DONE" },
        { "screen": "REGISTRATION_STATUS", "status": "DONE" } ] },
      { "key": "BUSINESS_VERIFICATION", "state": "IN_PROGRESS", "screens": [
        { "screen": "GST_VERIFICATION", "status": "DONE" },
        { "screen": "PAN_VERIFICATION", "status": "MISSING" },
        { "screen": "REGISTRATION_ENTITY_TYPE", "status": "MISSING" },
        { "screen": "KYC_DOCUMENTS", "status": "MISSING" } ] },
      { "key": "PAYOUT", "state": "UPCOMING", "screens": [ { "screen": "BANK_VERIFICATION", "status": "MISSING" } ] },
      { "key": "AGREEMENT_PLAN", "state": "UPCOMING", "screens": [ … ] },
      { "key": "BRAND_OUTLET", "state": "UPCOMING", "screens": [ … ] }
    ],
    "progress": { "group": 2, "groupCount": 5, "percent": 31 },
    "items": {
      "gst": "PROVIDED", "pan": "NOT_STARTED", "ownerVerification": "NOT_APPLICABLE",
      "documents": "NOT_STARTED", "bank": "NOT_STARTED",
      "ownerVerificationMethod": null, "documentCount": 0
    },
    "registrationStatusLocked": true,
    "editable": {
      "legal": true, "registrationStatus": false, "entity": true,
      "kyc": { "add": { "pan": true, "gst": false, "bank": true }, "change": false },
      "ownerVerification": false,
      "documents": { "add": true, "change": true },
      "profile": { "add": true, "change": true },
      "setup": { "add": true, "change": true },
      "billingAddress": true
    },
    "systemChecks": [
      { "key": "GST_VERIFIED", "points": 15, "passed": true, "skipped": false },
      { "key": "GST_ACTIVE", "points": 15, "passed": true, "skipped": false },
      { "key": "PAN_VERIFIED", "points": 15, "passed": false, "skipped": false },
      { "key": "GST_PAN_NAME_MATCH", "points": 15, "passed": false, "skipped": false },
      { "key": "BANK_VERIFIED", "points": 20, "passed": false, "skipped": true },
      { "key": "BANK_NAME_MATCH", "points": 20, "passed": false, "skipped": true }
    ],
    "customerVisibilityHints": {
      "isVisible": false, "requireShowcase": false, "showcaseReady": false,
      "reasons": ["BRAND_NOT_LIVE", "NO_OUTLET"]
    },
    "verification": {
      "status": "PENDING", "attemptNumber": 0, "submittedAt": null,
      "isApproved": false, "isApprovalAcknowledged": false,
      "isRejected": false, "rejectionReason": null, "isRevoked": false, "revokeReason": null
    },
    "deed": {
      "accepted": false, "acceptedByType": null, "mode": null, "version": null, "acceptedAt": null,
      "isLegacy": false, "hasProof": false, "proofUrl": null, "note": null,
      "vendorConfirmedAt": null, "vendorConfirmedVersion": null, "requiresDeedConfirmation": false
    },
    "hasBillingAddress": false,
    "isVerified": false,
    "profileStrength": { "score": 42, "level": "LOW", "sections": [ "…" ], "badgeEligible": false, "badgeBlockers": ["NOT_APPROVED", "STRENGTH_BELOW_75", "BANK_NOT_VERIFIED", "NO_IDENTITY_PROOF"] },
    "limits": { "brandNameMinLength": 2, "brandNameMaxLength": 25, "maxSubCategories": 3, "maxKycDocuments": 10, "maxActiveFeatures": 10 }
  }
}
```

| Field | Matlab |
|---|---|
| `currentScreen` | Kaunsi screen kholni hai. Naya vendor: `BRAND_NAME` |
| `editMode` | `FIRST_PASS` (submit se pehle) · `LOCKED` (submit ho chuka) · `REMEDIATION` (**admin** ne reject / revoke kiya — system ka score kabhi nahi) |
| `editLock` | `LOCKED` mein kaunsa: `PENDING` (admin decision baaki — sirf add) · `APPROVED`. Baaki `null` |
| `systemChecks` | Path ke system checks (design §9.3) — `points` = check kitne ka hai, `passed`, `skipped` (vendor ne skip kiya, fail nahi). Review page pe "kya pass, kya score badhayega". Kul score / status vendor ko nahi dikhta. Path na chuna ho to `[]`. Submit kabhi block nahi karta |
| `customerVisibilityHints` | Customer app pe dikhne mein kya baaki: `reasons` (jaise `BRAND_NOT_LIVE`, `NO_OUTLET`, `NO_VERIFIED_OUTLET`, `NO_VISIBLE_SHOWCASE`), `requireShowcase` (admin switch ON → album zaroori; professional skip pe warning dikhao), `showcaseReady` (customer ko dikhne layak album hai ya nahi — switch ON ho ya OFF; 🔧 D117 2026-11-21: pehle switch OFF pe hamesha `false` aata tha, ab `GET /brands/get` ke `customerVisibility.showcaseReady` jaisa hi) |
| `kycPath` | `GST` · `NO_GST` · `UNREGISTERED` · `null` (abhi chuna nahi) |
| `groups` | Sidebar ke 5 groups. `BUSINESS_VERIFICATION` ki screens path ke hisaab se (path na ho to khaali). `state`: `DONE` · `IN_PROGRESS` (vendor isi group mein hai) · `UPCOMING` |
| `groups[].screens[].status` | `DONE` (data saved) · `SKIPPED` (skip kiya — sidebar pe "Skipped", group / progress mein paar gina jaata hai) · `MISSING`. Brand-setup screens `continue` ke rules se: `BRAND_BASIC_DETAILS` = `DONE` jab logo + email + contact number teeno hon (D83) · `BRAND_PROFESSIONAL_DETAILS` = `DONE` jab vendor isse aage nikal chuka (current / furthest screen aage, ya submit ho chuka, ya approved) — warna `MISSING` · `OUTLET_DETAILS` = `DONE` jab ≥ 1 live outlet ho aur **har** live outlet verified + location + work hours (D85) — warna `MISSING`. Isliye `BRAND_OUTLET` group `DONE` aur `progress.percent` 100 tak pahunch sakte hain |
| `progress` | `group` 1-based (vendor jis group mein hai; review / under review / dashboard pe 5), `percent` = (saved + skipped screens) / kul screens |
| `items` | Paanch KYC items: `gst`, `pan`, `ownerVerification`, `documents`, `bank` — har ek `PROVIDED` · `SKIPPED` · `NOT_STARTED` · `NOT_APPLICABLE` (path pe nahi: GST sirf GST path pe — NO_GST pe baad mein add ho to `PROVIDED`; PAN UNREGISTERED pe tabhi jab owner ne PAN se verify kiya; owner verification sirf UNREGISTERED pe). Record saved ho to hamesha `PROVIDED`. Saath mein `ownerVerificationMethod` (`PAN` / `ID_DOCUMENT` / `null`) aur `documentCount` (live business documents) |
| `registrationStatusLocked` | `true` = business status ab vendor nahi badal sakta (GST path pe GST save, NO_GST pe PAN save, ya edit window band). UNREGISTERED hamesha `false` |
| `editable` | Vendor abhi kya kar sakta hai (design §6): `legal` (naam / category) · `registrationStatus` · `entity` · `kyc.add.{pan,gst,bank}` (kami wala jod sakte) · `kyc.change` (saved badalna — sirf remediation) · `ownerVerification` · `documents.{add,change}` · `profile.{add,change}` · `setup.{add,change}` (showcase / features / outlets) · `billingAddress` (hamesha). `false` wale ko panel grey kare — server bhi wahi rule lagata hai |
| `verification` | Under review / rejected / revoked / congrats ki state. `submittedAt` P3 se — ⚠️ **pehla submit**; resubmit pe nahi badalta (admin ke NEW / WAITING tabs isi pe chalte hain). Latest submit ka time = `GET /brands/verifications/history` (#33) ki `RESUBMITTED` row ka `createdAt` (owner, 2026-11-21) |
| `hasBillingAddress` | Brand ka billing address (live `Location`, kind BRAND) hai ya nahi — wahi check jo submit karta hai (purana / deleted `locationId` → `false`) |
| `isVerified` | 🆕 P7: verified badge (admin deta hai, display only) |
| `profileStrength` | 🆕 P7: wahi object jo [#32c](#32c-get-brandsprofile-strength) deta hai — review page, under review aur dashboard pe "+N" hints (D82) |
| `limits` | 🆕 D112 / panel audit Q8: `brandNameMinLength` (2), `brandNameMaxLength` (25), `maxSubCategories`, `maxKycDocuments`, `maxActiveFeatures` — settings se, wahi jo save pe lagte hain. Form hints / counters isi se; hardcode nahi |
| `deed` | 🆕 P5 (design §13): `accepted` · `acceptedByType` (`VENDOR` / `ADMIN`) · `mode` (`ONLINE` / `OFFLINE`) · `version` · `acceptedAt` · `isLegacy` (P5 se pehle accept — sirf purana flag, ya P9 migration ka record `version: "legacy"` jisme `acceptedAt` `null` hai) · `hasProof` / `proofUrl` (admin ki signed copy — short-lived signed link) · `note` · `vendorConfirmedAt` / `vendorConfirmedVersion`. 🔴 **`requiresDeedConfirmation: true`** = admin ne offline deed record ki, vendor ne abhi confirm nahi ki → login pe **blocking popup**, "Accept" = `PUT /brands/onboarding/accept-partnership` (#25). Popup gate hai, screen nahi |

### Errors
| Status | Message | Kab |
|---|---|---|
| `422` | `brandId is required when acting as an admin` | Admin bina `brandId` |
| `422` | `Invalid brandId` | Galat ObjectId |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | Vendor ne doosre brand ka `brandId` bheja |
| `404` | `Brand not found!` / `No brand is linked to your account` | |

### ⚠️ Notes

**1. Sirf padhta hai** — kabhi screen nahi badalta, kabhi heal nahi karta.

**2. Screen hamesha brand ke owner (vendor) ki** — admin padhe tab bhi.

---

## 20. POST /brands/onboarding/add-basic-details

Basic Details ka **ek step** save karta hai (onboarding v2, P1 — design D3, D66–D71).

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body — `step` pe depend karta hai

`step` = jo screen **save ho rahi hai** (agli nahi). Har step pe sirf uske apne fields; doosre step ka field → `422` (forbidden).

| `step` | Required fields |
|---|---|
| `BRAND_NAME` | `brandName` (2–25, D112) |
| `BUSINESS_CATEGORY` | `categoryId`, `subCategoryIds` (1 ya zyada, unique, sab **usi** category ki; max `vendor.onboarding.maxSubCategories`, default 3) |
| `REGISTRATION_STATUS` | `kycPath`: `GST` ("I have GST") · `NO_GST` ("Registered, no GST") · `UNREGISTERED` |
| `REGISTRATION_ENTITY_TYPE` | `businessEntityType` (BUSINESS_ENTITY_TYPE) — GST / NO_GST path pe hi |

```json
{ "step": "BRAND_NAME", "brandName": "Shree Radhes" }
```
```json
{ "step": "BUSINESS_CATEGORY", "categoryId": "66a1…", "subCategoryIds": ["66b1…", "66b2…"] }
```
```json
{ "step": "REGISTRATION_STATUS", "kycPath": "NO_GST" }
```
```json
{ "step": "REGISTRATION_ENTITY_TYPE", "businessEntityType": "PRIVATE_LIMITED" }
```

### Success — `200`
```json
{
  "success": true,
  "message": "Basic details updated successfully.",
  "data": {
    "brand": {
      "_id": "68f1a2b3c4d5e6f7a8b9c3a1",
      "brandName": "Shree Radhes",
      "legalBusinessName": null,
      "categoryId": "66a1…",
      "subCategoryIds": ["66b1…", "66b2…"],
      "businessRegistrationStatus": "REGISTERED",
      "businessEntityType": null,
      "onboarding": { "kycPath": "NO_GST" }
    },
    "currentScreen": "PAN_VERIFICATION"
  }
}
```

> Response ka `currentScreen` hi agli screen hai — usi pe navigate karein. ⚠️ Pehle response mein populated brand / user aata tha; ab ye shape.

**Kya save hota hai:**

| `step` | Brand pe |
|---|---|
| `BRAND_NAME` | `brandName` (display case) |
| `BUSINESS_CATEGORY` | `categoryId`, `subCategoryIds` (vendor ka order), `subCategoryId` = **pehli** (purane readers + purana customer app isi ko padhte hain) |
| `REGISTRATION_STATUS` | `onboarding.kycPath`, `businessRegistrationStatus` (`GST` / `NO_GST` → `REGISTERED`, `UNREGISTERED` → `UNREGISTERED`). UNREGISTERED pe `businessEntityType` apne aap `PROPRIETORSHIP` |
| `REGISTRATION_ENTITY_TYPE` | `businessEntityType` |

**Agli screen:**

| `step` | Agla |
|---|---|
| `BRAND_NAME` | `BUSINESS_CATEGORY` |
| `BUSINESS_CATEGORY` | `REGISTRATION_STATUS` |
| `REGISTRATION_STATUS` | GST → `GST_VERIFICATION` · NO_GST → `PAN_VERIFICATION` · UNREGISTERED → `OWNER_VERIFICATION` |
| `REGISTRATION_ENTITY_TYPE` | `KYC_DOCUMENTS` |

### Errors
| Status | `details.code` | Message / Kab |
|---|---|---|
| `422` | — | `step is required` / `step must be one of BRAND_NAME, BUSINESS_CATEGORY, REGISTRATION_STATUS, REGISTRATION_ENTITY_TYPE` |
| `422` | — | Step ka field missing / doosre step ka field bheja (forbidden) |
| `422` | `SUBCATEGORY_LIMIT` | `You can pick up to N subcategories.` — `details.limit` |
| `422` | — | `Every subcategory must belong to the chosen category.` |
| `404` | — | `Category not found.` |
| `422` | — | `Business entity is set automatically (Proprietorship) for unregistered businesses.` |
| `409` | `ONBOARDING_SCREEN_MISMATCH` | Step abhi khula nahi (aage ka / path pe nahi) — `details.currentScreen` |
| `409` | `REGISTRATION_STATUS_LOCKED` | Status badalna — GST path pe GST save ho chuka, ya NO_GST pe PAN save ho chuka |
| `409` | `ENTITY_FROM_GST` | GST path pe entity GST ke constitution se alag (P2, D70) — `details.acceptedEntityTypes`. Constitution map na ho to koi bhi chalega |
| `409` | `ONBOARDING_LOCKED` / `LEGAL_FIELD_LOCKED` | Admin decision pending / brand approved (approve ke baad sirf UNREGISTERED → GST / NO_GST upgrade aur khaali entity ek baar — #27 note 4) |
| `403` | — | Role VENDOR / ADMIN nahi |

### ⚠️ Notes

**1. `legalBusinessName` ab vendor nahi bharta** (design D67, P2 se live) — server likhta hai: GST path pe GST save pe GST ka legal naam, NO_GST pe PAN save pe PAN ka naam, UNREGISTERED pe owner verification pe (PAN ka naam, ya ID se → brand name). Purane `currentScreen`, `legalBusinessName`, `businessRegistrationStatus` fields hata diye gaye.

**2. UNREGISTERED ab chalta hai** — pehle `400 Business Registration Required` aata tha.

**3. Business status badalna** (back aakar, ya #27 se):
- GST path pe GST save hone tak, NO_GST pe PAN save hone tak badal sakte hain; UNREGISTERED hamesha badal sakta hai.
- Aage ki screen se badla → vendor naye path ki pehli verification screen pe jaata hai; us path ki verification khatam hone par server use wapas wahin le aata hai jahan tak wo pahle pahunch chuka tha (`furthestScreen`). Deed, plan, setup dobara nahi.
- UNREGISTERED se nikle → apne aap wala `PROPRIETORSHIP` hat jaata hai, entity screen dobara puchhti hai.
- **Carry-over (P2):** owner ka PAN pehle se ho → UNREGISTERED → NO_GST pe wahi business PAN ban jaata hai (nayi paid call nahi, PAN screen skip); NO_GST → UNREGISTERED pe wahi PAN owner verification ban jaata hai (owner screen skip). Documents hamesha rehte hain.

**4. Edit ke liye** `PUT /brands/onboarding/update-basic-details` (#27).

---

## 21. POST /brands/onboarding/add-pan-details

Verified PAN save. **Pehle `verify-pan` (#28) call karein** — uske response ka `verificationId` yahan bhejna hai. *(Onboarding v2, P0 — design D16, D97.)*

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body
| Field | Type | Required | Validation |
|---|---|---|---|
| `verificationId` | ObjectId | ✅ | `verify-pan` ka `data.verificationId` — isi brand ka, PAN type ka, **verified** |

```json
{ "verificationId": "6730f1a2b3c4d5e6f7a8b901" }
```

⚠️ **Baaki sab fields hat gaye.** `pan`, `fullName`, `panType`, `isVerified`, `verificationStatus`, `verificationResponse`, provider ids… pehle panel bhejta tha aur server waisa hi save kar deta tha — isliye `isVerified: true` bhejkar KYC client se pass ho jaata tha (design P11). Ab ye bheje to `stripUnknown` chupchaap hata deta hai; PAN record ki har field server **stored provider jawab** (`KycVerification`) se likhta hai:

| Record field | Kahan se |
|---|---|
| `pan` | verify kiya hua number |
| `fullName` | provider `data.fullName` |
| `panType` | PAN ka 4th character (`P` INDIVIDUAL, `C` COMPANY, `F`/`E` LLP, `H` HUF, `A` AOP, `T` TRUST, `B` BOI, `L` LOCAL_AUTHORITY, `J` ARTIFICIAL_JURIDICAL_PERSON, `G` GOVERNMENT) — provider `panType` `null` bhejta hai |
| `isVerified`, `verificationStatus`, `verificationMessage`, `verifiedAt` | provider jawab se |
| `providerTransactionId` · `providerRequestId` | provider `data.transactionId` · `requestId` |
| `verificationResponse` | provider ka poora jawab, jaisa aaya |

Aadhaar number kabhi copy nahi hota, provider bheje tab bhi.

### Success — `200`
```json
{
  "success": true,
  "message": "PAN details added successfully.",
  "data": {
    "record": {
      "_id": "68f1a2b3c4d5e6f7a8b9g001",
      "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
      "pan": "AABCM1234K",
      "panType": "COMPANY",
      "fullName": "MOCHA HOSPITALITY PRIVATE LIMITED",
      "isVerified": true,
      "verificationStatus": "SUCCESS",
      "verifiedAt": "2026-08-22T12:00:00.000Z"
    },
    "itemStatus": "PROVIDED",
    "currentScreen": "REGISTRATION_ENTITY_TYPE",
    "derived": { "legalBusinessName": "MOCHA HOSPITALITY PRIVATE LIMITED" }
  }
}
```

⚠️ **Shape badla (P2):** pehle `data` mein seedha PAN record aata tha; ab `data.record`. Saath mein `itemStatus`, `currentScreen` (isi pe navigate karein) aur `derived` — server ne kya bhara (`legalBusinessName` sirf NO_GST path pe; GST path pe `{}`).

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | — | `verificationId is required…` / `verificationId is not valid.` |
| `422` | `VERIFICATION_NOT_FOUND` | id galat, kisi aur brand ka, ya GST/bank verification ka |
| `422` | `VERIFICATION_FAILED` | CGPey ne PAN verify nahi kiya (message provider ka) — dobara sahi PAN se verify karein |
| `400` | `DOCUMENT_IN_USE` | ye PAN kisi aur brand pe save hai (do brands ne ek saath verify kiya ho tab yahan pakda jaata hai) |
| `409` | `DETAIL_ALREADY_PROVIDED` | PAN save ho chuka, ab **doosra** PAN (P2, D76). Wahi PAN dobara → chalta hai. Badalna support (admin) se, ya admin ke reject ke baad |
| `422` | `PAN_NOT_IN_GSTIN` | GST path pe PAN GSTIN ke andar wala nahi (characters 3–12) — `details.panFromGstin` |
| `409` | `DETAIL_ALREADY_PROVIDED` | Submit ke baad (pending / approved) PAN pehle se saved hai — badalna support se. Missing ho to jod sakte hain (note 6) |

### ⚠️ Notes

**1. Do-step design waisa hi:** vendor verify karke result dekhta hai, phir confirm karke save. Fark sirf itna ki result server ke paas rehta hai, panel sirf uska id lautata hai.

**2. Fail hua verification save nahi hota** (owner decision D97, 2026-11-18). Wo `KycVerification` mein audit ke liye rehta hai.

**3. Entity aur PAN type ka fark** submit pe admin ke liye sirf remark hai (NO_GST, design §9.3) — kabhi block nahi.

**4. Screen aage — server tay karta hai** (v2 P1). PAN screen pe save: GST path → `REGISTRATION_ENTITY_TYPE` · NO_GST → `REGISTRATION_ENTITY_TYPE`. Peeche ki screen se (back-edit / preview) save → screen wahi. PAN screen abhi nahi aayi / path pe nahi (UNREGISTERED) → `409 ONBOARDING_SCREEN_MISMATCH`. Purana `currentScreen` field ab nahi liya jaata.

**5. P2:** save pe `items.pan = PROVIDED`. NO_GST path pe brand ka `legalBusinessName` = PAN ka naam (D67). UNREGISTERED path ka owner PAN #23a se jaata hai, yahan se nahi.

**6. 🆕 P3 — submit ke baad:** PAN nahi hai to jod sakte hain (verify + save, screen nahi hilti, score usi attempt pe dobara chalta hai). Hai to `409 DETAIL_ALREADY_PROVIDED`.

---

## 22. POST /brands/onboarding/add-gst-details

Verified GSTIN save. **Pehle `verify-gst` (#29)** — uska `verificationId` yahan. *(Onboarding v2, P0 — D16, D70, D97.)*

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body
| Field | Type | Required | Validation |
|---|---|---|---|
| `verificationId` | ObjectId | ✅ | `verify-gst` ka `data.verificationId` — isi brand ka, GST type ka, **verified** |

```json
{ "verificationId": "6730f1a2b3c4d5e6f7a8b902" }
```

⚠️ `legalName`, `constitutionOfBusiness`, `registrationStatus`, `address`, `isVerified`… ab nahi liye jaate. GST record server stored jawab se likhta hai:

| Record field | Kahan se |
|---|---|
| `gstNumber` | verify kiya hua GSTIN |
| `legalName` · `tradeName` · `constitutionOfBusiness` | provider `data.*` |
| `taxpayerType` | provider `"Regular"` → `REGULAR` (enum; anjaan value → `UNKNOWN`) |
| `registrationStatus` | provider value (enum; `Active` → `SUCCESS`; anjaan → `UNKNOWN`) |
| `registrationDate` · `cancellationDate` · `lastUpdated` | provider `dd/mm/yyyy` → date (`NA` → khaali) |
| `stateCode` | GSTIN ke pehle 2 digit |
| `address` | provider ka snake_case address (`building_number` → `buildingNumber` …); `district` na ho to `city` |
| `isVerified`, `verificationStatus`, `verifiedAt`, `verificationResponse`, provider ids | provider jawab se |

### Success — `200`
```json
{
  "success": true,
  "message": "GST details added successfully.",
  "data": {
    "record": {
      "_id": "68f1a2b3c4d5e6f7a8b9g002",
      "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
      "gstNumber": "23AABCM1234K1ZP",
      "legalName": "MOCHA HOSPITALITY PRIVATE LIMITED",
      "taxpayerType": "REGULAR",
      "registrationStatus": "SUCCESS",
      "stateCode": "23",
      "isVerified": true
    },
    "itemStatus": "PROVIDED",
    "currentScreen": "PAN_VERIFICATION",
    "derived": {
      "legalBusinessName": "MOCHA HOSPITALITY PRIVATE LIMITED",
      "businessEntityType": "PRIVATE_LIMITED"
    }
  }
}
```

⚠️ **Shape badla (P2):** record ab `data.record` mein. `derived` = server ne GST se kya bhara: `legalBusinessName` hamesha (GST path), `businessEntityType` = ab brand ka entity (GST constitution se; vendor ka pehle wala GST maanta ho to wahi) — constitution kisi entity se map na ho to `null` (tab entity screen dropdown kholo). NO_GST / UNREGISTERED pe `derived` = `{}`.

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | — | `verificationId is required…` / `verificationId is not valid.` |
| `422` | `VERIFICATION_NOT_FOUND` | id galat, kisi aur brand ka, ya PAN/bank verification ka |
| `422` | `VERIFICATION_FAILED` | CGPey ne GSTIN verify nahi kiya |
| `422` | `GSTIN_NOT_ACTIVE` | GSTIN cancelled / suspended / inactive / pending cancellation, ya cancellation date hai. `details.registrationStatus` saath aata hai. Message: "Registered, no GST" chunein |
| `400` | `DOCUMENT_IN_USE` | ye GSTIN kisi aur brand pe save hai |
| `409` | `DETAIL_ALREADY_PROVIDED` | GSTIN save ho chuka, ab doosra (P2, D76) |
| `409` | `DETAIL_ALREADY_PROVIDED` | Submit ke baad (pending / approved) GSTIN pehle se saved hai — badalna support se. Missing ho to jod sakte hain (note P3) |
| `422` | `PAN_NOT_IN_GSTIN` | GSTIN brand ke saved PAN ka nahi — `details.panOnBrand` (#21 wale `details.panFromGstin` se alag key) |
| `422` | `BILLING_STATE_GSTIN_MISMATCH` | Saved billing address doosri state ka — pehle #32b. `details.billingState`, `gstinState`, `gstinStateCode` |

### ⚠️ Notes

**1. PAN GST me embedded hota hai** — GSTIN ke characters 3–12. System verification isko check karta hai (`panEmbeddedInGST` flag).

**2. Inactive GSTIN save hi nahi hota** (D70). Sirf wahi status refuse hote hain jo provider saaf "band" bataye; anjaan status save hota hai aur admin ko dikhta hai.

**3. Screen aage — server tay karta hai** (v2 P1). GST screen pe save → `PAN_VERIFICATION`. Back-edit → screen wahi. GST screen sirf GST path pe hai — NO_GST / UNREGISTERED pe `409 ONBOARDING_SCREEN_MISMATCH`.

**🆕 P3 — NO_GST (ya submit ke baad UNREGISTERED) pe GST jodna:** brand GST path pe chala jaata hai (`kycPath: GST`, `businessRegistrationStatus: REGISTERED`), legal naam + entity GST se (D71, D94). GSTIN ke andar brand ka saved PAN hona chahiye, warna `422 PAN_NOT_IN_GSTIN` (`verify-gst` pe hi, paisa nahi lagta). Submit ke baad GSTIN pehle se ho → `409 DETAIL_ALREADY_PROVIDED`.

**4. P2:** save pe `items.gst = PROVIDED`, aur GST path pe brand ka `legalBusinessName` = GST legal name, `businessEntityType` = constitution se (vendor ka pehle wala entity GST maanta ho to wahi rehta hai, jaise OPC → Private Limited). Constitution map na ho to entity screen puchhti hai.

---

## 23. POST /brands/onboarding/add-bank-details

Penny-dropped bank account save. **Pehle `verify-bank` (#30)** — uska `verificationId` yahan. *(Onboarding v2, P0 — D16, D97.)*

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body
| Field | Type | Required | Validation |
|---|---|---|---|
| `verificationId` | ObjectId | ✅ | `verify-bank` ka `data.verificationId` — isi brand ka, bank type ka, **verified** |
| `accountType` | string | ❌ | BANK_ACCOUNT_TYPES (`SAVINGS`, `CURRENT`, `NRE`, `NRO`, `OD`, `CC`, `OTHER`). Provider ye nahi deta; kisi score / gate / payout pe asar nahi |

```json
{ "verificationId": "6730f1a2b3c4d5e6f7a8b903", "accountType": "CURRENT" }
```

🔴 **`isVerified` ab server tay karta hai** — settlement isi flag pe vendor ko paisa bhejta hai. Pehle server apna verdict lowercase `isverified` key mein likhta tha (schema mein hai hi nahi, Mongoose ne gira diya) aur client ka `isVerified` `...rest` se save ho jaata tha (design P10). Ab Bank record ki har field stored penny-drop jawab se:

| Record field | Kahan se |
|---|---|
| `accountNumber` · `ifscCode` | verify kiye hue number + IFSC |
| `accountHolderName` | provider `result.account_holder_name` |
| `bankName` · `branchName` · `bankAddress` | provider `result.bank_name` · `bank_branch` · `bank_address` |
| `isValid` · `recommendedAction` · `paymentMode` · `failureReason` · `npciErrorCode` | provider `result.*` |
| `isVerified` | **sirf** jab provider `success`, `status: SUCCESS`, `result.is_valid` aur `result.recommended_action: "PROCEED"` — chaaron — aur holder ka naam de |
| `maskedAccountNumber` · `accountLast4Digits` | server |

### Success — `200`
```json
{
  "success": true,
  "message": "Bank details added successfully.",
  "data": {
    "record": {
      "_id": "68f1a2b3c4d5e6f7a8b9g003",
      "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
      "accountHolderName": "MOCHA HOSPITALITY PRIVATE LIMITED",
      "maskedAccountNumber": "***********5678",
      "ifscCode": "UTIB0001234",
      "accountType": "CURRENT",
      "recommendedAction": "PROCEED",
      "isVerified": true
    },
    "itemStatus": "PROVIDED",
    "currentScreen": "PARTNERSHIP_DEED",
    "derived": {}
  }
}
```

⚠️ **Shape badla (P2):** record ab `data.record` mein, saath mein `itemStatus` aur `currentScreen`.

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | — | `verificationId is required…` / `Bank account type must be one of …` |
| `422` | `VERIFICATION_NOT_FOUND` | id galat, kisi aur brand ka, ya PAN/GST verification ka |
| `422` | `VERIFICATION_FAILED` | penny drop fail hua (message bank ka reason, jaise "Account closed") — sahi account se dobara verify karein |
| `400` | `DOCUMENT_IN_USE` | ye account kisi aur brand pe save hai |
| `409` | `DETAIL_ALREADY_PROVIDED` | Bank save ho chuka, ab doosra account / IFSC (P2, D76) |
| `409` | `DETAIL_ALREADY_PROVIDED` | Submit ke baad (pending / approved) bank pehle se saved hai — badalna support se. Missing ho to jod sakte hain (note 5) |

### ⚠️ Notes

**1. Name match score server khud nikalta hai** — account holder ka naam vs GST legal / trade name (GST path) / PAN naam (NO_GST, UNREGISTERED + PAN) / legal name (owner ID), ≥ 85% → `BANK_NAME_MATCH` pass (`bankMatched`). Provider ka `isNameMatch` / `matchingScore` jo bhi aaye record pe save hota hai, score / flag pe asar nahi. (`beneficiaryName` ab bheja hi nahi jaata — #30 note 1, D114.)

**2. Same account number + IFSC** dobara save → wahi record update. Account ya IFSC badla → naya record, purana audit ke liye soft-delete.

**3. Screen aage — server tay karta hai** (v2 P1). Bank screen pe save → `PARTNERSHIP_DEED` (`SYSTEM_VERIFICATION` screen hat gayi). Back-edit → screen wahi. Bank screen abhi nahi aayi → `409 ONBOARDING_SCREEN_MISMATCH`.

**4. Skip:** bank abhi na dena ho → `POST /brands/onboarding/skip { "screen": "BANK_VERIFICATION" }` (#23f). Save pe `items.bank = PROVIDED` (pehle ka skip hat jaata hai).

**5. 🆕 P3 — submit ke baad (review pending ya approved):** bank **nahi** hai to jod sakte hain (verify + save, screen nahi hilti). Score usi attempt pe dobara chalta hai (`latestScore`, naya attempt nahi), admin ko ek notice. Bank pehle se hai → `verify-bank` pe hi `409 DETAIL_ALREADY_PROVIDED` (paisa nahi lagta).

---

## 23a. POST /brands/onboarding/owner-verification

**Owner kaun hai** — sirf **UNREGISTERED** path ki `OWNER_VERIFICATION` screen (onboarding v2, P2 — design D67, D72). Is path pe zaroori hai.

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Do tarike

| `method` | Body | Kya save hota hai |
|---|---|---|
| `PAN` (recommended) | JSON `{ "method": "PAN", "verificationId": "…" }` — pehle `verify-pan` (#28) | Brand ka PAN record (wahi writer jo #21), `items.pan = PROVIDED` |
| `ID_DOCUMENT` | multipart: `method`, `idType`, `file` — **ya** JSON `{ method, idType, uploadId }` (presign purpose `KYC_DOCUMENT`) | Brand ka **ek** live owner-ID document (private), status `UPLOADED` jab tak admin review na kare |

| Field | Type | Kab | Validation |
|---|---|---|---|
| `method` | string | ✅ hamesha | `PAN` · `ID_DOCUMENT` |
| `verificationId` | ObjectId | sirf `PAN` | `verify-pan` ka `data.verificationId` (isi brand ka, verified) |
| `idType` | string | sirf `ID_DOCUMENT` | `AADHAAR` (⚠️ **masked** — sirf aakhri 4 digit dikhein) · `DRIVING_LICENCE` · `PASSPORT` · `VOTER_ID` |
| `file` / `uploadId` | file / ObjectId | sirf `ID_DOCUMENT`, ek hi | PDF, ya JPG / PNG jiski **chhoti side ≥ 800 px**; max **5 MB**. HEIC / WebP / GIF nahi |

```json
{ "method": "PAN", "verificationId": "6730f1a2b3c4d5e6f7a8b901" }
```
```
multipart/form-data:  method=ID_DOCUMENT  idType=DRIVING_LICENCE  file=<licence.pdf>
```

### Success — `200`
```json
{
  "success": true,
  "message": "Owner verification saved successfully.",
  "data": {
    "ownerVerification": {
      "method": "ID_DOCUMENT",
      "status": "PROVIDED",
      "document": {
        "_id": "6731a2b3c4d5e6f7a8b9d001",
        "purpose": "OWNER_ID",
        "title": "Driving licence",
        "docType": null,
        "idType": "DRIVING_LICENCE",
        "status": "UPLOADED",
        "reason": null,
        "reviewedAt": null,
        "file": { "mimeType": "application/pdf", "sizeBytes": 182340, "originalName": "licence.pdf" },
        "fileUrl": "https://…amazonaws.com/…?X-Amz-Expires=300&…",
        "uploadedByType": "VENDOR",
        "createdAt": "2026-11-18T10:00:00.000Z",
        "updatedAt": "2026-11-18T10:00:00.000Z"
      }
    },
    "legalBusinessName": "Shree Radhes",
    "currentScreen": "KYC_DOCUMENTS"
  }
}
```

`document` sirf `ID_DOCUMENT` pe aata hai. `legalBusinessName` server ka (D67): PAN se → PAN pe likha naam; ID se → brand name.

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | — | `method` / `verificationId` / `idType` missing, ya galat method ke saath bheja (`… is only sent with method …`) |
| `422` | — | `The ID document is required. Send a file or an uploadId.` |
| `422` | `VERIFICATION_NOT_FOUND` / `VERIFICATION_FAILED` | PAN wala id galat / fail hua (#21 jaisa) |
| `400` | `DOCUMENT_IN_USE` | ye PAN kisi aur brand pe save hai |
| `422` | `OWNER_PAN_NOT_PERSONAL` | PAN owner ka personal nahi (4th character `P` nahi — company / firm / LLP / trust). Business registered hai to "Registered, no GST" chunein (owner decision 2026-11-18, D99) |
| `422` | `KYC_FILE_TYPE` | File PDF / JPG / PNG nahi (file ke bytes se tay hota hai, naam se nahi) |
| `422` | `KYC_IMAGE_TOO_SMALL` | Photo ki chhoti side 800 px se kam, ya size padha nahi gaya — `details.minShortSidePx` (+ `width`, `height`) |
| `413` | — | File 5 MB se badi |
| `503` | `KYC_STORAGE_UNAVAILABLE` | Private storage (S3) active nahi — upload abhi band. Thodi der baad |
| `409` | `ONBOARDING_SCREEN_MISMATCH` | Brand UNREGISTERED path pe nahi, ya screen abhi nahi aayi — `details.currentScreen` |
| `409` | `DETAIL_ALREADY_PROVIDED` | Submit ke baad (pending / approved) owner pehle se verified hai — badalna support se (note 4) |
| `409` | — | Do ID uploads ek saath — `Please refresh and try again.` |

### ⚠️ Notes

**1. Submit tak badal sakte hain** (D76). Dobara bhejo → naya PAN (nayi paid check) ya naya ID; purana ID document soft-delete ho kar audit ke liye rehta hai (`replacedById`). Method badla (PAN ↔ ID) → pehle wala extra proof ki tarah rehta hai.

**2. Screen:** `OWNER_VERIFICATION` pe save → `KYC_DOCUMENTS`. Back-edit → screen wahi. Rejection fix (remediation) → screen nahi hilti, history row likhi jaati hai.

**3. File link (`fileUrl`) signed hai aur kuch minute (`storage.delivery.signedUrlTtlMinutes`, default 5) chalta hai** — store mat karo; expire ho to #23b dobara padho.

**4. 🆕 P3 — submit ke baad:** owner verification sirf tab jod sakte hain jab abhi tak nahi hui (purane approved brands); hui hai to `409 DETAIL_ALREADY_PROVIDED` (badalna support se).

---

## 23b. GET /brands/onboarding/documents

Brand ke saare live KYC documents + recommended chips + limit (onboarding v2, P2 — D73).

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`**. Vendor apna brand; admin `?brandId=` (review isi list se).

### Query
| Field | Type | Required | Notes |
|---|---|---|---|
| `brandId` | ObjectId | Admin ✅ · Vendor ❌ | |

### Success — `200`
```json
{
  "success": true,
  "message": "Documents fetched successfully.",
  "data": {
    "documents": [
      { "_id": "6731…d001", "purpose": "OWNER_ID", "title": "Driving licence", "idType": "DRIVING_LICENCE", "docType": null, "status": "ACCEPTED", "reason": null, "fileUrl": "https://…", "file": { "mimeType": "application/pdf", "sizeBytes": 182340, "originalName": "licence.pdf" }, "uploadedByType": "VENDOR", "createdAt": "…", "updatedAt": "…", "reviewedAt": "…" },
      { "_id": "6731…d002", "purpose": "BUSINESS", "title": "FSSAI licence", "idType": null, "docType": "FSSAI", "status": "UPLOADED", "reason": null, "fileUrl": "https://…", "file": { "mimeType": "image/jpeg", "sizeBytes": 912000, "originalName": "fssai.jpg" }, "uploadedByType": "VENDOR", "createdAt": "…", "updatedAt": "…", "reviewedAt": null }
    ],
    "hints": ["FSSAI", "SHOP_ESTABLISHMENT"],
    "limit": 10,
    "count": 1
  }
}
```

| Field | Matlab |
|---|---|
| `documents` | Owner ID pehle (ho to), phir business documents purane se naye |
| `documents[].status` | `UPLOADED` (admin ne nahi dekha) · `ACCEPTED` · `REJECTED` (`reason` ke saath) |
| `documents[].fileUrl` | Signed link, kuch minute ka. `null` = link ban nahi paya (dobara padho) |
| `hints` | Category ke recommended `docType` codes (admin set karta hai); category ke na ho to default `UDYAM`, `SHOP_ESTABLISHMENT`, `TRADE_LICENCE`. Chips dikhao, click → `docType` + title prefill |
| `limit` / `count` | Business documents ki limit (`vendor.onboarding.maxKycDocuments`) aur abhi kitne — owner ID nahi gina jaata. `count >= limit` → Add button band |

### Errors
| Status | Message | Kab |
|---|---|---|
| `422` | `brandId is required when acting as an admin` | |
| `403` | `Forbidden: …` | Vendor ne doosre brand ka `brandId` bheja |
| `404` | `Brand not found!` | |

---

## 23c. POST /brands/onboarding/documents

Ek titled business document jodna (`KYC_DOCUMENTS` screen, onboarding v2, P2 — D73). Screen **nahi** badalta — aage jaane ke liye #23g `continue` (ya #23f `skip`).

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body — multipart `file`, ya JSON `uploadId`
| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | string | ✅ | 2–80 chars. Chip se aaya ho to chip ka naam, warna vendor ka |
| `docType` | string | ❌ | `FSSAI` · `DRUG_LICENCE` · `SHOP_ESTABLISHMENT` · `TRADE_LICENCE` · `UDYAM` · `SHOP_PHOTO` · `ELECTRICITY_BILL` · `RENT_AGREEMENT` · `OTHER`. Na bhejo → `OTHER` |
| `file` / `uploadId` | file / ObjectId | ✅ ek | PDF, ya JPG / PNG (chhoti side ≥ 800 px), max 5 MB. Presign purpose `KYC_DOCUMENT` |

### Success — `201`
```json
{
  "success": true,
  "message": "Document added successfully.",
  "data": {
    "document": { "_id": "6731…d002", "purpose": "BUSINESS", "title": "FSSAI licence", "docType": "FSSAI", "status": "UPLOADED", "fileUrl": "https://…", "…": "…" },
    "documentsStatus": "PROVIDED"
  }
}
```

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | — | `Please give the document a title.` / title length / galat `docType` |
| `422` | `KYC_DOCUMENT_LIMIT` | `You can add up to N documents.` — `details.limit`. Upload hone se **pehle** check hota hai; do add ek saath aakhri slot pe aayein to save ke baad dobara — limit se bahar wala row + file wapas hata ke yahi `422` |
| `422` | `KYC_FILE_TYPE` · `KYC_IMAGE_TOO_SMALL` | #23a jaisa |
| `413` | — | 5 MB se badi |
| `503` | `KYC_STORAGE_UNAVAILABLE` | #23a jaisa |
| `409` | `ONBOARDING_SCREEN_MISMATCH` | `KYC_DOCUMENTS` screen abhi nahi aayi |

🆕 **P3:** naya document **hamesha** jod sakte hain — submit se pehle, review pending mein aur approve ke baad (D78, D95). Submit ke baad jode document ki history row banti hai (`DETAIL_ADDED`), score nahi badalta.

---

## 23d. PUT /brands/onboarding/documents/:documentId

Business document ka **naam badalna** aur / ya **file badalna** (onboarding v2, P2).

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body — sab optional, kam se kam ek
| Field | Notes |
|---|---|
| `title` | 2–80 |
| `docType` | #23c jaisa |
| `file` / `uploadId` | Nayi file = **replace** |

- **Sirf naam / docType** → wahi row, wahi `_id`.
- **Nayi file** → **naya row, naya `_id`** (status wapas `UPLOADED`); purana soft-delete, audit ke liye rehta hai. Panel response ka `document._id` rakhe.

### Success — `200`
```json
{ "success": true, "message": "Document updated successfully.", "data": { "document": { "_id": "6731…d009", "title": "Trade licence", "status": "UPLOADED", "fileUrl": "https://…", "…": "…" } } }
```

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | — | `Send a new title, a docType or a new file.` |
| `422` | `OWNER_ID_DOCUMENT` | Owner ID yahan nahi badalta — #23a se |
| `404` | — | `Document not found.` (doosre brand ka id bhi yahi) |
| `409` | — | `This document was just changed. Please refresh.` (do tab ek saath) |
| `409` | `ONBOARDING_LOCKED` | 🆕 P3: review pending — pehle se diya document badal / hata nahi sakte (naya jod sakte) |
| `409` | `DETAIL_ALREADY_PROVIDED` | 🆕 P3: approve ke baad document badalna / hatana support ka kaam (D95) |
| `422` / `413` / `503` | file codes | #23a jaisa |

---

## 23e. DELETE /brands/onboarding/documents/:documentId

Business document hatana — **soft delete** (row aur file audit ke liye rehte hain). Owner ID yahan se nahi (`422 OWNER_ID_DOCUMENT`).

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Success — `200`
```json
{ "success": true, "message": "Document removed successfully.", "data": { "documentsStatus": "PROVIDED", "count": 2 } }
```

Aakhri document gaya → `documentsStatus`: `SKIPPED` (vendor `KYC_DOCUMENTS` se aage nikal chuka ho) ya `NOT_STARTED` (abhi usi screen pe).

### Errors
`404 Document not found.` · `422 OWNER_ID_DOCUMENT` · `409 ONBOARDING_SCREEN_MISMATCH` (screen abhi nahi aayi) · 🆕 P3: `409 ONBOARDING_LOCKED` (review pending) / `409 DETAIL_ALREADY_PROVIDED` (approve ke baad).

---

## 23f. POST /brands/onboarding/skip

Skip ho sakne wali screen bina data ke paar karna (onboarding v2, P2 — D74).

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body
```json
{ "screen": "KYC_DOCUMENTS" }
```

| `screen` | Item | Agla |
|---|---|---|
| `KYC_DOCUMENTS` | `documentsStatus = SKIPPED` (documents pehle se hon to `PROVIDED` hi rehta hai) | `BANK_VERIFICATION` (status switch ke baad: `furthestScreen`) |
| `BANK_VERIFICATION` | `bankStatus = SKIPPED` (bank saved ho to nahi badalta) | `PARTNERSHIP_DEED` |
| `BRAND_PROFESSIONAL_DETAILS` | — (P3) | `OUTLET_DETAILS` |

### Success — `200`
```json
{ "success": true, "message": "Step skipped.", "data": { "currentScreen": "BANK_VERIFICATION" } }
```

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | `SCREEN_NOT_SKIPPABLE` | Baaki koi screen — `details.skippable` |
| `409` | `ONBOARDING_SCREEN_MISMATCH` | `screen` vendor ki **apni** screen nahi (back-edit se skip nahi) — `details.currentScreen` |
| `409` | `ONBOARDING_LOCKED` / `LEGAL_FIELD_LOCKED` | Admin decision pending / brand approved |

⚠️ Food category pe documents skip karte waqt panel FSSAI warning dikhaye (kanoon se zaroori) — server rokta nahi.

---

## 23g. POST /brands/onboarding/continue

Jis screen ka data doosre APIs se save hota hai, use aage badhana. **No body.** (Onboarding v2 — P2: `KYC_DOCUMENTS`; P3: setup screens.)

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

| Screen | Zaroori | `missing` code | Agla |
|---|---|---|---|
| `KYC_DOCUMENTS` | ≥ 1 business document (zero ho to #23f `skip`) | `DOCUMENT` | `BANK_VERIFICATION` (status switch ke baad: `furthestScreen`) |
| `BRAND_BASIC_DETAILS` | logo, email, contact number (`PUT /brands/update`, #32) | `LOGO`, `EMAIL`, `MOBILE` | `BRAND_PROFESSIONAL_DETAILS` |
| `BRAND_PROFESSIONAL_DETAILS` | kuch nahi (`skip` bhi chalega) | — | `OUTLET_DETAILS` |
| `OUTLET_DETAILS` | ≥ 1 live outlet; **har** live outlet ka manager OTP verified + location + work hours | `OUTLET`, `OUTLET_NOT_VERIFIED:<outletId>`, `OUTLET_LOCATION:<outletId>`, `OUTLET_WORK_HOURS:<outletId>` | `ONBOARDING_REVIEW` |

### Success — `200`
```json
{ "success": true, "message": "Moved to the next step.", "data": { "currentScreen": "BANK_VERIFICATION" } }
```

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | `ONBOARDING_STEP_INCOMPLETE` | `details.missing` (jaise `["DOCUMENT"]`), `details.screen` |
| `409` | `ONBOARDING_SCREEN_MISMATCH` | Vendor ki screen pe `continue` kaam nahi karta (wahan save se aage jaate hain) |
| `409` | `ONBOARDING_LOCKED` / `LEGAL_FIELD_LOCKED` | Admin decision pending / brand approved |

---

## 24. POST /brands/onboarding/submit

Brand ko admin review ke liye bhejna (onboarding v2, P3 — design §9, D5, D12, D13, D27, D80, D81, D100). **Purane `GET /brands/onboarding/system-verify` ki jagah** — wo route ab nahi hai.

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body
Koi nahi.

### Kab chalta hai

| Haalat | Kya hota hai |
|---|---|
| Pehla submit | Sirf `ONBOARDING_REVIEW` screen se. Screen → `UNDER_REVIEW` |
| Admin ne reject / revoke kiya (REMEDIATION) | Resubmit — vendor jahan bhi parked hai wahin se, **screen nahi hilti**. Naya attempt, purana superseded |
| Admin decision pending | `409 ONBOARDING_LOCKED` ("already under review") |
| Approved | `409 LEGAL_FIELD_LOCKED` |

### Zaroori (warna `422 ONBOARDING_STEP_INCOMPLETE`, `details.missing[]`)

| Code | Matlab |
|---|---|
| `BRAND_NAME` · `CATEGORY` · `REGISTRATION` | Basic Details |
| `GST` (GST path) · `PAN` + `ENTITY` (GST / NO_GST) · `OWNER_VERIFICATION` (UNREGISTERED) | Path ke mandatory items |
| `DEED` | 🆕 P5: partnership deed accept nahi — vendor ki apni ya admin ki offline (signed copy ke saath) |
| `BILLING_ADDRESS` | Billing address (#32b) — P4 |
| `LIVE_PLAN` | Chalu plan |
| `LOGO` · `EMAIL` · `MOBILE` | Basic brand details |
| `OUTLET` · `OUTLET_NOT_VERIFIED:<id>` · `OUTLET_LOCATION:<id>` · `OUTLET_WORK_HOURS:<id>` | Har live outlet complete |

Bank aur documents optional hain (skip ho sakte). Approve pe bhi wahi deed shart lagti hai (`409 DEED_NOT_ACCEPTED`, admin side).

### Success — `200`
```json
{
  "success": true,
  "message": "Your brand has been submitted for review.",
  "data": {
    "currentScreen": "UNDER_REVIEW",
    "attemptNumber": 1,
    "submittedAt": "2026-11-18T10:00:00.000Z",
    "systemChecks": [
      { "key": "PAN_VERIFIED", "points": 30, "passed": true, "skipped": false },
      { "key": "BANK_VERIFIED", "points": 35, "passed": false, "skipped": true },
      { "key": "BANK_NAME_MATCH", "points": 35, "passed": false, "skipped": true }
    ]
  }
}
```

`systemChecks` = wahi list jo `GET /brands/onboarding/status` (#20a) deta hai. **Kul score aur system ka verdict vendor ko nahi dikhta** — wo admin ki triage ke liye hai.

### System score (sirf admin ke liye, advisory)

Path ke hisaab se checks, har path ka total 100 (design §9.3):

| Check | GST | NO_GST | UNREGISTERED |
|---|---:|---:|---:|
| GST verified | 15 | — | — |
| GST active | 15 | — | — |
| PAN verified | 15 | 30 | 30 (owner ID se → 0) |
| GST legal name ↔ PAN name | 15 | — | — |
| Bank verified | 20 | 35 | 35 |
| Bank holder name ↔ GST / PAN / owner naam | 20 | 35 | 35 |

- Duplicate WhatsApp / email: −20.
- ≥ 90 `APPROVED` · ≥ 75 `MANUAL_REVIEW` · baaki `REJECTED` — **advisory**. Bank skip hua ya owner ne ID se verify kiya → status `MANUAL_REVIEW` pe fix (owner decision D100). Documents skip sirf remark.
- 🔴 **Kam score ab application reject nahi karta** (pehle karta tha aur vendor ko "fix karo" mode mein bhej deta tha). Faisla hamesha admin ka.

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | `ONBOARDING_STEP_INCOMPLETE` | `details.missing[]` — upar ki table |
| `409` | `ONBOARDING_SCREEN_MISMATCH` | Pehla submit `ONBOARDING_REVIEW` ke alawa kahin se |
| `409` | `ONBOARDING_LOCKED` | Pehle se review mein |
| `409` | `LEGAL_FIELD_LOCKED` | Brand approved hai |
| `409` | — | Do submit ek saath — `Please refresh and try again.` |

### ⚠️ Notes

**1. Notices:** vendor ko "application under review" (resubmit pe "updated details"), admins ko "awaiting review" — submit pe ek baar.

**2. Submit ke baad sirf add** (D78): kami wala item (bank, documents, NO_GST pe GST) jod sakte hain; PAN / GST / bank jodne pe score usi attempt pe dobara chalta hai (`latestScore`, D79) — naya attempt nahi, screen nahi hilti.

**3. Timeline:** `GET /brands/verifications/history` (#33) — `SYSTEM_VERIFIED` / `RESUBMITTED`, phir `DETAIL_ADDED`, `DOCUMENT_REVIEWED`.

---

## 25. PUT /brands/onboarding/accept-partnership

Vendor partnership deed accept karta hai — ya admin ki offline deed **confirm** karta hai (onboarding v2, P1 + 🆕 P5 — design §13, D26, D43, D57).

**Access:** Intended: VENDOR · Enforced: **VENDOR** (admin offline deed alag route se: `PUT /brands/admin/:brandId/deed`, admin doc #25g)

### Body
Koi nahi.

### Success — `200`
```json
{
  "success": true,
  "message": "Partnership Deed accepted!",
  "data": {
    "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
    "hasAcceptedPartnershipDeed": true,
    "deed": {
      "accepted": true, "acceptedByType": "VENDOR", "mode": "ONLINE", "version": "v1",
      "acceptedAt": "2026-11-19T10:00:00.000Z", "isLegacy": false, "hasProof": false, "proofUrl": null, "note": null,
      "vendorConfirmedAt": null, "vendorConfirmedVersion": null, "requiresDeedConfirmation": false
    },
    "currentScreen": "SUBSCRIBE_PLAN"
  }
}
```

🆕 P5: `deed` = wahi object jo status (#20a) deta hai. `version` = `Setting.vendor.onboarding.deedVersion` (admin badal sakta hai; badalne pe kisi ko dobara accept nahi karna — D103).

### Do kaam, ek route (P5)

| Haalat | Kya hota hai | `currentScreen` |
|---|---|---|
| `status.deed.requiresDeedConfirmation: true` (admin ki offline deed, abhi confirm nahi) | **Kisi bhi screen se** confirm: `vendorConfirmedAt`, `vendorConfirmedVersion` save. Record `ADMIN` / `OFFLINE` hi rehta hai | **Nahi hilti** — jo thi wahi |
| Vendor `PARTNERSHIP_DEED` pe | Vendor ka apna record (`VENDOR` / `ONLINE`, version) | Aage (neeche table) |
| Baaki sab | `409 ONBOARDING_SCREEN_MISMATCH` | — |

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `409` | `ONBOARDING_SCREEN_MISMATCH` | Vendor `PARTNERSHIP_DEED` screen pe nahi hai — `details.currentScreen` |
| `404` | — | `Brand not found.` |
| `403` | — | Role VENDOR nahi |

### ⚠️ Notes

**1. Accept sirf `PARTNERSHIP_DEED` screen pe** chalta hai. ⚠️ Pehle kisi bhi screen se chal jaata tha — KYC ke beech se accept karne pe vendor baaki KYC chhod kar aage nikal jaata tha, aur dashboard vendor ko bina kuch badle `200` milta tha. Ab dono `409`. 🆕 P5: ek hi exception — admin ki offline deed ka **confirm** (popup), kisi bhi screen se, bina screen hilaye. Confirm ho chuka → wahi `409` phir se.

**2. Agli screen:**
| Brand ka plan | `currentScreen` |
|---|---|
| Koi live plan nahi | `SUBSCRIBE_PLAN` |
| Admin ne KYC ke dauraan plan grant kar diya | `BRAND_BASIC_DETAILS` — "plan chuno" skip |

**3. `brand.hasAcceptedPartnershipDeed: true`** set hota hai (guard pass hone ke baad hi). 🆕 P5: poora record `brand.deed` mein; submit ke baad hua to history mein `DEED_ACCEPTED` / `DEED_CONFIRMED`.

---

## 26. PUT /brands/onboarding/acknowledge-approval

Admin approve karne ke baad vendor congratulations screen dismiss karta hai.

**Access:** Intended: VENDOR · Enforced: **VENDOR**

### Body
Koi nahi.

### Success — `200`
```json
{
  "success": true,
  "message": "Welcome aboard! Redirecting you to your dashboard.",
  "data": {
    "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
    "status": "APPROVED",
    "isApproved": true,
    "isApprovalAcknowledged": true,
    "approvalAcknowledgedAt": "2026-08-22T14:00:00.000Z",
    "currentScreen": "DASHBOARD"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Brand not found.` | |
| `400` | `Your brand is not approved yet. Please wait for the admin's decision.` | Brand abhi approve hi nahi hua |
| `409` | `Brand approval changed while acknowledging. Please refresh and try again.` | Beech mein approval badal gaya (jaise revoke) |

### ⚠️ Notes
**1. Screen aage** → `DASHBOARD`. Onboarding ka aakhri step.
**2. History me `APPROVAL_ACKNOWLEDGED` record hoti hai.**
**3. Sirf approved brand pe kaam karta hai.**

> 📖 Code: `services/systemVerify/acknowledgeBrandApproval.js` (alag doc nahi hai)

---

## 27. PUT /brands/onboarding/update-basic-details

Basic Details **edit** — sidebar ka Basic Details preview, aur admin reject ke baad remediation (onboarding v2, P1). Same service as #20.

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body — sab optional, kam se kam ek
| Field | Type | Validation |
|---|---|---|
| `brandName` | string | 2–25 chars (D112) |
| `categoryId` + `subCategoryIds` | ObjectId + ObjectId[] | **Saath mein hi**; rules #20 jaise |
| `kycPath` | string | `GST` · `NO_GST` · `UNREGISTERED` |
| `businessEntityType` | string | BUSINESS_ENTITY_TYPE (UNREGISTERED pe nahi) |
| `legalBusinessName` 🆕 | string | P6b — **sirf admin** (2–200). Vendor bheje → `403` (legal name PAN / GST / owner verification se server banata hai, D67) |

```json
{ "brandName": "Shree Radhes Cafe", "kycPath": "UNREGISTERED" }
```

### Success — `200`
#20 jaisa: `{ brand: { … }, currentScreen }`.

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | — | `Please provide at least one detail to update.` / `categoryId and subCategoryIds go together` |
| `422` | `SUBCATEGORY_LIMIT` | Limit se zyada subcategories |
| `409` | `ONBOARDING_SCREEN_MISMATCH` | Kisi field ka step abhi tak nahi aaya (jaise status chunne se pehle entity), ya path pe nahi |
| `409` | `REGISTRATION_STATUS_LOCKED` | Status badalna lock ke baad |
| `409` | `ONBOARDING_LOCKED` / `LEGAL_FIELD_LOCKED` | Admin decision pending / brand approved (note 4) |
| `403` | — | Vendor ne `legalBusinessName` bheja |

### ⚠️ Notes

**1. Screen nahi badalti** — sirf ek exception: submit se pehle (FIRST_PASS) business status badla to vendor naye path ki pehli verification screen pe jaata hai (#20 note 3). Remediation mein status badalne pe bhi screen nahi hilti.

**2. `currentScreen` ab nahi liya jaata** (server ka hai — design D2) — bheje to chupchaap hat jaata hai. `legalBusinessName` vendor bheje → `403 The legal name comes from your PAN / GST. Please contact support if it needs correcting.` (D67); sirf admin bhej sakta hai.

**3. Rejection ke baad ka flow:** admin reject → vendor yahan / KYC routes se fields theek kare → `POST /brands/onboarding/submit` (#24) se resubmit. History me `REMEDIATION_UPDATED`.

**4. 🆕 P3 — submit ke baad:** review pending → `409 ONBOARDING_LOCKED` (kuch nahi badalta). Approve ke baad sirf: UNREGISTERED → `GST` / `NO_GST` upgrade (`PUT update-basic-details { "kycPath": "NO_GST" }`, ya `POST add-basic-details { step: "REGISTRATION_STATUS", kycPath }`; sirf `kycPath` akela bhejo; approval rehta hai, screen nahi hilti, admin ko notice) aur entity **ek baar** jab khaali ho (upgrade ke baad). Baaki legal edit → `409 LEGAL_FIELD_LOCKED`.

> 📖 Poora remediation design → [brand_rejection_remediation_design.md](./brand_rejection_remediation_design.md)

---

# KYC Verification APIs

Live verification — CGPey provider se. **Jawab server pe save hota hai** (`KycVerification`, onboarding v2 P0) aur response mein `verificationId` aata hai. PAN / GST / bank record tab banta hai jab vendor wo id `add-*-details` (#21–#23) pe bhejta hai.

Teeno pe **`isVendorOrAdmin`** — vendor apna brand; admin `?brandId=` (paid call admin ke naam se record hoti hai). Teeno paid call se **pehle** step guard chalate hain: PAN → `PAN_VERIFICATION` / `OWNER_VERIFICATION`, GST → `GST_VERIFICATION`, bank → `BANK_VERIFICATION` screen abhi nahi aayi ya path pe nahi → `409 ONBOARDING_SCREEN_MISMATCH` (`details.currentScreen`), paisa nahi lagta. Admin reject / revoke ya submit ke baad ye guard nahi lagta.

## 28. POST /verification/brands/onboarding/verify-pan

CGPey se PAN check, **jawab server pe save** (`KycVerification`), aur `verificationId` lautata hai. *(Onboarding v2, P0 — D16, D47, D48, D98.)*

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body
| Field | Type | Required | Validation |
|---|---|---|---|
| `pan` | string | ✅ | `/^[A-Z]{5}[0-9]{4}[A-Z]$/`, auto-uppercase + trim |

```json
{ "pan": "AABCM1234K" }
```

### Success — `200`
```json
{
  "success": true,
  "message": "PAN verified successfully",
  "data": {
    "verificationId": "6730f1a2b3c4d5e6f7a8b901",
    "type": "PAN",
    "isVerified": true,
    "status": "SUCCESS",
    "message": "PAN verified successfully",
    "reused": false,
    "verifiedAt": "2026-11-18T10:00:00.000Z",
    "nameOnRecord": "MOCHA HOSPITALITY PRIVATE LIMITED",
    "details": { "pan": "AABCM1234K", "panType": "COMPANY", "fullName": "MOCHA HOSPITALITY PRIVATE LIMITED" },
    "panType": "COMPANY",
    "suggestedEntity": "PRIVATE_LIMITED",
    "providerResponse": { "…": "CGPey ka jawab, jaisa aaya" }
  }
}
```

| Field | Matlab |
|---|---|
| `verificationId` | `add-pan-details` (#21) pe bhejna hai |
| `isVerified` | server ka faisla: provider `success` + `data.status: SUCCESS` + naam diya |
| `reused` | `true` = isi brand ka pichhla verified jawab `vendor.kyc.reuseDays` (default 30) din ke andar tha — **paid call nahi hui** |
| `details` | review sub-step ke liye mapped fields |
| `suggestedEntity` | PAN type se entity ka sujhaav (`P` PROPRIETORSHIP, `C` PRIVATE_LIMITED, `F` PARTNERSHIP, `E` LLP, `T` TRUST; baaki `null`) |

**Fail hua PAN bhi `200`** deta hai: `isVerified: false`, `status: "FAILED"`, `message` provider ka reason (na ho to "PAN could not be verified…"). Ye bhi ek paid call thi, isliye save hoti hai — lekin #21 pe ye id `422 VERIFICATION_FAILED` degi.

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | — | `PAN Number is required` / `Please enter a valid PAN Number` |
| `400` | `DOCUMENT_IN_USE` | ye PAN kisi **aur** brand pe save hai — CGPey call hi nahi hoti |
| `409` | `DETAIL_ALREADY_PROVIDED` | Brand ka PAN save ho chuka aur ye doosra PAN hai (P2) — paid call nahi hoti. UNREGISTERED ka owner PAN submit tak badal sakta hai |
| `422` | `PAN_NOT_IN_GSTIN` | GST path pe GSTIN wala PAN nahi — paid call nahi hoti |
| `422` | `OWNER_PAN_NOT_PERSONAL` | UNREGISTERED path pe business PAN (owner ka personal PAN chahiye) — paid call nahi hoti |
| `409` | `DETAIL_ALREADY_PROVIDED` | Submit ke baad (pending / approved) PAN pehle se saved hai — paid call nahi hoti. Missing ho to verify chalta hai |
| `409` | `ONBOARDING_SCREEN_MISMATCH` | PAN / owner screen abhi nahi aayi ya path pe nahi — paid call nahi hoti |
| provider ka status | `PROVIDER_ERROR` | CGPey tak pahunch hi nahi paaye, ya CGPey ne call hi mana kar di (down, IP allow-list, credentials, validation) — `details.provider`, `details.requestId`, `details.raw`. Kuch save nahi hota. ⚠️ CGPey ka error status jisme **check ka apna nateeja** ho (PAN / GST: `data.status`; bank: `result.is_valid`) ye nahi hai — wo jawab hai: `200 isVerified: false` + reason, save hota hai (D115). Panel ek hi message dikhaye: "Verification service abhi jawab nahi de rahi, thodi der baad try karein" (D114) |

### ⚠️ Notes

**1. Har call chargeable ho sakti hai** — retry loop mat banayein; user explicitly "Verify" dabaye. Same PAN dobara verify karne pe window ke andar paisa nahi lagta (`reused: true`).

**2. Reuse sirf server ke apne stored jawab se** (D47). Pehle saved PAN record ka "provider response" reuse hota tha — jo client ne likha tha (design P19).

---

## 29. POST /verification/brands/onboarding/verify-gst

CGPey se GSTIN check, jawab server pe save, `verificationId` lautata hai. *(Onboarding v2, P0.)*

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body
| Field | Type | Required | Validation |
|---|---|---|---|
| `gstNumber` | string | ✅ | `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/` |

```json
{ "gstNumber": "23AABCM1234K1ZP" }
```

### Success — `200`
```json
{
  "success": true,
  "message": "GST verified successfully",
  "data": {
    "verificationId": "6730f1a2b3c4d5e6f7a8b902",
    "type": "GST",
    "isVerified": true,
    "status": "SUCCESS",
    "reused": false,
    "nameOnRecord": "MOCHA HOSPITALITY PRIVATE LIMITED",
    "details": {
      "gstNumber": "23AABCM1234K1ZP",
      "legalName": "MOCHA HOSPITALITY PRIVATE LIMITED",
      "tradeName": "CAFE MOCHA",
      "constitutionOfBusiness": "Private Limited Company",
      "taxpayerType": "REGULAR",
      "registrationStatus": "SUCCESS",
      "registrationDate": "2017-07-01T00:00:00.000Z",
      "address": { "buildingNumber": "4", "location": "Scheme 54, Vijay Nagar", "city": "Indore", "district": "Indore", "state": "Madhya Pradesh", "pin": "452010", "country": "India" }
    },
    "isActive": true,
    "registrationStatus": "SUCCESS",
    "constitution": "Private Limited Company",
    "suggestedEntity": "PRIVATE_LIMITED",
    "panFromGstin": "AABCM1234K",
    "gstStateCode": "23",
    "addressOnRecord": "4, Scheme 54, Vijay Nagar, Indore, Madhya Pradesh, 452010",
    "providerResponse": { "…": "raw" }
  }
}
```

| Field | Matlab |
|---|---|
| `isActive` | `false` = cancelled / suspended / inactive / pending cancellation, ya cancellation date. Aisa GSTIN #22 pe `422 GSTIN_NOT_ACTIVE` dega |
| `suggestedEntity` | GST constitution se entity (`GST_TO_BRAND_ENTITY_MAP`); anjaan constitution → `null` |
| `panFromGstin` | GSTIN ke characters 3–12 (PAN screen prefill ke liye) |
| `gstStateCode` | GSTIN ki state (purane codes naye pe: 28 → 37, 25 → 26) |

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | — | `GST number is required` / `Please enter a valid GSTIN` |
| `400` | `DOCUMENT_IN_USE` | ye GSTIN kisi aur brand pe save hai — CGPey call nahi hoti |
| `409` | `DETAIL_ALREADY_PROVIDED` | Brand ka GSTIN save ho chuka aur ye doosra hai (P2) — paid call nahi hoti |
| `409` | `DETAIL_ALREADY_PROVIDED` | Submit ke baad (pending / approved) GSTIN pehle se saved hai — paid call nahi hoti. Missing ho to verify chalta hai |
| `409` | `ONBOARDING_SCREEN_MISMATCH` | GST screen abhi nahi aayi ya path pe nahi — paid call nahi hoti |
| `422` | `PAN_NOT_IN_GSTIN` | GSTIN brand ke saved PAN ka nahi — `details.panOnBrand`, paid call nahi hoti |
| `422` | `BILLING_STATE_GSTIN_MISMATCH` | Saved billing address doosri state ka — pehle #32b; paid call nahi hoti |
| provider ka status | `PROVIDER_ERROR` | CGPey tak nahi pahunche, ya CGPey ne call mana kar di — kuch save nahi (#28 jaisa, D114). Check ka nateeja wala error status jawab hai, `200 isVerified: false` (D115) |

### ⚠️ Note
Provider ka `constitutionOfBusiness` string `BUSINESS_ENTITY_TYPE` enum pe map hota hai (`GST_TO_BRAND_ENTITY_MAP`). Ye mapping GST save pe entity bharti hai (#22 `derived.businessEntityType`) aur GST path pe galat entity ko `409 ENTITY_FROM_GST` deti hai (#20). Score mein entity ke points nahi — sirf admin ke liye remark / flag.

| GST constitution | Brand `businessEntityType` jo match maana jaata hai |
|---|---|
| Proprietorship | `PROPRIETORSHIP` |
| Partnership | `PARTNERSHIP` |
| Private Limited Company | `PRIVATE_LIMITED` **ya** `ONE_PERSON_COMPANY` |
| Public Limited Company | `PUBLIC_LIMITED` |
| Limited Liability Partnership · Foreign Limited Liability Partnership | `LLP` |
| Society/ Club/ Trust/ AOP | `TRUST` |
| Hindu Undivided Family · Government Department · Public Sector Undertaking · Unlimited Company · Local Authority · Statutory Body · Foreign Company · Others | `OTHERS` |

⚠️ OPC ka GST par apna constitution nahi hota — wo Private Limited Company ke roop me register hoti hai, isliye ek GST value do brand types accept karti hai. `/` ke aas-paas spaces aur case se farq nahi padta. Unmapped constitution kabhi match nahi hota, brand ka type khaali ho tab bhi nahi.

---

## 30. POST /verification/brands/onboarding/verify-bank

Penny-drop verification, jawab server pe save, `verificationId` lautata hai. *(Onboarding v2, P0.)*

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — 🆕 P6: admin `?brandId=` ke saath, vendor (owner) ki screen aur locks pe (design §15, D104; admin doc [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-)). Vendor ke liye kuch nahi badla

### Body
| Field | Type | Required | Validation |
|---|---|---|---|
| `accountNumber` | string | ✅ | `/^\d{9,18}$/` |
| `ifscCode` | string | ✅ | `/^[A-Z]{4}0[A-Z0-9]{6}$/`, auto-uppercase |

```json
{
  "accountNumber": "912010012345678",
  "ifscCode": "UTIB0001234"
}
```

### Success — `200`
```json
{
  "success": true,
  "message": "Bank verified successfully",
  "data": {
    "verificationId": "6730f1a2b3c4d5e6f7a8b903",
    "type": "BANK",
    "isVerified": true,
    "status": "SUCCESS",
    "reused": false,
    "nameOnRecord": "MOCHA HOSPITALITY PRIVATE LIMITED",
    "details": {
      "accountHolderName": "MOCHA HOSPITALITY PRIVATE LIMITED",
      "maskedAccountNumber": "***********5678",
      "accountLast4Digits": "5678",
      "ifscCode": "UTIB0001234",
      "bankName": "AXIS BANK",
      "branchName": "VIJAY NAGAR"
    },
    "bankName": "AXIS BANK",
    "branchName": "VIJAY NAGAR",
    "isNameMatch": null,
    "providerResponse": { "…": "raw" }
  }
}
```

**Verified tabhi** jab provider `success`, `status: SUCCESS`, `result.is_valid`, `result.recommended_action: "PROCEED"` — chaaron — aur holder ka naam de. Fail drop bhi `200` (`isVerified: false`, `message` bank ka reason, jaise "Account closed"); #23 pe ye id `422 VERIFICATION_FAILED` degi.

⚠️ **D115 (2026-11-20):** CGPey fail drop **HTTP 400** ke saath bhejta hai (body: `status: "FAILED"`, `result.is_valid: false`, `result.recommended_action` jaise `AC_RETRY_TXN`, `chargeble`). Pehle server ise `PROVIDER_ERROR` bana deta tha ("service jawab nahi de rahi") — galat account number pe bhi. Ab ye bhi upar jaisa `200 isVerified: false`, save hota hai (reuse nahi hota — agli koshish nayi call). `PROVIDER_ERROR` sirf tab jab jawab mein bank ka result hi na ho.

⚠️ Reuse ke liye account number **aur IFSC** dono same hone chahiye.

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | — | `Account number is required` / `Please enter a valid account number!` / IFSC errors |
| `400` | `DOCUMENT_IN_USE` | ye account kisi aur brand pe save hai — penny drop nahi hota |
| `409` | `DETAIL_ALREADY_PROVIDED` | Brand ka bank save ho chuka aur ye doosra account / IFSC hai (P2) — penny drop nahi hota |
| `409` | `DETAIL_ALREADY_PROVIDED` | Submit ke baad (pending / approved) bank pehle se saved hai — penny drop nahi hota. Missing ho to verify chalta hai |
| `409` | `ONBOARDING_SCREEN_MISMATCH` | Bank screen abhi nahi aayi — penny drop nahi hota |
| provider ka status | `PROVIDER_ERROR` | CGPey tak nahi pahunche, ya CGPey ne call mana kar di — kuch save nahi (#28 jaisa, D114). Check ka nateeja wala error status jawab hai, `200 isVerified: false` (D115) |

### ⚠️ Notes

**1. `beneficiaryName` mat bhejo — bhejoge to server chupchaap hata deta hai (D114, 2026-11-20).** Pehle ye doc ise bhejne ko kehta tha aur server ise CGPey tak le jaata tha; CGPey koi bhi extra field mana karta hai (`400 "beneficiaryName" is not allowed`, stage pe pakda gaya), to bank verify hi nahi hota tha. Ab CGPey ko sirf `accountNumber` + `ifscCode` jaate hain. Name match server khud nikalta hai (account holder ka naam vs GST / PAN / legal name, ≥ 85% — #23 note 1). Account holder ka naam **sirf bank ke jawab se** — bank naam na de to `isVerified: false`.

**2. Penny-drop real transaction hai** — provider account me ₹1 bhejta hai. Retry mahenga hai; window ke andar same account + IFSC dobara verify karne pe nahi hota (`reused: true`).

**3. Verdict `recommended_action: "PROCEED"` hai** (pehle is doc mein `ACCEPT` likha tha — galat tha; stage ke 17 asli jawab `PROCEED` dikhate hain).

---

# Brand APIs

## 31. GET /brands/get

Brand ka poora detail — 14 lookups ke saath.

> 🆕 **P2 (2026-10-25, live 2026-11-04):** response me `customerVisibility` — aapka brand customers ko dikhta
> hai ya nahi, aur kyun nahi. Neeche Note 8. **Customer par live hone ki shartein:** approved brand +
> kam se kam ek **location wala** active outlet + (admin switch ON par) ek dikhne layak album
> (`minItemsPerSection` visible media). Voucher zaroori nahi (profile / search ke liye) — home feed par
> bina-voucher brand sirf naye app (`includeBrandsWithoutVoucher=true`) me aur sirf album ke saath aata
> hai; purana app feed me sirf voucher wale brand dikhata hai — [plan](./brand_feed_outlet_rule_plan.md).

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership** (🔧 ownership 2026-10-26, stage + prod par live 2026-10-27 — hotfix)

### Query Params
| Param | Type | Required | Notes |
|---|---|---|---|
| `brandId` | ObjectId | ❌ | **Vendor ke liye optional** — na do to token ka brand. Kisi **aur** brand ki id → `403` (✅ prod par live 2026-10-27) |

```http
GET /brands/get
```

### Success — `200`
```json
{
  "success": true,
  "message": "Brand details fetched successfully",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c3a1",
    "brandName": "Cafe Mocha",
    "legalBusinessName": "mocha hospitality private limited",
    "description": "artisanal coffee and continental bites",
    "logo": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/brands/mocha-logo.jpg",
    "coverImage": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/brands/mocha-cover.jpg",
    "email": "hello@cafemocha.in",
    "whatsappNumber": "9812345678",
    "uniqueId": "TDB000078",
    "merchantId": "TM-362P-7M7E-ZB2N",
    "businessRegistrationStatus": "REGISTERED",
    "businessEntityType": "PRIVATE_LIMITED",
    "status": "PENDING",
    "isApproved": false,
    "isSubscribed": true,
    "hasAcceptedPartnershipDeed": true,
    "followersCount": 1240,
    "avoidanceCount": 12,
    "joinedDate": "2026-03-15T00:00:00.000Z",
    "subBrandsLimit": 10,
    "subBrandsUsed": 3,
    "isActive": true,
    "customerVisibility": { "isVisible": false, "reasons": ["BRAND_NOT_LIVE", "NO_LOCATED_OUTLET"], "showcaseReady": true, "hasLiveVoucher": false },
    "categoryId": "68f1a2b3c4d5e6f7a8b9c0e1",
    "subCategoryId": "68f1a2b3c4d5e6f7a8b9c0f1",
    "subCategoryIds": ["68f1a2b3c4d5e6f7a8b9c0f1", "68f1a2b3c4d5e6f7a8b9c0f2"],
    "subCategories": [
      { "_id": "68f1a2b3c4d5e6f7a8b9c0f1", "name": "cafe", "image": "https://…" },
      { "_id": "68f1a2b3c4d5e6f7a8b9c0f2", "name": "bakery", "image": "https://…" }
    ],
    "isVerified": false,
    "onboarding": { "kycPath": "GST", "…": "…" },
    "deed": { "acceptedByType": "VENDOR", "mode": "ONLINE", "version": "v1", "…": "…" },
    "user": { "_id": "…", "role": "VENDOR", "name": "rahul sharma" },
    "pan": { "pan": "AABCM1234K", "isVerified": true },
    "gst": { "gstNumber": "23AABCM1234K1ZP", "isVerified": true },
    "bank": { "accountHolderName": "MOCHA HOSPITALITY PRIVATE LIMITED", "maskedAccountNumber": "***********5678", "accountLast4Digits": "5678", "ifscCode": "UTIB0001234", "bankName": "AXIS BANK", "isVerified": true, "verificationStatus": "SUCCESS" },
    "systemVerify": { "score": 94, "status": "APPROVED" },
    "subscribed": { "status": "ACTIVE", "endDate": "2026-09-22T00:00:00.000Z" },
    "category": { "name": "food & beverages" },
    "subCategory": { "name": "cafe" },
    "location": { "formattedAddress": "…", "geo": {} },
    "workHours": { "monday": {}, "tuesday": {} },
    "firstSubBrand": { "_id": "…", "storeId": "MOCHA-VN-01", "uniqueId": "TDS000201", "user": {}, "location": {}, "workHours": {} },
    "createdAt": "2026-03-15T00:00:00.000Z",
    "updatedAt": "2026-08-22T14:00:00.000Z"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | `brandId` me doosre brand ki id (✅ prod par live 2026-10-27) |
| `404` | `Brand not found!` | Brand nahi mila / deleted |
| `404` | `No brand is linked to your account` | Account par brand nahi |
| `422` | `Invalid brandId` | Joi format check |

### ⚠️ Notes

**1. Vendor ke liye ye "my brand" endpoint hai** — `brandId` skip karo.

**2. Vendor ko apna PAN/GST/Bank dikhna sahi hai, lekin bank masked (🆕 D116, 2026-11-21).** Vendor ke `bank` mein `accountNumber`, raw `verificationResponse` aur provider ka `user` **nahi** aate — sirf `maskedAccountNumber`, `accountLast4Digits`, `accountHolderName`, `ifscCode`, `bankName`, `branchName`, status fields. Admin ko poora record milta hai. Panel last 4 hi dikhaye aur poora number kahin save na kare. Customer ko route `403` deta hai (purana "customer ko bhi milta hai" ab sach nahi). ✅ **Stage / prod par live (hotfix, 2026-10-27):** pehle `brandId` me **doosre** brand ki id bhejne par uska poora detail aa jaata tha (ownership check nahi tha); ab `resolveActorBrand` — sirf apna brand, doosre ka `403` (admin doc Appendix B #6). Panel ko kuch nahi badalna — `brandId` skip karta hai to pehle jaisa hi.

**3. ✅ Approval fields brand pe hi mil jaate hain.** `status` (`SYSTEM_VERIFICATION_STATUS`), `isApproved`, `isReviewed`, `isRejected`, `isRevoked`, `rejectionReason`, `revokeReason`, `isApprovalAcknowledged` — sab `reviewBrandVerification` (admin review) aur `acknowledgeBrandApproval` se maintain hote hain. Vendor panel inhi se approval banner/state decide kar sakta hai; `systemverifies[0]` sirf score aur flags ke liye chahiye.

**4. `subBrandsLimit` / `subBrandsUsed` plan ka outlet pool batate hain** — dashboard pe "3 of 10 outlets used".

**5. Response bhaari hai** — dashboard pe ek baar call karke cache karein.

**6. Lookup fields singular objects hain, arrays nahi** — `buildAggregateLookup` default se `$unwind` karta hai. Naam collection ka nahi, lookup ke `as` ka hai: `pan`, `gst`, `bank`, `location`, `workHours`, `category`, `subCategory`, `systemVerify`, `subscribed`, `firstSubBrand`. Ek exception: 🆕 `subCategories` **array** hai.

**6a. 🆕 Onboarding v2 fields** — poora brand document aata hai (sirf `__v` hatta hai), isliye `subCategoryIds[]`, `onboarding` (kycPath, item statuses, `submittedAt` …), `deed` aur `isVerified` (badge) bhi milte hain:
- `subCategories` = `[{ _id, name, image }]` brand ke **apne order** mein (`subCategoryIds`, ya purane brand ki akeli `subCategoryId`). `subCategory` (single lookup) wahi rehta hai aur pehli wali hai; raw `subCategoryIds` bhi aata hai.
- `location` = brand ka **billing address** (`Brand.locationId`, #32a), outlet ka address nahi.
- Onboarding / deed ki routing ke liye `GET /brands/onboarding/status` (#20a) padhein — yahan ka `onboarding` raw hai.

**7. Admin ke internal "Coming soon" fields vendor ko kabhi nahi aate (2026-10-23).** Admin kisi real brand ko launch tak customers ke liye "Coming soon" rakh sakta hai (`isRealDummy` + admin ka note). Ye admin-only hai — yahan aur `PUT /brands/update` ke response me ye keys **nahi** hoti. Vendor panel ko kuch nahi karna.

**8. 🆕 `customerVisibility` — "customers ko mera brand dikh raha hai?" (P2, live 2026-11-04).** Hamesha object:

| Field | Matlab |
|---|---|
| `isVisible` | Customers ko brand dikhta hai (admin switch jaisa abhi hai uske hisaab se) |
| `reasons[]` | Kyun nahi — **saare** reasons, ek nahi. Khaali = sab theek |
| `showcaseReady` | Kam se kam ek album customers ko dikhne layak hai (visible, active, `minItemsPerSection` media) |
| `hasLiveVoucher` | Kisi location wale outlet par live, claim-able voucher (claimable offer, plan claim le sake) — sirf jaankari. Brand ki status / album isme nahi: feed par voucher card tabhi jab `isVisible` bhi `true` ho |

| `reasons` | Vendor ko kya dikhayein |
|---|---|
| `BRAND_NOT_LIVE` | Brand approved / active nahi, ya rejected / revoked |
| `NO_OUTLET` | "Ek outlet banaiye / chalu kijiye" |
| `NO_LOCATED_OUTLET` | "Outlet ka address (location) dalein" — bina location ka outlet customer nahi dekh sakta |
| `NO_VERIFIED_OUTLET` 🆕 | "Outlet manager ka WhatsApp verify karwayein" — location wala outlet hai, par kisi ka manager OTP verify nahi (naya outlet jiska OTP nahi aaya, ya admin ne number badla — `REVERIFY`). `NO_LOCATED_OUTLET` ke saath kabhi nahi aata. P10.5, live 2026-11-04 |
| `NO_VISIBLE_SHOWCASE` | "Ek album me kam se kam N photo / video dalein aur use visible aur on (active) rakhein" (admin switch ON hone par hi aata hai) |

⚠️ Showcase section ki rows (#44 / #45) ka `customerVisibility` (`isLive`, `HIDDEN` / `INACTIVE` / `NOT_ENOUGH_MEDIA`) **alag object** hai — wo ek album ke baare me hai, ye poore brand ke.

Panel tip: `showcaseReady: false` ho to switch OFF par bhi "album dalein" ka halka note dikhayein — switch ON hote hi wahi brand chhup jayega, aur bina voucher wale brand ko feed card ke liye album hamesha chahiye. ✅ Customer app par ye rule har surface par lagta hai (P3–P6: profile, brand feed, voucher feed, search) — stage + prod par live 2026-11-04; ye field wahi sach batata hai.

---

## 32. PUT /brands/update

Brand ki public profile update.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership** (🔧 ownership 2026-10-26, stage + prod par live 2026-10-27 — hotfix)

### Query Params
| Param | Type | Required | Notes |
|---|---|---|---|
| `brandId` | ObjectId | ❌ | Vendor ke liye optional — token se. Kisi **aur** brand ki id → `403` (✅ prod par live 2026-10-27 — pehle doosre brand ka naam / logo / description badal jaata tha) |

### Body — sab optional
| Field | Type | Validation | Notes |
|---|---|---|---|
| `brandName` | string | 2–25 chars (D112) | Display case me store (sab chhote akshar bheje to har shabd ka pehla akshar bada) |
| `email` | string | Valid email | 🔴 Ab **account** par bhi likhta hai — niche note 5 |
| `mobile` | string | 10 digits, first `6-9` | 🔴 Wahi — niche note 5 |
| `useWhatsappAsMobile` 🆕 | boolean | — | P8 (D83) — "Same as WhatsApp number": server owner ka **verified** WhatsApp number `mobile` mein daalta hai aur **verified** maanta hai (WhatsApp OTP se number pehle hi prove hai). `mobile` ke saath mat bhejo (`422`). WhatsApp verified nahi → `422 OWNER_NUMBER_NOT_VERIFIED` |
| `description` | string | – | |
| `joinedDate` | date | – | |
| ~~`isOnboarding`~~ · ~~`subCategoryId`~~ | — | — | ⛔ **Hata diye (onboarding v2 P3, D25).** Bheje to chupchaap strip — kuch nahi hota, screen nahi hilti. Aage badhna: `POST /brands/onboarding/continue` (#23g). Subcategories: `update-basic-details` (#27) |
| `logo` | file | JPG · PNG · WebP · GIF | **Multipart**, field name `logo` |
| `coverImage` | file | JPG · PNG · WebP · GIF | 🆕 **Multipart**, field name `coverImage` |
| `logoUploadId` | ObjectId 🆕 | – | Presigned — purpose `BRAND_LOGO` |
| `coverImageUploadId` | ObjectId 🆕 | – | Presigned — purpose `BRAND_COVER`. Har slot ka apna purpose hai, to logo ka id cover ki jagah nahi chalega |

🔴 **Uploads ab transaction ke BAHAR hote hain.** Pehle wo `withTransaction` ke andar the, yaani do file jitni der leti utni der ek Mongo transaction khuli rehti — aur Mongo ki apni 60-second seemaa paar hote hi aapki poori edit chali jaati, us wajah se jiska database se koi lena-dena nahi tha. Brand pehle check hota hai, to galat id ab bhi kuch nahi kharchti.

**Cover image** — brand profile ke peeche wali chaudi tasveer. Pehle ye field
model me thi aur 8 read pipelines use maangti thi, par **likhne ka koi raasta hi
nahi tha** — customer app ko hamesha `null` milta tha.

Dono file alag-alag hain: sirf `coverImage` bhejne se logo waisa hi rehta hai,
aur ulta bhi. Jo tasveer replace hoti hai wahi delete hoti hai, **save ke baad**.

⚠️ Ab file ka type check hota hai. Galat file par `422` milega jisme accepted
types likhe honge — pehle wo `500 Something went wrong` ban jaata tha aur kahin
nahi likha hota tha ki file ki wajah se hai.

```json
{ "brandName": "Cafe Mocha", "description": "Artisanal coffee and continental bites", "email": "hello@cafemocha.in" }
```

**Onboarding mein (BRAND_BASIC_DETAILS):** logo + email + contact number yahin se, phir `POST /brands/onboarding/continue`. Ye endpoint kabhi screen nahi badalta.

### Success — `200`
```json
{
  "success": true,
  "message": "Brand details updated successfully",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c3a1",
    "brandName": "Cafe Mocha",
    "description": "artisanal coffee and continental bites",
    "logo": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/brands/mocha-logo-v2.jpg",
    "categoryId": "68f1a2b3c4d5e6f7a8b9c0e1",
    "subCategoryId": "68f1a2b3c4d5e6f7a8b9c0f1",
    "updatedAt": "2026-08-22T14:10:00.000Z"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | `brandId` me doosre brand ki id (✅ prod par live 2026-10-27) — upload se pehle, kuch kharch nahi |
| `404` | `Brand not found!` | |
| `404` | `No brand is linked to your account` | Account par brand nahi |
| `404` | `User not found!` | Brand ka owner user missing |
| `422` | `Brand name must be at least 2 characters` / `Brand name cannot exceed 25 characters` | |
| `422` | `Please enter a valid email address` / `Please enter a valid 10 digit mobile number` | |
| `422` | 🆕 `Send either mobile or useWhatsappAsMobile, not both.` | P8 |
| `422` | 🆕 `Your WhatsApp number is not verified yet, so it cannot be used as the contact number.` · `details.code: OWNER_NUMBER_NOT_VERIFIED` | P8 — owner ne WhatsApp OTP se kabhi sign in nahi kiya (admin ka banaya vendor) |
| `403` | `You cannot change this account's contact details...` | 🆕 Aap na is brand ke maalik hain na admin (`details.code: IDENTITY_WRITE_FORBIDDEN`) |
| `409` | `That email address is already in use on another account.` | 🆕 Koi doosra vendor wahi email/mobile rakhta hai |
| `409` | `ONBOARDING_LOCKED` | 🆕 P3: application review mein hai — sirf khaali field bhar sakte hain (logo / cover / description / email / mobile). Bhari cheez badalna ya `brandName` badalna mana |
| `409` | `LEGAL_FIELD_LOCKED` | 🆕 P3: approve ke baad `brandName` vendor nahi badal sakta (support / admin). Baaki profile approve ke baad bhi editable |
| `500` | *(upload error)* | Cloudinary fail |

### ⚠️ Notes

**1. 🆕 P3 — kab kya badal sakta hai (vendor; admin hamesha sab):** submit se pehle aur admin ke reject / revoke ke baad sab. Review pending → sirf **khaali** field bharna (`409 ONBOARDING_LOCKED`). Approve ke baad → `brandName` admin ka (`409 LEGAL_FIELD_LOCKED`), baaki sab theek. Wahi value dobara bhejna badlav nahi maana jaata.

**2. Logo replace hone pe purana delete hota hai** — aur delete us row ke **apne**
`storage.provider` ko follow karta hai, aaj ki setting ko nahi, to provider badalne
par purani files strand nahi hotin. Fail pe rollback.

⚠️ **Uploads ab transaction ke bahar hote hain** (U-5) — dekhein upar.

**3. `brandName` display case me store** — panel ko capitalize nahi karna.

**4. ✅ Role gate lag chuka hai** — `isVendorOrAdmin`. Pehle customer bhi call kar sakta tha.

**5. 🔴 `email` aur `mobile` ab brand ke apne field nahi hain — wo account ke mirror hain.**

Pehle ye seedhe `Brand` par likhe jaate the. Nateeja: vendor ka `User.email` purane
pate par pada rehta tha jabki `Brand.email` — jo copy invoice, approval mail aur har
notification **asli me padhti hai** — naya rakhti thi. Do value, aur ye bataane ka
koi tareeka nahi ki kaun si chaalu hai.

Ab ek hi call dono jagah likhti hai, aur:

- **Flag `false` ho jaata hai.** Yahan kuch bhi ye saabit nahi karta ki pata ya number
  aapka hai. `isEmailVerified` / `isMobileVerified` sirf
  `POST /auth/email/verify` aur `POST /auth/mobile/verify` se `true` hote hain.
  Jab tak verify na ho, us channel par notification bhi band rehti hai.
- **Uniqueness ab lagti hai.** `Brand.email` par kabhi koi unique index nahi tha;
  `User` par hai (`user_email_role_unique`). Doosre vendor ka email daalne par ab
  `409` milega, pehle chup-chaap duplicate ban jaata tha.
- **`whatsappNumber` yahan se badal hi nahi sakta.** Wo login identity hai —
  uska raasta sirf `POST /auth/whatsapp/verify` hai.

---

## 32a. GET /brands/billing-address

Brand ka **billing address** — har invoice ka "Bill to" (onboarding v2, P4 — design §14, D30, D46). Ye brand ki apni address (`Location` kind BRAND) hai; outlet ka address alag hota hai.

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — vendor apna brand, admin `?brandId=`.

### Success — `200`
```json
{
  "success": true,
  "message": "Billing address fetched successfully.",
  "data": {
    "billingAddress": {
      "_id": "6732…b001",
      "addressLine1": "12 MG Road", "addressLine2": null, "landmark": null,
      "city": "Pune", "district": "Pune", "state": "Maharashtra", "zipcode": "411001", "country": "india",
      "formattedAddress": "12 MG Road, Pune, Maharashtra, 411001, india",
      "coordinates": [73.85, 18.52],
      "stateCode": "27",
      "updatedAt": "2026-11-18T10:00:00.000Z"
    },
    "suggestedAddress": null,
    "gstAddress": {
      "source": "GST", "addressLine1": "2nd Floor, Plaza, MG Road", "city": "Pune", "district": "Pune",
      "state": "Maharashtra", "zipcode": "411001", "country": "India"
    },
    "gstin": "27AABCM1234K1ZP",
    "gstStateCode": "27"
  }
}
```

| Field | Matlab |
|---|---|
| `billingAddress` | Saved billing address, ya `null` |
| `suggestedAddress` | **Sirf jab saved nahi:** GST ka address, warna PAN ka. Form prefill karo — vendor confirm kare, panel geocode karke `PUT` kare. Khud save nahi hota |
| `gstAddress` | GSTIN ho to **hamesha** (edit ke waqt bhi) — "Same as GST" checkbox isse prefill kare (D46). Outlet form ka "GST address is the outlet address" bhi yahi padhe |
| `gstin` · `gstStateCode` | GSTIN ho to billing ki state yahi honi chahiye (D33) |

---

## 32b. PUT /brands/billing-address

Billing address save / edit (upsert) — onboarding v2, P4 (design §14, D31–D34).

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — vendor apna, admin `?brandId=`.

**Kab:** **hamesha** — submit se pehle, review ke dauraan, approve ke baad (renewal aur invoice ko chahiye). Koi edit window / add-only rule nahi. Screen kabhi nahi badalta.

### Body — outlet address form jaise (Google se)
| Field | Type | Required | Notes |
|---|---|---|---|
| `addressLine1` | string | ✅ | Max 300 |
| `addressLine2` · `landmark` | string | ❌ | |
| `city` | string | ✅ | |
| `district` | string | ❌ | |
| `state` | string | ✅ | GSTIN ho to **usi state ka** (aliases chalte hain: "Orissa" = "Odisha", "NCT of Delhi" = "Delhi") |
| `zipcode` | string | ✅ | `country` ke hisaab se ([table](#zip-code-validation-country-wise)) |
| `country` | string | ❌ | Default `india` |
| `formattedAddress` | string | ❌ | Na bhejo to server banata hai |
| `coordinates` | number[] | ✅ | **`[longitude, latitude]`** |

```json
{ "addressLine1": "12 MG Road", "city": "Pune", "district": "Pune", "state": "Maharashtra", "zipcode": "411001", "coordinates": [73.85, 18.52] }
```

### Success — `200`
```json
{ "success": true, "message": "Billing address saved successfully.", "data": { "billingAddress": { "_id": "6732…b001", "city": "Pune", "state": "Maharashtra", "stateCode": "27", "…": "…" } } }
```

Pehli baar → naya address banta hai aur brand se jud jaata hai; baad mein → **wahi** address edit hota hai (ek brand ka ek hi).

### Errors
| Status | `details.code` | Kab |
|---|---|---|
| `422` | `BILLING_STATE_GSTIN_MISMATCH` | GSTIN doosri state ka (D33) — `details.billingState`, `gstinState`, `gstinStateCode`. Map na pehchane wali state bhi |
| `422` | — | Field errors (`City is required`, `Invalid Zip Code/Postal Code`, coordinates) |
| `409` | — | Do pehle save ek saath — `The billing address was just saved from somewhere else. Please refresh and try again.` |
| `403` | — | Vendor ne doosre brand ka `brandId` bheja |

### ⚠️ Notes

**1. Delete nahi hota** (D34). Generic `/locations/*` routes ab brand ka address nahi chhoote (#38, #41, #42 — `409 USE_BILLING_ADDRESS_ENDPOINT` / `BILLING_ADDRESS_NOT_DELETABLE`).

**2. Ulta rule bhi:** billing address saved hai aur **GST** doosri state ka verify / save karo → `422 BILLING_STATE_GSTIN_MISMATCH` (`verify-gst` pe paid call se pehle) — pehle billing address update karo.

**3. Checkout:** bina billing address `create-order` (#71) → `422 BILLING_ADDRESS_REQUIRED`. Order pe billing **freeze** hoti hai — invoice wahi address chhaapta hai, baad mein badla to bhi.

**4. Customer ko kabhi nahi dikhta** — brand profile ka `location` ab selected outlet ka hai (D90).

**5. History:** brand submit ho chuka ho (attempt ho) to har save pe `BILLING_ADDRESS_CHANGED` row (#33) — `performedByType` `VENDOR` / `ADMIN`.

---

## 32c. GET /brands/profile-strength

Brand ki **profile strength** — kitna poora hai, aur kya jodne se kitna badhega ("+N" hints). Onboarding v2, P7 (design §10, D51, D82, D106).

**Access:** Intended: VENDOR + ADMIN · Enforced: **`isVendorOrAdmin`** — vendor apna, admin `?brandId=`.

Har read pe compute hota hai, kahin store nahi. `GET /brands/onboarding/status` (#20a) mein bhi `profileStrength` aata hai.

### Success — `200`
```json
{
  "success": true,
  "message": "Profile strength fetched successfully.",
  "data": {
    "brandId": "6732…c3a1",
    "isVerified": false,
    "score": 79,
    "level": "STRONG",
    "sections": [
      {
        "key": "LEGAL", "label": "Legal details", "earned": 50, "max": 50,
        "items": [
          { "key": "BANK", "label": "Verified bank account", "done": true, "available": true, "earned": 15, "max": 15, "points": 0, "action": null }
        ]
      },
      {
        "key": "PROFILE", "label": "Brand profile", "earned": 25, "max": 25,
        "items": [
          { "key": "SHOWCASE", "label": "Showcase album with photos", "done": false, "available": false, "earned": 0, "max": 5, "points": 0, "action": null }
        ]
      },
      {
        "key": "OUTLETS", "label": "Outlets", "earned": 0, "max": 20,
        "items": [
          { "key": "OUTLET_READY", "label": "A ready outlet", "done": false, "available": true, "earned": 0, "max": 15, "points": 15, "action": "Add an outlet with a verified manager, location and work hours" }
        ]
      }
    ],
    "badgeEligible": true,
    "badgeBlockers": []
  }
}
```
(Har section ke `items` chhote kiye hain — asal mein saare aate hain.)

| Field | Matlab |
|---|---|
| `score` | 0–100. `round(earned / available × 100)` — jo item brand ke liye mumkin nahi (`available: false`) wo ginti se bahar (D51), isliye har brand 100 tak pahunch sakta hai |
| `level` | `LOW` (< 50) · `MEDIUM` (50–74) · `STRONG` (≥ 75) |
| `items[].points` · `action` | Jo item poora nahi aur mumkin hai: kitne points milenge + kya karna hai — "+N" hint. Poore / na-mumkin item pe `0` / `null` |
| `badgeEligible` · `badgeBlockers` | Verified badge ki shartein (admin deta hai): `NOT_APPROVED`, `STRENGTH_BELOW_75`, `BANK_NOT_VERIFIED`, `NO_IDENTITY_PROOF` |
| `isVerified` | Badge abhi hai ya nahi (display only — kuch access nahi badalta) |

### Items aur points (design §10.2)

| Section | Item (`key`) | Points |
|---|---|---|
| LEGAL (50) | `BRAND_AND_LEGAL_NAME` — brand name + legal name (legal name PAN / GST se aata hai) | 5 |
| | `CATEGORY` — category + subcategories | 5 |
| | `IDENTITY` — GST / NO_GST: PAN verified · UNREGISTERED: owner ka PAN verified, ya owner ID UPLOADED / ACCEPTED | 10 |
| | `BUSINESS_PROOF` — GST verified (10) **ya** documents (1 → 5, 2+ → 10; UPLOADED / ACCEPTED, rejected 0) — jo zyada | 10 |
| | `BANK` — bank verified | 15 |
| | `DEED` — vendor ne khud accept ki (ya admin ki offline deed popup se confirm ki — D106) | 5 |
| PROFILE (30) | `LOGO` 5 · `COVER_IMAGE` 5 · `DESCRIPTION` (≥ 50 characters) 5 · `EMAIL_VERIFIED` 3 · `MOBILE_VERIFIED` 2 | 20 |
| | `SHOWCASE` — kam se kam ek album jisme media ho. Showcase band ho, ya plan mein showcase nahi → `available: false` | 5 |
| | `FEATURES` — kam se kam 2 listing features | 5 |
| OUTLETS (20) | `OUTLET_READY` — ek outlet: manager verified + location + work hours | 15 |
| | `ALL_OUTLETS_COMPLETE` — har outlet poora | 5 |

### Errors
| Status | Kab |
|---|---|
| `422` | Admin ne `brandId` nahi bheja |
| `403` | Vendor ne doosre brand ka `brandId` bheja |
| `404` | Brand nahi mila |

---

## 33. GET /brands/verifications/history

Brand ke verification lifecycle ka audit trail.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership** ⚠️
**Scoping:** Vendor service-level pe apne brand tak scoped hai

### Query Params
| Param | Type | Required | Default | Validation |
|---|---|---|---|---|
| `page` | number | ❌ | `1` | Integer ≥ 1 |
| `limit` | number | ❌ | `10` | Integer 1–100 |
| `brandId` | ObjectId | ❌ | – | **Vendor ke liye ignore hota hai** |
| `systemVerifyId` | ObjectId | ❌ | – | Ek attempt ki history |
| `performedBy` | ObjectId | ❌ | – | Kis user ne kiya |
| `action` | string | ❌ | – | BRAND_VERIFICATION_ACTION enum |
| `performedByType` | string | ❌ | – | `SYSTEM` \| `ADMIN` \| `VENDOR` |
| `attemptNumber` | number | ❌ | – | Integer ≥ 1 |
| `search` | string | ❌ | – | |
| `fromDate` · `toDate` | ISO date | ❌ | – | `toDate` >= `fromDate` |
| `sortOrder` | string | ❌ | `DESC` | `ASC` \| `DESC` (uppercase) |

### Success — `200`
```json
{
  "success": true,
  "message": "Brand verification history fetched successfully.",
  "data": {
    "total": 5,
    "totalPages": 1,
    "page": 1,
    "limit": 10,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9i001",
        "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
        "action": "APPROVED",
        "performedByType": "ADMIN",
        "attemptNumber": 2,
        "previousStatus": "MANUAL_REVIEW",
        "newStatus": "APPROVED",
        "reason": "Documents verified, all good",
        "createdAt": "2026-08-22T13:00:00.000Z",
        "brand": { "_id": "68f1a2b3c4d5e6f7a8b9c3a1", "brandName": "Cafe Mocha", "status": "APPROVED", "isApproved": true, "…": "…" }
      },
      {
        "_id": "68f1a2b3c4d5e6f7a8b9i002",
        "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
        "action": "RESUBMITTED",
        "performedByType": "VENDOR",
        "attemptNumber": 2,
        "previousStatus": "REJECTED",
        "newStatus": "MANUAL_REVIEW",
        "reason": null,
        "createdAt": "2026-08-22T12:15:00.000Z",
        "brand": { "…": "…" }
      },
      {
        "_id": "68f1a2b3c4d5e6f7a8b9i003",
        "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
        "action": "REJECTED",
        "performedByType": "ADMIN",
        "attemptNumber": 1,
        "previousStatus": "MANUAL_REVIEW",
        "newStatus": "REJECTED",
        "reason": "Bank account holder name does not match the PAN",
        "createdAt": "2026-08-21T10:00:00.000Z",
        "brand": { "…": "…" }
      }
    ]
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `400` | `Brand not found for user.` | Vendor ke paas brand nahi |
| `422` | `Invalid Brand ID format` | |
| `422` | `Action must be one of SYSTEM_VERIFIED, RESUBMITTED, …` | Invalid enum |
| `422` | `To date cannot be earlier than from date` | |
| `422` | `Limit cannot exceed 100` | |

### ⚠️ Notes

**1. Vendor ke liye `brandId` bekaar hai** — validator comment: *"Ignored for vendors — the service always scopes them to their own brand."*

**2. Har event naya row hai** — re-rejection purana overwrite nahi karti, poora timeline milta hai.

**3. Rejection reason yahin se milta hai** — `action: "REJECTED"` row ka **`reason`** (🔧 D116, 2026-11-21: pehle yahan `rejectionReason` likha tha, jo galat tha; code hamesha `reason` deta aaya hai). Vendor ko yahi dikhana hai. Latest reason brand pe bhi hai: `GET /brands/get` aur `GET /brands/onboarding/status` ka `rejectionReason`.

**3a. Vendor ko sirf ye fields milte hain:** `brandId`, `action`, `performedByType`, `attemptNumber`, `previousStatus`, `newStatus`, `reason`, `createdAt`, `brand`. Score, flags, `note` aur kis admin ne kiya (`performedBy`) sirf admin ko.

**4. `attemptNumber` batata hai kaunsa attempt tha** — resubmit pe badhta hai.

**5. ✅ Ab customer ko khula nahi hai** — `isVendorOrAdmin` laga hua hai.

> 📖 Code: `services/systemVerify/getBrandVerificationHistory.js` (alag doc nahi hai)

---

# Outlet / Sub-Brand APIs

Outlets (aur franchises) brand ke physical stores hain. Har outlet ka apna `SUB_VENDOR` user account banta hai.

⚠️ **Ye plan ke limits se metered hain** — `OUTLET` aur `FRANCHISE` **alag-alag pools** se kharchte hain.

## 34. POST /subBrands/signUp-with-whatsapp

Naya outlet register karta hai — **aur wahi call dobara maarne par OTP resend karta hai.**

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership**

> ### 🔵 Ye call dohrana safe hai
>
> Panel ye call answer hone ke baad OTP modal kholta hai. Modal na aaye — response
> gir gaya, tab band ho gaya, ya manager tak message pahuncha hi nahi — to vendor
> ke paas sirf ek hi cheez hai: button dobara dabana. **Pehle** us dusri call ka
> jawab `403 already registered` tha: kuch galat tha hi nahi, outlet maujood tha
> aur code ka intezaar kar raha tha, par endpoint ke paas ye kehne ka koi tareeka
> nahi tha — to vendor ko bataya jaata tha ki unka input galat hai, aur onboarding
> wahin ruk jaati thi, slot kharch hone ke baad.
>
> Ab dobara call karne par **code dobara jaata hai**. Kuch naya banta nahi: na
> doosra `User`, na doosra `SubBrand`, na doosra slot, na koi role ya verification
> flag dobara likha jaata hai. `data.isNewOutlet` batata hai ki dono me se kya hua.

### Body
| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `brandId` | ObjectId | ✅ | – | ⚠️ Validator me **required** hai, chahe vendor ho. Vendor apna hi bhej sakta hai |
| `whatsappNumber` | string | ✅ (ya `useOwnerNumber`) | – | 10 digits, first `6-9`; `+91`/`91` prefix strip ho jaata hai. 🆕 P8: `useOwnerNumber: true` ke saath **mat** bhejo |
| `useOwnerNumber` 🆕 | boolean | ❌ | `false` | P8 (D86) — "Same as brand WhatsApp number": server **brand owner ka** number leta hai (client ka nahi). Owner ka WhatsApp verified ho (sign-in OTP) tabhi — warna `422 OWNER_NUMBER_NOT_VERIFIED`. Outlet aur manager account **seedha verified** bante hain: koi OTP nahi, koi hold nahi, `subBrand.verifiedVia: "OWNER_NUMBER"`, response `isVerified: true`, `otpSent: false`. Usi number pe pehle se outlet ho to aaj jaisa (resend / 403) |
| `isFirstOutlet` | boolean | ❌ | `false` | Onboarding ka pehla outlet — `brand.firstSubBrandId` set hota hai. ⚠️ Ab **sirf boolean**. Pehle `Joi.alternatives()` tha aur string `"false"` truthy padhi jaati thi — client ne jo maanga uska ulta hota tha, bina kisi error ke |
| `outletType` | string | ❌ | `OUTLET` | `OUTLET` \| `FRANCHISE` — **kaunsa plan pool kharcha hoga**. ⚠️ Repeat call par **ignore** hota hai, note 3 dekhein |

```json
{
  "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
  "whatsappNumber": "9823456789",
  "isFirstOutlet": true,
  "outletType": "OUTLET"
}
```

### Success — `200` (naya outlet bana)
```json
{
  "success": true,
  "message": "OTP sent to subBrand whatsapp number successfully.",
  "data": {
    "isNewOutlet": true,
    "otpSent": true,
    "user": {
      "_id": "68f1a2b3c4d5e6f7a8b9j001",
      "subBrandId": "68f1a2b3c4d5e6f7a8b9c4a1",
      "role": "SUB_VENDOR",
      "whatsappNumber": "9823456789",
      "uniqueId": "TDU000201",
      "referralCode": "OUTLET7K2X",
      "isWhatsappVerified": false,
      "isActive": true
    },
    "subBrand": {
      "_id": "68f1a2b3c4d5e6f7a8b9c4a1",
      "userId": "68f1a2b3c4d5e6f7a8b9j001",
      "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
      "outletType": "OUTLET",
      "whatsappNumber": "9823456789",
      "uniqueId": "TDS000201",
      "storeId": "MOCHA-VN-01",
      "joinedDate": "2026-08-22T14:30:00.000Z",
      "isActive": true
    },
    "usage": {
      "subBrands": { "used": 3, "limit": 10, "isUnlimited": false },
      "franchises": { "used": 0, "limit": 2, "isUnlimited": false }
    }
  }
}
```

### Success — `200` (wahi call dobara — sirf OTP gaya)
Bilkul wahi shape, do farq ke saath: `message` aur `isNewOutlet`. `usage` bhi same
rehta hai, kyunki koi slot kharch nahi hua.

```json
{
  "success": true,
  "message": "OTP resent to subBrand whatsapp number successfully.",
  "data": {
    "isNewOutlet": false,
    "otpSent": true,
    "user": { "…": "wahi outlet ka user" },
    "subBrand": { "…": "wahi outlet" },
    "usage": { "…": "badla nahi" }
  }
}
```

### Success — `200` (`useOwnerNumber: true` — owner ke verified number pe, bina OTP)
🔧 D116 (2026-11-21): pehle yahan bhi message `"Outlet/Sub-Brand created, but the OTP could not be sent."` aata tha,
kyunki `otpSent: false` hai — jabki outlet verified ban chuka tha. Ab apna message hai. Panel message pe kabhi
branch na kare; `isVerified` / `subBrand.verifiedVia` padhe.

```json
{
  "success": true,
  "message": "Outlet/Sub-Brand created and verified with the brand owner's WhatsApp number.",
  "data": {
    "isNewOutlet": true,
    "otpSent": false,
    "otpError": null,
    "retryAfterSeconds": null,
    "isVerified": true,
    "verifiedVia": "OWNER_NUMBER",
    "user": { "…": "manager account, verified" },
    "subBrand": { "verifiedVia": "OWNER_NUMBER", "isWhatsappVerified": true, "…": "…" },
    "usage": { "…": "slot kat chuka hai" }
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `403` | `Outlet/Sub-Brand is already registered with this number` | Number **kisi aur brand** ke outlet pe hai |
| `422` | 🆕 `The brand owner's WhatsApp number is not verified yet. Use the outlet manager's number.` · `details.code: OWNER_NUMBER_NOT_VERIFIED` | P8 — `useOwnerNumber` par owner ka number verified nahi |
| `422` | 🆕 `Send either whatsappNumber or useOwnerNumber, not both.` / `WhatsApp number is required (or useOwnerNumber: true).` | P8 |
| `403` | `Outlet/Sub-Brand is already registered with this number, and it is already verified. The outlet manager can sign in from the app.` | Aapka hi outlet hai par verify ho chuka — `details.code: OUTLET_ALREADY_VERIFIED` |
| `403` | `This outlet's account is deactivated. Reactivate it before sending a new code.` | `details.code: OUTLET_DEACTIVATED` |
| `403` | `Access denied. This feature requires an active subscription. Please subscribe to continue.` | Koi active plan nahi — **sirf naye outlet par**, resend par nahi |
| `403` | `Your current plan does not include outlets. Please upgrade your subscription to add outlets.` | Plan me outlet pool hai hi nahi (`limit: 0`) |
| `403` | `Outlet/Sub-brand limit reached — 10 of 10 used on your current plan. Please upgrade your subscription to add more.` | Pool khatam |
| `403` | `Your current plan does not include franchises. …` | `outletType: "FRANCHISE"` par franchise pool nahi |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | Dusre brand ka `brandId` |
| `404` | `Brand not found!` | |
| `409` | `This number has a half-created outlet account. Please contact support.` | `SUB_VENDOR` user hai par uska `SubBrand` nahi — `details.code: OUTLET_RECORD_MISSING`. Transaction ke baad naye aise ban nahi sakte |
| `409` | `Could not create the outlet, please try again.` | Generated value (`uniqueId` / `referralCode` / `storeId`) par collision — transaction roll back ho gaya, retry sach me sahi salah hai |
| `422` | `Brand ID is required` / `Invalid Brand ID format` | |
| `422` | `Please enter a valid 10 digit WhatsApp number` | |
| `422` | `outletType must be one of: FRANCHISE, OUTLET` | |
| `429` | `We have already sent you a code — please check your messages. You can ask for another in N second(s).` | 60s cooldown — **sirf repeat call par**. Naya outlet banate waqt ye error nahi aata, neeche note 6 dekhein |
| `429` | `Too many codes have been sent to this number or email in the last hour. Please try again in N minute(s).` | Ghante ka cap (5) — wahi baat |

### ⚠️ Edge cases & notes

**1. Order matter karta hai — errors isi order me aayenge:**
```
1. Ownership check       → resolveActorBrand
2. Number pehle se hai?  → resend / 403 / 409  (note 2 ki table)
3. Subscription gate     → 403 "requires an active subscription"
4. Slot reservation      → 403 "limit reached"
5. Actual creation       → ek transaction me
6. OTP                   → transaction ke baad
```

**2. Number pehle se maujood ho to kya hota hai:**

| Outlet ki haalat | Jawab | Slot | Naya record |
|---|---|---|---|
| **Dusre brand** ka | `403` already registered | – | – |
| Aapka, **verified** | `403` already verified | – | – |
| Aapka, account **deactivated** | `403` deactivated | – | – |
| Aapka, **unverified** | `200` — OTP resend | ❌ nahi katega | ❌ nahi banega |

**3. Repeat call par `outletType` aur `isFirstOutlet` ignore hote hain.** Outlet ko
outlet aur franchise pool ke beech move karna `PUT /subBrands/update` ka kaam hai —
wo `switchOutletType` se guzarta hai, target pool me claim karta hai aur jayaz
tarike se mana bhi kar sakta hai. Yahan chupchap maan lena wo slot bina us poori
jaanch ke hila dega. Response ka `subBrand` asli value rakhta hai.

**4. Slot reservation atomic hai.** `reserveOutletSlot` ek **conditional increment**
hai — limit test aur increment ek hi operation me. Do concurrent signups dono pass
nahi kar sakte (read-then-write check se ye guarantee nahi milti).

**5. Creation ab ek transaction me hai.** `User.create` + `SubBrand.create` + link
ek `session.withTransaction` ke andar. Pehle ye teen alag writes the aur unki safai
ek `catch` me thi — jo tabhi chalti hai jab process zinda ho. Beech me crash hone
par `SUB_VENDOR` bin outlet ke reh jaata tha, aur kyunki unique index
`{whatsappNumber, role}` par hai, wo number **hamesha ke liye** block ho jaata tha:
`repairRoleProfile` `Brand` aur `Customer` banata hai, `SubBrand` jaanbujh kar nahi,
to use koi kabhi poora nahi karta.

**6. ⚠️ OTP na ja sake to bhi outlet banta hai — aur ye `200` hai.**

Teeno endpoint ab ek hi niyam par chalte hain: **jo pakka kaam hua wo `200` hai,
aur message ka kya hua wo body me batate hain; message bhejna hi akela kaam ho to
uska fail hona hi jawab hai.** Outlet banana pakka kaam hai. Isliye:

| Call | OTP fail hone par |
|---|---|
| Naya outlet | `200` + `otpSent: false` — outlet **rehta hai** |
| Repeat call (resend) | `429` — kuch bana hi nahi tha, isliye error hi sahi jawab hai |
| `PATCH /whatsapp-number` | `200` + `otpSent: false` — number badal chuka hai |

```json
{
  "success": true,
  "message": "Outlet/Sub-Brand created, but the OTP could not be sent.",
  "data": {
    "isNewOutlet": true,
    "otpSent": false,
    "otpError": "We have already sent you a code — please check your messages. You can ask for another in 47 second(s).",
    "retryAfterSeconds": 47,
    "subBrand": { "…": "ban chuka hai" },
    "usage": { "…": "slot kat chuka hai" }
  }
}
```

🔴 **Pehle ye poora outlet delete kar deta tha**, aur sabse aam failure yahan
`429` hai — wo bhi aksar kisi ki galti se nahi: throttle **phone** par hai
(jaan-boojh kar, kyunki ek phone ek insaan hai), to outlet manager ne tees second
pehle apne customer account se sign in dabaya ho to vendor ka outlet banna mana ho
jaata tha. Vendor apni abhi-banai cheez ko gayab hote dekhta tha aur error message
messages ke baare me hota tha.

Ab outlet khada rehta hai, vendor saath second baad **wahi button** dobara dabata
hai (note 2 ki table), aur wo resend kar deta hai.

⚠️ Chup-chaap nahi — slot **sach me** kharch hua hai, isliye panel ko `otpSent`
dekhna **zaroori** hai. Server par bhi line logged hoti hai.

**7. Transaction fail ho to kuch nahi bachta.** Ye upar wale se alag hai: wahan
outlet ban hi nahi paaya, to slot release ho jaata hai aur koi adhoora document
nahi rehta.

**8. `usage` response me aata hai** — dashboard ka counter turant update kar sakte
hain, alag call ki zarurat nahi. `limit: null` matlab unlimited.

**9. Outlet user ka koi password nahi hota** — wo OTP se login karta hai. ✅ Ye
pehle ka shared-default-password issue fix ho chuka hai.

**10. Outlet manager verify kaise karta hai:** `POST /auth/verify-otp-whatsapp`
`{ whatsappNumber, otp, role: "SUB_VENDOR" }`. Wahi call `isWhatsappVerified` set
karta hai aur JWT deta hai. Uske baad ke logins
`POST /auth/loginOrSignUp-with-whatsapp` se — `SELF_SIGNUP_ROLES` sirf `SUB_VENDOR`
ko *khud ko banane* se rokta hai, login se nahi.

**11. `storeId` auto-generate hota hai** — brand ke naam se derive hota hai (jaise
`MOCHA-VN-01`).

**12. Galat number type ho gaya?** Verify hone se pehle
`PATCH /subBrands/:subBrandId/whatsapp-number` se theek karein (section 34a) —
wahi outlet, wahi slot. Verify ke baad wo raasta band hai.

**13. Outlet banane ke baad** uski location (`POST /locations/create` with
`isSubBrandAddress: true`) aur work hours (`POST /workHours/upsert` with
`subBrandId`) set karni chahiye.

> **P10.4 (live 2026-11-04): pehle OTP, phir location / hours.** Order ab zaroori hai: outlet → **manager ka
> OTP** → location → hours → voucher. Jab tak manager OTP nahi deta, outlet `NEVER_VERIFIED` hai aur
> location / hours / voucher / edit sab `409 OUTLET_NOT_VERIFIED` dete hain (D13).

**14. 🆕 Hold (P10.4, live 2026-11-04).** Naya outlet `subBrand.isWhatsappVerified: false` aur
`numberHoldStartedAt` ke saath banta hai. Manager `outletNumberHoldHours` (admin setting, default **72
ghante**) me OTP na de to job outlet **apne aap cancel** karta hai — slot wapas, number free, vendor ko
`OUTLET_HOLD_EXPIRED` notification. Khatam hone se `outletHoldReminderHours` (default 24) pehle
`OUTLET_HOLD_EXPIRING` reminder. **Resend se timer nahi badhta** (D9); number theek karne (34a) par naya
timer. Response shape **same** — `subBrand` me ye do naye fields dikhte hain. Countdown ke liye
`GET /subBrands/get-all` ka `holdExpiresAt` padhein.

---

## 34a. PATCH /subBrands/:subBrandId/whatsapp-number

Outlet ka **galat type hua WhatsApp number theek karta hai — verify hone se pehle.**

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership**

> ### 🔴 Ye kyun chahiye tha
>
> Ek mistype kiya number aisa outlet banata tha jise na koi poora kar sakta tha na
> hata sakta tha. Slot kharch ho chuka, `user_whatsappNumber_role_unique` galat
> number pakde baitha, koi delete route hai nahi, aur `PUT /subBrands/update`
> `whatsappNumber` ko chhoo nahi sakta — to vendor ke paas do hi raaste the: doosra
> slot jala kar doosra outlet banao, ya support se kaho. Aur typo ka pata chalta hi
> tab hai jab code nahi aata, jo is flow par sabse aam cheez hai.

> ### ⚠️ Sirf verify hone se **pehle**
>
> Uske baad number ek live login identity hai, aur use badalna ek **step-up** hai:
> pehle maujooda number par code, phir naye par, aur landing par baaki har session
> khatam. `POST /auth/whatsapp/send-verification` ye poora kaam pehle se karta hai,
> **outlet manager ke apne session se**. Vendor ke liye uska shortcut ka matlab hota
> ki koi bhi vendor login rakhne wala apne staff ka account apni pasand ke phone par
> le ja sakta hai.
>
> Verify hone se pehle step-up karne ke liye kuch hai hi nahi — number ne abhi tak
> kuch sabit nahi kiya — isliye jis vendor ne account banaya wo use theek kar sakta
> hai, aur naya number purane ki tarah **unverified** shuru hota hai.

### Params
| Field | Type | Required | Validation |
|---|---|---|---|
| `subBrandId` | ObjectId | ✅ | URL me |

### Body
| Field | Type | Required | Validation |
|---|---|---|---|
| `whatsappNumber` | string | ✅ | 10 digits, first `6-9`; `+91`/`91` prefix strip ho jaata hai |

```json
{ "whatsappNumber": "9823456700" }
```

### Success — `200`
```json
{
  "success": true,
  "message": "Outlet/Sub-Brand WhatsApp number updated and a new OTP has been sent.",
  "data": {
    "subBrand": {
      "_id": "68f1a2b3c4d5e6f7a8b9c4a1",
      "userId": "68f1a2b3c4d5e6f7a8b9j001",
      "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
      "outletType": "OUTLET",
      "whatsappNumber": "9823456700",
      "uniqueId": "TDS000201",
      "storeId": "MOCHA-VN-01",
      "isActive": true
    },
    "user": {
      "_id": "68f1a2b3c4d5e6f7a8b9j001",
      "role": "SUB_VENDOR",
      "whatsappNumber": "9823456700",
      "isWhatsappVerified": false,
      "isActive": true
    },
    "otpSent": true,
    "otpError": null,
    "retryAfterSeconds": null
  }
}
```

### Success — `200`, par code nahi ja saka
Number **badal chuka hai**; sirf message nahi gaya.

```json
{
  "success": true,
  "message": "Outlet/Sub-Brand WhatsApp number updated, but the OTP could not be sent.",
  "data": {
    "subBrand": { "…": "naya number set ho chuka" },
    "user": { "…": "naya number set ho chuka" },
    "otpSent": false,
    "otpError": "We have already sent you a code — please check your messages. You can ask for another in 47 second(s).",
    "retryAfterSeconds": 47
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `403` | `Forbidden: You do not have permission to update this outlet.` | Dusre brand ka outlet |
| `403` | `You cannot change this account's contact details. Only the account holder can, or an administrator.` | `assertCanWriteIdentity` — `details.code: IDENTITY_WRITE_FORBIDDEN` |
| `404` | `Outlet/Sub-Brand not found!` | |
| `404` | `Brand not found!` | |
| `404` | `The outlet's user account no longer exists.` | |
| `409` | `This outlet's number is already verified. The outlet manager can change it from their own account, which sends a code to the current number first.` | `details.code: OUTLET_ALREADY_VERIFIED` |
| `409` | `Outlet/Sub-Brand is already registered with this number` | Naya number kisi aur outlet ka hai |
| `409` | `That number was taken while you were saving. Try a different one.` | Index ne race decide kiya |
| `422` | `That is already this outlet's WhatsApp number. Call POST /subBrands/signUp-with-whatsapp to send the code again.` | `details.code: WHATSAPP_UNCHANGED` |
| `422` | `Please enter a valid 10 digit WhatsApp number` | |
| `422` | `Invalid Sub-Brand ID format` | |

### ⚠️ Edge cases & notes

**1. Kuch bhi naya nahi banta.** Na slot reserve/release hota hai, na `uniqueId` ya
`storeId` dobara issue hota hai, na doosra `User`/`SubBrand` aata hai — **wahi
outlet**, bas alag number par. Typo theek karne ki keemat zero hai, yahi poora
maksad hai.

**2. `429` par ye call fail nahi hoti.** Number save ho chuka hota hai, to `429`
throw karna ek aise badlav ko failure batata jo sach me hua. Vendor ka agla natural
kadam — number dobara type karna — phir `422 WHATSAPP_UNCHANGED` par jaata aur ek
doosri, ghair-zaroori error jaisa padhta. Isliye natija body me aata hai
(`otpSent` / `otpError` / `retryAfterSeconds`), aur resend
`POST /subBrands/signUp-with-whatsapp` se hota hai.

**3. Naya number kisi CUSTOMER ka ho to koi dikkat nahi.** Duplicate check
`role: SUB_VENDOR` tak scoped hai, bilkul `user_whatsappNumber_role_unique` ki
tarah — ek hi insaan ka CUSTOMER account usi number par hona bilkul jayaz hai.

**4. ⚠️ WhatsApp notification preference band ho jaati hai.** `applyIdentityChange`
ka niyam hai ki unverified key apna channel off kar deti hai, aur wo verify hone par
apne aap wapas on **nahi** hoti — verify karna sabit karta hai *"ye number mera
hai"*, ye nahi ki *"yahan bhejo"*. Outlet manager use apne notification settings se
wapas on kar sakta hai.

**5. Outlet manager ko naya code usi tarah verify karna hai** —
`POST /auth/verify-otp-whatsapp` `{ whatsappNumber: <naya>, otp, role: "SUB_VENDOR" }`.

**6. 🆕 Hold dobara shuru (P10.4, live 2026-11-04).** Kabhi verify na hue (`NEVER_VERIFIED`) outlet ka number
badalne par hold **naye number se poora** shuru hota hai (D9) — `GET /subBrands/get-all` ka `holdExpiresAt`
aage badh jaata hai. `REVERIFY` outlet (admin ne verified manager ka number badla tha) par hold kabhi nahi
lagta. Purane number ka signup audit `CANCELLED` ho jaata hai, naye ka code jaate hi khulta hai.

---

## 34b. PATCH /subBrands/:subBrandId/cancel 🆕

Kabhi verify na hua outlet **hold khatam hone ka intezaar kiye bina** hatana — galat insaan, test, manager
chala gaya. [Design D10](./verified_signup_outlet_plan.md#2-locked-decisions)

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership** (vendor sirf apne brand ka;
admin koi bhi)

> ✅ **P10.4 (2026-10-28) — stage + prod par live 2026-11-04.**

### Params
| Field | Type | Required | Validation |
|---|---|---|---|
| `subBrandId` | ObjectId | ✅ | URL me. **Body nahi.** |

### Success — `200`
```json
{
  "success": true,
  "message": "Outlet cancelled. Its slot is back on your plan and the number is free.",
  "data": {
    "subBrandId": "68f1a2b3c4d5e6f7a8b9c4a1",
    "uniqueId": "#TS538618",
    "cancelled": true,
    "slotReleased": true,
    "outletType": "OUTLET"
  }
}
```

**Kya hota hai:** outlet aur manager ka account **soft-delete**, plan ka slot wapas (`subBrandsUsed` /
`franchisesUsed` ek kam), number free (koi bhi brand dobara use kar sakta hai), onboarding ka
`firstSubBrandId` isi outlet par tha to hat jaata hai, signup audit `CANCELLED`.

### Errors
| Status | Message | Kab |
|---|---|---|
| `403` | `Forbidden: You do not have permission to cancel this outlet.` | Dusre brand ka outlet |
| `404` | `Outlet/Sub-Brand not found!` · `Brand not found!` | |
| `409` | `Only an outlet whose number was never verified can be cancelled.` | `details.code: OUTLET_ALREADY_VERIFIED` — outlet `VERIFIED` ya `REVERIFY` hai |
| `409` | `This outlet has vouchers, claims or payments linked to it, so it cannot be cancelled here. Please contact support.` | `details.code: OUTLET_HAS_ACTIVITY` — sirf purane outlets par mumkin (naye par D13 ye sab rokta hai) |
| `409` | `This outlet changed while you were cancelling it — it was verified or already cancelled. Refresh the outlet list.` | `details.code: OUTLET_STATE_CHANGED` — usi pal manager ne verify kiya / job ne cancel kiya |
| `422` | `Invalid Sub-Brand ID format` | |

### Panel
- Outlet list me sirf `verificationState: "NEVER_VERIFIED"` par **Cancel** button; confirm modal.
- `200` par list refresh (outlet gayab, usage badla). `409` par `details.code` ke hisaab se message.

---

## 35. GET /subBrands/get-all

Outlets ki paginated list.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN** ⚠️

### Query Params
| Param | Type | Required | Default | Validation |
|---|---|---|---|---|
| `page` | number | ❌ | `1` | Integer ≥ 1 |
| `limit` | number | ❌ | `10` | Integer 1–100 |
| `search` | string | ❌ | – | |
| `brandId` | ObjectId | ⚠️ | – | **Vendor ko apna bhejna chahiye** — warna sabke outlets aa jayenge (role gate missing hai) |
| `userId` · `locationId` · `workHoursId` | ObjectId | ❌ | – | |
| `outletType` | string | ❌ | – | `OUTLET` \| `FRANCHISE` |
| `email` · `mobile` · `whatsappNumber` | string | ❌ | – | |
| `uniqueId` · `storeId` | string | ❌ | – | |
| `isActive` | boolean\|string | ❌ | – | |
| `isWhatsappVerified` | boolean | ❌ | – | 🆕 Outlet manager ka account verify hua ya nahi. `false` → *pending outlets* tab. ⚠️ `true`/`false` hi, string `"1"` nahi |
| `fromDate` · `toDate` | ISO date | ❌ | – | |
| `sortBy` | string | ❌ | `createdAt` | `joinedDate` \| `createdAt` \| `updatedAt` \| `outletType` \| `isActive` |
| `sortOrder` | string | ❌ | `desc` | `asc` \| `desc` |

```http
GET /subBrands/get-all?brandId=68f1a2b3c4d5e6f7a8b9c3a1&isActive=true&limit=50
```

### Success — `200`
```json
{
  "success": true,
  "message": "Outlets/Sub-Brands fetched successfully",
  "data": {
    "total": 3,
    "totalPages": 1,
    "page": 1,
    "limit": 50,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9c4a1",
        "userId": "68f1a2b3c4d5e6f7a8b9j001",
        "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
        "locationId": "68f1a2b3c4d5e6f7a8b9c4b1",
        "workHoursId": "68f1a2b3c4d5e6f7a8b9c4c1",
        "outletType": "OUTLET",
        "storeId": "MOCHA-VN-01",
        "uniqueId": "TDS000201",
        "whatsappNumber": "9823456789",
        "email": "vijaynagar@cafemocha.in",
        "description": "vijay nagar outlet",
        "joinedDate": "2026-08-22T14:30:00.000Z",
        "isActive": true,
        "createdAt": "2026-08-22T14:30:00.000Z",
        "updatedAt": "2026-08-22T14:30:00.000Z",
        "manager": {
          "_id": "68f1a2b3c4d5e6f7a8b9j001",
          "isWhatsappVerified": false,
          "isActive": true
        }
      }
    ]
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `No any subbrand found` | ⚠️ Koi outlet nahi — **empty-state dikhayein** |
| `422` | `Invalid Brand ID format` | |
| `422` | `Limit cannot exceed 100` | |
| `422` | `Outlet type can't be empty` | |

### ⚠️ Notes

**1. ✅ Ab scoped hai.** Pehle jo query me aaye wahi filter hota tha, to `brandId` bheje bina **platform ke saare outlets** aa jaate the. Ab service khud kaatti hai: vendor ko apna brand, outlet manager ko **sirf apna outlet**, admin ko sab. Doosre brand ka `brandId` bhejne par `403`. `brandId` bhejna ab **filter** hai, security nahi.

**2. Empty pe 404 aata hai** — error nahi, empty-state.

**3. `locationId` / `workHoursId` `null` ho sakte hain** — naya outlet jiski address/timings set nahi hui.

**4. 🆕 `manager` — outlet manager ke account ki onboarding state.** Panel ko
yahi chahiye ye tay karne ke liye ki row par *"Resend OTP"* aur *"Edit number"*
dikhana hai ya nahi:

| Field | Matlab |
|---|---|
| `manager.isWhatsappVerified` | `false` → outlet abhi code ka intezaar kar raha hai. Dono buttons dikhayein |
| `manager.isActive` | Manager ka **account** on/off. `false` par code bhejna `403 OUTLET_DEACTIVATED` dega |

```js
const canResend = !o.manager?.isWhatsappVerified && o.manager?.isActive !== false;
```

⚠️ **`manager.isActive` aur row ka apna `isActive` do alag cheezein hain.** Row
wala matlab "customer ko dikhe"; `manager` wala tay karta hai ki manager **sign in
kar paayega ya nahi** (`assertAccountAccess`). Dono dikhane padte hain, warna panel
"outlet band hai" aur "manager band hai" ko ek hi cheez bata dega.

⚠️ Isse pehle ye pipeline sirf `locations` aur `workhours` join karti thi, to
panel ke paas ye jaanne ka **koi tareeka nahi tha** ki kaunsa outlet unverified hai
— `isWhatsappVerified` `User` par hai, `SubBrand` par nahi. Signup ke response se
client-side yaad rakhna kaam nahi karta: reload par chala jaata hai, aur reload hona
hi wo case hai jiske liye ye sab bana hai.

ℹ️ Sirf teen field aate hain (`_id`, `isWhatsappVerified`, `isActive`) —
`users` lookup allow-list se project hoti hai, to password hash jaisi koi cheez
nikal hi nahi sakti.

**5. 🆕 `verificationState` + `holdExpiresAt` (P10.4, live 2026-11-04) — panel inhi ko padhe.**

| Field | Values | Panel |
|---|---|---|
| `verificationState` | `NEVER_VERIFIED` — manager ne kabhi OTP nahi diya | "Pending" badge · Resend / Fix number / **Cancel** ([#34b](#34b-patch-subbrandssubbrandidcancel-)) · edit / location / hours / voucher band (`409 OUTLET_NOT_VERIFIED`) |
| | `VERIFIED` — normal (purane aur dummy outlets bhi) | Sab |
| | `REVERIFY` — pehle verified tha, admin ne number badla | Edits allowed; "customer ko nahi dikh raha — manager naye number se OTP de" note |
| `holdExpiresAt` | ISO date ya `null` | Sirf `NEVER_VERIFIED` + hold wale par bhara → countdown. Is time tak OTP nahi aaya to outlet apne aap cancel. `null` = koi hold nahi (purana outlet, `REVERIFY`, ya admin ne hold `0` kiya) |

⚠️ Raw `isWhatsappVerified` / `firstVerifiedAt` / `numberHoldStartedAt` bhi row par aa sakte hain — **unhe
mat padho**: purane outlet par flag hota hi nahi aur wo *verified* hai. `verificationState` ye sab
sahi tay karke deta hai. `holdExpiresAt` live setting se nikalta hai — admin hold badle to countdown bhi
badalta hai.

---

## 36. PUT /subBrands/update/:subBrandId

Outlet details update.

> **P10.4 (live 2026-11-04):** `NEVER_VERIFIED` outlet par **koi bhi** edit (details, type, on/off, photos) →
> `409` `"Verify the outlet's WhatsApp number first. Send the code again from the outlet list."`,
> `details: { code: "OUTLET_NOT_VERIFIED", subBrandId }` — admin par bhi (D13 / D14). Ownership check
> pehle hota hai (doosre brand ka outlet → `403`). `REVERIFY` outlet par edits chalte hain (D15).

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN**

### Path Params
| Param | Type | Required |
|---|---|---|
| `subBrandId` | ObjectId | ✅ |

### Body — sab optional
| Field | Type | Validation | Notes |
|---|---|---|---|
| `email` | string | Valid email | 🔴 Ye **outlet manager ke account** ka email hai — niche dekhein |
| `outletType` | string | `OUTLET` \| `FRANCHISE` | ⚠️ Change karne pe **naya pool kharcha hoga** — subscription gate lagta hai |
| `joinedDate` | date | – | |
| `description` | string | – | |
| `isActive` | boolean | – | ⚠️ **Sirf tab apply hota hai jab explicitly bhejo** |
| `logo` | file | JPG · PNG · WebP · GIF | 🆕 **Multipart**, field name `logo` |
| `coverImage` | file | JPG · PNG · WebP · GIF | 🆕 **Multipart**, field name `coverImage` |
| `logoUploadId` | ObjectId 🆕 | – | Presigned — purpose `SUB_BRAND_LOGO` |
| `coverImageUploadId` | ObjectId 🆕 | – | Presigned — purpose `SUB_BRAND_COVER` |

```json
{ "description": "Vijay Nagar flagship outlet", "email": "vn@cafemocha.in" }
```

> ### 🆕 Outlet ki apni tasveerein
>
> `SubBrand.logo` aur `SubBrand.coverImage` model me pehle se thin aur **koi
> endpoint unhe likhta hi nahi tha** — outlet hamesha bina tasveer ke rehta tha.
>
> ⚠️ Ye endpoint **ab multipart leta hai**, pehle nahi leta tha. JSON body waise
> hi kaam karti rahegi; file bhejni ho tabhi `multipart/form-data` chahiye.
>
> Brand ki tarah hi: dono field alag hain, jo replace hoti hai wahi delete hoti
> hai (save ke baad), aur galat file par `422` milta hai. Ownership wahi hai jo
> baaki update par — vendor sirf apne brand ka outlet, admin koi bhi.

**Type change:**
```json
{ "outletType": "FRANCHISE" }
```

> ### 🔴 `email` outlet ka apna field nahi hai
>
> Wo us outlet ke **manager ke `User` account** ka email hai, aur `SubBrand.email`
> uska mirror. Pehle sirf `SubBrand.email` likha jaata tha, jabki manager ka apna
> `User.email` chhua hi nahi jaata — do value ek insaan ki, aur jise koi maintain
> nahi kar raha tha wahi `notify()` sabse pehle padhta hai.
>
> - **Vendor ye set kar sakta hai**, par sirf **apne** outlet ka. Kisi doosre brand
>   ke outlet par `403 IDENTITY_WRITE_FORBIDDEN`.
> - **Flag `false` ho jaata hai.** Aap ye saabit nahi karte ki wo pata manager ka hai.
>   Isi wajah se ye us account me ghusne ka raasta **nahi** banta: unverified email se
>   `POST /auth/login-with-email` chalta hi nahi. Sirf manager khud, apni session se,
>   use verify kar sakta hai.
> - Wahi email kisi aur account par ho to `409`.

### Success — `200`
```json
{
  "success": true,
  "message": "Outlet/Sub-Brand updated successfully.",
  "data": {
    "subBrand": {
      "_id": "68f1a2b3c4d5e6f7a8b9c4a1",
      "outletType": "OUTLET",
      "storeId": "MOCHA-VN-01",
      "description": "Vijay Nagar flagship outlet",
      "email": "vn@cafemocha.in",
      "isActive": true,
      "updatedAt": "2026-08-22T15:00:00.000Z"
    },
    "outletTypeChanged": false,
    "usage": {
      "subBrands": { "used": 3, "limit": 10, "isUnlimited": false },
      "franchises": { "used": 0, "limit": 2, "isUnlimited": false }
    }
  }
}
```

### Success — `200` (type change)
```json
{
  "success": true,
  "message": "Outlet/Sub-Brand updated and outlet type switched successfully.",
  "data": {
    "subBrand": { "outletType": "FRANCHISE" },
    "outletTypeChanged": true,
    "usage": {
      "subBrands": { "used": 2, "limit": 10, "isUnlimited": false },
      "franchises": { "used": 1, "limit": 2, "isUnlimited": false }
    }
  }
}
```

> Message aur `outletTypeChanged` flag dono badalte hain.

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Outlet/Sub-Brand not found!` | |
| `404` | `Brand not found!` | Outlet ka parent brand missing |
| `403` | `Forbidden: You do not have permission to update this outlet.` | Dusre brand ka outlet |
| `403` | `Access denied. This feature requires an active subscription. …` | Type change par plan nahi |
| `403` | `Franchise limit reached — 2 of 2 used on your current plan. …` | Target pool full |
| `422` | `Invalid Brand ID format` | `subBrandId` galat (message me "Brand" likha hai — validator ka copy-paste) |

### ⚠️ Notes

**1. `isActive` ka silent default hata diya gaya hai.** Validator ka comment: *"No `.default(true)` — it used to silently reactivate a deactivated outlet on any update that simply did not mention isActive."* Ab deactivated outlet accidentally reactivate nahi hoga.

**2. Type change do pools ko touch karta hai** — purane se slot release, naye me reserve. Save fail ho to dono revert ho jaate hain: *"Undo the counter movement so the pools do not drift from reality."*

**3. Type change pe subscription gate lagta hai** — kyunki wo naya slot kharchta hai. Sirf description edit karne pe nahi lagta.

**4. Ownership check yahan explicit hai** — `resolveActorBrand` nahi, par same logic: admin koi bhi outlet, vendor sirf apne brand ka.

**5. `422` message me "Brand ID" likha aata hai** jabki param `subBrandId` hai — validator me copy-paste rah gaya hai. Cosmetic issue.

---

# Work Hours APIs

## 37. POST /workHours/upsert

Brand ya outlet ke weekly timings set karta hai. Upsert hai — dobara call karne pe update hota hai.

> **P10.4 (live 2026-11-04):** `subBrandId` wala outlet `NEVER_VERIFIED` ho to `409 OUTLET_NOT_VERIFIED`
> (`details: { code, subBrandId }`), admin par bhi. Ownership pehle (`403`). Brand ki hours par asar nahi.

**Access:** Intended: VENDOR · Enforced: **VENDOR + ADMIN** (`isVendorOrAdmin`) **+ ownership + active plan (vendor)** (✅ prod par live 2026-10-27)

### Body
| Field | Type | Required | Validation |
|---|---|---|---|
| `brandId` | ObjectId | ⚠️ | Brand-level timings ke liye |
| `subBrandId` | ObjectId | ⚠️ | Outlet-level timings ke liye |
| `monday` … `sunday` | object | ⚠️ | Din ka schedule — kam se kam **ek din** chahiye |

⚠️ **`brandId` ya `subBrandId` — exactly ek dena hai.** Dono ya koi nahi = error.

**Din ka object:**
| Field | Type | Required | Validation |
|---|---|---|---|
| `isOpen` | boolean | ❌ (default `false`) | |
| `start` | string | ⚠️ **`isOpen: true` pe required** | `HH:mm` 24-hour (`/^([01]\d\|2[0-3]):([0-5]\d)$/`) |
| `end` | string | ⚠️ **`isOpen: true` pe required** | `HH:mm`, aur `start` se **baad** hona chahiye |

```json
{
  "subBrandId": "68f1a2b3c4d5e6f7a8b9c4a1",
  "monday":    { "isOpen": true,  "start": "09:00", "end": "23:00" },
  "tuesday":   { "isOpen": true,  "start": "09:00", "end": "23:00" },
  "wednesday": { "isOpen": true,  "start": "09:00", "end": "23:00" },
  "thursday":  { "isOpen": true,  "start": "09:00", "end": "23:00" },
  "friday":    { "isOpen": true,  "start": "09:00", "end": "23:59" },
  "saturday":  { "isOpen": true,  "start": "10:00", "end": "23:59" },
  "sunday":    { "isOpen": false }
}
```

### Success — `201` *(note: 201, not 200)*
```json
{
  "success": true,
  "message": "WorkHours upserted successfully",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c4c1",
    "subBrandId": "68f1a2b3c4d5e6f7a8b9c4a1",
    "brandId": null,
    "monday":    { "isOpen": true,  "start": "09:00", "end": "23:00" },
    "tuesday":   { "isOpen": true,  "start": "09:00", "end": "23:00" },
    "wednesday": { "isOpen": true,  "start": "09:00", "end": "23:00" },
    "thursday":  { "isOpen": true,  "start": "09:00", "end": "23:00" },
    "friday":    { "isOpen": true,  "start": "09:00", "end": "23:59" },
    "saturday":  { "isOpen": true,  "start": "10:00", "end": "23:59" },
    "sunday":    { "isOpen": false, "start": null,    "end": null },
    "isActive": true,
    "createdAt": "2026-08-22T15:10:00.000Z",
    "updatedAt": "2026-08-22T15:10:00.000Z"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `422` | `Either brandId or subBrandId is required` | Dono missing |
| `422` | `Provide either brandId or subBrandId, not both` | Dono diye |
| `422` | `At least one working day is required` | Koi din nahi bheja |
| `422` | `Start time must be in HH:mm format` | Galat format |
| `422` | `End time must be in HH:mm format` | |
| `422` | `Start time is required when the day is open` | `isOpen: true` par `start` nahi |
| `422` | `End time is required when the day is open` | |
| `422` | `Start time must be earlier than end time` | `start >= end` |
| `422` | `Invalid brandId format` / `Invalid subBrandId format` | |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | Doosre brand ya doosre brand ke outlet ki id (✅ 2026-10-27) |
| `403` | `Access denied. This feature requires an active subscription. Please subscribe to continue.` | Vendor ka plan live nahi (✅ 2026-10-27; admin par ye check nahi) |
| `404` | `Brand not found!` / `Outlet/Sub-Brand not found!` | Id nahi mili ya deleted |

### ⚠️ Notes

**1. Partial update possible hai** — sirf jo din bhejo wahi update hote hain, baaki waise hi rehte hain. Poora hafta bhejna zaruri nahi.

**2. Bandh din ke liye sirf `isOpen: false` kaafi hai** — `start`/`end` optional ho jaate hain (`null`/`""` bhi allowed).

**3. Time 24-hour format me hai.** `"09:00"` (leading zero ke saath), `"23:59"`. `"9:00"` ya `"11:00 PM"` reject honge.

**4. Overnight timings support nahi hain.** `start < end` mandatory hai — matlab `22:00` se `02:00` (raat bhar khula) express nahi kar sakte. Aisi jagah ke liye `23:59` tak set karna padega.

**5. `brandId` bhejo to brand-level default timings ban'ti hain**, `subBrandId` bhejo to us outlet ki. Outlet ki apni timings brand ki default ko override karti hain (customer ko outlet wali dikhti hai).

**6. Response `201` deta hai** chahe update hi kyun na ho — upsert hai.

**7. ✅ Role gate + ownership (prod par live 2026-10-27, hotfix).** Route `isVendorOrAdmin` hai, aur ab service bhi dekhti hai ki brand / outlet kiska hai: vendor sirf apne brand aur apne outlets ke hours set kar sakta hai, doosre ka `403`. Pehle sirf role gate tha — koi bhi vendor kisi bhi brand ya outlet ki id bhej kar uske hours badal sakta tha (customer wahi timings dekhta hai).

**8. Vendor ko live plan chahiye** (✅ prod par live 2026-10-27) — baaki paid vendor writes ki tarah. Onboarding par asar nahi: outlet ke hours plan lene ke baad (step 7) set hote hain. Plan khatam ho jaaye to hours badalne ke liye renew karna hoga.

---

# Location APIs

Ek hi `Location` model teen cheezein serve karta hai — customer address, brand address, outlet address. `isBrandAddress` / `isSubBrandAddress` flags se distinguish hota hai.

Global middleware: `router.use(verifyJwtToken)` — ⚠️ **koi role gate nahi**

> `POST /locations/upsert` customer-only hai (service me role check hai) — vendor ke liye nahi.

## 38. POST /locations/create

Brand ya outlet ka address banata hai.

> **P10.4 (live 2026-11-04):** outlet ka address (`isSubBrandAddress: true`) — outlet `NEVER_VERIFIED` ho to
> `409 OUTLET_NOT_VERIFIED` (`details: { code, subBrandId }`), admin par bhi. Ownership pehle (`403`).
> Update (#41) aur delete (#42) par bhi yahi — teeno ek hi check se guzarte hain. Padhna (get) khula hai.

**Access:** **VENDOR+SUB_VENDOR+ADMIN**, ownership verified ✅ · vendor apna brand, outlet manager sirf **apna outlet**, admin koi bhi

### Body
| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `addressLine1` | string | ✅ | – | |
| `city` | string | ✅ | – | |
| `state` | string | ✅ | – | |
| `zipcode` | string | ✅ | – | `country` ke hisaab se regex ([table](#zip-code-validation-country-wise)) |
| `coordinates` | number[] | ✅ | – | Exactly 2: **`[longitude, latitude]`**. lng −180..180, lat −90..90 |
| `brandId` | ObjectId | ⚠️ | – | **`isBrandAddress: true` pe required** |
| `subBrandId` | ObjectId | ⚠️ | – | **`isSubBrandAddress: true` pe required** |
| `isBrandAddress` | boolean\|string | ❌ | `false` | |
| `isSubBrandAddress` | boolean\|string | ❌ | `false` | |
| `addressLine2` · `landmark` · `district` | string | ❌ | – | |
| `country` | string | ❌ | `india` | 2–80 chars |
| `formattedAddress` | string | ❌ | auto-generated | 1–500 chars |
| `addressType` | string | ❌ | `HOME` | `HOME` \| `WORK` \| `OTHER` |
| `isDefault` | boolean\|string | ❌ | `false` | |
| `userId` | ObjectId | ❌ | token ka user | Vendor flow me na bhejein |

**Outlet ka address:**
```json
{
  "subBrandId": "68f1a2b3c4d5e6f7a8b9c4a1",
  "isSubBrandAddress": true,
  "addressLine1": "Shop 4, Scheme 54",
  "addressLine2": "Vijay Nagar",
  "landmark": "Opposite C21 Mall",
  "city": "Indore",
  "district": "Indore",
  "state": "Madhya Pradesh",
  "zipcode": "452010",
  "country": "india",
  "coordinates": [75.8951, 22.7548],
  "addressType": "WORK"
}
```

**Brand ka registered address:**
```json
{
  "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
  "isBrandAddress": true,
  "addressLine1": "301, Corporate Tower",
  "city": "Indore",
  "state": "Madhya Pradesh",
  "zipcode": "452001",
  "coordinates": [75.8577, 22.7196]
}
```

### Success — `200`
```json
{
  "success": true,
  "message": "Location created successfully",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c4b1",
    "kind": "SUB_BRAND",
    "subBrandId": "68f1a2b3c4d5e6f7a8b9c4a1",
    "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
    "userId": "68f1a2b3c4d5e6f7a8b9c2a1",
    "createdBy": "68f1a2b3c4d5e6f7a8b9c2b7",
    "updatedBy": "68f1a2b3c4d5e6f7a8b9c2b7",
    "addressLine1": "Shop 4, Scheme 54",
    "addressLine2": "Vijay Nagar",
    "landmark": "Opposite C21 Mall",
    "addressType": "WORK",
    "city": "indore",
    "district": "indore",
    "state": "madhya pradesh",
    "country": "india",
    "zipcode": "452010",
    "formattedAddress": "shop 4, scheme 54, vijay nagar, opposite c21 mall, indore, indore, madhya pradesh, 452010, india",
    "geo": { "type": "Point", "coordinates": [75.8951, 22.7548] },
    "isBrandAddress": false,
    "isSubBrandAddress": true,
    "isDefault": false,
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-08-22T15:20:00.000Z"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `403` | 🆕 `Forbidden: You do not have permission to perform this action on this brand.` | Doosre brand ya uske outlet ki id |
| `400` | `Location cannot be both Brand address and SubBrand address` | Dono flags `true` |
| `400` | `subBrandId is required for SubBrand address` | |
| `404` | `Brand not found!` / `SubBrand not found` | |
| `409` | `USE_BILLING_ADDRESS_ENDPOINT` | 🆕 P4 (D34): `isBrandAddress: true` — brand ka address ab billing address hai, sirf `PUT /brands/billing-address` (#32b) se. Outlet / customer address pehle jaisa |
| `409` | 🆕 Duplicate key | Us brand/outlet ka **live address pehle se hai** — pehle purana delete karein |
| `422` | `Address Line 1 is required` / `City is required` / `State is required` | |
| `422` | `Zip Code/Postal Code is required` / `Invalid Zip Code/Postal Code` | |
| `422` | `Coordinates are required.` | |
| `422` | `Coordinates must be [longitude, latitude].` | Array length 2 nahi |
| `422` | `Coordinates must contain only numbers.` | |
| `422` | `Invalid longitude/latitude.` | Range se bahar |

### ⚠️ Edge cases & notes

**1. Coordinates ka order `[longitude, latitude]` hai** — GeoJSON standard. Ye **ulta** hai us se jo maps APIs usually dete hain (`lat, lng`). **Ye sabse common bug hai.** Indore = `[75.8951, 22.7548]`, `[22.7548, 75.8951]` **nahi**.

**2. 🆕 Sync ek hi transaction me hota hai** — address aur parent ka pointer, dono ya koi nahi:
- `isBrandAddress: true` → `brand.locationId`
- `isSubBrandAddress: true` → `subBrand.locationId` **aur** `subBrand.geo`

> Pehle ye do alag writes the, aur `Location.create()` **brand check se pehle** chalta tha — galat `brandId` par `404` aata tha par row ban chuki hoti thi. Development DB me 7 aise address the jinpar koi parent point nahi karta tha.

**3. Outlet ka geo customer listings ke liye critical hai.** `GET /vouchers/customer/get-all` outlets pe chalta hai — bina location wale outlets ke vouchers customer ko **kabhi nahi dikhenge**, chahe voucher published ho, aur chahe customer ne location di ho ya nahi. Brand directory me bhi aisa brand "paas" kabhi nahi ginta. 🆕 Customer ki location ab zaruri nahi: location na ho to customer ko saari listing dikhti hai; location ho to sirf admin radius (`maxDistanceKm`) ke andar wale outlets — aur radius me kuch na ho to saare.

**4. Text fields lowercase ho jaate hain** — `city`, `district`, `state`, `country`. `addressLine1`, `addressLine2`, `landmark` original case me rehte hain.

**5. `formattedAddress` auto-generate hota hai** agar na bhejein — saare parts comma-separated, lowercase.

**6. 🆕 `userId` bhejne ki zarurat nahi — wo entity se derive hota hai.**

| Kind | `userId` | `brandId` | `subBrandId` |
|---|---|---|---|
| Brand address | brand ke owner ki | brand ki | – |
| **Outlet address** | outlet ke user ki | 🆕 **brand ki bhi** | outlet ki |
| Customer address *(sirf admin)* | customer ke user ki | – | – |

Pehle brand/outlet address par `userId` **jaan-boojh kar khaali** chhoda jaata tha (24 me se 19 rows).

**7. 🆕 `kind` field** — `BRAND` \| `SUB_BRAND` \| `CUSTOMER`. `isBrandAddress` / `isSubBrandAddress` isi se derive hote hain aur response me pehle jaise hi aate hain. Banane ke baad **badla nahi ja sakta**.

**8. 🆕 Outlet ke address par `brandId` bhi aata hai** — isse ek brand ke saare outlets ke address ek query me nikal jaate hain.

---

## 39. GET /locations/getAll

Locations ki paginated list — **apne brand ki**.

**Access:** **VENDOR+SUB_VENDOR+ADMIN**, scope enforced ✅ · vendor ko apna brand + apne outlets, outlet manager ko **sirf apna outlet**

> 🆕 Pehle koi scope **tha hi nahi**. Filters optional hain, to bina filter ke ek
> request **platform ke saare address** de deti thi — customer ke ghar ke pate
> aur GPS coordinates samet. Ab vendor ko sirf apne brand ka apna address aur
> apne outlets ke address dikhte hain. Customer ke address **kabhi nahi**.

### Query Params
| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `page` | number | ❌ | `1` | |
| `limit` | number | ❌ | `10` | |
| `search` | string | ❌ | – | addressLine1/2, landmark, city, district, state, zipcode, country, formattedAddress me match |
| `brandId` | ObjectId | ❌ | – | 🆕 Vendor ke liye optional — scope apne aap lagta hai. **Doosre brand ki id bhejne par `403`** |
| `subBrandId` | ObjectId | ❌ | – | |
| `userId` · `customerId` | ObjectId | ❌ | – | |
| `city` · `district` · `state` · `zipcode` · `country` | string | ❌ | – | Exact match, lowercase |
| `addressType` | string | ❌ | – | `HOME` \| `WORK` \| `OTHER` |
| `isBrandAddress` · `isSubBrandAddress` · `isDefault` · `isActive` | boolean\|string | ❌ | – | |
| `fromDate` · `toDate` | ISO date | ❌ | – | |
| `sortBy` | string | ❌ | `createdAt` | Validate nahi hota |
| `sortOrder` | string | ❌ | `desc` | `asc` \| `desc` |

```http
GET /locations/getAll?brandId=68f1a2b3c4d5e6f7a8b9c3a1&isSubBrandAddress=true
```

### Success — `200`
```json
{
  "success": true,
  "message": "Locations fetched successfully",
  "data": {
    "total": 4,
    "totalPages": 1,
    "page": 1,
    "limit": 10,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9c4b1",
        "subBrandId": "68f1a2b3c4d5e6f7a8b9c4a1",
        "addressLine1": "Shop 4, Scheme 54",
        "city": "indore",
        "state": "madhya pradesh",
        "zipcode": "452010",
        "formattedAddress": "shop 4, scheme 54, vijay nagar, …",
        "geo": { "type": "Point", "coordinates": [75.8951, 22.7548] },
        "isSubBrandAddress": true,
        "isActive": true,
        "createdAt": "2026-08-22T15:20:00.000Z"
      }
    ]
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `No any location found` | Empty — **empty-state dikhayein** |
| `422` | `Invalid brandId format` / `Invalid subBrandId format` | |

### ⚠️ Notes

**1. ✅ Ab scoped hai.** Pehle bina `brandId` ke ye **platform ke saare addresses** deta tha — dusre customers ke ghar ke pate bhi. Ab service khud caller ke hisaab se kaatti hai: ADMIN ko sab, VENDOR ko apna brand + uske outlets, SUB_VENDOR ko sirf apna outlet. `brandId` bhejna ab **filter** hai, security nahi.

**2. City/state/zipcode filters lowercase me match karte hain** — service khud `.toLowerCase()` karta hai, to input case matter nahi karta.

**3. `sortBy` validate nahi hota** — galat field name pe error nahi, MongoDB ignore kar dega (unpredictable order).

---

## 40. GET /locations/get/:id

**Access:** Intended: All roles · Enforced: **Any authenticated + ownership** ⚠️

### Path Params
| Param | Type | Required |
|---|---|---|
| `id` | ObjectId | ✅ |

### Success — `200`
```json
{
  "success": true,
  "message": "Location fetched successfully",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c4b1",
    "subBrandId": "68f1a2b3c4d5e6f7a8b9c4a1",
    "addressLine1": "Shop 4, Scheme 54",
    "city": "indore",
    "state": "madhya pradesh",
    "zipcode": "452010",
    "geo": { "type": "Point", "coordinates": [75.8951, 22.7548] },
    "isSubBrandAddress": true,
    "isActive": true
  }
}
```

### Errors
| Status | Message |
|---|---|
| `404` | `Location not found` |
| `422` | `Location ID is required` / `Invalid location ID format` |

### ⚠️ Note

**1. ✅ Ownership ab check hoti hai.** Pehle kisi bhi valid location ID se koi bhi
address mil jaata tha. Ab
[services/locations/getLocation.js](../services/locations/getLocation.js) role ke
hisaab se resolve karta hai: ADMIN ko sab · CUSTOMER ko sirf apna · VENDOR ko apne
brand ka address ya apne kisi outlet ka. Outlet ka rishta **`SubBrand` se** verify
hota hai, token ke `brandId` se nahi — taaki stale claim jawab chaudा na kar sake.

**2. ✅ `SUB_VENDOR` ab apna outlet ka address padh sakta hai.** Pehle yahan
`403` milta tha — wo `PUT /locations/update/:id` se address **badal** sakta tha
par id se **padh** nahi sakta tha, kyunki `getLocation` me SUB_VENDOR ki branch
hi nahi thi (aur controller `subBrandId` bhejta bhi nahi tha). Ab dono hain.

⚠️ Check `actor.subBrandId` ke against hota hai, brand ke nahi — ek outlet
manager ka brand uske outlet se udhaar liya hua hai, to brand-level ownership
use bhai-outlet ka address bhi padhne deta.

---

## 41. PUT /locations/update/:id

**Access:** **VENDOR+SUB_VENDOR+ADMIN**, ownership verified ✅ · outlet manager sirf apna outlet

> **P10.4 (live 2026-11-04):** outlet ka address + outlet `NEVER_VERIFIED` → `409 OUTLET_NOT_VERIFIED` (see #38).

### Path Params
| Param | Type | Required |
|---|---|---|
| `id` | ObjectId | ✅ |

### Body — sab optional
| Field | Type | Validation |
|---|---|---|
| `addressLine1` · `addressLine2` · `landmark` | string | – |
| `city` · `district` · `state` | string | – |
| `zipcode` | string | Country-wise regex |
| `country` | string | 2–80 chars |
| `formattedAddress` | string | 1–500 chars |
| `coordinates` | number[] | `[longitude, latitude]`, range-checked |
| `addressType` | string | `HOME` \| `WORK` \| `OTHER` |
| `isDefault` | boolean\|string | – |
| `isBrandAddress` · `isSubBrandAddress` | boolean\|string | 🆕 **Badle nahi ja sakte.** Jo abhi hai wahi bhejo, ya bhejo hi mat — alag value par `400` |

```json
{ "addressLine1": "Shop 4-A, Scheme 54", "coordinates": [75.8952, 22.7549] }
```

### Success — `200`
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": { "_id": "…", "addressLine1": "Shop 4-A, Scheme 54", "geo": { "type": "Point", "coordinates": [75.8952, 22.7549] } }
}
```

### Errors
| Status | Message |
|---|---|
| `403` | 🆕 `Forbidden: You do not have permission to perform this action on this brand.` |
| `400` | 🆕 `A location's type cannot be changed. Delete it and create a new one.` |
| `404` | `Location not found` |
| `422` | `Invalid Zip Code/Postal Code` |
| `409` | 🆕 P4: brand ka address (`details.code: USE_BILLING_ADDRESS_ENDPOINT`) — `PUT /brands/billing-address` se badlo |
| `422` | `Coordinates must be [longitude, latitude].` / `Invalid longitude/latitude.` |
| `422` | `Invalid location ID format` |

### ⚠️ Notes

**1. 🆕 Coordinates badalne par outlet ka `geo` usi transaction me sync hota hai.** Pehle wo call `await` ke bina tha — fail ho jaata to chup-chaap, aur panel naya pata dikhata jabki customer ko "near me" me outlet **purani jagah** dikhta. Ab sync fail hone par poori request fail hoti hai aur address bhi nahi hilta.

> `SubBrand.geo` hi wo field hai jo customer ka nearest search padhta hai (`$geoNear` `SubBrand` par chalta hai, `Location` par nahi) — voucher feed, voucher detail ki distance, brand directory aur search, sab isi se.

**2. 🆕 Location ka **type** badal nahi sakta.** `isBrandAddress` / `isSubBrandAddress` flip karne par `400`. Type badalne ka matlab `Brand.locationId`, `SubBrand.locationId` aur `Customer.locationId` teenon ka re-sync — jo hota nahi tha, to row ek jagah aur pointer doosri jagah reh jaata tha. Badalna ho to delete karke naya banaayein.

**3. ✅ Ownership ab enforce hoti hai.** Row ka maalik caller se match karna chahiye (admin koi bhi). Pehle sirf `id` kaafi thi — aur ek Location **customer ki** bhi ho sakti hai, jiska voucher feed usi address se banta hai.

**4. 🆕 `updatedBy` har update par set hota hai**, `createdBy` waisa hi rehta hai. Admin kisi ka address theek kare to `userId` (maalik) nahi badalta — sirf `updatedBy` admin ka ho jaata hai.

---

## 42. DELETE /locations/delete/:id

**Access:** **Koi bhi signed-in role**, ownership verified ✅

> **P10.4 (live 2026-11-04):** outlet ka address + outlet `NEVER_VERIFIED` → `409 OUTLET_NOT_VERIFIED` (see #38).

> 🆕 Gate ab `verifyJwtToken` hai, koi role gate nahi — wahi shape jo
> `GET /locations/get/:id` ka hai. Sawaal role ka hai hi nahi: *ye address kiska
> hai*. `resolveLocationTarget` wo tay karta hai — vendor apna brand, outlet
> manager apna outlet, **customer apna ghar ka pata**, admin koi bhi. Baaki
> sabko `403`.

### Path Params
| Param | Type | Required |
|---|---|---|
| `id` | ObjectId | ✅ |

### Success — `200`
```json
{ "success": true, "message": "Location deleted successfully", "data": { "_id": "…", "isDeleted": true } }
```

### Errors
| Status | Message |
|---|---|
| `403` | 🆕 `Forbidden: You do not have permission to perform this action on this brand.` |
| `404` | `Location not found` |
| `422` | `Invalid location ID format` |
| `409` | 🆕 P4: brand ka billing address delete nahi hota (`details.code: BILLING_ADDRESS_NOT_DELETABLE`) |

### ⚠️ Notes

**1. Soft delete hai** — `isDeleted: true`, record rehta hai.

**2. 🆕 Parent ka pointer usi transaction me clear hota hai** — `subBrand.locationId` ab dangling nahi rehta. Outlet ka `geo` **hata** diya jaata hai (pehle `[0,0]` set hota tha, jo Gulf of Guinea ka ek asli point hai aur 2dsphere index me pada rehta tha).

**3. ⚠️ Outlet ka address delete karne se pehle sochein** — us outlet ke vouchers customer listing se **gayab ho jaayenge**, kyunki nearest search ko uski position hi nahi milegi. Aur naya voucher banate waqt ab saaf `400` aayega: *"outlet has no address yet"*.

**4. ✅ Ownership ab enforce hoti hai.** Pehle sirf `id` kaafi thi — koi bhi vendor token kisi **customer ka ghar ka pata** mita sakta tha, aur uske saath `Customer.locationId` bhi.

---

# Showcase APIs

Brand ka photo/video gallery — **sections** me organized, har section me **media** (photos + videos). Customer ise brand profile pe dekhta hai.

⚠️ **Sections plan se metered hain** — `showcase` bucket. Media pe koi plan limit nahi, par per-section config limits hain.

Global middleware: `router.use(verifyJwtToken)` — ⚠️ **koi role gate nahi** ([Appendix B](#appendix-b--known-issues))

### Media config (admin-configurable)

Live values `Setting.vendor.showcase` se aate hain; ye fallbacks hain:

| Limit | Default |
|---|---:|
| Max sections per brand | 5 |
| Max items per section | 15 |
| Max images per section | 15 |
| Max videos per section | 5 |
| Min items per section | 3 🆕 |
| Max image size | 10 MB |
| Max GIF size | 15 MB 🆕 |
| Max video size | 50 MB |

Allowed images: `image/jpeg` · `image/jpg` · `image/png` · `image/webp` · 🆕 `image/gif`
Allowed videos: `video/mp4` · `video/webm` · `video/quicktime`

> ⚠️ **GIF ka apna cap hai** — 15 MB, image ka 10 MB nahi. Animated GIF har frame
> poora store karta hai, to usi tasveer ka GIF photo se kai guna bhaari hota hai.
> Error message wahi limit bolta hai jo lagi hai:
> `<file> exceeds maximum GIF size of 15 MB.`
>
> 🆕 **Min items** ek floor hai, ceiling nahi: jis section me itni visible media
> na ho, wo customer ko dikhta hi nahi. Admin ise badal sakta hai — badhane par
> chhote sections turant chhup jaate hain (aur admin switch `requireShowcase` ON ho
> to jis brand ka aakhri album isse neeche gira, wo poora brand customer se chhup
> jaata hai — #31 Note 8).
>
> ✅ **Ab ye sach me lagu hai** (pehle number rakha tha par padhta koi nahi tha).
> Customer ke teeno surface — brand profile, poori gallery, aur clips feed — aise
> section ko chhod dete hain. Vendor/admin ke apne endpoints par **koi farak
> nahi**: aapko wo section dikhta rahega, warna aap theek hi nahi kar paate.
>
> Iska seedha matlab: **naya section banate hi customer ko nahi dikhta** — wo
> khali banta hai — aur teesri media add karte hi dikhne lagta hai.

### 🆕 Do floors — section apne aap customer se gayab na ho jaye

Ab tak sab ceilings the. Ye do floors kehte hain ki **kam se kam kya bacha rehna chahiye**, aur inhe todne wali write **rok di jaati hai**:

| Floor | Default | Kya rokta hai |
|---|---|---|
| `minItemsPerSection` | `3` | Jo delete/hide section ko customer ki nazar se **utaar de** |
| `minSectionsPerBrand` | `1` | Brand ka **aakhri section** delete karna, ya aakhra dikhne wala hide karna |
| 🆕 aakhri customer-visible album (P7, live 2026-11-04) | — | Brand ka **aakhri** album jo customer dekh raha hai (on + `minItemsPerSection` media) hide / band / delete karna → `422`. Admin switch se independent; admin par nahi lagta — #46, #53 |

**Media hide karna = media delete karna** (customer ke liye). Isliye `isActive: false` (#49) par wahi floor lagta hai jo delete (#52) par — warna vendor teen media chup-chaap off karke wahi haalat bana leta, bina kisi rok ke.

> ⚠️ **Jo section pehle se floor ke neeche hai, uspar rok nahi hai.**
>
> `minItems` 3 hai aur section me 2 media hain — wo section customer ko waise bhi nahi dikh raha. Uspar delete rokne se kuch bachta nahi, sirf vendor phansta hai: media delete band, aur "poora section delete kar dein" wala raasta bhi band (kyunki `minSectionsPerBrand` 1 se neeche nahi ja sakta). Ek section, do photo — koi legal move hi nahi bachta.
>
> Isliye rok sirf **us kadam par** hai jo section ko floor se neeche le jaata hai. Neeche wala section ghat sakta hai, `1` tak — us par purana rule lagta hai: *"At least one media is required in this section."*

**ADMIN par ye floors nahi lagte.** Admin media hata raha hai matlab wo **moderate** kar raha hai. Agar floor use rokta, to platform kisi galat content ko isliye nahi utaar paata kyunki utaarne se section chhota ho jayega — floor vendor ko apni hi galti se bachane ke liye hai, content ko platform se nahi.

**Client ko kya karna hai:** ye `400`/`422` message me hi raasta likha hota hai (naya media add karein, ya doosra section dikhayein). Message seedha dikha dena kaafi hai.

---

### 🆕 `409` — koi aur usi section par kaam kar raha tha

Ek hi section par do log ek saath likhein — ek media delete kare, dusra usi waqt
reorder kare — to **dusre ko `409` milta hai**, aur uski write hoti hi nahi:

```json
{
  "success": false,
  "message": "Somebody else changed this while you were editing it. Reload and try again."
}
```

Ye **sab section-write endpoints** par lag sakta hai — #46 (update), #49 (media
update), #50 (media replace), #51 (media reorder), #52 (media delete), #53
(section delete). Pehle aisi haalat me dono write "safal" hoti thi aur section ka
order aadha-aadha bach jaata tha — panel me media `1, 3` par dikhte the, `1, 2`
par nahi.

**Client ko kya karna hai:** section dobara fetch karke user ko naya state
dikhaiye, phir unka action repeat karwaiye. Apne aap retry **mat** kijiye — jo
badla hai wo user ko dikhna chahiye, warna wahi conflict phir se hoga.

Ye error toote hue server ka nahi hai: write isliye ruki kyunki document beech me
badal gaya. `500` nahi bhejte, isliye "Something went wrong" wala raasta khatam.

---

## 43. POST /showcase/section/add

Naya showcase section banata hai.

**Access:** Intended: VENDOR · Enforced: **VENDOR+ADMIN + ownership** — vendor apna brand, admin `brandId` de kar kisi ka bhi

### Body
| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `brandId` | ObjectId | admin ke liye ✅ | – | Vendor ke liye optional (apna brand auto) |
| `title` | string | ✅ | – | 2–60 chars. **Jaisa likha waisa store hota hai** (pehle lowercase hota tha) |
| `description` | string | ❌ | – | Max 500 chars, `""` allowed |
| ~~`sortOrder`~~ | — | — | **server decide karta hai** | 🆕 **Hata diya gaya** — note 4 |
| `sectionType` | string | ❌ | `CUSTOM` | `CUSTOM` \| `SYSTEM` |
| `isActive` | boolean | ❌ | `true` | |
| `isVisible` | boolean | ❌ | `true` | `false` bhejein to section hidden banega |
| `isShowVideosInClips` | boolean | ❌ | `true` | Is section ke videos customer ke reels feed me aayein ya nahi |

```json
{
  "title": "Ambience",
  "description": "Our cozy interiors",
  "isShowVideosInClips": true
}
```

### Success — `201`
```json
{
  "success": true,
  "message": "Section created successfully.",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c5a1",
    "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
    "title": "Ambience",
    "slug": "ambience",
    "description": "Our cozy interiors",
    "coverImageMode": "AUTO",
    "sortOrder": 1,
    "sectionType": "CUSTOM",
    "isActive": true,
    "isVisible": true,
    "isShowVideosInClips": true,
    "isDeleted": false,
    "mediaCount": 0,
    "createdAt": "2026-08-22T16:00:00.000Z"
  }
}
```

> `medias: []` ki jagah ab `mediaCount` aata hai — create/update response me media array bhejne ka koi matlab nahi tha.

### Errors
| Status | Message | Kab |
|---|---|---|
| `403` | `Access denied. This feature requires an active subscription. Please subscribe to continue.` | Koi active plan nahi |
| `403` | `Your current plan does not include showcase sections. Please upgrade your subscription to add showcase sections.` | Plan me showcase pool nahi |
| `403` | `Showcase section limit reached — 5 of 5 used on your current plan. Please upgrade your subscription to add more.` | Pool khatam |
| `409` | `Section title already exists.` | Same brand me wahi title (case-insensitive) |
| `404` | `Brand not found.` | Vendor ka brand nahi |
| `422` | `Section title is required.` | |
| `422` | `Section title must contain at least 2 characters.` | |
| `422` | `Section title cannot exceed 60 characters.` | |

### ⚠️ Notes

**1. Order of checks:** subscription gate → duplicate title → slug generate → **slot reserve (sabse last)**. Service ka comment: *"Claimed as late as possible — after the duplicate-title and slug checks."* Matlab duplicate title pe slot waste nahi hota.

**2. `title` original case me store hota hai** (naya) — customer app wahi render karta hai. Duplicate check case-insensitive hi hai, to `"Ambience"` aur `"ambience"` ek saath nahi rah sakte (409).

**3. `slug` auto-generate hota hai** brand ke andar unique — same title dobara nahi ho sakta, par slug collision handle ho jaata hai.

**4. 🆕 `sortOrder` server decide karta hai** — brand ke **non-deleted sections ki ginti + 1**. Pehle `last.sortOrder + 1` tha, jo sirf badhta tha.

Wajah deleted sections nahi the — wo query pehle se `isDeleted: false` filter karti thi. Wajah ye thi ki **delete par bache hue sections renumber nahi hote the**: `1, 2, 3` me se doosra delete karo to `1, 3` reh jaata tha, agla create sabse bada number padhkar `4` deta, aur list `1, 3, 4` ban jaati. Phir delete karo to `1, 4, 5` — numbers ginti se door hote chale jaate the.

Ab positions **dense `1..n`** rehti hain. Delete (#53) gap band karta hai, aur **create bhi pehle brand ko dense karta hai** — to jin brands me ye drift pehle se hai, unka agla section banate hi list sudhar jaati hai aur naya section hamesha aakhir me aata hai.

🔴 **Request se `sortOrder` hata diya gaya hai** — position sirf reorder endpoint (#47) ki property hai, wahi wajah jo media update (#49) me pehle se lagu thi. Purana client bhejta rahe to `422` nahi aayega; `stripUnknown` use chup-chaap hata deta hai.

**5. ✅ Teeno toggle ab actually apply hote hain** (naya) — `isActive` / `isVisible` / `isShowVideosInClips` validator accept karta tha par service inhe drop kar deti thi, to hidden section banane ki koshish karne pe bhi visible section banta tha.

**6. `isShowVideosInClips` reels feed control karta hai.** Customer ka `/showcase/:brandId/video-clips` **double opt-in** maangta hai: section pe ye flag **aur** media pe `isShowInVideoClips` — dono `true` hone chahiye. Media wala flag **sirf videos** pe lagta hai.

**7. Section khali banta hai** — media alag se `POST /showcase/section/:sectionId/add-media` (#48) se add karni hoti hai.

---

## 44. GET /showcase/section/get/:sectionId

Ek section + uska media, paginated.

**Access:** Intended: VENDOR · Enforced: **VENDOR+ADMIN + ownership** ⚠️

### Path Params
| Param | Type | Required |
|---|---|---|
| `sectionId` | ObjectId | ✅ |

### Query Params
| Param | Type | Required | Default | Validation |
|---|---|---|---|---|
| `page` | number | ❌ | `1` | Integer ≥ 1 |
| `limit` | number | ❌ | `10` | Integer 1–100 |
| `search` | string | ❌ | – | Max 100 chars — media title/altText me |
| `type` | string | ❌ | – | `PHOTO` \| `VIDEO` |
| `isActive` | boolean | ❌ | – | **Naya.** Default me on aur off dono media aati hain; ye ek side pe filter karta hai |

```http
GET /showcase/section/get/68f1a2b3c4d5e6f7a8b9c5a1?type=VIDEO
```

### Success — `200`
```json
{
  "success": true,
  "message": "Section fetched successfully.",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c5a1",
    "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
    "title": "ambience",
    "slug": "ambience",
    "description": "Our cozy interiors",
    "coverImage": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/showcase/amb-cover.jpg",
    "sortOrder": 1,
    "sectionType": "CUSTOM",
    "coverImageMode": "AUTO",
    "isActive": true,
    "isVisible": true,
    "isShowVideosInClips": true,
    "customerVisibility": {
      "isLive": true,
      "reasons": [],
      "visibleMediaCount": 4,
      "minItemsRequired": 3
    },
    "mediaCount": 5,
    "photoCount": 4,
    "videoCount": 1,
    "inactiveMediaCount": 1,
    "media": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1,
      "data": [
        {
          "_id": "68f1a2b3c4d5e6f7a8b9c5b1",
          "type": "PHOTO",
          "media": {
            "url": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/showcase/amb1.jpg",
            "kind": "IMAGE",
            "width": 1920,
            "height": 1080,
            "mimeType": "image/jpeg",
            "sizeBytes": 2516582,
            "originalName": "seating area.jpg",
            "provider": "CLOUDINARY"
          },
          "title": "seating area",
          "altText": "cafe seating with wooden tables",
          "sortOrder": 1,
          "isActive": true,
          "createdAt": "2026-08-22T16:05:00.000Z",
          "updatedAt": "2026-08-22T16:05:00.000Z"
        },
        {
          "_id": "68f1a2b3c4d5e6f7a8b9c5b2",
          "type": "VIDEO",
          "media": {
            "url": "https://res.cloudinary.com/drvdnqydw/video/upload/v1/showcase/amb-tour.mp4",
            "kind": "VIDEO",
            "width": 1080,
            "height": 1920,
            "mimeType": "video/mp4",
            "sizeBytes": 19084083,
            "originalName": "cafe walkthrough.mp4",
            "provider": "CLOUDINARY",
            "duration": 24,
            "thumbnail": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/showcase/amb-tour-thumb.jpg"
          },
          "title": "cafe walkthrough",
          "altText": "video tour",
          "sortOrder": 2,
          "isActive": true,
          "isShowInVideoClips": true,
          "createdAt": "2026-08-22T16:06:00.000Z",
          "updatedAt": "2026-08-22T16:06:00.000Z"
        }
      ]
    }
  }
}
```

> ⚠️ **Media ek nested block hai — `data.media.data[]`, na ki `data.medias[]`.** Pagination bhi usi block me hai, section ke saath flat nahi. Live run me pakda gaya (2026-08-27); doc me pehle flat `medias[]` + top-level `total` likha tha.

### 🆕 `customerVisibility` — section customer ko dikh raha hai ya nahi, aur kyun nahi

```json
"customerVisibility": {
  "isLive": false,
  "reasons": ["NOT_ENOUGH_MEDIA"],
  "visibleMediaCount": 2,
  "minItemsRequired": 3
}
```

| Field | Matlab |
|---|---|
| `isLive` | `true` = section customer ke teeno surface par dikh raha hai |
| `reasons[]` | Kyun nahi dikh raha. `isLive: true` par hamesha `[]` |
| `visibleMediaCount` | Kitni media customer ko dikhegi (`isActive && !isDeleted`) |
| `minItemsRequired` | Abhi ka floor — `Setting.vendor.showcase.minItemsPerSection` |

**`reasons[]` ki values:**

| Code | Kab | Vendor kya kare |
|---|---|---|
| `HIDDEN` | `isVisible: false` | Toggle on karein (#46) |
| `INACTIVE` | `isActive: false` | Toggle on karein (#46) |
| `NOT_ENOUGH_MEDIA` | `visibleMediaCount < minItemsRequired` | Media add karein (#48), ya chhupi hui media wapas on karein (#49) |

**Ye field kyun hai.** Section ka customer se gayab ho jaana **chup-chaap** hota hai — koi write nahi, koi log nahi, vendor ki apni list bilkul waisi hi. Do wajah aisi hain jo vendor ne khud ki (dono toggle), par teesri kaa jawab panel apne aap nikal hi nahi sakta: wo ek admin setting par nirbhar hai. Isliye teeno ek saath yahin bhej dete hain.

> ⚠️ **Saari wajahein aati hain, sirf pehli nahi.** Section ek saath hidden bhi ho sakta hai aur media me kam bhi. Ek hi bata dena vendor ko ek cheez theek karne bhejta hai aur wo dekhta hai kuch nahi badla. UI chahe ek line dikhaye — par jo wajah batayi hi nahi gayi wo dikha nahi sakta.

> ⚠️ **Ye field derive hoti hai, stored nahi.** Admin `minItemsPerSection` badal de to platform ke har section ka jawab badal jaata hai, bina kisi document ko chhue. Stored flag us waqt har jagah galat ho jaata. Customer read wahi ginti usi tarah karti hai, to dono kabhi alag nahi bol sakte.

> Query ke `search` / `type` / `isActive` filter **is field ko nahi badalte** — visibility section ki property hai, us page ki nahi jo aap dekh rahe hain.

### Errors
| Status | Message |
|---|---|
| `404` | `Showcase section not found.` |
| `422` | *(Joi message)* — invalid `sectionId`, `limit > 100`, invalid `type` |

### ⚠️ Notes

**1. 🔴 `url` / `thumbnail` / `storage` / `metadata` ek `media` object ban gaye.**

| Pehle | Ab |
|---|---|
| `url` | `media.url` |
| `thumbnail` | `media.thumbnail` — **sirf VIDEO par**, aur wo uska poster hai |
| `metadata.width` / `.height` / `.duration` | `media.width` / `media.height` / `media.duration` |
| `metadata.sizeMB` | `media.sizeBytes` (bytes, MB nahi) |
| `metadata.mimeType` | `media.mimeType` |
| `storage.provider` | `media.provider` |
| `storage.publicId` / `bucket` / `key` | **nahi aate** |

File size aur dimensions ab bhi dikhte hain — wo panel ke kaam ke hain. Jo nahi
dikhta wo hai object ka **pata**: `publicId`, `bucket`, `key`. `media.provider`
bata deta hai file kahan rehti hai, bina ye bataye ki use seedha kaise kheencha
jaaye.

> ⚠️ `type` (`PHOTO`/`VIDEO`) waisa hi rehta hai, par ab wo **stored field nahi**
> — `media.kind` se derive hota hai. Ek GIF `type: "PHOTO"` deta hai aur
> `media.kind: "GIF"` — dono sach hain, alag-alag sawaal ke jawab.

**2. 🔴 `isActive: false` media ab bhi aati hai** (naya). Pehle wo list se gayab ho jaati thi — matlab off karne ke baad usko wapas on karne ka koi rasta hi nahi bachta tha. Ab sirf soft-deleted media chhupti hai. Ek side chahiye to `?isActive=true|false`.

**3. `isShowInVideoClips` sirf `VIDEO` rows pe aata hai** (naya). Photo pe ye key hoti hi nahi — wo video-only switch hai, to photo pe toggle mat dikhayein.

**4. Section ke teeno switch ab response me hain** — `isVisible`, `isShowVideosInClips`, `isActive` (aur `slug`, `coverImageMode`). Ye doc pehle se inhe list karta tha, par service bhejti nahi thi — ab bhejti hai.

**5. Counts pre-calculated hain** — `mediaCount`, `photoCount`, `videoCount`, `inactiveMediaCount`. Ye **poore album** ke counts hain (soft-deleted chhod kar), `type`/`search`/`isActive` filter inhe nahi badalta — filter sirf `media.data[]` page ko narrow karta hai.

**6. ✅ Ownership check hoti hai** — `resolveSectionForActor` verify karta hai ki section aapke brand ka hai.

---

## 45. GET /showcase/section/get-all

Sections ki paginated list.

**Access:** Intended: Admin + Vendor · Enforced: **VENDOR+ADMIN + ownership** ⚠️

### Query Params
| Param | Type | Required | Default | Validation |
|---|---|---|---|---|
| `brandId` | ObjectId | ❌ | – | Vendor: sirf apna brand chalega. Admin: kisi bhi brand pe narrow karne ke liye |
| `page` | number | ❌ | `1` | Integer ≥ 1 |
| `limit` | number | ❌ | `10` | Integer 1–100 |
| `search` | string | ❌ | – | Title me match, `""` allowed |
| `isActive` | boolean | ❌ | *(koi default nahi)* | Bheja to filter, na bheja to on+off dono |
| `isVisible` | boolean | ❌ | *(koi default nahi)* | Bheja to filter, na bheja to visible+hidden dono |
| `sortBy` | string | ❌ | `sortOrder` | `title` \| `sortOrder` \| `createdAt` \| `updatedAt` |
| `order` | string | ❌ | `asc` | `asc` \| `desc` — **note: `order` hai, `sortOrder` nahi** |

### Success — `200`
```json
{
  "success": true,
  "message": "Showcase sections fetched successfully.",
  "data": {
    "total": 3,
    "totalPages": 1,
    "page": 1,
    "limit": 10,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9c5a1",
        "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
        "title": "Ambience",
        "slug": "ambience",
        "description": "Our cozy interiors",
        "coverImage": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/showcase/amb-cover.jpg",
        "coverImageMode": "AUTO",
        "sectionType": "CUSTOM",
        "sortOrder": 1,
        "isActive": true,
        "isVisible": true,
        "isShowVideosInClips": true,
        "mediaCount": 5,
        "photoCount": 4,
        "videoCount": 1,
        "inactiveMediaCount": 0,
        "visibleMediaCount": 5,
        "customerVisibility": {
          "isLive": true,
          "reasons": [],
          "visibleMediaCount": 5,
          "minItemsRequired": 3
        },
        "createdAt": "2026-08-22T16:00:00.000Z",
        "updatedAt": "2026-08-22T16:05:00.000Z"
      }
    ]
  }
}
```

### Errors
| Status | Message |
|---|---|
| `404` | `No any showcasesection found` | Empty — **empty-state** |
| `422` | *(Joi message)* — `limit > 100`, invalid `sortBy`/`order` |

### ⚠️ Notes

**1. ✅ Brand scoping fix ho chuki hai.** Pehle service me brand filter commented out tha — vendor ko **platform ke saare brands ke sections** mil jaate the (security finding #4). Ab:
- **VENDOR** apne brand pe pinned hai. `brandId` bhejein to `resolveActorBrand` verify karta hai ki wo aapka hi hai, warna `403`.
- **ADMIN** global hai — `brandId` na bhejein to sab brands, bhejein to us brand ke sections.

**2. 🔴 `isActive` / `isVisible` ke default filter hata diye gaye hain** (naya). Pehle default `true`/`true` tha, matlab jis section ko aapne abhi hide kiya wo aapki apni list se hi gayab ho jaata tha — usko dubara dhoondh kar on karne ka koi tareeka nahi bachta tha. Ab managed list me **sirf soft-deleted** sections chhupte hain.

Panel me "Hidden" tab chahiye to `?isVisible=false` bhejein.

**3. Counts soft-deleted media ko chhod kar sab count karte hain** — `isActive: false` media bhi `mediaCount` me hai, aur `inactiveMediaCount` alag se batata hai kitni off hain.

**3a. 🆕 `customerVisibility` har row par aata hai** — wahi shape jo #44 par hai, poora explanation [wahan](#44-get-showcasesectiongetsectionid) hai. List screen par seedha badge bana sakte hain: `isLive: false` wale sections ko mark karein aur `reasons[0]` ki line dikhayein.

> ⚠️ `visibleMediaCount` aur `mediaCount` **alag** hain. `mediaCount` sab kuch ginta hai jo vendor manage karta hai (chhupi media bhi); `visibleMediaCount` sirf wo jo customer dekhega — aur floor **usi** par lagta hai. Jis section me `mediaCount: 5` aur `visibleMediaCount: 2` ho wo customer ko nahi dikhega.

**4. Search case-insensitive hai** aur title pe chalta hai.

---

## 46. PUT /showcase/section/update/:sectionId

> 🆕 **Develop par (P7, 2026-10-26 — stage + prod par live 2026-11-04):** brand ka **aakhri dikhne layak** album (visible + active + `minItemsPerSection` visible media) chhupane / band karne par `422` — neeche errors table. Pehle wala guard sirf aakhri **on** section dekhta tha, media floor nahi; wo bhi rehta hai. Sirf "crossing" par: naya guard us section par nahi lagta jise customer abhi dekh hi nahi raha (chhupa, band, ya floor se kam media), aur jis brand ka koi dikhne layak album hai hi nahi wo nahi phansta — par agar wo section brand ka akela **on** section hai to purana `422` "last section" phir bhi lagta hai. Admin switch se independent. Admin exempt — [plan §4.9](./brand_feed_outlet_rule_plan.md#49-vendor--admin).

**Access:** Intended: VENDOR · Enforced: **VENDOR+ADMIN + ownership** ⚠️

### Path Params
| Param | Type | Required |
|---|---|---|
| `sectionId` | ObjectId | ✅ |

### Body — sab optional, **kam se kam ek field chahiye**
| Field | Type | Validation |
|---|---|---|
| `title` | string | 2–60 chars |
| `description` | string | Max 500 chars, `""` bhej kar clear kar sakte hain |
| ~~`sortOrder`~~ | — | 🆕 **Hata diya gaya** — neeche note dekhein |
| `sectionType` | string | `CUSTOM` \| `SYSTEM` |
| `isActive` | boolean | – |
| `isVisible` | boolean | – |
| `isShowVideosInClips` | boolean | – |
| `coverMediaId` | ObjectId | 🆕 Is section ki kisi media ka id — use cover **pin** kar deta hai |
| `coverImageMode` | string | 🆕 Sirf `AUTO` — pin hata deta hai |

```json
{ "description": "Our cozy interiors, refreshed", "isShowVideosInClips": false }
```

> ### 🆕 Cover pin karna
>
> **Default hamesha se kaam karta raha hai:** cover section ki pehli dikhne wali
> media ka hota hai aur har add, delete aur reorder par khud badal jaata hai.
> Isme kuch karna nahi padta.
>
> Jo nahi tha wo ye: vendor apni pasand ki tile chun sake. `coverImageMode:
> MANUAL` code me pehle se honour hota tha par **koi endpoint use set nahi karta
> tha** — wo branch mara pada tha.
>
> ```json
> { "coverMediaId": "68f1a2b3c4d5e6f7a8b9c6b2" }   // pin — mode MANUAL ho jaata hai
> { "coverImageMode": "AUTO" }                      // unpin — pehli media par wapas
> ```
>
> | Case | Jawab |
> |---|---|
> | Kisi **doosre section** ki media id | `404 That media is not in this section.` |
> | **Chhupi hui** media (`isActive: false`) | `422 A hidden media cannot be the cover. Show it first.` |
> | **Deleted** media | `404` |
> | `coverImageMode: "MANUAL"` | `422` — MANUAL pin karne ka **nateeja** hai, request nahi |
> | Dono ek saath | `422` — ek hi bhejein |
>
> 🔴 **Pin ki hui media delete ya chhupa di jaaye to cover apne aap `AUTO` par
> wapas aa jaata hai** aur pehli dikhne wali media par chala jaata hai. Iske bina
> section ek aisi file par point karta rehta jo ja chuki hai — brand profile par
> tooti hui tile, ek aam delete se jo success bhi keh deta.
>
> ⚠️ Pin **media ke id** se bandha hai, URL se nahi. Isliye us media ki file
> replace karne par cover uske saath chalta hai — pin bana rehta hai.

### Success — `200`
```json
{
  "success": true,
  "message": "Section updated successfully.",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c5a1",
    "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
    "title": "Ambience",
    "slug": "ambience",
    "description": "Our cozy interiors, refreshed",
    "coverImage": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/showcase/amb-cover.jpg",
    "coverImageMode": "AUTO",
    "sectionType": "CUSTOM",
    "sortOrder": 1,
    "isActive": true,
    "isVisible": true,
    "isShowVideosInClips": false,
    "mediaCount": 5,
    "createdAt": "2026-08-22T16:00:00.000Z",
    "updatedAt": "2026-08-22T16:20:00.000Z"
  }
}
```

> `medias[]` array response me **nahi** aata (naya) — title badalne pe poori media list wapas bhejne ka koi matlab nahi tha. Media ke liye #44 hai.

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Showcase section not found.` | |
| `409` | `Section title already exists.` | Naya title kisi aur section ka hai |
| `422` | 🆕 `This is the last section customers can see on your profile. Show another one before hiding this.` | `isVisible: false` ya `isActive: false`, aur brand ka koi aur section on nahi hai. **ADMIN par nahi lagta.** |
| `422` | 🆕 `This is the last album customers can see on your profile. Make another album visible, with at least {N} photos or videos, before hiding or deleting this one.` | (P7, live 2026-11-04) Ye section customer ko dikh raha hai (on + kam se kam `{N}` = `minItemsPerSection` visible media) aur brand ka koi aur album aisa nahi — doosre "on" sections floor se kam media wale hon tab bhi. **ADMIN par nahi lagta.** Upar wala error pehle check hota hai |
| `422` | *(min-1 message)* | Body khali |
| `422` | `Section title must contain at least 2 characters.` | |

### ⚠️ Notes

**1. Body khali nahi ho sakti** — validator pe `.min(1)` hai.

**2. Teen alag-alag switch hain, confuse na karein:**

| Field | Customer pe asar | Vendor list (#45) pe asar | Slot |
|---|---|---|---|
| `isVisible: false` | Section brand profile aur gallery dono se hat jaata hai | Dikhta rehta hai | Release nahi |
| `isActive: false` | Section customer ko dikhna band | Dikhta rehta hai | Release nahi |
| `isShowVideosInClips: false` | Sirf reels feed se videos hatte hain, album me rehte hain | Dikhta rehta hai | Release nahi |

Section poora hatana ho tabhi delete (#53) — wohi slot release karta hai.

**3. `title` original case me store hota hai** (naya) — pehle sab lowercase ho jaata tha. Uniqueness ab bhi case-insensitive hai, to "Ambience" aur "ambience" ek saath nahi rah sakte (`409`).

**4. ✅ Rename pe slug ab drift nahi karta** (naya) — pehle har rename `ambience` → `ambience-2` → `ambience-3` karta chala jaata tha, kyunki section apne hi slug se "duplicate" match kar jaata tha.

**5. ✅ Ownership check hoti hai** — `resolveSectionForActor`.

**6. 🔴 `sortOrder` hata diya gaya hai** (naya) — position ab sirf reorder endpoint (#47) badalta hai. Yahan se set karne par do sections ek hi number par aa sakte the (ya ek `99` par), aur baad me kuch renumber karta hi nahi tha — to list bas galat padi rehti, bina kisi error ke. Koi per-field rule isse rok nahi sakta: uniqueness aur density **poori list** ki property hain, isliye wo wahin check ho sakti hain jahan poori list aati hai.

Media update (#49) me ye pehle se aisa hi tha — ab baaki domain bhi wahin aa gaya.

> Purana client `sortOrder` bhejta rahe to `422` **nahi** milega — `stripUnknown` use chup-chaap hata deta hai. Kuch migrate karne ki zarurat nahi; bas wo value ka ab koi asar nahi.

---

## 47. PUT /showcase/section/:brandId/reorder

Sections ka order badalta hai.

**Access:** Intended: Admin + Vendor · Enforced: **VENDOR+ADMIN + ownership** ⚠️

> ✅ Ye route pehle broken tha (leading `/` missing) — ab fix ho chuka hai.

### Path Params
| Param | Type | Required |
|---|---|---|
| `brandId` | ObjectId | ✅ |

### Body
| Field | Type | Required | Validation |
|---|---|---|---|
| `sections` | array | ✅ | Min 1 item |
| `sections[].id` | ObjectId | ✅ | Section ka `_id` |
| `sections[].sortOrder` | number | ✅ | Integer ≥ **1** |

```json
{
  "sections": [
    { "id": "68f1a2b3c4d5e6f7a8b9c5a2", "sortOrder": 1 },
    { "id": "68f1a2b3c4d5e6f7a8b9c5a1", "sortOrder": 2 },
    { "id": "68f1a2b3c4d5e6f7a8b9c5a3", "sortOrder": 3 }
  ]
}
```

### Success — `200`
```json
{
  "success": true,
  "message": "Sections reordered successfully.",
  "data": { "updated": 3 }
}
```

> 🔴 **Ye endpoint 2026-08-27 se pehle kabhi kaam nahi karta tha.** Service `item.sectionId` padhti thi jabki validator (aur ye doc) `id` accept karte hain — har well-formed request `undefined.toString()` pe `500` de deti thi. Live run me pakda gaya aur fix kar diya gaya. Field ab bhi **`id`** hi hai.

### Errors
| Status | Message | Kab |
|---|---|---|
| `400` | `Invalid section list.` | Koi `id` us brand ka nahi |
| `400` | `Please send the complete section order — N sections expected, M received.` | ⚠️ **Naya** — partial list ab reject hoti hai |
| `400` | `Duplicate id found.` / `Duplicate sort order found.` | |
| `422` | *(Joi message)* | Invalid `brandId` / missing `sortOrder` |

### ⚠️ Notes

**1. `sortOrder` `1` se start hota hai** — media reorder (#51) bhi ab yehi hai (pehle wahan `0` allowed tha).

**2. 🔴 Poori list mandatory hai** (naya) — pehle partial list accept ho jaati thi, par service list ko `1..n` renumber karti hai, to chhod diye gaye sections ke saath positions takra jaati thi (do sections `sortOrder: 1` pe). Ab #51 ki tarah complete list maangi jaati hai. Drag-and-drop UI ke paas poori list hoti hi hai.

**3. Customer ko sections isi `sortOrder` me dikhte hain** (ascending).

---

## 48. POST /showcase/section/:sectionId/add-media

Photos/videos add karta hai — **multipart**, ya `uploadId` se (🆕 U-3), ya dono
mila-jula.

**Access:** Intended: VENDOR · Enforced: **VENDOR+ADMIN + ownership** ⚠️

### Headers
| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ |
| `Content-Type` | `multipart/form-data` | ✅ |

### Path Params
| Param | Type | Required |
|---|---|---|
| `sectionId` | ObjectId | ✅ |

### Body (multipart)
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `files` | file[] | ⚠️ | – | Ek ya multiple images/videos |
| `thumbnails` | file[] | ⚠️ | – | **Har video ke liye ek poster** — index se match hota hai |
| `uploadIds` | ObjectId[] 🆕 | ⚠️ | – | Presigned raaste se — `SHOWCASE_MEDIA` purpose |
| `thumbnailUploadIds` | ObjectId[] 🆕 | ⚠️ | – | Unke poster — `SHOWCASE_THUMBNAIL` purpose |
| `isShowInVideoClips` | boolean | ❌ | `true` | **Sirf batch ki videos pe lagta hai.** Photos pe hamesha `false` store hota hai |

⚠️ `files` **ya** `uploadIds` — kam se kam ek. Dono khali ho to `400`.

### 🆕 Presigned raasta

Har file ke liye pehle `POST /uploads/presign` (#94) → S3 par POST → `POST
/uploads/confirm` (#95). Jo `uploadId` mile wo yahan bhejiye — file yahan aati hi
nahi.

```json
{
  "uploadIds": ["68f1…e001", "68f1…e002"],
  "thumbnailUploadIds": ["68f1…e003"],
  "isShowInVideoClips": true
}
```

⚠️ **Poster ke liye purpose alag hai** — `SHOWCASE_THUMBNAIL`, `SHOWCASE_MEDIA`
nahi. Dono ek hi bucket aur prefix me jaate hain; farq ye ki thumbnail 10 MB par
capped hai aur video leta hi nahi. Gallery ka id poster ki jagah bhejne par `422`
aata hai aur **koi upload jalta nahi** — dono abhi bhi apni jagah chal jaayenge.

⚠️ **Mila-jula batch chalta hai** — kuch file attached, kuch pehle se S3 par.
Store hone ka kram **files pehle, ids baad me**, aur section ki ginti **poore
batch** par lagti hai, har raaste par alag nahi.

> ### 🔴 Video ke saath poster ab mandatory hai
>
> `thumbnails[2]` `files[2]` ka poster hai, aur `thumbnailUploadIds[0]`
> `uploadIds[0]` ka — **index se jodte hain, aur har raasta apne andar**. Jis
> index par video hai aur poster nahi, wo request `422` se rukti hai, **upload se
> pehle** — yaani presigned raaste par bhi aapka upload bacha rehta hai.
>
> 🔴 **Section ke apne rules bhi confirm se pehle chalte hain** — kitni media,
> kaunsa mime. Baad me chalte to jawab wahi rehta, par ek extra file chun lene par
> aapki **saari** files jal jaatin.
>
> Pehle poster provider khud bana deta tha — kam se kam theory me. Sach ye tha:
> Cloudinary ka `getOptimizedImageUrl(publicId)` `/image/upload/` ka path banata
> hai ek aise asset ke liye jo `/video/upload/` me rehta hai, yaani **har stored
> video poster 404 tha**; aur S3 poster banata hi nahi tha. Uska nateeja ye ki
> video-first section ka `coverImage` khud `.mp4` ban jaata tha.

> ### 🔴 Poster ki position = media ki position, **photos bhi ginti me** (audit 2026-10-07)
>
> `thumbnails[i]` / `thumbnailUploadIds[i]` us item ka poster hai jo `files[i]` /
> `uploadIds[i]` par hai — chahe wahan photo ho. Bich me **khaali jagah chhodne ka
> koi tareeka nahi** (`null` validator refuse karta hai, multipart array me hole
> hota nahi). Isliye `[photo, video]` + ek poster → poster photo ko milta hai,
> video ko kuch nahi → `422`.
>
> **Panel ka niyam (abhi aur aage dono me chalega):** batch me **videos pehle,
> photos baad me**, aur posters usi kram me jis kram me videos hain. Tab
> `posters[i]` hamesha `videos[i]` par padta hai. Ya har video alag request me
> bhejo (`files=[video]`, `thumbnails=[poster]`) — onboarding editor yahi karta hai.
>
> ⚠️ Backend par ye pairing "n-va poster → n-va **video**" karna pending hai;
> tab tak upar wala niyam hi follow karein. Dekhein
> [Uploads — frontend action items](#-uploads--frontend-action-items-2026-10-07).

> ### ⚠️ Batch beech me fail ho to pehle ki files rollback nahi hotin (audit 2026-10-07)
>
> Neeche note 2 kehta hai "saari uploaded files delete ho jaati hain" — **abhi
> poori tarah sach nahi.** Agar item 3 fail ho (jaise video bina poster, ya
> poster `413`), to item 1–2 jo S3 par chadh chuke the wahin reh jaate hain aur
> unke `uploadId` jal chuke hote hain — retry par `409 "That upload has already
> been used."`. Section me kuch save nahi hota. Backend fix pending hai; tab tak
> panel **upload se pehle** khud check kare: har video ke saath poster hai, poster
> still image hai aur 10 MB se chhota hai.

### Success — `201`
```json
{
  "success": true,
  "message": "Media uploaded successfully.",
  "data": {
    "uploaded": 2,
    "medias": [
      {
        "type": "PHOTO",
        "media": {
          "url": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/showcase/amb1.jpg",
          "kind": "IMAGE",
          "width": 1920,
          "height": 1080,
          "mimeType": "image/jpeg",
          "sizeBytes": 2516582,
          "originalName": "amb1.jpg",
          "provider": "CLOUDINARY"
        },
        "title": "amb1",
        "altText": "amb1",
        "sortOrder": 1,
        "isActive": true
      },
      {
        "type": "VIDEO",
        "media": {
          "url": "https://res.cloudinary.com/drvdnqydw/video/upload/v1/showcase/amb-tour.mp4",
          "kind": "VIDEO",
          "width": 1080,
          "height": 1920,
          "mimeType": "video/mp4",
          "sizeBytes": 19084083,
          "originalName": "amb-tour.mp4",
          "provider": "CLOUDINARY",
          "duration": 24,
          "thumbnail": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/showcase/amb-tour-thumb.jpg"
        },
        "title": "amb-tour",
        "altText": "amb-tour",
        "sortOrder": 2,
        "isActive": true,
        "isShowInVideoClips": true
      }
    ]
  }
}
```

> ⚠️ Ye response bhi ab #44 wale **same whitelist** se jaata hai. Pehle prepared
> documents seedhe laut te the — `storage.publicId` ke saath. `_id` yahan nahi
> aata (pehle bhi nahi aata tha); list padhni ho to #44 use karein.

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Showcase section not found.` | |
| `400` | `Please upload at least one media.` | Koi file nahi |
| `400` | `Please upload at least one image or video.` | Files hain par koi valid media nahi |
| `400` | `Maximum 15 media items are allowed in one section.` | Total limit |
| `400` | `Maximum 15 images are allowed.` | Image limit |
| `400` | `Maximum 5 videos are allowed.` | Video limit |
| `400` | `<filename> image format is not supported.` | jpeg/jpg/png/webp ke bahar |
| `400` | `<filename> video format is not supported.` | mp4/webm/quicktime ke bahar |
| `400` | `<filename> exceeds maximum image size of 10 MB.` | |
| `400` | `<filename> exceeds maximum video size of 50 MB.` | |
| `400` | `Unsupported media type.` | MIME detect nahi hua |
| `422` | `A video needs a poster image. Attach one in "thumbnails" at the same position as the video in "files", or send its upload in "thumbnailUploadIds" at the same position as the video's id in "uploadIds".` | 🆕 **Text badla 2026-10-07.** Pehle `Attach one as "thumbnail"` kehta tha — wo **replace** ka field hai, add-media ka nahi. Us text ko follow karke `thumbnail` bhejne par poster padha hi nahi jaata tha aur wahi `422` dobara aata |
| `422` | `The poster has to be a still image — "<mime>" is not one.` | Poster video/GIF hai |
| `404` | `That upload was not found.` | Galat / expire / kisi aur ka `uploadId` |
| `409` | `That upload has already been used.` | Wahi `uploadId` dobara (ya pichhli fail request me jal chuka) |
| `422` | `That upload was authorised for SHOWCASE_THUMBNAIL, and this is SHOWCASE_MEDIA. …` | Purpose ulta-pulta |
| `422` | `Send either a file or an uploadId, not both — they are two ways to do the same thing.` | |
| `500` | `Failed to add media to showcase section.` | Upload fail — rollback, par upar wala ⚠️ box dekhein |

> ⚠️ `Duplicate <filename> found.` wali row hata di gayi — showcase me aisa koi
> check code me hai hi nahi.
| `500` | `Showcase configuration not found.` | Settings issue |

### ⚠️ Notes

**1. Limits **existing + naye** dono milakar check hote hain** — agar section me 13 images hain aur aap 3 aur bhejo, to `"Maximum 15 images are allowed."` aayega.

**2. Rollback on failure** — save fail ho to batch ki uploaded files delete ho jaati hain (har ek apne provider se). ⚠️ **Exception:** upload loop ke **beech** me fail hone par pehle ki files nahi hatti — upar ka ⚠️ box dekhein.

**3. `isShowInVideoClips` sirf videos pe apply hota hai** (naya). Photos par hamesha `false` store hota hai — response me bhi `false` dikhega. Pehle har media pe `true` chala jaata tha, jiska koi asar nahi hota tha (clips feed type pe filter karta hai) par panel me ek bekaar toggle dikh jaata tha.

**4. Cover image auto-set hoti hai** — batch ki pehli media se, **agar pehle se koi cover na ho** aur `coverImageMode` `AUTO` ho. Video bhi cover ban sakta hai: uska **poster** use hota hai, `.mp4` link nahi.

**5. 🔴 Video poster auto-generate ab nahi hota** — aap bhejte hain, `thumbnails` field me (**plural**). Dekhein upar ka note. Pehle iska daawa tha ki Cloudinary bana deta hai; wo URL 404 deta tha.

> 🔴 **Vendor panel aaj `thumbnail` (singular) bhejta hai** (`brandApi.js` → `addShowcaseMedia`). Add-media use padhta hi nahi, isliye panel se **har video add `422` deta hai**. Field `thumbnails` hai.

**6. 🆕 `sortOrder` auto-assign hota hai** — section ki **non-deleted media ki ginti + 1** se shuru hokar batch append hota hai. Pehle `max(sortOrder) + 1` tha, jo **deleted rows bhi ginta** tha (unka number wahin rehta hai), to bahut edit hui section me agli upload `9` par chali jaati jabki andar 2 hi photo thi.

> ⚠️ Ye domain ki ekmaat­ra write hai jo **optimistic lock ke bahar** hai, kyunki `$push` use hoti hai. Upload ke dauraan koi aur media delete kar de to nayi media apni jagah se **ek aage** gir sakti hai — gap banta hai, koi row kabhi gum ya duplicate nahi hoti, aur agla delete/reorder use band kar deta hai. Iske badle `save()` rakhte to yahan bhi `409` aata — 50 MB video upload karne ke baad vendor se dobara upload karwana, jo isse mehnga sauda hai.

**7. Limits admin-configurable hain** — `Setting.vendor.showcase` se. Upar diye defaults hain; live values alag ho sakti hain. Error message me actual value aati hai.

**8. Plan limit yahan nahi lagti** — media pe koi entitlement bucket nahi hai, sirf section pe hai.

**9. Validation errors ab sahi status ke saath aate hain** (naya) — unsupported format jaisi cheezein pehle outer catch me `500 Failed to add media…` ban jaati thi; ab original `400` + asli message milta hai.

---

## 49. PATCH /showcase/section/:sectionId/media/update/:mediaId

Media ka metadata update — **file nahi badalti**.

**Access:** Intended: VENDOR · Enforced: **VENDOR+ADMIN + ownership** ⚠️

### Path Params
| Param | Type | Required |
|---|---|---|
| `sectionId` | ObjectId | ✅ |
| `mediaId` | ObjectId | ✅ |

### Body — sab optional (multipart bhi ho sakta hai, `thumbnail` file ke liye)
| Field | Type | Validation |
|---|---|---|
| `title` | string | Max 100 chars, `""` se clear |
| `altText` | string | Max 150 chars, `""` se clear |
| `isShowInVideoClips` | boolean | ⚠️ **Sirf VIDEO pe** — photo pe bhejne se `422` |
| `isActive` | boolean | – |
| *(file)* `thumbnail` | file | ⚠️ **Sirf VIDEO pe** — image format, max 10 MB |
| `thumbnailUploadId` | ObjectId 🆕 | ⚠️ **Sirf VIDEO pe** — presigned raasta, purpose `SHOWCASE_THUMBNAIL` |

⚠️ Poster ya to file ho ya `thumbnailUploadId` — dono raaste ek hi jagah aate
hain. Photo par koi bhi bhejne par `422`, aur **upload kharch nahi hota**.

> 🔴 **`sortOrder` hata diya gaya hai** (naya). Position ab sirf reorder endpoint (#51) badalta hai. Yahan se set karne pe do media ek hi `sortOrder` pe aa jaati thi aur order arbitrary ho jaata tha.

```json
{ "title": "Seating area", "altText": "Cafe seating with wooden tables", "isShowInVideoClips": false }
```

### Success — `200`
```json
{
  "success": true,
  "message": "Media info updated successfully.",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c5b2",
    "type": "VIDEO",
    "media": {
      "url": "https://cdn.trydood.com/videos/showcase/68f1…/amb-tour.mp4",
      "kind": "VIDEO",
      "width": 1080,
      "height": 1920,
      "mimeType": "video/mp4",
      "sizeBytes": 19084083,
      "originalName": "amb-tour.mp4",
      "provider": "AWS_S3",
      "duration": 24,
      "thumbnail": "https://cdn.trydood.com/images/showcase/68f1…/custom-poster.jpg"
    },
    "title": "Cafe walkthrough",
    "altText": "Video tour",
    "sortOrder": 2,
    "isActive": true,
    "isShowInVideoClips": false,
    "createdAt": "2026-08-22T16:06:00.000Z",
    "updatedAt": "2026-08-27T11:00:00.000Z"
  }
}
```

> ⚠️ **Shape theek kiya (audit 2026-10-07).** Pehle yahan top-level `url`,
> `thumbnail`, `storage`, `metadata` dikhaye the. Asli response #48/#50 wala
> managed whitelist hai: file ki details `media` ke andar, aur `storage` kabhi
> bahar nahi aata.

> ### 🔴 "Show in Video Clips" toggle **isi** endpoint se hota hai
>
> Body `{ "isShowInVideoClips": true }` (ya `false`) — JSON chalega. Vendor panel
> aaj ye toggle **#50 replace** se bhejta hai, bina file ke; replace ka validator
> ye field leta hi nahi aur ek file maangta hai, to har toggle `400 "Please upload
> exactly one media file."` deta hai. Sahi endpoint yahi (#49) hai.

### Errors
| Status | Message | Kab |
|---|---|---|
| `400` | `Please provide at least one field to update.` | Na koi field, na thumbnail file |
| `404` | `Media not found.` | Media nahi, ya soft-deleted hai |
| `422` | `isShowInVideoClips applies to video media only. This media is a photo.` | **Naya** |
| `422` | `A custom thumbnail can only be set on video media. This media is a photo.` | **Naya** |
| `422` | 🆕 `A section needs at least 3 visible media to stay on your profile. Add another one first, or delete the whole section.` | `isActive: false` bheja aur wo section ko floor se **neeche** le jaata. Hide karna delete jaisa hi hai — [floors block](#-do-floors--section-apne-aap-customer-se-gayab-na-ho-jaye). **ADMIN par nahi lagta.** |
| `400` | `Thumbnail must be an image in a supported format.` | **Naya** — thumbnail ab validate hoti hai |
| `400` | `Thumbnail exceeds maximum image size of 10 MB.` | **Naya** |
| `422` | *(Joi message)* | invalid ids, title/altText limit cross |

### ⚠️ Notes

**1. File replace karne ke liye `PUT .../media/replace/:mediaId` (#50) use karein** — ye metadata aur (video ka) poster badalta hai.

**2. `altText` accessibility ke liye hai** — customer app screen readers ke liye use kar sakta hai.

**3. `isActive: false` karne se media customer ko dikhna band** — delete nahi karna padta, aur ab wo vendor list (#44) me bhi dikhti rehti hai to wapas on kar sakte hain.

**4. 🔴 `isShowInVideoClips` sirf video ka switch hai** (naya) — photo pe bhejne pe `422` aata hai. Panel me photo ke liye ye toggle dikhayein hi nahi (#44 photo rows me ye key bhejta hi nahi).

**5. 🔴 Poster bhi sirf video pe** — photo apna hi thumbnail hai. Pehle ye check nahi tha, aur photo pe thumbnail set karne se photo ka apna asset delete hone ka risk tha.

**6. ✅ Purana poster hamesha delete hota hai** — bina koi "ye custom hai ya auto?" wala sawaal poochhe. Wo sawaal isliye tha ki auto-generated poster delete karne se video ka apna asset chala jaata; ab koi poster derive hota hi nahi, to har stored poster ek alag file hai jise sirf yahi media reference karta hai. (Us purane check ka apna bug bhi tha: S3 par `publicId` null hone se URL comparison skip ho jaata aur **har** auto poster custom padha jaata — yaani poster badalne par wahi poster delete ho jaata jo vendor dekh raha tha.)

**7. ✅ Thumbnail upload fail hone pe ab request fail hoti hai** (naya) — pehle error swallow ho jaata tha aur `200` aa jaata tha, jabki poster badla hi nahi hota tha.

**8. Cover image auto-sync hoti hai** — poster ya `isActive` badalne se section ka cover shift ho sakta hai (jab tak `coverImageMode: MANUAL` na ho).

---

## 50. PUT /showcase/section/:sectionId/media/replace/:mediaId

Media file replace karta hai. **Multipart.**

**Access:** Intended: VENDOR · Enforced: **VENDOR+ADMIN + ownership** ⚠️

### Path Params
| Param | Type | Required |
|---|---|---|
| `sectionId` | ObjectId | ✅ |
| `mediaId` | ObjectId | ✅ |

### Body (multipart)
| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | file | ⚠️ | **Exactly ek** file |
| `thumbnail` | file | ⚠️ | **Video replace karte waqt required** — poster image |
| `uploadId` | ObjectId 🆕 | ⚠️ | Presigned raasta — purpose `SHOWCASE_MEDIA` |
| `thumbnailUploadId` | ObjectId 🆕 | ⚠️ | Uska poster — purpose `SHOWCASE_THUMBNAIL` |

⚠️ `file` **ya** `uploadId` — ek chahiye, dono nahi.

⚠️ **Ye endpoint sirf file badalta hai.** `isShowInVideoClips` yahan validator
me hai hi nahi (chup-chaap drop hota hai) — wo toggle #49 se hota hai.

### Success — `200`
```json
{
  "success": true,
  "message": "Media replaced successfully.",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c5b1",
    "type": "PHOTO",
    "media": {
      "url": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/showcase/amb1-v2.jpg",
      "kind": "IMAGE",
      "width": 2048,
      "height": 1152,
      "mimeType": "image/jpeg",
      "sizeBytes": 3250585,
      "originalName": "amb1-v2.jpg",
      "provider": "CLOUDINARY"
    },
    "title": "seating area",
    "altText": "cafe seating with wooden tables",
    "sortOrder": 1,
    "isActive": true,
    "createdAt": "2026-08-22T16:05:00.000Z",
    "updatedAt": "2026-09-15T10:00:00.000Z"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Media not found.` | Section ya media nahi, ya media inactive/deleted hai |
| `400` | `Please upload exactly one media file.` | Zero ya multiple files |
| `400` | `Only photo replacement is allowed for this media.` | Type mismatch — **upload se pehle** check hota hai |
| `422` | `A video needs a poster image. Attach one as "thumbnail", or name its upload as "thumbnailUploadId".` | Video se replace kar rahe hain, poster nahi bheja. 🔴 **Vendor panel aaj video replace par poster bhejta hi nahi** — isliye panel se har video replace yahi `422` deta hai |
| `422` | `Send either a file or an uploadId, not both — they are two ways to do the same thing.` | `file` aur `uploadId` dono bheje |
| `404` 🆕 | `That upload was not found.` | Galat / expire / **kisi aur ka** `uploadId` |
| `422` 🆕 | `That upload was authorised for SHOWCASE_MEDIA, and this is SHOWCASE_THUMBNAIL. …` | Gallery ka id poster ki jagah (ya ulta) |
| `400` | *(format/size errors)* | #48 jaise |
| `500` | `Failed to replace media` | Upload fail — file rollback ho jaati hai |

### ⚠️ Notes

**1. Purani file storage se delete ho jaati hai** — sirf new upload succeed **aur** document save hone ke baad. Video ka poster bhi saath me hat jaata hai.

**2. `_id`, `sortOrder`, `isActive` aur `isShowInVideoClips` same rehte hain** — sirf file badalti hai.

**3. 🔴 Type badal NAHI sakta** — photo ki jagah photo, video ki jagah video. (Ye rule pehle bhi tha par upload ke **baad** check hota tha, aur uska `400` outer catch me `500` ban jaata tha. Ab mime type se pehle hi check hota hai — na bekaar upload, na galat status code.)

> ⚠️ Comparison **wire type** par hai, `kind` par nahi. JPEG ki jagah GIF chalega
> — gallery ke liye dono photo hain aur dono ek hi ceiling me ginte hain — par
> `media.kind` phir bhi `GIF` likhega, jo use `gifs/` prefix me rakhta hai, resize
> step se door.

**4. Cover image auto-sync hoti hai** — agar ye media cover thi to naya poster cover ban jaata hai (`coverImageMode: MANUAL` na ho to).

---

## 51. PUT /showcase/section/:sectionId/media/reorder

**Access:** Intended: VENDOR · Enforced: **VENDOR+ADMIN + ownership** ⚠️

### Path Params
| Param | Type | Required |
|---|---|---|
| `sectionId` | ObjectId | ✅ |

### Body
| Field | Type | Required | Validation |
|---|---|---|---|
| `medias` | array | ✅ | Min 1 item — **section ki saari live media** |
| `medias[].id` | ObjectId | ✅ | |
| `medias[].sortOrder` | number | ✅ | Integer ≥ **1** (pehle `0` allowed tha; ab section reorder ke saath consistent) |

```json
{
  "medias": [
    { "id": "68f1a2b3c4d5e6f7a8b9c5b2", "sortOrder": 1 },
    { "id": "68f1a2b3c4d5e6f7a8b9c5b1", "sortOrder": 2 }
  ]
}
```

### Success — `200`
```json
{
  "success": true,
  "message": "Media reordered successfully.",
  "data": {
    "updated": 2,
    "coverImage": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/showcase/amb-tour-thumb.jpg"
  }
}
```

> Already sahi order me ho to `{ "updated": 0, "message": "Media already in same order." }` aata hai.
>
> 🔴 **Ye bhi 2026-08-27 se pehle kabhi kaam nahi karta tha** — section reorder wala hi bug (service `item.mediaId` padhti thi, payload me `id` aata hai). Live run me pakda gaya aur fix kar diya gaya.

### Errors
| Status | Message | Kab |
|---|---|---|
| `400` | `Media list is required.` | Empty |
| `404` | `Showcase section not found.` | |
| `400` | `Please send the complete media order — N media expected, M received.` | ⚠️ **Section ki saari non-deleted media bhejni hoti hai** (hidden bhi), sirf badli hui nahi |
| `400` | `Invalid media id : <id>` | Koi id us section ki nahi, ya deleted hai |

### ⚠️ Notes

**1. ⚠️ Poori list mandatory hai.** Partial reorder allowed nahi. Error message ab batata hai kitni expected thi aur kitni mili.

**2. 🆕 Hidden media bhi list me aati hai** — pehle sirf `isActive: true` wali renumber hoti thi. Media #2 ko hide karke baaki ko reorder karo, to bache hue 1, 2, 3 ho jaate the aur **hidden wali bhi 2 par** hi rehti thi. Wapas on karte hi do media ek hi position par — kaun pehle aayega, ye Mongo ke return order par chhod diya jaata tha.

Hidden ≠ deleted: jo vendor ko apne panel me dikhti hai, wo order ka hissa hai (S-12). Section reorder (#47) hamesha aisa hi tha — ab dono ek jaise hain. Iska matlab **expected count me hidden media bhi gini jaati hai** — pehle wo error "2 media expected" bolta tha jabki panel me teen dikh rahi thi.

**3. `sortOrder` `1` se start hota hai** — #47 ke saath ab consistent.

**3. Cover image order ke saath move karti hai** — pehli media ka thumbnail cover ban jaata hai, isliye response me naya `coverImage` bhi aata hai. `coverImageMode: MANUAL` ho to cover nahi badalta. (Pehle cover ke liye media ka `url` prefer hota tha — video pehle number pe aa jaaye to cover ek `.mp4` link ban jaati thi aur UI me broken image dikhti thi. Ab hamesha `thumbnail` prefer hota hai.)

---

## 52. DELETE /showcase/section/:sectionId/media/delete/:mediaId

**Access:** Intended: VENDOR · Enforced: **VENDOR+ADMIN + ownership** ⚠️

### Path Params
| Param | Type | Required |
|---|---|---|
| `sectionId` | ObjectId | ✅ |
| `mediaId` | ObjectId | ✅ |

### Success — `200`
```json
{
  "success": true,
  "message": "Media deleted successfully.",
  "data": {
    "deletedMediaId": "68f1a2b3c4d5e6f7a8b9c5b1",
    "coverImage": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/showcase/amb2.jpg"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Media not found.` | Section ya media nahi, ya pehle se deleted/inactive |
| `400` | `At least one media is required in this section.` | ⚠️ **Aakhri live media delete nahi kar sakte** |
| `400` | 🆕 `A section needs at least 3 visible media to stay on your profile. Add another one first, or delete the whole section.` | Delete section ko floor se **neeche** le jaata. Number `Setting` se aata hai. **ADMIN par nahi lagta.** Jo section pehle se neeche hai wo ghat sakta hai — [floors block](#-do-floors--section-apne-aap-customer-se-gayab-na-ho-jaye) dekhein |

### ⚠️ Notes

**1. ⚠️ Section khali nahi ho sakta.** Aakhri media delete karne ki koshish pe `400` aayega. Section hi hatana ho to `DELETE /showcase/section/delete/:sectionId` (#53) use karein.

**2. 🔴 Ab soft delete hai** (naya) — media document `isDeleted: true` + `deletedAt` ke saath rehta hai, array se `$pull` nahi hoti. Ye is domain ka aakhri hard delete tha. Kisi bhi API me wo media ab nahi aayegi (vendor list me bhi nahi).

**3. Cloudinary se file phir bhi delete hoti hai** — storage cost bachane ke liye. Matlab soft delete ek **audit record** hai, restore point nahi.

**4. ✅ Cover image ab khud sudhar jaati hai** (naya) — deleted media cover thi to bachi hui pehli media ka thumbnail cover ban jaata hai, aur naya `coverImage` response me aata hai. Pehle cover stale reh jaati thi (comparison `url` se hoti thi jabki cover `thumbnail` se set hui thi).

**5. 🆕 Baaki media ki position turant renumber ho jaati hai** — teen photo `1, 2, 3` par hain aur beech wali delete karein to bachi hui `1, 2` par aa jaati hain. Pehle deleted media apni position chhod jaati thi aur panel me `1, 3` dikhta tha; vendor ke paas theek karne ka ek hi raasta tha — poora drag-and-drop reorder. Aur agli upload sabse bade number se aage jaati thi, to har delete ke saath farak badhta jaata tha.

Deleted row apna purana number **rakhta hai** — wo audit record hai, ginti me nahi aata, aur `sortOrder: 0` karne par wo schema default se takra kar har read me sabse aage aa jaata. Koi bhi API deleted media nahi lautati, to ye number kahin dikhta nahi.

Hidden media renumber me **shaamil** hoti hai, to use wapas on karne par wo apni hi jagah par aati hai.

---

## 53. DELETE /showcase/section/delete/:sectionId

Poora section delete — media ke saath.

> 🆕 **Develop par (P7, 2026-10-26 — stage + prod par live 2026-11-04):** brand ka aakhri **dikhne layak** album delete karne par `422` — neeche errors table (pehle sirf aakhri non-deleted section bachta tha, wo `400` bhi rehta hai aur pehle check hota hai). Guard storage delete se **pehle** — refuse hone par koi photo / video nahi mitti. Sirf "crossing" par: jo section customer abhi dekh hi nahi raha, wo delete ho sakta hai (bas brand ka aakhri non-deleted section na ho — wo `400`). Admin exempt — [plan §4.9](./brand_feed_outlet_rule_plan.md#49-vendor--admin).

**Access:** Intended: VENDOR · Enforced: **VENDOR+ADMIN + ownership** ⚠️

### Path Params
| Param | Type | Required |
|---|---|---|
| `sectionId` | ObjectId | ✅ |

### Success — `200`
```json
{
  "success": true,
  "message": "Section deleted successfully.",
  "data": {
    "deletedSectionId": "68f1a2b3c4d5e6f7a8b9c5a1",
    "deletedMediaIds": [
      "68f1a2b3c4d5e6f7a8b9c5b1",
      "68f1a2b3c4d5e6f7a8b9c5b2"
    ]
  }
}
```

> `deletedMediaIds` me ab sach me **ids** aati hain (naya) — pehle is key me poore media documents (storage, metadata sameta) chale jaate the.

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Showcase section not found.` | |
| `422` | `Invalid section ID format` | |
| `400` | 🆕 `A brand needs at least one showcase section. Create another one before deleting this.` | Ye brand ka aakhri non-deleted section hai. **ADMIN par nahi lagta.** |
| `422` | 🆕 `This is the last album customers can see on your profile. Make another album visible, with at least {N} photos or videos, before hiding or deleting this one.` | (P7, live 2026-11-04) Ye section customer ko dikh raha hai aur brand ka koi aur dikhne layak album nahi. **ADMIN par nahi lagta.** Upar wala `400` pehle check hota hai |

### ⚠️ Notes

**1. ✅ Plan slot release ho jaata hai** — `releaseSlot(brandId, SHOWCASE)`. Delete karke naya section bana sakte hain.

**2. Soft delete hai** — section aur uski saari media pe `isDeleted: true`. **Cloudinary files delete ho jaati hain** (doc me pehle ulta likha tha) — to restore possible nahi, ye audit record hai.

**3. Sirf hide karna ho to `isVisible: false` ya `isActive: false` (#46) use karein** — wo slot release **nahi** karte, par customer ko dikhna band ho jaata hai aur file bhi safe rehti hai. (Aakhri dikhne layak album par #46 bhi wahi `422` dega.)

**4. 🆕 Baaki sections turant renumber ho jaate hain** — brand ke paas `1, 2, 3` the aur doosra delete hua to bache hue `1, 2` ho jaate hain. Pehle section-level par ye hota hi nahi tha (media ke andar hota tha), to brand hamesha ke liye `1, 3, 4` list karta rehta — aur create bhi sabse bade number se aage jaata tha, to farak badhta jaata tha.

Delete hua section apna purana number rakhta hai, par wo kisi listing me aata hi nahi. **Sirf isi brand ke** sections renumber hote hain.

---

# Voucher APIs

Vouchers **immutable versioning** pe chalte hain — har edit naya version banata hai, purana version untouched rehta hai.

⚠️ **Vouchers plan se metered hain** — `vouchers` bucket.

### Lifecycle

```
DRAFT ──submit-review──> UNDER_REVIEW ──admin review──> APPROVED ──publish──> PUBLISHED
                                              │                                    │
                                              └──> REJECTED          naya version ──┤
                                                                     publish hua    │
                                                                                    ▼
                                                            ARCHIVED ──endAt (job)──> EXPIRED
                                                                                    ▲
                                                                    endAt (job) ────┘
```

| Status | Kaun set karta hai | Editable? |
|---|---|---|
| `DRAFT` | Vendor (create) | ✅ Haan |
| `UNDER_REVIEW` | Vendor (submit) | ❌ `409` |
| `APPROVED` | **Admin** | ✅ Naya version banta hai |
| `REJECTED` | **Admin** | ✅ Haan |
| `PUBLISHED` | Vendor ya Admin | ⚠️ Naya version banana padta hai |
| `ARCHIVED` | **Publish** — jab naya version live hota hai | ❌ `409` |
| `EXPIRED` | Background job — `endAt` nikalne par | ❌ `409` |
| `PAUSED` | – | ❌ Pehle resume karein |

### ⚠️ `ARCHIVED` aur `EXPIRED` do alag cheezein hain

| | Kab | Field |
|---|---|---|
| **`ARCHIVED`** | Vendor ne **naya version publish** kiya, ye purana replace ho gaya | `archivedAt` |
| **`EXPIRED`** | Version ki apni **`endAt` nikal gayi** | `expiredAt` |

Ek archived version ki validity abhi chal rahi ho sakti hai — wo circulation se
jaldi nikla, waqt khatam hone se nahi. Jab uski `endAt` aayegi, `expireVouchers`
job use `ARCHIVED → EXPIRED` kar degi.

Dono customer listing se bahar hain (wo sirf `PUBLISHED` dikhati hai) aur dono
plan ka voucher slot chhod dete hain.

### 🆕 Images ka floor — ek rule, ek jawab

Voucher ko ab kam se kam **`Setting.vendor.voucher.minImages`** (default **3**) images chahiye. Teen jagah lagta hai, teeno par **ek hi message aur ek hi status**:

| Endpoint | Kis par ginti hoti hai |
|---|---|
| #54 create | Is request me aayi files — **upload shuru hone se pehle** |
| #55 update | Jo edit ke **baad bachta** hai (rakhi + nayi − hatayi) |
| #56 submit-review | Version me stored images, chahe wo kitni requests me bani hon |

```
422  A voucher needs at least 3 images — this one has 2. Add 1 more.
```

**Message agla kadam batata hai, sirf rule nahi.** Purana message *"At least one voucher image is required"* ye batata tha ki platform kya chahta hai aur vendor ko khud hisaab lagane chhod deta tha — jo floor `1` par theek tha aur `3` par nahi, kyunki number vendor ki screen par hai hi nahi. Ab dono ginti aur baaki kitni chahiye, sab message me hai.

> ### ⚠️ Contract change — do cheezein badli hain
>
> **1. Message badla hai** teeno endpoints par. Agar aap **text par match** kar rahe the, wo tootega — status code aur `success: false` par match karein.
>
> **2. #55 ka status `400` → `422` ho gaya.** Ek hi rule ke do alag status code the: create `422` deta tha, update `400`. Do me se koi bhi client galat nahi tha — bas jis endpoint par gaya uspar depend karta tha. Ab teeno `422` hain.

**Kyun ye zaroori tha:** yahi sawal paanch jagah pucha jaata tha aur **paanch alag jawab** milte the — do status code, teen alag wording, aur **koi bhi `minImages` padhta nahi tha**. To platform 3 par set hota aur ek-image wala voucher paanchon jagah se nikal jaata.

> **#57 approve par ye floor nahi lagta** — wahan sirf structural check hai (0 images = corrupt). Admin `minImages` badha de vendor ke submit ke **baad**, to queue me pade vouchers approve na ho paate aur vendor unhe theek bhi nahi kar sakta (wo bhej chuka hai). Wo voucher ko peeche se retire karna hota — bilkul wahi cheez jise `minImages` ka design rokta hai.

---

## 54. POST /vouchers/create

Naya voucher banata hai. Images zaroori hain — **multipart**, ya `uploadId` se
(🆕 U-4), ya dono mila-jula.

> **P10.4 (live 2026-11-04):** `subBrandIds` me koi `NEVER_VERIFIED` outlet ho to `409 OUTLET_NOT_VERIFIED`
> (`details: { code, subBrandId }`) — address wale `400` se **pehle**. `REVERIFY` outlet allowed (D15) —
> voucher banega, bas customer ko tab tak nahi dikhega jab tak manager OTP na de. Update (#55) par naye
> outlet jodne par bhi yahi.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership** (`resolveActorBrand`)

### Headers
| Header | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <token>` | ✅ |
| `Content-Type` | `multipart/form-data` | ✅ |

### Body
| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `brandId` | ObjectId | ✅ | – | Vendor apna hi bhej sakta hai |
| `name` | string | ✅ | – | 2–150 chars |
| `startAt` | ISO date | ✅ | – | |
| `endAt` | ISO date | ✅ | – | `startAt` se baad |
| `offers` | array | ✅ | – | Min 1. JSON string bhi accept hota hai |
| `subBrandIds` | ObjectId[] | ✅ | – | Min 1 — kaunse outlets pe valid |
| `subCategoryId` 🆕 | ObjectId | Brand ki **kai** subcategories hon to ✅ | brand ki ek ho to wahi | P8 (D88) — voucher ki **ek** subcategory, brand ki apni list mein se. Brand ki ek hi subcategory → apne aap wahi (aaj jaisa). Kai → zaroori (`422 SUBCATEGORY_REQUIRED`); list se bahar → `422 SUBCATEGORY_NOT_IN_BRAND` (`details.allowed[]`) |
| `images` | file[] | ⚠️ | – | **Multipart**, field name `images` |
| `imageUploadIds` | ObjectId[] 🆕 | ⚠️ | – | Presigned raasta — purpose `VOUCHER_IMAGE` |
| `media` | file | ❌ | – | Banner — image, GIF ya video |
| `bannerUploadId` | ObjectId 🆕 | ❌ | – | Banner, presigned — purpose `VOUCHER_BANNER` |
| `poster` | file | ⚠️ | – | **Video banner ke saath zaroori** |
| `bannerPosterUploadId` | ObjectId 🆕 | ⚠️ | – | Wahi, presigned — purpose `VOUCHER_BANNER_POSTER` |
| `description` | string | ❌ | – | Max 2000 chars |
| `tags` | string[] | ❌ | – | Min 1 item agar bhejein |
| `isSaveAsDraft` | boolean | ❌ | `true` | |

⚠️ `images` **ya** `imageUploadIds` — milakar `minImages` (default 3) poore hone
chahiye. Dono khali ho to wahi refusal jo kam images par aata hai.

⚠️ **`bannerType` ab nahi hai** (V-4). Banner `media` naam se aata hai aur wo kya
hai ye uske **bytes** se tay hota hai — payload me type batana ek hi sawaal ka
doosra jawab tha, aur stored wala jeet sakta tha.

### 🆕 Presigned raasta

Har file ke liye pehle `POST /uploads/presign` (#94) → S3 par POST → `POST
/uploads/confirm` (#95). Jo `uploadId` mile wo yahan bhejiye.

```json
{
  "brandId": "68f1…c3a1",
  "name": "Flat 30% off on total bill",
  "imageUploadIds": ["68f1…e001", "68f1…e002", "68f1…e003"],
  "bannerUploadId": "68f1…e004",
  "bannerPosterUploadId": "68f1…e005"
}
```

🔴 **Poster ka purpose alag hai** — `VOUCHER_BANNER_POSTER`, `VOUCHER_BANNER`
nahi. Ek hi bucket aur prefix, par poster 10 MB par capped hai aur video leta hi
nahi. Banner ka id poster ki jagah bhejne par `422`, aur koi upload jalta nahi.

🔴 **Image floor aur limits confirm se pehle chalte hain** — teen ki jagah do
bhejne par refusal aata hai aur aapke uploads **abhi bhi aapke** hain.

⚠️ **Mila-jula batch chalta hai**, aur floor poore batch par lagta hai: do
attached + ek `uploadId` = teen.

**Offer ka shape:**
| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `title` | string | ✅ | – | |
| `minBillAmount` | number | ✅ | – | Positive |
| `discountType` | string | ✅ | – | `PERCENTAGE` \| `FLAT` \| ~~`FIXED`~~ |
| `discountValue` | number | ✅ | – | Positive |
| `usageType` | string | ✅ | – | `ONCE_PER_USER` \| `MULTIPLE` |
| `sortOrder` | number | ✅ | – | Integer ≥ 1 |
| `discountApplicableOn` | string | ❌ | `SUBTOTAL` | `SUBTOTAL` \| `FINAL_BILL` |
| `maxDiscountAmount` | number | ❌ | – | Positive — **`PERCENTAGE` pe cap** |
| `isActive` | boolean | ❌ | – | |

**Multipart example:**
```
brandId:      68f1a2b3c4d5e6f7a8b9c3a1
name:         Flat 30% off on total bill
description:  Valid on dine-in and takeaway
startAt:      2026-09-01T00:00:00.000Z
endAt:        2026-10-01T23:59:59.000Z
subBrandIds:  ["68f1a2b3c4d5e6f7a8b9c4a1","68f1a2b3c4d5e6f7a8b9c4a2"]
tags:         ["coffee","cafe","discount"]
offers:       [{"title":"30% off above 500","minBillAmount":500,"discountType":"PERCENTAGE","discountValue":30,"maxDiscountAmount":300,"usageType":"ONCE_PER_USER","discountApplicableOn":"SUBTOTAL","sortOrder":1}]
images:       <file1>
images:       <file2>
images:       <file3>
media:        <banner file — image, GIF ya video>
poster:       <still image — sirf jab media video ho>
```

> ⚠️ **Example theek kiya (audit 2026-10-07).** Pehle yahan `bannerType: IMAGE` +
> `bannerImage: <file>` likha tha. Dono ab exist nahi karte — Joi `bannerType`
> chup-chaap hata deta hai aur service `bannerImage` padhti hi nahi, to us example
> se bheja gaya banner **bina kisi error ke gayab** ho jaata. Banner ka field
> `media` hai (ya `bannerUploadId`), poster `poster` (ya `bannerPosterUploadId`).

> ⚠️ **Ek akeli `uploadId` ko do baar mat bhejiye.** `imageUploadIds` (aur #55 ka
> `newImageUploadIds`) ek akeli string bhi le leta hai — wahi id do baar bhejne par
> doosri baar `409 "That upload has already been used."` aata hai aur poori request
> fail hoti hai. Multipart me har id **ek baar** append karein, ya poori list
> `JSON.stringify([...])` karke ek field me bhejein.

### Success — `201`
```json
{
  "success": true,
  "message": "Voucher created successfully.",
  "data": {
    "voucherId": "68f1a2b3c4d5e6f7a8b9c2a1",
    "voucherCode": "TDV000451",
    "versionId": "68f1a2b3c4d5e6f7a8b9c2b1",
    "versionCode": "TDV000451-V1",
    "versionNumber": 1,
    "status": "DRAFT"
  }
}
```

> ⚠️ **Response theek kiya (audit 2026-10-07).** Pehle yahan poora `voucher` +
> `version` + `usage` dikhaya tha; create sirf ids aur codes lautata hai. Poora
> voucher chahiye to `GET /vouchers/get/:voucherId` call karein.

### Errors
| Status | Message | Kab |
|---|---|---|
| `403` | `Access denied. This feature requires an active subscription. …` | Koi active plan nahi |
| `403` | `Your current plan does not include vouchers. Please upgrade your subscription to add vouchers.` | Plan me voucher pool nahi |
| `403` | `Voucher limit reached — 20 of 20 used on your current plan. Please upgrade your subscription to add more.` | Pool khatam |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | Dusre brand ka `brandId` |
| `422` | 🆕 `Choose which of your brand's subcategories this voucher belongs to.` · `details.code: SUBCATEGORY_REQUIRED`, `details.allowed[]` | P8 — brand ki kai subcategories, `subCategoryId` nahi bheja |
| `422` | 🆕 `This subcategory is not one of your brand's subcategories.` · `details.code: SUBCATEGORY_NOT_IN_BRAND` | P8 |
| `400` | `Brand not found` | |
| `400` | `Voucher name is required.` | Trim ke baad khali |
| `409` | `Voucher with this name already exists for this brand.` | Duplicate name |
| `422` | 🆕 `A voucher needs at least 3 images — this one has 2. Add 1 more.` | Itni images nahi bheji. Number `Setting.vendor.voucher.minImages` se aata hai — neeche note dekhein |
| `400` | 🆕 `<file> exceeds maximum image size of 10 MB.` | Voucher images par **pehle koi size check tha hi nahi** — P12. Limit `Setting.storage.limits.maxImageSizeMB` se aati hai |
| `422` | `At least one offer is required.` | |
| `422` | `Offer 1: "title" is required` | Offer ke andar ka error — `Offer <n>:` prefix ke saath |
| `422` | `Invalid offer JSON at index 0.` | JSON string malformed |
| `422` | `Offer at index 0 must be an object.` | |
| `422` | `Minimum bill amount must be greater than zero.` | |
| `422` | `Sort order is required.` / `Sort order must be at least 1.` | |
| `422` | `Brand ID is required.` / `Invalid Brand ID.` | |
| `422` | `Invalid sub-brand ID.` | |
| `422` | `A voucher banner has to be an image, a GIF or a video — "<mime>" is none of those.` | Banner galat type ka |
| `422` | `A video banner needs a poster image. Attach one as "poster", or send its upload as "bannerPosterUploadId".` | 🆕 **Text badla 2026-10-07** — ab presigned field ka naam bhi batata hai |
| `422` | `The poster has to be a still image — "<mime>" is not one.` | |
| `404` | `That upload was not found.` | Galat / expire / kisi aur ka `uploadId` |
| `409` | `That upload has already been used.` | Wahi `uploadId` dobara — ⚠️ ek id ko do baar append karne par bhi yahi |
| `500` | *(upload error)* | **Images rollback ho jaati hain** |

> ⚠️ `Banner type must be one of: IMAGE, VIDEO, GIF.` wali row hata di — `bannerType` V-4 me hat chuka hai.

> ### ⚠️ Banner ki galti par images ke `uploadId` jal jaate hain (audit 2026-10-07)
>
> Images pehle upload aur attach hoti hain, banner ka check **uske baad** hota
> hai. To video banner bina poster ke, ya galat `bannerUploadId` bhejne par images
> rollback ho jaati hain **aur unke `imageUploadIds` dobara kaam nahi aate** —
> retry par `409`. Backend fix pending hai. Tab tak panel Save se pehle khud
> check kare: video banner ke saath poster hai aur wo still image hai. (Vendor
> panel ye check pehle se karta hai — `VoucherForm.jsx`.)

### ⚠️ Edge cases & notes

**1. Writes fully transactional hain.** Voucher + Version + SubBrand mappings sab ek MongoDB transaction me bante hain. Fail hone pe **uploaded images bhi rollback** ho jaati hain (`rollbackVoucherImages`), aur plan ka slot bhi wapas milta hai.

> ### 🆕 Uploads ab transaction ke **bahar** hote hain
>
> Pehle images aur banner dono transaction khulne ke **baad** upload hote the. Transaction apne locks poori umar rakhta hai aur server use `transactionLifetimeLimitSeconds` (default **60s**) par khud abort kar deta hai. Matlab slow connection wale vendor ko slow request nahi milti thi — use ek aisi request milti thi jo minute bhar chalti, sab kuch upload kar deti, aur phir commit par transaction ki error deti. Bytes ka paisa lag chuka hota.
>
> Ab tarteeb ye hai: **saari validation aur dono upload pehle, transaction sirf writes ke liye** — jo milliseconds me hote hain. Banner bhi isi wajah se pehle chala gaya (wo video ho sakta hai); use voucher id chahiye thi, aur wo id upload se pehle hi ban jaati hai.
>
> **Aapke liye kya badla:** kuch nahi, contract wahi hai. Farak sirf ye ki ab ek badi upload par transaction timeout nahi milega, aur upload fail hone par error **upload ki** hogi — transaction ki nahi.
>
> ⚠️ Iska matlab ye bhi hai ki ab zyadatar failures transaction shuru hone se **pehle** hote hain (duplicate naam, galat category, image size, upload fail). Rollback aur slot release dono par pehle jaisa hi chalte hain.

**2. `offers` JSON string ho sakta hai** — multipart me array bhejna mushkil hai, isliye validator string parse kar leta hai. Error message me index bhi aata hai (`Offer 1: …`).

**3. 🆕 `subBrandIds` mandatory hai, aur har outlet ka address hona chahiye.**

Bina address wale outlet par ab `400` aata hai:

> `One of the selected outlets has no address yet. Add its address first — a voucher on an outlet with no location is never shown to customers.`

🔴 **Pehle ye chup-chaap hota tha.** Outlet bina address ke `[0,0]` par (Gulf of
Guinea) baith jaata tha, voucher ban jaata, approve hota, publish hota — aur
**customer ko kabhi nahi dikhta**. Kahin koi error nahi, koi warning nahi. Ab
vendor ko pehle hi bata diya jaata hai ki kaunsa outlet theek karna hai.

Yahi check `PUT /vouchers/update/:id` par bhi lagta hai — dono ek hi gate se jaate hain.

**4. Version 1 auto-create hota hai** `DRAFT` status me. `voucher.currentVersionId` uspe point karta hai.

**5. ⚠️ `FIXED` discount type mat use karein** — enum me hai par calculation me handle nahi hota. Aisa offer customer ko `discountAmount: 0` dega aur eligible list se filter ho jayega. Sirf `PERCENTAGE` ya `FLAT` ([Appendix B](#appendix-b--known-issues)).

**6. `maxDiscountAmount` sirf `PERCENTAGE` pe matlab rakhta hai** — cap lagata hai. `FLAT` pe ignore hota hai.

**7. Banner optional aur independent hai** — approval flow se alag. Ek hi field: `media` (ya `bannerUploadId`); wo image hai, GIF hai ya video, ye file ke bytes se tay hota hai. Video ho to `poster` (ya `bannerPosterUploadId`) zaroori. ~~`bannerType` + `bannerImage`/`bannerVideo`/`bannerGif`~~ ab nahi hain.

**8. `maxImages` / `maxOffers` admin-configurable hain** (`Setting.vendor.voucher`) — defaults 5 images, 10 offers.

---

## 55. PUT /vouchers/update/:voucherId

Voucher edit — **naya version banata hai**. Multipart.

> **P10.4 (live 2026-11-04):** naye jode outlets (`newSubBrandIds`) me koi `NEVER_VERIFIED` ho to
> `409 OUTLET_NOT_VERIFIED` (see #54). Pehle se lage outlets par check nahi.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership**

### Path Params
| Param | Type | Required |
|---|---|---|
| `voucherId` | ObjectId | ✅ |

### Body — sab optional, **delta-based**
| Field | Type | Validation | Notes |
|---|---|---|---|
| `name` | string | 2–150 chars | |
| `description` | string | Max 2000, `""` allowed | |
| `startAt` · `endAt` | ISO date | – | |
| `subCategoryId` 🆕 | ObjectId | — | P8 (D88): voucher ki subcategory badalna — brand ki **abhi ki** list mein se (`422 SUBCATEGORY_NOT_IN_BRAND`). Na bhejo → wahi rehti hai, chahe brand ne baad mein wo subcategory hata di ho. Published / approved par naya version banta hai (review dobara) |
| `newTags` | string[] | – | Add karne wale tags |
| `removedTags` | string[] | – | Hatane wale tags |
| `newOffers` | array | Offer schema | Naye offers |
| `removedOfferIds` | ObjectId[] | – | Hatane wale offers |
| `removeImageIds` | ObjectId[] | – | Hatane wali images — file tabhi delete hoti hai jab koi **doosra version** use na kar raha ho (neeche dekhein) |
| `newSubBrandIds` | ObjectId[] | – | Naye outlets |
| `removeSubBrandIds` | ObjectId[] | – | Hatane wale outlets |
| `newImages` | file[] | – | **Multipart**, field name `newImages` |
| `newImageUploadIds` | ObjectId[] 🆕 | – | Presigned raasta — purpose `VOUCHER_IMAGE`. Mila-jula batch chalta hai, aur floor **poore** batch par lagta hai |

> #### ⚠️ `removeImageIds` file kab sach me delete karta hai
>
> Ek **published** voucher ko edit karne par naya draft version **fork** hota hai,
> aur fork har kept image ko apne `storage` ke saath copy karta hai — yaani do
> version ek hi file par point karte hain.
>
> Isliye draft se image hatane par server pehle dekhta hai ki us file ko koi aur
> non-deleted version to nahi use kar raha. Kar raha ho to **row hat jaati hai,
> file rehti hai** — warna live published voucher ki tasveer mar jaati.
>
> Vendor ko farak nahi padta: image us version se hat hi jaati hai. Ye sirf ye
> batata hai ki purana version kyun theek chalta rehta hai.
>
> 🆕 Ab ye baat **service level par test** hoti hai — v1 PUBLISHED, uska fork v2,
> v2 se shared image hatao, aur v1 ki file zinda rehni chahiye. Pehle iska koi
> test is raaste par nahi tha, to check ko bypass karne wala change kahin pakda
> hi nahi jaata.

> ### 🆕 Images ab transaction ke **bahar** upload hoti hain
>
> Wahi badlav jo create (#54) par hai: upload pehle, transaction sirf writes ke
> liye. Ek badi upload par ab transaction timeout nahi milega, aur upload fail ho
> to error **upload ki** aayegi, transaction ki nahi. Contract wahi hai.

```json
{
  "name": "Flat 35% off on total bill",
  "newOffers": [
    { "title": "35% off above 600", "minBillAmount": 600, "discountType": "PERCENTAGE", "discountValue": 35, "maxDiscountAmount": 400, "usageType": "ONCE_PER_USER", "sortOrder": 2 }
  ],
  "removedOfferIds": ["68f1a2b3c4d5e6f7a8b9c2d1"],
  "newTags": ["monsoon"],
  "removedTags": ["discount"]
}
```

### Success — `200`
```json
{
  "success": true,
  "message": "Voucher updated successfully.",
  "data": {
    "voucher": { "_id": "68f1a2b3c4d5e6f7a8b9c2a1", "status": "DRAFT", "currentVersionId": "68f1a2b3c4d5e6f7a8b9c2b2" },
    "version": {
      "_id": "68f1a2b3c4d5e6f7a8b9c2b2",
      "versionNumber": 2,
      "versionCode": "TDV000451-V2",
      "name": "flat 35% off on total bill",
      "status": "DRAFT",
      "isImmutable": false
    },
    "createdNewVersion": true
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Voucher not found.` | |
| `404` | `Voucher current version not found.` | Data inconsistency |
| `400` | `Voucher has no editable version.` | `currentVersionId` nahi |
| `409` | `Voucher is under review and cannot be edited.` | `UNDER_REVIEW` |
| `409` | `Archived voucher cannot be edited.` | `ARCHIVED` |
| `409` | `Paused voucher cannot be edited directly. Resume it first.` | `PAUSED` |
| `409` | `Expired voucher cannot be edited.` | `EXPIRED` |
| `409` | `Voucher cannot be edited from <STATUS> status.` | Baaki blocked statuses |
| `409` | `Voucher with this name already exists for this brand.` | Naya naam duplicate |
| `400` | `Voucher name cannot be empty.` | |
| `400` | `At least one offer is required.` | Sab offers hata diye |
| ~~`400`~~ → `422` | 🆕 `A voucher needs at least 3 images — this one has 2. Add 1 more.` | ⚠️ **Status badla** (`400` → `422`). Ginti us par hai jo edit ke **baad bachta** hai, upload par nahi |
| `400` | `Maximum 5 voucher images are allowed.` | Limit cross |
| `400` | 🆕 `<file> exceeds maximum image size of 10 MB.` | Voucher images par **pehle koi size check tha hi nahi** — P12. Limit `Setting.storage.limits.maxImageSizeMB` se aati hai |
| `400` | `At least one SubBrand is required.` | Sab outlets hata diye |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | |

### ⚠️ Edge cases & notes

**1. Delta-based hai, replace nahi.** `newOffers` add karta hai, `removedOfferIds` hataata hai. Poori list bhejne ki zarurat nahi — aur bhejni bhi nahi chahiye.

**2. Naya version kab banta hai:** agar current version `PUBLISHED` ya `APPROVED` ho (immutable), to naya `DRAFT` version banta hai. `DRAFT` version ho to wahi update hota hai. Response ka `createdNewVersion` batata hai kya hua.

**3. Published voucher edit karne se live version pe asar nahi padta** — customer ko purana published version dikhta rehta hai jab tak naya approve + publish na ho.

**4. Status-wise editability** — upar [Lifecycle](#voucher-apis) table dekho.

**5. Image limit combined check hoti hai** — existing − removed + new.

**6. `removedTags` / `newTags` JSON string bhi accept karte hain** (multipart ke liye).

---

## 56. POST /vouchers/submit-review/:voucherId

Voucher ko admin review ke liye bhejta hai.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN**

### Path Params
| Param | Type | Required |
|---|---|---|
| `voucherId` | ObjectId | ✅ |

### Body
Koi nahi.

### Success — `200`
```json
{
  "success": true,
  "message": "Voucher submitted for review successfully.",
  "data": {
    "voucherId": "68f1a2b3c4d5e6f7a8b9c2a1",
    "versionId": "68f1a2b3c4d5e6f7a8b9c2b1",
    "versionNumber": 1,
    "status": "UNDER_REVIEW",
    "submittedAt": "2026-08-22T17:30:00.000Z"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Voucher not found.` | |
| `403` | `You are not authorized to submit this voucher.` | Dusre brand ka voucher |
| `400` | `Voucher has no editable version.` | |
| `404` | `Voucher version not found.` | |
| `400` | `Published voucher cannot be submitted directly. Create a new version first.` | Already published version submit karne ki koshish |
| `409` | `Voucher status changed. Please refresh and try again.` | Concurrent modification |
| `409` | `Voucher version status changed. Please refresh and try again.` | Version race |
| `422` | 🆕 `A voucher needs at least 3 images — this one has 2. Add 1 more.` | ⚠️ **Naya** — pehle yahan `400 "At least one image is required"` tha, jo `minImages` padhta hi nahi tha. Upar ka [images floor block](#-images-ka-floor--ek-rule-ek-jawab) dekhein |
| `403` | 🆕 P5 — `details.code`: `BRAND_NOT_APPROVED` · `BANK_REQUIRED` · `PLAN_REQUIRED` | **Customers ko bechne ki shart** (design §12.2, D15): brand approved, bank **verified**, live plan — isi kram mein pehli kami. Draft banana / edit karna khula rehta hai |
| `422` | 🆕 `A voucher needs a banner before it can be submitted. Upload one as "media" on the banner endpoint.` | ⚠️ **Naya** — banner ab submit ke liye zaruri hai (#59). Pending, approved ya rejected — teeno chalte hain, bas kuch to bheja ho |
| `400` | *(validation)* | Offers/dates adhoore |

### ⚠️ Notes

**1. Submit ke baad edit block ho jaata hai** — `UNDER_REVIEW` pe `PUT /vouchers/update` `409` dega. Admin approve/reject karne ke baad hi aage badh sakte hain.

**2. Pre-submit validation chalti hai** — `validateVoucherBeforeSubmit` offers, images, validity period sab check karta hai. Adhoora voucher submit nahi hoga.

**3. Concurrent-safe hai** — conditional update se, `modifiedCount !== 1` pe `409`. Do tabs se ek saath submit karne pe ek fail hoga.

**4. `VoucherApprovalHistory` entry banti hai** `SUBMITTED` action ke saath.

**5. Ye ownership `resolveActorBrand` se nahi karta** — apna check hai (`403 "You are not authorized to submit this voucher."`).

---

## 57. POST /vouchers/publish/:versionId

Approved version ko live karta hai.

**Access:** **VENDOR+ADMIN**, ownership verified ✅ · vendor sirf apne brand ka

### Path Params
| Param | Type | Required | Notes |
|---|---|---|---|
| `versionId` | ObjectId | ✅ | ⚠️ **Version ka id**, voucher ka nahi |

### Body
Koi nahi.

### Success — `200`
```json
{
  "success": true,
  "message": "Voucher published successfully.",
  "data": {
    "voucherId": "68f1a2b3c4d5e6f7a8b9c2a1",
    "versionId": "68f1a2b3c4d5e6f7a8b9c2b1",
    "versionNumber": 1,
    "status": "PUBLISHED",
    "publishedAt": "2026-08-22T18:00:00.000Z",
    "isImmutable": true,
    "startAt": "2026-09-01T00:00:00.000Z",
    "endAt": "2026-10-01T23:59:59.000Z"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `401` | `User authentication is required.` | Token se `userId` nahi mila |
| `403` | 🆕 `Forbidden: You do not have permission to perform this action on this brand.` | Voucher kisi aur brand ka |
| `400` | `Invalid voucher version ID.` | Format |
| `404` | `Voucher version not found.` | |
| `400` | `Only an approved voucher version can be published. Current status: DRAFT.` | Admin ne approve nahi kiya |
| `400` | `This voucher version is already immutable and cannot be published again.` | Dobara publish |
| `409` | `This voucher version is no longer the current version and cannot be published.` | Beech me naya version ban gaya |
| `400` | `Voucher cannot be published from <STATUS> status.` | Voucher-level status block |
| `404` | `Voucher not found.` | |
| `403` | 🆕 P5 — `details.code`: `BRAND_NOT_APPROVED` · `BANK_REQUIRED` · `PLAN_REQUIRED` | Customers ko bechne ki shart (design §12.2) — admin publish kare tab bhi (shart brand ki hai) |
| `400` | `Voucher validity period is required.` | `startAt`/`endAt` nahi |
| `400` | `Voucher end date/time must be after voucher start date/time.` | |
| `400` | `Cannot publish an expired voucher version.` | `endAt` already nikal chuki |

### ⚠️ Notes

**1. `versionId` chahiye, `voucherId` nahi.** `GET /vouchers/versions/get-all` (#58) se lein.

**2. Sirf `APPROVED` version publish ho sakta hai** — admin ke `POST /vouchers/review/:versionId` ke baad.

**3. 🆕 Ownership ab check hoti hai.** Voucher ka `brandId` caller ke brand se match karna chahiye (admin koi bhi). Pehle sirf `versionId` kaafi tha — `userId` andar aata tha par **sirf audit fields** (`updatedBy`, `publishedBy`, `performedBy`, `archivedBy`) me kharch hota tha.

🔴 Publish sirf status nahi badalta — wo **jo version live hai use ARCHIVE** kar deta hai. To koi bhi vendor doosre brand ka **chalta hua voucher hata kar** dusra live kar sakta tha, aur approval history me **uska apna naam** darj hota — ek aise brand par jisse uska koi rishta nahi.

**4. Publish karte hi version `isImmutable: true` ho jaata hai** — ab wo kabhi edit nahi ho sakta. Change chahiye to naya version.

**5. Expired voucher publish nahi hota** — `endAt` future me honi chahiye.

**6. Publish ke baad customer ko dikhne lagta hai** — `GET /vouchers/customer/get-all` me, jab `startAt <= now < endAt`. 🆕 Location wale customer ko pehle radius (`maxDistanceKm`) ke andar wale vouchers dikhte hain; uske radius me koi voucher na ho, ya customer ne location hi na di ho, to **saare** live vouchers — yaani aapka voucher bhi, chahe outlet door ho.

**7. 🆕 Master voucher ab `PUBLISHED` bolta hai.** Pehle wo `APPROVED` par hi pada reh jaata tha. Isse `PAUSED` ke paas utarne ki seedhi ban gayi (#57a) aur expiry sweep master tak pahunchne lagi.

---

## 57a. POST /vouchers/pause/:versionId

🆕 Live voucher ko customer feed se hataata hai, **bina khatam kiye**.

**Access:** **VENDOR+ADMIN**, ownership verified ✅ · vendor sirf apne brand ka

### Path Params
| Param | Type | Required | Notes |
|---|---|---|---|
| `versionId` | ObjectId | ✅ | ⚠️ **Version ka id**, voucher ka nahi |

### Body
| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | String | ❌ | Max 1000. Aapka apna note — *"stock khatam, Monday tak"*. Customer ko nahi dikhta |

### Success — `200`
```json
{
  "success": true,
  "message": "Voucher paused. Customers will not see it until you resume it.",
  "data": {
    "voucherId": "68f1a2b3c4d5e6f7a8b9c2a1",
    "versionId": "68f1a2b3c4d5e6f7a8b9c2b1",
    "voucherCode": "VCH-10000042",
    "versionCode": "VCH-10000042-V1",
    "versionNo": 1,
    "action": "PAUSED",
    "voucherStatus": "PAUSED",
    "versionStatus": "PAUSED",
    "pausedAt": "2026-09-17T10:15:00.000Z",
    "reason": "Stock khatam, Monday tak"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `401` | `User authentication is required.` | Token se `userId` nahi mila |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | Voucher kisi aur brand ka |
| `400` | `Invalid voucher version ID.` | Format |
| `404` | `Voucher version not found.` / `Voucher not found.` | |
| `409` | `Only a published voucher can be paused — this one is APPROVED.` | Wo version live hai hi nahi |
| `400` | `The reason cannot exceed 1000 characters.` | |
| `409` | `Voucher version status changed. Please refresh and try again.` | Beech me kisi aur ne badal diya |

---

## 57b. POST /vouchers/resume/:versionId

🆕 Paused voucher ko wapas customer feed me laata hai.

**Access:** **VENDOR+ADMIN**, ownership verified ✅ · vendor sirf apne brand ka

### Path Params
| Param | Type | Required | Notes |
|---|---|---|---|
| `versionId` | ObjectId | ✅ | |

### Body
Koi nahi.

### Success — `200`
```json
{
  "success": true,
  "message": "Voucher is live again.",
  "data": {
    "voucherId": "68f1a2b3c4d5e6f7a8b9c2a1",
    "versionId": "68f1a2b3c4d5e6f7a8b9c2b1",
    "voucherCode": "VCH-10000042",
    "versionCode": "VCH-10000042-V1",
    "versionNo": 1,
    "action": "RESUMED",
    "voucherStatus": "PUBLISHED",
    "versionStatus": "PUBLISHED",
    "pausedAt": null,
    "reason": null
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `401` | `User authentication is required.` | |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | |
| `404` | `Voucher version not found.` / `Voucher not found.` | |
| `409` | `Only a paused voucher can be resumed — this one is PUBLISHED.` | Wo paused hai hi nahi |
| `409` | 🔴 `Version 2 went live while this one was paused, and a voucher can only have one live version. Pause version 2 first, or leave this one paused.` | Beech me doosra version publish ho gaya |
| `409` | `This voucher's validity ran out while it was paused. Create a new version with new dates.` | `endAt` nikal chuki |

### ⚠️ Notes

**1. Pause khatam karna nahi hai.** Version jaisa tha waisa hi rehta hai — dates, offers, images, sab. Resume karte hi wapas wahi voucher live ho jaata hai. Ye publish-over-karne ya expire hone se alag hai, wo dono wapas nahi aate.

**2. Customer ke liye wo turant gayab ho jaata hai.** Listing `status: "PUBLISHED"` par match karti hai, to paused version kisi feed me nahi aata — aur resume par wapas aa jaata hai. Iske liye customer side par kuch naya nahi jodna pada.

**3. 🔴 Paused rehte hue aap doosra version publish kar sakte hain — par phir purana wapas nahi aayega.** Ek voucher par ek hi live version ho sakta hai (partial unique index). Pause karne se wo slot khali ho jaata hai, to v2 publish ho sakta hai; uske baad v1 ko resume karne par **saaf 409** milta hai jisme likha hota hai ki kaunsa version live hai aur ab kya karna hai. Pehle ye `E11000` database error banke **500** girta.

**4. Ghadi nahi rukti.** Paused voucher ki `endAt` waise hi aati hai. Nikal gayi to hourly sweep use `EXPIRED` kar deti hai aur resume par 409 milta hai — naya version banana padega.

**5. `reason` sirf aapke liye hai.** Approval history me darj hota hai. Customer ko kabhi nahi dikhta, aur admin ke `rejectionReason` se alag field hai — ek wo hai jo aapne chuna, dusra wo jo aap par hua.

**6. Master status tabhi badalta hai jab wo isi version ki baat kar raha ho.** Agar aapne naya version banana shuru kar diya hai to master `DRAFT` par hai (wo aapka chalu kaam track kar raha hai), aur pause use nahi chhuta — `versionStatus` phir bhi `PAUSED` ho jaata hai, aur customer ke liye wahi maayne rakhta hai.

---

## 57c. DELETE /vouchers/:voucherId

🆕 Voucher delete karta hai — **soft**, aur plan ka slot wapas de deta hai.

**Access:** **VENDOR+ADMIN**, ownership verified ✅ · vendor sirf apne brand ka

### Path Params
| Param | Type | Required | Notes |
|---|---|---|---|
| `voucherId` | ObjectId | ✅ | ⚠️ **Voucher ka id**, version ka nahi — delete poore voucher par hota hai |

### Body
| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | String | ❌ | Max 500. Admin ki deleted-list me yahi padha jaata hai |

### Success — `200`
```json
{
  "success": true,
  "message": "Voucher deleted.",
  "data": {
    "voucherId": "68f1a2b3c4d5e6f7a8b9c2a1",
    "voucherCode": "VCH-10000042",
    "status": "DELETED",
    "deletedAt": "2026-09-17T10:15:00.000Z",
    "deletedBy": "68f1a2b3c4d5e6f7a8b9c0a1",
    "deleteReason": "Galti se bana diya tha",
    "versionsDeleted": 2,
    "previousStatus": "DRAFT"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `401` | `User authentication is required.` | |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | Voucher kisi aur brand ka |
| `400` | `Invalid voucher ID.` | Format |
| `404` | `Voucher not found.` | Hai hi nahi, ya pehle se deleted |
| `400` | `The reason cannot exceed 500 characters.` | |
| `409` | 🔴 `2 customers are holding this voucher right now (1 already paid, 1 still checking out), so it cannot be deleted.` | **Live claim** — neeche dekhein |
| `409` | `Voucher was already deleted. Please refresh.` | Do delete ek saath aaye |

#### 🔴 `409` ke saath `details` bhi aata hai
```json
{
  "success": false,
  "message": "2 customers are holding this voucher right now (1 already paid, 1 still checking out), so it cannot be deleted.",
  "details": {
    "liveClaims": 2,
    "breakdown": { "PAID": 1, "PENDING": 1 },
    "suggestedAction": "Pause it instead — that takes it off the customer app immediately and leaves these claims intact. You can delete it once they are settled."
  }
}
```

### ⚠️ Notes

**1. Soft delete hai — row rehti hai.** `VoucherClaim` apne saath offer, voucher, brand aur outlet ke snapshot rakhta hai, isliye customer ki order history is document ko padhti hi nahi aur delete ke baad bhi poori rehti hai. Par claim `voucherId` par point karta hai — hard delete un sabko khali jagah par chhod deta.

**2. `status: DELETED` aur `isDeleted: true` hamesha saath likhe jaate hain.** Ek jagah se (`voucherDeletionFields`). `isDeleted` wo hai jis par har query filter karti hai; `DELETED` wo hai jo panel dikha sakta hai — boolean kisi ko dikhaya nahi ja sakta.

**3. Saari versions bhi jaati hain.** Voucher ki version ki apni koi zindagi nahi hai. Chhod dete to ek deleted voucher ki `PUBLISHED` version reh jaati, jise customer listing `voucherMappings` se join karke khushi se serve karti rehti.

**4. 🔴 Live claim par delete rukta hai — admin ke liye bhi.** `PENDING` matlab customer abhi checkout par khada hai; `PAID` uss se bhi bhaari — paisa ja chuka hai aur discount abhi mila nahi. Baaki saare states (`REDEEMED`, `FAILED`, `CANCELLED`, `EXPIRED`, `REFUNDED`) khatam ho chuke hain, un par nahi rukta.

Is codebase ke har doosre guard me ADMIN ko chhoot hai, kyunki admin ka kaam hi vendor ke rule ke upar jaana hai. Ye wala alag hai: jise ye bachata hai wo in dono me se koi nahi. Jis customer ne paisa de diya hai use wo discount milna hi chahiye, aur delete dabane wale admin ko pata bhi nahi chalta ki wo kisi ko beech raaste chhod raha hai.

**5. Slot turant wapas milta hai.** Delete ke baad brand ka `vouchersUsed` ek kam ho jaata hai, to naya voucher usi waqt banaya ja sakta hai.

**6. `PAUSED` aur `DELETED` alag cheezein hain.** Pause wapas aa sakta hai (#57b), delete nahi. Agar aap sirf isliye hata rahe hain ki abhi customer ko na dikhe, to pause chahiye.

---

## 57d. PUT /vouchers/versions/:versionId/images/reorder

🆕 Voucher ki images ka kram badalta hai — **poori list bhejni hoti hai**.

**Access:** **VENDOR+ADMIN**, ownership verified ✅ · vendor sirf apne brand ka

### Path Params
| Param | Type | Required | Notes |
|---|---|---|---|
| `versionId` | ObjectId | ✅ | ⚠️ **Version ka id** — images version ki hoti hain, voucher ki nahi |

### Body
| Field | Type | Required | Notes |
|---|---|---|---|
| `images` | Array | ✅ | **Poori list.** Har item: `{ id, sortOrder }` |
| `images[].id` | ObjectId | ✅ | Image entry ka `_id` |
| `images[].sortOrder` | Number ≥ 1 | ✅ | Sirf **kram** tay karta hai — server 1..n me dobara number karta hai |

```json
{
  "images": [
    { "id": "68f1a2b3c4d5e6f7a8b9d003", "sortOrder": 1 },
    { "id": "68f1a2b3c4d5e6f7a8b9d001", "sortOrder": 2 },
    { "id": "68f1a2b3c4d5e6f7a8b9d002", "sortOrder": 3 }
  ]
}
```

### Success — `200`
```json
{
  "success": true,
  "message": "Voucher images reordered.",
  "data": {
    "versionId": "68f1a2b3c4d5e6f7a8b9c2b1",
    "voucherCode": "VCH-10000042",
    "updated": 3,
    "images": [
      { "id": "68f1a2b3c4d5e6f7a8b9d003", "sortOrder": 1, "url": "https://cdn.trydood.com/images/vouchers/.../three.webp" },
      { "id": "68f1a2b3c4d5e6f7a8b9d001", "sortOrder": 2, "url": "https://cdn.trydood.com/images/vouchers/.../one.webp" },
      { "id": "68f1a2b3c4d5e6f7a8b9d002", "sortOrder": 3, "url": "https://cdn.trydood.com/images/vouchers/.../two.webp" }
    ]
  }
}
```

Kram pehle se wahi ho to `updated: 0` aur `message: "Images already in this order."` — koi write nahi hoti.

### Errors
| Status | Message | Kab |
|---|---|---|
| `401` | `User authentication is required.` | |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | Voucher kisi aur brand ka |
| `400` | `Invalid voucher version ID.` | Format |
| `404` | `Voucher version not found.` / `Voucher not found.` | |
| `409` | 🔴 `A published version cannot be reordered — its images are part of what was approved. Create a new version to change the order.` | `PUBLISHED` ya `APPROVED` version |
| `400` | `Please send the complete image order — 3 images expected, 2 received.` | Adhoori list |
| `400` | `Invalid image id : <id>` | Aisa id jo is version ka nahi |
| `400` | `Duplicate id found.` | Ek hi image do baar |
| `400` | `Duplicate sort order found.` | Do image ek hi position par |
| `400` | `Image list is required.` | Khali list |

### ⚠️ Notes

**1. 🔴 Pehli image hi banner ka fallback hai.** Approved banner na ho to customer ko voucher ke upar **`sortOrder: 1` wali image** dikhti hai (#59 · V-4a), aur claim ka snapshot bhi wahi freeze karta hai. Yaani ye endpoint list ki safai nahi hai — ye wo cheez badalta hai jo customer sabse pehle dekhta hai.

**2. Poori list bhejni zaruri hai.** Position 1..n me dobara number hoti hain, to adhoori list unse takrati jo bheji hi nahi gayi. Error me dono ginti aati hain, taaki pata chale kitni chhoot rahi hain.

**3. Aapke bheje number sirf kram batate hain.** `10, 20, 30` bhejein to `1, 2, 3` ban jaate hain. Gaps ka kabhi koi matlab tha hi nahi, aur unhe rakhne ka matlab hota ki agli image daalte waqt server andaza lagaye ki aapne un gaps se kya kehna chaha tha.

**4. 🔴 Sirf `DRAFT` ya `REJECTED` version.** Published version `isImmutable` hoti hai — uski images us cheez ka hissa hain jo admin ne approve ki thi. Yahan **naya version apne aap nahi banta**: ek drag-and-drop jo chupke se version bana kar approval queue me daal de, wo aapne maanga hi nahi tha. Kram badalna ho to pehle naya version banaiye (`PUT /vouchers/update/:voucherId`), phir usme reorder karein.

**5. `REJECTED` version me chalta hai** — wo aapka hi theek karne ko bacha hua kaam hai.

---

## 58. GET /vouchers/versions/get-all

Voucher versions ki paginated list — vendor ka voucher dashboard.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN** ⚠️

### Query Params
| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `page` | number | ❌ | `1` | |
| `limit` | number | ❌ | `10` | |
| `search` | string | ❌ | – | Name/description/tags me text match |
| `brandId` | ObjectId | ⚠️ | – | **Vendor ko bhejna chahiye** — warna sabke vouchers |
| `voucherId` | ObjectId | ❌ | – | Ek voucher ke saare versions |
| `categoryId` · `subCategoryId` | ObjectId | ❌ | – | |
| `status` | string | ❌ | – | VOUCHER_STATUSES enum |
| `createdBy` · `submittedBy` · `reviewedBy` · `approvedBy` · `rejectedBy` | ObjectId | ❌ | – | |
| `versionNumber` | number | ❌ | – | |
| `versionCode` | string | ❌ | – | |
| `isImmutable` · `isActive` | boolean | ❌ | – | |
| `includeDeleted` | boolean | ❌ | `false` | 🆕 **Sirf ADMIN.** Deleted versions bhi list me le aata hai. Vendor ke bhejne par **403** — chupke se ignore nahi hota |
| `isDummy` | boolean | ❌ | – | 🆕 Admin panel ke liye bana (dummy "Coming soon" brands alag karna). Vendor ke liye bekaar — vendor ka brand hamesha real hai; `isDummy=true` bhejne par `404`. Galat value par `422` |
| `fromDate` · `toDate` | ISO date | ❌ | – | |
| `sortBy` | string | ❌ | `NEWEST` | `DISTANCE` \| `NEWEST` \| `EXPIRING_SOON` \| `RELEVANCE` |
| `sortOrder` | string | ❌ | – | `asc` \| `desc` |

```http
GET /vouchers/versions/get-all?brandId=68f1a2b3c4d5e6f7a8b9c3a1&status=DRAFT&limit=20
```

### Success — `200`
```json
{
  "success": true,
  "message": "Voucher versions fetched successfully",
  "data": {
    "total": 12,
    "totalPages": 1,
    "page": 1,
    "limit": 20,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9c2b1",
        "voucherId": "68f1a2b3c4d5e6f7a8b9c2a1",
        "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
        "versionNumber": 1,
        "versionCode": "TDV000451-V1",
        "name": "flat 30% off on total bill",
        "description": "Valid on dine-in and takeaway",
        "tags": ["coffee", "cafe"],
        "images": [
          {
            "_id": "…",
            "media": {
              "url": "…",
              "kind": "IMAGE",
              "width": 1200,
              "height": 800,
              "mimeType": "image/webp",
              "sizeBytes": 82314,
              "originalName": "hero.webp",
              "provider": "AWS_S3"
            },
            "sortOrder": 1
          }
        ],
        "offers": [
          { "_id": "…", "title": "30% off above 500", "minBillAmount": 500, "discountType": "PERCENTAGE", "discountValue": 30, "maxDiscountAmount": 300 }
        ],
        "brand": { "_id": "…", "brandName": "…", "legalBusinessName": "…", "uniqueId": "…", "merchantId": "…", "logo": "…", "isActive": true, "isApproved": true },
        "voucher": { "_id": "…", "name": "…", "voucherCode": "…", "status": "PUBLISHED", "isActive": true, "isSuggested": false, "suggestionOrder": 0, "currentVersionId": "…", "publishedVersionId": "…", "banner": { "current": { "url": "…", "kind": "IMAGE", "provider": "AWS_S3" }, "pending": null, "status": "APPROVED" }, "createdAt": "…" },
        "category": { "_id": "…", "name": "…", "image": "…", "isActive": true },
        "subCategory": { "_id": "…", "name": "…", "image": "…", "isActive": true },
        "approvedByUser": { "_id": "…", "name": "admin user", "username": "…", "role": "ADMIN" },
        "status": "PUBLISHED",
        "startAt": "2026-09-01T00:00:00.000Z",
        "endAt": "2026-10-01T23:59:59.000Z",
        "isImmutable": true,
        "publishedAt": "2026-08-22T18:00:00.000Z",
        "submittedBy": { "_id": "…", "name": "rahul sharma" },
        "approvedBy": { "_id": "…", "name": "admin user" },
        "isActive": true,
        "createdAt": "2026-08-22T17:00:00.000Z"
      }
    ]
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `No any voucherversion found` | Empty — **empty-state** |
| `422` | `Invalid Voucher Id` / `Invalid Brand Id` | |
| `422` | *(Joi message)* — invalid `status`/`sortBy` | |
| `422` | `isDummy must be true or false` | |

### ⚠️ Notes

**0. 🆕 `brand` block me do naye keys — `isDummy` (hamesha `false` vendor ke liye) aur `dummyBatch` (`null`).** Admin panel ke dummy badge ke liye hain; vendor panel inhe ignore kare. Koi purana key nahi badla.

**1. ✅ Ab scoped hai.** Pehle `brandId` bheje bina **har brand ke versions** aa jaate the — unpublished drafts, pricing aur rejection notes samet. Ab vendor ko apna brand milta hai, outlet manager ko apne brand ke sab (voucher brand ka hota hai, har counter par redeem hota hai), admin ko sab. Doosre brand ka `brandId` → `403`.

**2. Ye **versions** deta hai, vouchers nahi.** Ek voucher ke multiple versions honge. Voucher-wise group karna ho to `voucherId` se filter karein ya client-side group karein.

**3. `sortBy=RELEVANCE` bina `search` ke silently `NEWEST` ban jaata hai** — koi error nahi.

**4. `publish` (#57) ke liye `versionId` yahin se milta hai** — `status: "APPROVED"` filter karke.

**5. 🆕 File ab `media` ke andar hai — teeno panel surfaces par ek hi shape.**

Flat `url` ki jagah `media` object aata hai, wahi jo showcase panel (`formatManagedMedia`) aur ticker panel (`toAdminTickerShape`) dete hain:

```jsonc
{ "url", "kind", "width", "height", "mimeType", "sizeBytes", "originalName", "provider" }
// "duration" sirf VIDEO / AUDIO par · "thumbnail" (poster) sirf VIDEO par
```

⚠️ `provider` **flat** hai, `storage` ke andar nested nahi. `publicId`, `bucket` aur `key` kabhi nahi jaate — wo file ka **pata** hai, uske baare me detail nahi: jiske paas wo hai wo file seedha fetch ya overwrite kar sakta hai, is server ke har check ko bypass karke. `provider` isliye rehta hai kyunki S3 migration ke dauraan dekhna padta hai ki kaunsi file move ho chuki hai — *kaam ka, khatarnak nahi*.

Yahi `voucher.banner.current` / `.pending` par bhi lagta hai. Ek hi jagah faisla hota hai: `helpers/media/toMediaResponse.js`.

**6. 🔴 Joined blocks ab whitelist hain — pehle poore documents ja rahe the.**

`brand`, `voucher`, `category`, `subCategory` aur `*ByUser` lookups par **koi projection thi hi nahi**, aur user lookup `{password: 0, otp: 0, refreshToken: 0}` thi — yaani teen field hatakar baaki poora user document. Jo ja raha tha:

| Block | Ab nahi jaata |
|---|---|
| `brand` | `BankId` · `GSTId` · `PANId` · `email` · `mobile` · `whatsappNumber` · `logoStorage` · `approvedByAdminId` / `rejectedByAdminId` / `revokedByAdminId` · `revokeReason` · `verificationAttemptCount` · `systemVerifyId` · saare entitlement counters |
| `*ByUser` | `email` · `mobile` · `whatsappNumber` · **`walletBalance`** · `tCoinsBalance` · `referralCode` · `notificationPreferences` · `isOnline` · `currentScreen` |
| `voucher` | `normalizedName` · `createdBy` / `updatedBy` · `banner.*.storage` ka locator |

⚠️ Ye endpoint `isVendorOrAdmin` hai, aur `approvedByUser` / `reviewedByUser` wo **admin** hote hain jinhone voucher review kiya — to ek vendor apni list kholkar admin ka email, mobile aur wallet balance padh sakta tha.

⚠️ Vendor users me `name` set nahi hota, isliye `createdByUser` aksar `{_id, role}` hi aayega. Ye projection ki kami nahi, us user ke paas naam hai hi nahi.

---

## 58a. GET /vouchers/get/:voucherId 🆕

Ek voucher ki **poori detail, ek call me** — voucher screen ka single source.

Isme aata hai: voucher master, **`currentVersion` (jo edit ho rahi hai) aur
`publishedVersion` (jo live hai) dono full**, har version ke attached outlets
apne `location` + `workHours` ke saath, brand block, saari versions ki switcher
list, aur claim counts + revenue.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership**

### Params
| Param | Type | Required | Notes |
|---|---|---|---|
| `voucherId` | ObjectId (path) | ✅ | |
| `versionId` | ObjectId (query) | ❌ | Switcher se koi **teesri** version kholne ke liye. Isi voucher ki honi chahiye, warna `404` |
| `includeDeleted` | boolean (query) | ❌ | 🆕 **Sirf ADMIN.** Deleted voucher/versions bhi khulte hain. Vendor bheje to **403** — chupke se ignore nahi hota |

```http
GET /vouchers/get/68f1a2b3c4d5e6f7a8b9c2a1
GET /vouchers/get/68f1a2b3c4d5e6f7a8b9c2a1?versionId=68f1a2b3c4d5e6f7a8b9c2b1
```

### Success — `200`
```jsonc
{
  "success": true,
  "message": "Voucher details fetched successfully",
  "data": {
    "voucher": {
      "_id": "68f1a2b3c4d5e6f7a8b9c2a1",
      "name": "flat 30% off on total bill",
      "description": "Valid on dine-in and takeaway",
      "voucherCode": "VCH-00000015",
      "status": "PUBLISHED",
      "isActive": true,
      "tags": ["coffee", "cafe"],
      "timezone": "Asia/Kolkata",
      "currentVersionId": "68f1a2b3c4d5e6f7a8b9c2b2",
      "currentVersionNumber": 2,
      "publishedVersionId": "68f1a2b3c4d5e6f7a8b9c2b2",
      "publishedVersionNumber": 2,
      "banner": {
        "current": { "url": "…", "kind": "IMAGE", "width": 1200, "height": 628, "mimeType": "image/webp", "sizeBytes": 82314, "originalName": "banner.webp", "provider": "AWS_S3" },
        "pending": null,
        "status": null,
        "rejectionReason": null,
        "reviewedBy": "68f1a2b3c4d5e6f7a8b9c000",
        "reviewedAt": "2026-09-11T16:55:32.197Z"
      },
      "isSuggested": true,
      "suggestionOrder": 1,
      "suggestedAt": "2026-09-03T10:38:34.682Z",
      "suggestedBy": { "_id": "…", "name": "admin user", "username": "…", "role": "ADMIN" },
      "isDeleted": false,
      "deletedAt": null, "deletedBy": null, "deleteReason": null,
      "createdBy": { "_id": "…", "role": "VENDOR" },
      "updatedBy": { "_id": "…", "name": "admin user", "role": "ADMIN" },
      "createdAt": "2026-09-01T18:10:38.440Z",
      "updatedAt": "2026-09-11T16:55:32.197Z"
    },

    "brand": {
      "_id": "68f1a2b3c4d5e6f7a8b9c3a1",
      "brandName": "mocha cafe",
      "legalBusinessName": "mocha hospitality private limited",
      "uniqueId": "#TB75849",
      "merchantId": "TM-VGLU-YD8F-ZDF5",
      "logo": "…",
      "isActive": true,
      "isApproved": true
    },

    "currentVersion": {
      "_id": "68f1a2b3c4d5e6f7a8b9c2b2",
      "versionNumber": 2,
      "versionCode": "VCH-00000015-V2",
      "name": "flat 30% off on total bill",
      "description": "Valid on dine-in and takeaway",
      "tags": ["coffee", "cafe"],
      "status": "PUBLISHED",
      "isImmutable": true,
      "isActive": true,
      "isDeleted": false,
      "startAt": "2026-09-12T00:00:00.000Z",
      "endAt": "2026-09-30T13:00:00.000Z",
      "category":    { "_id": "…", "name": "Cafes", "image": "…", "isActive": true },
      "subCategory": { "_id": "…", "name": "Coffee Shops", "image": "…", "isActive": true },
      "images": [
        { "_id": "…", "media": { "url": "…", "kind": "IMAGE", "width": 1200, "height": 800, "mimeType": "image/webp", "sizeBytes": 82314, "originalName": "hero.webp", "provider": "AWS_S3" }, "sortOrder": 1 }
      ],
      "offers": [
        { "_id": "…", "title": "30% off above 500", "minBillAmount": 500, "discountType": "PERCENTAGE", "discountValue": 30, "maxDiscountAmount": 300, "usageType": "MULTIPLE", "discountApplicableOn": "SUBTOTAL", "sortOrder": 1, "isActive": true, "isDeleted": false }
      ],

      "outlets": [
        {
          "_id": "68f1a2b3c4d5e6f7a8b9c4a1",
          "attachmentId": "68f1a2b3c4d5e6f7a8b9c9a1",   // VoucherSubBrand row
          "isAttachmentActive": true,
          "attachedAt": "2026-09-11T16:50:00.000Z",
          "uniqueId": "#TS830940",
          "storeId": "TS-HJ2K-3UYB-BKBP",
          "outletType": "OUTLET",
          "logo": null,
          "coverImage": null,
          "description": "Indiranagar flagship",
          "email": null,
          "mobile": null,
          "whatsappNumber": "8090102030",
          "isActive": true,
          "isDeleted": false,
          "joinedDate": "2026-09-10T17:46:50.242Z",
          "geo": { "type": "Point", "coordinates": [77.6895662, 12.9302136] },
          "location": {
            "_id": "…",
            "addressLine1": "Embassy TechVillage",
            "addressLine2": "Kadubeesanahalli",
            "landmark": null,
            "city": "bengaluru",
            "district": "bangalore division",
            "state": "karnataka",
            "country": "india",
            "zipcode": "560103",
            "formattedAddress": "Outer Ring Rd, Kadubeesanahalli, Bengaluru, Karnataka 560103, India",
            "geo": { "type": "Point", "coordinates": [77.6895662, 12.9302136] }
          },
          "workHours": {
            "_id": "…",
            "monday":    { "start": "09:00", "end": "18:00", "isOpen": true },
            "tuesday":   { "start": "09:00", "end": "18:00", "isOpen": true },
            "wednesday": { "start": "09:00", "end": "18:00", "isOpen": true },
            "thursday":  { "start": "09:00", "end": "18:00", "isOpen": true },
            "friday":    { "start": "09:00", "end": "18:00", "isOpen": true },
            "saturday":  { "start": "10:00", "end": "22:00", "isOpen": true },
            "sunday":    { "start": null,    "end": null,    "isOpen": false }
          }
        }
      ],
      "outletCount": 1,
      "liveOutletCount": 1,
      "totalBrandOutlets": 1,
      "isAppliedOnAllOutlets": true,

      // ⚠️ Is version ke apne claims aur paisa — voucher ke nahi.
      "stats": {
        "currency": "INR",
        "claims": { "total": 8, "pending": 0, "paid": 0, "redeemed": 4, "failed": 0, "cancelled": 4, "expired": 0, "refunded": 0 },
        "revenue": { "billAmount": 6000, "customerPaid": 4305, "offerDiscount": 1650, "promoDiscount": 100, "convenienceFee": 55, "taxOnTop": 0, "vendorPayable": 4350, "commission": 0, "refunded": 0, "netCustomerPaid": 4305 }
      },

      "submittedAt": "…", "reviewedAt": "…", "approvedAt": "…", "publishedAt": "…",
      "rejectedAt": null, "rejectionReason": null,
      "pausedAt": null, "pauseReason": null,
      "expiredAt": null, "archivedAt": null,
      "deletedAt": null, "deleteReason": null,
      "createdBy":   { "_id": "…", "role": "VENDOR" },
      "submittedBy": { "_id": "…", "role": "VENDOR" },
      "reviewedBy":  { "_id": "…", "name": "admin user", "role": "ADMIN" },
      "approvedBy":  { "_id": "…", "name": "admin user", "role": "ADMIN" },
      "rejectedBy": null, "pausedBy": null, "deletedBy": null,
      "createdAt": "…", "updatedAt": "…"
    },

    "publishedVersion": { /* bilkul wahi shape — live version */ },
    // "requestedVersion" sirf tab aati hai jab aapne ?versionId= bheja ho

    "versions": [
      { "_id": "…", "versionNumber": 2, "versionCode": "VCH-00000015-V2", "status": "PUBLISHED", "claimCount": 8, "customerPaid": 4305, "startAt": "…", "endAt": "…", "isImmutable": true, "isActive": true, "isDeleted": false, "attachedOutletsCount": 1, "submittedAt": "…", "reviewedAt": "…", "approvedAt": "…", "publishedAt": "…", "rejectedAt": null, "pausedAt": null, "expiredAt": null, "deletedAt": null, "createdAt": "…", "updatedAt": "…" },
      { "_id": "…", "versionNumber": 1, "status": "ARCHIVED", "claimCount": 14, "customerPaid": 123435.9, "attachedOutletsCount": 0, "…": "…" }
    ],
    "versionCount": 2,

    // Poore voucher ka jod — har version ke stats ka sum.
    "stats": {
      "currency": "INR",
      "claims": { "total": 22, "pending": 0, "paid": 0, "redeemed": 13, "failed": 0, "cancelled": 9, "expired": 0, "refunded": 0 },
      "revenue": {
        "billAmount": 139987,
        "customerPaid": 127740.9,
        "offerDiscount": 12546.1,
        "promoDiscount": 100,
        "convenienceFee": 400,
        "taxOnTop": 0,
        "vendorPayable": 127440.9,
        "commission": 0,
        "refunded": 0,
        "netCustomerPaid": 127740.9
      }
    }
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Voucher not found.` | Id exist nahi karta, **ya aapke brand ka nahi hai** — dono ka ek hi jawab |
| `404` | `Voucher version not found.` | `?versionId=` isi voucher ka nahi hai |
| `403` | `Only an admin can read a deleted voucher.` | Vendor ne `includeDeleted` bheja |
| `403` | `Forbidden: You do not have permission…` | Role hi allowed nahi |
| `404` | `No brand is linked to your account` | Vendor account par brand hi nahi |
| `422` | `Invalid voucher ID.` | Malformed id |

### ⚠️ Notes

**1. 🔴 Doosre brand ka voucher `404` deta hai, `403` nahi — aur ye jaan-bujh kar hai.**

`403` ye confirm kar deta ki wo id **exist karti hai**. Voucher ids har share link
aur har claim receipt me jaati hain, to `403` is endpoint ko ek aisa oracle bana
deta jisse koi bhi ye pata kar le ki kaunsi id asli hai. "Not found" wahi jawab
hai jo ek banayi hui id ko milta hai — farq se seekhne ko kuch nahi bachta.

Brand ka faisla `resolveVoucherBrandScope` karta hai (wahi resolver jo #58 use
karta hai) aur wo **voucher ke apne `$match` me** jaata hai — doosre brand ka
voucher padha hi nahi jaata, padh kar filter nahi hota.

**2. `currentVersion` aur `publishedVersion` alag-alag rows hain — aksar.**

Yahi to version flow ka matlab hai: vendor ek draft edit kar raha hota hai jabki
customer ko purani live version dikh rahi hoti hai. Isliye screen ko **dono**
chahiye — ek hi dikhane wali screen aadhe waqt galat hoti. Naye voucher par
`publishedVersion: null` bilkul normal hai.

⚠️ `voucher.currentVersionNumber` ek **number** hai, `currentVersion` ek
**object**. Stored document me dono ka naam `currentVersion` hai (ek number, ek
pointer) — yahan number ko rename kiya gaya hai taaki version chip me
`[object Object]` na chhap jaye.

**3. Outlets us **version** ke hain, voucher ke nahi.**

Attachment `VoucherSubBrand` par hai aur wo version-wise hai — nayi version
publish karte hi outlet list badal sakti hai. Isliye `outlets` har version block
ke andar hai, upar voucher par nahi.

| Field | Matlab |
|---|---|
| `isAttachmentActive` | Mapping ka apna switch — off hai to voucher us counter par nahi chalta |
| `isActive` / `isDeleted` | **Outlet ka** apna switch. Off outlet bhi list me rehta hai, gayab nahi hota — warna "attach hi nahi hai" padha jaata |
| `liveOutletCount` | Wo outlets jinke dono switch on hain |
| `isAppliedOnAllOutlets` | `liveOutletCount === totalBrandOutlets` (brand ke **active** outlets), aur brand ke zero outlets par hamesha `false` |

⚠️ Jis outlet ki `location` set nahi hai wo bhi aata hai, `location: null` ke
saath. Customer detail API use **gira deti hai** (map par dikhane ko kuch hai hi
nahi) — par aapki screen par use girana matlab ek juda hua outlet chhupa dena.

**4. `offers` me switched-off aur deleted offers bhi aate hain.**

Customer API inhe gira deti hai — jo offer claim nahi ho sakta wo customer ko
daam jaisa dikhta hai aur payment par fail hota hai. Ye aapka apna editor hai:
jo offer aapne band kiya hai wo dikhna chahiye, warna uske hone ka pata sirf tab
chalta hai jab wahi offer dobara add karne par takraata hai. `isActive` /
`isDeleted` dono har offer par hain.

**5. Revenue **do jagah** hai — version ka apna, aur voucher ka jod.**

| Kahan | Kya |
|---|---|
| `currentVersion.stats` · `publishedVersion.stats` · `requestedVersion.stats` | Us **version** ke apne claims aur paisa |
| `versions[].claimCount` · `versions[].customerPaid` | Switcher me hi dikh jaaye ki kaunsi version chali — bina expand kiye |
| Top-level `stats` | Poore voucher ka total |

Ye farq asli hai. Ek voucher ki versions ek ke baad ek bikti hain, to voucher ka
total ye batata hi nahi ki kamaaya kisne. Ek live voucher par: voucher `22 claims
· ₹1,27,740.9`, par uski live version sirf `8 claims · ₹4,305` — baaki ₹1,23,436
us archived version ka hai jise isne replace kiya.

⚠️ **Top-level `stats` version rows ka jod hai**, alag se nahi nikala jaata — ek
hi aggregation, ek hi scan. Isliye header ka number aur version ke numbers kabhi
aapas me mismatch nahi kar sakte. (Test isi ko pin karta hai.)

⚠️ Switcher row par wo do **flat numbers** hain — `claimCount`, `customerPaid` —
`claims`/`stats` naam se nahi. Ek hi shabd ke neeche kahin number kahin object
hona wahi jaal hai jiske liye `currentVersionNumber` alag naam se aata hai.

**6. ⚠️ `stats.revenue` claim-side figures hain — settlement statement nahi.**

Har number har claim ke **frozen pricing snapshot** se aata hai: bikri ke waqt
kya charge hua aur vendor ka kya bana. Voucher screen ke liye yahi sahi basis hai
— ye "is voucher ne kya kiya" batata hai, chahe wo kisi bhi payout cycle me gaya
ho.

Ye **wo nahi hai jo aapko mila**. Settlement refunds, reserve, commission tax,
chargebacks aur pichhli cycle ka bacha hua — sab cycle ke saare vouchers par net
karta hai; wo record `GET /settlements/*` par hai. Panel me ise "earnings" likhna
ek vendor ke saamne do alag, dono sahi, aur aapas me na milne wale numbers rakh
dega.

⚠️ Revenue me wahi claims ginte hain jinka **paisa actually capture hua** —
`paidAt` set hai. `PENDING` aur `FAILED` kabhi nahi ginte; `REDEEMED`, `EXPIRED`
aur `REFUNDED` ginte hain (paisa aaya tha). `refunded` alag column hai aur
`netCustomerPaid` usse ghata kar aata hai.

**7. Media ka wahi ek shape hai jo #58 ka hai** — `media` object, flat `provider`,
aur `publicId`/`bucket`/`key` kabhi nahi. Wahi `helpers/media/toMediaResponse.js`
dono endpoints ke peechhe hai, isliye do panel screens do spellings nahi seekhti.
Banner bhi wahi `toManagedBanner` shape hai jo upload aur review responses ka hai.

**8. Har entity ki id `_id` hai — ek hi spelling poore response me.** Voucher,
version, outlet, brand, category, offer, image: sab `_id`. Sirf `attachmentId`
alag naam se aata hai, kyunki wo outlet ki id nahi — `VoucherSubBrand` mapping
row ki hai.

**9. `versions` list switcher ke liye hai, uspar arrays nahi aate.** Har row me
status, dates aur `attachedOutletsCount` hai — images/offers nahi. Koi teesri
version poori chahiye to `?versionId=` bhejiye, wo `requestedVersion` me expand
hokar aati hai.

---

## 59. POST /vouchers/:voucherId/banner

Voucher ka promo banner **review ke liye bhejta** hai. **Multipart.**

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership**

### Path Params
| Param | Type | Required |
|---|---|---|
| `voucherId` | ObjectId | ✅ |

### Body (multipart)
| Field | Type | Required | Validation |
|---|---|---|---|
| `media` | file | ⚠️ | 🆕 **Ek hi field name**, chahe image ho, GIF ho ya video. Allowed types aur size cap `Setting.storage` se |
| `poster` | file | ⚠️ | 🆕 **Video par required** — poster image. Baaki par bhejna mana hai nahi, par zarurat bhi nahi |
| `bannerUploadId` | ObjectId 🆕 | ⚠️ | Presigned raasta — purpose `VOUCHER_BANNER` |
| `bannerPosterUploadId` | ObjectId 🆕 | ⚠️ | Uska poster — purpose `VOUCHER_BANNER_POSTER` |

⚠️ `media` **ya** `bannerUploadId` — ek chahiye, dono nahi.

🔴 **Poster ka purpose alag hai.** Ek hi bucket aur `vouchers/<id>` prefix, par
poster 10 MB par capped hai aur video leta hi nahi. Banner ka id poster ki jagah
bhejne par `422`, aur koi upload jalta nahi — dono abhi bhi apni jagah chal
jaayenge.

```
media: <banner.jpg>
```

Video ke liye:

```
media:  <teaser.mp4>
poster: <teaser-cover.jpg>
```

> ### 🔴 `bannerType` ab nahi bhejna — aur teen file field bhi gaye
>
> Pehle payload me `bannerType` jaata tha aur file `bannerImage` / `bannerVideo` /
> `bannerGif` me se kisi ek field me. Yaani client batata tha ki file kya hai, aur
> server jaanchta tha ki dono baatein milti hain ya nahi — **ek sawal ke do jawab**,
> aur stored wala jeet sakta tha. Yahi bug home banner mahino tak rakhta raha.
>
> Ab file `media` me aati hai aur wo kya hai ye uski apni bytes se tay hota hai
> (`media.kind`). GIF isi wajah se `gifs/` prefix me jaata hai, us resize step se
> door jo uski animation flatten kar deta.
>
> **Aapko kya badalna hai:** `bannerType` field hata dijiye, aur teeno file field
> ki jagah `media` use kijiye. Video par poster ab `bannerThumbnail` nahi, `poster`
> hai.

> ### 🆕 Banner ab **seedha live nahi hota** — pehle review hota hai
>
> Ye endpoint banner ko `pending` me daalta hai aur `bannerStatus: PENDING` set
> karta hai. Customer ko wo **tab tak nahi dikhta** jab tak admin approve na kare.
>
> **Purana banner is beech live rehta hai.** Replace karne par jo abhi approved hai
> wo hilta hi nahi — warna vendor ka apna artwork tweak karna uske live offer ka
> banner utaar deta, review queue jitni lambi ho utni der ke liye. Aur us beech
> customer ko ek aisi image dikhti jise kisi ne dekha hi nahi.
>
> Pehli baar banner bhejne par (koi approved banner hai hi nahi) customer ko
> voucher ki **pehli image** dikhti hai — neeche fallback wala note dekhein.

> ### 🔴 Video banner par poster mandatory hai
>
> Poster kabhi derive nahi hota. Cloudinary ka `getOptimizedImageUrl(publicId)`
> `/image/upload/` ka path banata hai ek aise asset ke liye jo `/video/upload/`
> me rehta hai — wo URL **404** deta tha; S3 poster banata hi nahi. Isliye app ko
> video banner par dikhane ko kuch hota hi nahi tha jab tak `.mp4` buffer na ho.
>
> Check **upload se pehle** chalta hai — poster na ho to `422`, aur video ki
> bytes chadhti hi nahi.

> ### 🆕 Size cap ab lagta hai
>
> Banner par **koi size check tha hi nahi** — sirf mime dekha jaata tha, aur 300 MB
> ka `.mp4` seedha nikal jaata tha: upload, storage ka paisa, aur voucher card ke
> sabse upar. Ab global limits lagti hain (`Setting.storage.limits`) — image 10 MB,
> GIF 15 MB, video 50 MB (defaults).

### Success — `200`
```json
{
  "success": true,
  "message": "Voucher banner submitted for review.",
  "data": {
    "voucherId": "68f1a2b3c4d5e6f7a8b9c2a1",
    "banner": {
      "current": null,
      "pending": {
        "url": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/vouchers/banner-451.jpg",
        "kind": "IMAGE",
        "width": 1200,
        "height": 628,
        "mimeType": "image/jpeg",
        "sizeBytes": 184320,
        "originalName": "banner.jpg",
        "provider": "CLOUDINARY"
      },
      "status": "PENDING",
      "rejectionReason": null,
      "reviewedBy": null,
      "reviewedAt": null
    }
  }
}
```

> ⚠️ **`banner` ka shape poora badal gaya hai.** Pehle `{ type, image, video, gif }`
> tha; ab `{ current, pending, status, rejectionReason, reviewedBy, reviewedAt }`.
> `current` wahi hai jo customer ko dikhta hai (hamesha approved), `pending` wo jo
> review me hai.
>
> 🔴 **Response ab `{ voucherId, banner }` hai — poora voucher nahi.**
> Code `return voucher;` kar raha tha, yaani `normalizedName`, `createdBy`,
> `updatedBy`, `timezone`, `deleteReason` aur model ka har column — jabki ye doc
> shuru se `{ voucherId, banner }` hi bata raha tha. Ab dono milte hain.
>
> 🔴 **`storage` ab nahi aata; uski jagah flat `provider` hai.** Yahan pehle
> likha tha ki *"vendor ka apna write response hai, isliye `storage` aata hai"* —
> wo ye samjhata tha ki khatra kyun nahi hai, ye nahi ki **zarurat kyun hai**.
> Vendor se `publicId` kabhi maanga hi nahi jaata (file `uploadId` se attach hoti
> hai), to wo field sirf sajawat thi — us ek response par jahan locator bhoolna
> sabse aasaan hai. Ab teeno banner surfaces — ye upload, admin ka review, aur
> version listing — **ek hi `toManagedBanner` se** guzarte hain.
>
> ⚠️ Banner-less voucher par ab `image: {}`, `video: {}`, `gif: {}` **nahi** aate —
> pehle teeno khaali object har voucher par likhe jaate the (P9). Jis slot me
> kuch nahi hai wo `null` aata hai.

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Voucher not found.` | |
| `422` | 🆕 `Please attach the banner file as "media", or send its upload as "bannerUploadId".` | File hi nahi aayi. **Text badla 2026-10-07** — pehle sirf `"media"` kehta tha, presigned field ka naam nahi |
| `422` | 🆕 `A voucher banner has to be an image, a GIF or a video — "<mime>" is none of those.` | PDF wagairah |
| `422` | 🆕 `<file> is not a supported format — expected one of: …` | Mime allow-list me nahi |
| `422` | 🆕 `<file> exceeds the maximum size of 50 MB.` | Size cap — pehle koi cap tha hi nahi |
| `422` | `A video banner needs a poster image. Attach one as "poster", or send its upload as "bannerPosterUploadId".` | Video bheja, poster nahi. **Text badla 2026-10-07** |
| `422` | `The poster has to be a still image — "<mime>" is not one.` | Poster ki jagah video/gif |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | |

### ⚠️ Notes

**1. Version/approval flow se alag hai** — ye master-level banner hai, voucher ke version se koi lena-dena nahi. Published voucher ka banner bhi kabhi bhi bheja ja sakta hai, bina naya version banaye. Par ab uska **apna** review hai.

**2. 🆕 Purana banner tabhi delete hota hai jab wo bhi pending tha.** Do baar bina review ke bhejein to pehli file kisi ne dekhi hi nahi aur koi use point nahi karta, to wo hat jaati hai. **`current` kabhi nahi chhua jaata** — jo live hai wo live rehta hai.

**3. 🔴 `DELETE /vouchers/:voucherId/banner` hata diya gaya hai.** Banner ka slot ab kabhi khali nahi hota: approved banner na ho to customer ko voucher ki pehli image dikhti hai. "Mera banner hata do" ab ek state hi nahi hai — badalna ho to naya bhej dijiye.

**3a. 🆕 Banner ab submit-for-review ke liye zaruri hai (#56).** Bina banner ke voucher submit nahi hota. Publish par ye rok **nahi** hai — banner submit ke baad reject bhi ho sakta hai, aur ek poore approved voucher ko uske artwork ke faisle par rokna galat hoga. Fallback isiliye hai.

**4. Reject hone par kya hota hai** — voucher **PUBLISHED hi rehta hai**. Customer ko pehli image dikhti hai, aur aapko `bannerStatus: REJECTED` ke saath `rejectionReason` milta hai. Naya banner bhejte hi wo reason clear ho jaata hai — purana faisla nayi file par nahi chipkta.

**5. Ye voucher ke `images` se alag hai** — `images` version ka hissa hain (approval flow me), banner master-level hai.

---

## ~~60. DELETE /vouchers/:voucherId/banner~~ — 🔴 hata diya gaya

Ye endpoint ab maujood nahi hai. Number jaan-bujh kar khali chhoda hai taaki 61 se aage ke saare section numbers wahi rahein jo purane links aur tickets me likhe hain.

Banner "hatane" ka koi matlab nahi raha: slot kabhi khali nahi hota, approved banner na ho to customer ko voucher ki pehli image dikh jaati hai (#59). Badalna ho to naya bhej dijiye — wo purane ko khud replace kar dega.

---

# Brand Feature APIs

## 61. POST /brandFeatures/add

**Multipart** (icon mandatory).

**Access:** Vendor (apna brand) + Admin · **VENDOR+ADMIN**, ownership verified ✅

### Body (multipart)
| Field | Type | Required | Default | Validation |
|---|---|---|---|---|
| `brandId` | ObjectId | ✅ | – | Body me — token se resolve nahi hota |
| `title` | string | ✅ | – | 2–150 chars |
| `icon` | file | ⚠️ | – | **Multipart**, field name `icon` |
| `iconUploadId` | ObjectId 🆕 | ⚠️ | – | Presigned — purpose `BRAND_FEATURE_ICON`. `icon` ke saath **nahi** |

⚠️ Dono me se ek zaroori hai. 🔴 Das-feature ki seemaa **upload se pehle** check hoti hai, to bhari hone par aapka upload bacha rehta hai.
| `description` | string | ❌ | – | Max 500 chars, `""` allowed |
| `isActive` | boolean\|string | ❌ | `true` | |

```
brandId:     68f1a2b3c4d5e6f7a8b9c3a1
title:       Free WiFi
description: High speed internet for all guests
icon:        <file>
isActive:    true
```

### Success — `200`
```json
{
  "success": true,
  "message": "Brand feature added successfully",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c6a1",
    "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
    "title": "Free WiFi",
    "description": "High speed internet for all guests",
    "icon": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/features/wifi.png",
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-08-22T18:30:00.000Z"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Brand not found!` | `brandId` galat ya deleted |
| `400` | `A brand can have maximum <N> active features!` · 🆕 `details.code: FEATURE_LIMIT`, `details.limit` | P8 (D84): `N` = setting `vendor.brandFeatures.maxActive` (default 10) — panel hardcode na kare |
| `400` | `Feature icon is required!` | File nahi bheji |
| `500` | `Failed to upload feature icon!` | Cloudinary fail |
| `422` | `Brand ID is required` / `Invalid Brand ID format` | |
| `422` | `Feature title is required` / `Feature title must be at least 2 characters` | |
| `422` | `Feature title cannot exceed 150 characters` | |
| `422` | `Feature description cannot exceed 500 characters` | |

### ⚠️ Notes

**1. 10-limit sirf active features pe hai.** `isActive: false` wale count nahi hote. 10 ho jaayein to kisi ko deactivate karke naya add kar sakte hain.

**2. `brandId` body me mandatory hai** — token se resolve nahi hota, par ✅ ab
`resolveActorBrand` se **verify** hota hai: vendor sirf apna brand naam de sakta
hai, admin koi bhi. Pehle koi bhi authenticated user kisi bhi brand me feature
jod sakta tha.

**3. Icon mandatory hai** — bina icon ke feature nahi banta.

**4. `title` lowercase me store nahi hota** — jaisa bhejo waisa rehta hai (baaki modules se different).

---

## 62. GET /brandFeatures/get-all

**Access:** Intended: All roles · Enforced: **Public** — token ki zarurat nahi (guest bhi)

### Query Params
| Param | Type | Required | Default | Validation |
|---|---|---|---|---|
| `brandId` | ObjectId | ✅ | – | **Mandatory** |
| `page` | number | ❌ | `1` | Integer ≥ 1 |
| `limit` | number | ❌ | `10` | Integer 1–100 |
| `search` | string | ❌ | – | `title` + `description` me match |
| `title` | string | ❌ | – | Sirf `title` me |
| `isActive` | boolean\|string | ❌ | – | |
| `fromDate` · `toDate` | ISO date | ❌ | – | |
| `sortBy` | string | ❌ | `createdAt` | `title` \| `createdAt` \| `updatedAt` \| `isActive` |
| `sortOrder` | string | ❌ | `desc` | `asc` \| `desc` |

```http
GET /brandFeatures/get-all?brandId=68f1a2b3c4d5e6f7a8b9c3a1&limit=20
```

### Success — `200`
```json
{
  "success": true,
  "message": "Brand features fetched successfully",
  "data": {
    "total": 4,
    "totalPages": 1,
    "page": 1,
    "limit": 20,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9c6a1",
        "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
        "title": "Free WiFi",
        "description": "High speed internet for all guests",
        "icon": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/features/wifi.png",
        "isActive": true,
        "createdAt": "2026-08-22T18:30:00.000Z",
        "updatedAt": "2026-08-22T18:30:00.000Z"
      }
    ]
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Brand not found!` | brandId galat — **real error** |
| `404` | `No any brandfeature found` | Brand sahi, features nahi — **empty-state** |
| `422` | `Brand ID is required` / `Invalid Brand ID format` | |

### ⚠️ Notes

**1. Do alag 404 messages hain** aur matlab alag hai:
- `"Brand not found!"` → brandId galat, real error dikhayein
- `"No any brandfeature found"` → empty-state dikhayein

**2. Vendor panel me `isActive` filter na lagayein** — vendor ko apne inactive features bhi dikhne chahiye (manage karne ke liye). Customer app `isActive=true` bhejta hai.

**3. Ye endpoint customer ko bhi khula hai** — brand profile page ke liye by design.

---

## 63. GET /brandFeatures/get/:featureId

**Access:** Intended: All roles · Enforced: **Public** — token ki zarurat nahi (guest bhi)

### Path Params
| Param | Type | Required |
|---|---|---|
| `featureId` | ObjectId | ✅ |

### Success — `200`
```json
{
  "success": true,
  "message": "Brand feature fetched successfully",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c6a1",
    "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
    "title": "Free WiFi",
    "description": "High speed internet for all guests",
    "icon": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/features/wifi.png",
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-08-22T18:30:00.000Z",
    "updatedAt": "2026-08-22T18:30:00.000Z"
  }
}
```

### Errors
| Status | Message |
|---|---|
| `404` | `Brand feature not found!` |
| `422` | `Feature ID is required` / `Invalid Feature ID format` |

### ⚠️ Note
Practically vendor panel me shayad na chahiye — `get-all` (#62) me poora data aa jaata hai.

---

## 64. PUT /brandFeatures/update/:featureId

**Access:** Vendor (apna brand) + Admin · **VENDOR+ADMIN**, ownership verified ✅

### Path Params
| Param | Type | Required |
|---|---|---|
| `featureId` | ObjectId | ✅ |

### Body — sab optional
| Field | Type | Validation |
|---|---|---|
| `title` | string | 2–150 chars |
| `description` | string | Max 500, `""` allowed |
| `isActive` | boolean\|string | – |
| `icon` | file | **Multipart** — replace karne ke liye |
| `iconUploadId` | ObjectId 🆕 | Presigned — purpose `BRAND_FEATURE_ICON` |

```json
{ "description": "High speed fibre internet, free for all guests", "isActive": true }
```

### Success — `200`
```json
{
  "success": true,
  "message": "Brand feature updated successfully",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c6a1",
    "title": "Free WiFi",
    "description": "High speed fibre internet, free for all guests",
    "isActive": true,
    "updatedAt": "2026-08-22T18:40:00.000Z"
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | 🆕 Feature kisi aur brand ka hai |
| `404` | `Brand feature not found!` | 🆕 Pehle yahan **500** aata tha |
| `400` | `A brand can have maximum <N> active features!` · 🆕 `details.code: FEATURE_LIMIT` | Pehle yahan **500** aata tha. P8: `N` setting se (`vendor.brandFeatures.maxActive`, default 10) |
| `422` | `Feature title must be at least 2 characters` | |
| `422` | `Invalid Feature ID format` | |

### ⚠️ Notes

**1. `isActive: false` → `true` karne pe 10-limit check hota hai.** Agar already 10 active hain to `400` aayega.

**2. Icon replace karne pe purana delete hota hai** (us row ke apne provider se). Ownership check **upload se pehle** chalta hai, to refuse hui request kuch upload nahi karti aur purana icon chhuta nahi.

**3. ✅ Ownership ab enforce hoti hai.** Feature ka `brandId` caller ke brand se match karna chahiye (admin koi bhi). Pehle sirf `featureId` se uthaya jaata tha.

**4. 🆕 `isActive: false` ab sach me kaam karta hai.** Pehle JSON me boolean `false` bhejne par response `200 "updated successfully"` aata tha aur **kuch badalta nahi tha** — feature brand profile par live rehta tha. Multipart form se (`"false"` string) chalta tha, isliye panel me kabhi nahi dikha. Dono ab ek jaise hain.

---

## 65. DELETE /brandFeatures/delete/:featureId

**Access:** Vendor (apna brand) + Admin · **VENDOR+ADMIN**, ownership verified ✅

### Path Params
| Param | Type | Required |
|---|---|---|
| `featureId` | ObjectId | ✅ |

### Success — `200`
```json
{ "success": true, "message": "Brand feature deleted successfully", "data": { "_id": "…", "isDeleted": true } }
```

### Errors
| Status | Message |
|---|---|
| `403` | 🆕 `Forbidden: You do not have permission to perform this action on this brand.` |
| `404` | `Brand feature not found!` |
| `422` | `Feature ID is required` / `Invalid Feature ID format` |

### ⚠️ Notes

**1. Soft delete hai** — `isDeleted: true`.
**2. Sirf hide karna ho to `isActive: false` (#64) behtar hai** — 10-limit se bhi bahar ho jaata hai aur wapas la sakte hain.
**3. ✅ Ownership ab enforce hoti hai.** Record soft-delete hota hai par uska **icon Cloudinary se permanently hat jaata hai** — wo wapas nahi aata. Pehle koi bhi vendor kisi bhi brand ka feature ek-ek id karke mita sakta tha.

---

# Subscription Plan APIs

Available plans browse karne ke liye. Plans **admin** banata hai — vendor sirf padh sakta hai.

## 66. GET /subscriptions/getAll

**Access:** Intended: Vendor + Admin · Enforced: **Any authenticated** (`verifyJwtToken`) — 🔧 (2026-10-26, live 2026-11-04) admin ke alawa sabko sirf **on-sale** plans (`isActive: true`); `isActive` filter sirf admin ka

### Query Params
| Param | Type | Required | Default | Validation |
|---|---|---|---|---|
| `page` | number | ❌ | `1` | Integer ≥ 1 |
| `limit` | number | ❌ | `10` | Integer ≥ 1 |
| `search` | string | ❌ | – | `""` allowed. Plain text — naam / description me, case-insensitive (🔧 2026-10-26: regex nahi; `(` par pehle `500` aata tha) |
| `type` | string | ❌ | – | `WEEKLY` \| `MONTHLY` \| `QUARTERLY` \| `HALF_YEARLY` \| `YEARLY` \| `CUSTOM` (purana `QUATERLY` bhi chalta hai) |
| `isActive` | boolean\|string | ❌ | – | `true` / `false` — 🔧 sirf admin ke liye maana jaata hai; vendor ko hamesha on-sale plans |
| `sortBy` | string | ❌ | – | `price` \| `name` \| `createdAt` |
| `sortOrder` | string | ❌ | – | `asc` \| `desc` |

```http
GET /subscriptions/getAll?isActive=true&sortBy=price&sortOrder=asc&limit=20
```

### Success — `200`
```json
{
  "success": true,
  "message": "Subscriptions fetched",
  "data": {
    "total": 3,
    "totalPages": 1,
    "page": 1,
    "limit": 20,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9k001",
        "name": "BASIC",
        "image": "https://cdn.trydood.com/images/subscription-plans/68f1a2b3c4d5e6f7a8b9k001/4c2a.png",
        "tier": 1,
        "isTrial": false,
        "type": "MONTHLY",
        "typeLabel": "Monthly",
        "durationValue": 1,
        "durationUnit": "MONTH",
        "durationLabel": "1 month",
        "price": 999,
        "discountType": "PERCENT",
        "discountPercent": 10,
        "discountedPrice": 899.1,
        "entitlements": {
          "subBrands": { "limit": 3, "isUnlimited": false },
          "franchises": { "limit": 0, "isUnlimited": false },
          "vouchers": { "limit": 0, "isUnlimited": true },
          "showcase": { "limit": 5, "isUnlimited": false },
          "dealPack": { "isEnabled": false },
          "prioritySupport": { "isEnabled": false }
        },
        "features": [
          { "title": "Outlets", "value": "3", "available": true },
          { "title": "Vouchers", "value": "Unlimited", "available": true },
          { "title": "Priority Support", "value": "No", "available": false }
        ],
        "benefits": ["Listing on customer app", "Basic analytics"],
        "isActive": true,
        "createdAt": "2026-04-01T00:00:00.000Z"
      }
    ]
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `No any subscription found` | Empty — **empty-state** |
| `422` | *(Joi message)* | Invalid `type`/`sortBy` |

### ⚠️ Notes

**1. `entitlements` structured hai aur enforce hota hai** — plan card pe yahi dikhana chahiye. `features[]` free-text hai, **sirf display ke liye**.

> Validator ka comment: *"Fixed key set on purpose … so an admin cannot invent a key that silently enforces nothing. This is what the gates read — `features[]` below stays free-text and display-only."*

**2. `isUnlimited: true` ho to `limit` ignore hota hai** — UI me "Unlimited" dikhayein.

**3. Plan card: `price` kaat kar dikhayein, `discountedPrice` bada** — "~~₹999~~ ₹899.10". `discountedPrice` plan ki apni discount ke baad ki price hai (promo aur GST se pehle), server price + discount se khud nikalta hai — checkout ka `taxableValue` isi se shuru hota hai. `strikePrice` ab **nahi aata**; wo haath se likha "was ₹X" tha.

**4. `isActive=true` bhejein** — retired plans na dikhein.

**5. Plan chunne ke baad `POST /transactions/subscribe/preview` (#70) call karein** — actual payable amount (tax + promo ke saath) wahan se milta hai, `price` field se nahi.

**6. `image` — plan card ki picture, URL ya `null`.** Admin apne alag endpoint se lagata / badalta / hatata hai; vendor sirf padhta hai. Storage ki details (`bucket`, `key`) kabhi nahi aati. `null` ho to card apna default dikhaye.

**7. Plan card par period `typeLabel` se dikhayein, length `durationLabel` se.** Plan 3 din se 15 saal tak kuch bhi ho sakta hai (`durationValue` + `durationUnit`); `type` sirf label hai — `CUSTOM` plan ka `typeLabel` uski length hota hai ("18 Months", "3 Days"). `durationInDays` ab response me nahi aata.

**8. `tier` — plan ka rank (Basic 1, Pro 2, …), admin set karta hai.** Upgrade / downgrade isi se tay hota hai, price se nahi (dekhein [SUBSCRIPTION_ACTION](#subscription_action--checkout-pe-kya-ho-raha-hai)). Plans ko tier se group karke, har group me alag lengths dikha sakte hain. Purane plan par tier na ho to `null` ya missing — backfill ke baad sab par hoga.

**9. `isTrial: true` — free trial** (price ₹0). Sirf bina plan wale brand ke liye, aur ek brand ko **ek hi baar, hamesha**. Card par "Free trial" dikhayein; checkout me `requiresPayment: false` aata hai. Brand pehle trial le chuka ho to preview `blockedReason` deta hai — card chhupa sakte hain.

**10. 🆕 `featureValues`** — plan ki values admin ke feature master ke liye (`[{ key, value }]`). Labels, order aur default ke saath poori table ke liye #67b (compare) use karein — wahan har cell `display` ready hai.

---

## 67. GET /subscriptions/get/:id

**Access:** Intended: Vendor + Admin · Enforced: **Any authenticated** (`verifyJwtToken`) — 🔧 (2026-10-26, live 2026-11-04) inactive plan vendor ko `404 "Subscription not found"`; apna current plan `GET /subscribeds/get` se (on sale ho ya na ho)

### Path Params
| Param | Type | Required |
|---|---|---|
| `id` | ObjectId | ✅ |

### Success — `200`
```json
{
  "success": true,
  "message": "Subscription fetched",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9k001",
    "name": "BASIC",
    "image": "https://cdn.trydood.com/images/subscription-plans/68f1a2b3c4d5e6f7a8b9k001/4c2a.png",
    "tier": 1,
    "type": "MONTHLY",
    "typeLabel": "Monthly",
    "durationValue": 1,
    "durationUnit": "MONTH",
    "durationLabel": "1 month",
    "price": 999,
    "discountType": "PERCENT",
    "discountPercent": 10,
    "discountedPrice": 899.1,
    "entitlements": { "subBrands": { "limit": 3, "isUnlimited": false } },
    "features": [ ],
    "benefits": [ ],
    "isActive": true,
    "isDeleted": false
  }
}
```

### Errors
| Status | Message |
|---|---|
| `404` | `Subscription not found` |
| `422` | *(invalid ObjectId)* |

---

## 67b. GET /subscriptions/compare 🆕

Plans ki **comparison table** — "kaunse plan me kya milta hai" screen. Frontend koi hisaab nahi karta.

**Access:** Intended: Vendor + Admin · Enforced: **Any authenticated**

Query koi nahi (`includeInactive` sirf admin ke liye maana jaata hai).

### Success — `200` *(Postman capture, seeded DB)*
```json
{
  "success": true,
  "message": "Plan comparison fetched",
  "data": {
    "columns": [
      {
        "planId": "68f1a2b3c4d5e6f7a8b9k002",
        "name": "postman seed pro",
        "tier": 2,
        "type": "YEARLY",
        "typeLabel": "Yearly",
        "durationValue": 1,
        "durationUnit": "YEAR",
        "durationLabel": "1 year",
        "price": 4999,
        "discountedPrice": 4999,
        "isTrial": false,
        "image": null
      }
    ],
    "groups": ["Limits", "Included"],
    "rows": [
      {
        "key": "subBrands",
        "kind": "LIMIT",
        "isSystem": true,
        "label": "Outlets",
        "description": "",
        "unit": "",
        "group": "Limits",
        "sortOrder": 10,
        "cells": [
          { "planId": "68f1a2b3c4d5e6f7a8b9k002", "raw": { "limit": 10, "isUnlimited": false }, "display": "10", "isIncluded": true }
        ]
      },
      {
        "key": "vouchers",
        "kind": "LIMIT",
        "isSystem": true,
        "label": "Vouchers",
        "group": "Limits",
        "sortOrder": 30,
        "cells": [
          { "planId": "68f1a2b3c4d5e6f7a8b9k002", "raw": { "limit": 0, "isUnlimited": true }, "display": "Unlimited", "isIncluded": true }
        ]
      }
    ]
  }
}
```
*(Chhe enforced rows hamesha — Outlets, Franchises, Vouchers, Showcase sections, Deal pack, Priority support — phir admin ke display features. Yahan do dikhayi.)*

### Kaise render karein
- `columns` = table ke columns, isi order me (tier, phir length).
- Har `rows[i].cells[j]` = `columns[j]` ka cell. `display` seedha likho: `"10"` · `"Unlimited"` · `"✓"` · `"—"` (plan me nahi) · text.
- `isIncluded: false` ko grey / strike dikha sakte hain.
- `groups` = section headers, isi order me.

### ⚠️ Notes

**1. Enforced rows wahi dikhate hain jo sach me lagta hai** — gate jo limit enforce karta hai, wahi number. `features[]` ka free text nahi.

**2. Sirf bikne wale plans** (`isActive`). Vendor ka apna chalu plan band ho gaya ho to wo yahan nahi dikhega — uski limits dashboard (#68) par hain.

---

## 67a. GET /promoCodes/vendor/get-all 🆕

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership**

Wo promo codes jo is brand ko plan kharidte waqt mil sakte hain. Har row batati hai **laga sakte ho ya nahi**, nahi to **kyun nahi**, aur — plan chuna ho to — **kitna bachega**.

Ye wahi gate hai jo `POST /transactions/subscribe/preview` (#70) par hai: jo admin kisi brand ke liye purchase preview kar sakta hai, wo usi brand ke codes bhi dekh sakta hai. Brand khud `resolveActorBrand` se tay hota hai — vendor apne alawa kisi ka nahi padh sakta.

### Query Params
| Param | Type | Required | Notes |
|---|---|:---:|---|
| `page` · `limit` | number | ❌ | `limit` max **50**, default 20 |
| `subscriptionId` | ObjectId | ❌ | Plan ke against price karne ke liye |
| `brandId` | ObjectId | ⚠️ | **Vendor ke liye optional** (token se), **admin ke liye required** |

### Do tareeke se poocho

| Kaise | Kya milta hai |
|---|---|
| **Sirf list** | Catalogue: code, headline, terms, aapke brand ki usage. `savings` **`null`** |
| **`subscriptionId` ke saath** | Upar ka sab, **plus** asli `savings`, aur wo gates jo plan maangte hain — minimum order value, plan scope, aur **action scope** |

> ⚠️ **`action` aap nahi bhejte, wo nikalta hai.** Jo code sirf renewal par valid hai use pata hona chahiye ki ye renewal hai — aur wo brand ke **current plan** se tay hota hai, na ki request se. Isliye `subscriptionId` dete hi wahi `buildCheckoutPreview` chalta hai jo checkout chalata hai, aur NEW/RENEW/UPGRADE/DOWNGRADE wahin se aata hai.
>
> ⚠️ **Isi wajah se ye GET kabhi-kabhi likhta bhi hai.** `getActiveSubscription` `heal: true` par chalta hai: jo `Subscribed` row apni `endDate` guzarne ke baad bhi ACTIVE keh rahi ho, wo wahin EXPIRED ho jaati hai. Repair skip karte to stale row live dikhti, `action` `RENEW` aata jabki sach `NEW` hai, aur `["NEW"]` par scoped code usi vendor ko unusable dikhta jiske liye likha gaya tha — jabki ek click baad checkout wahi row heal karke usi code ko accept kar leta.

### Response — `200`

```jsonc
{
  "success": true,
  "message": "Promo codes fetched successfully",
  "data": {
    "isEnabled": true,                  // Setting.vendor.subscription.isPromoCodeEnabled
    "context": {                        // subscriptionId diya ho tab; warna null
      "subscriptionId": "68f…k001",
      "planName": "Gold",
      "action": "RENEW",
      "taxableValue": 8000
    },
    "total": 2, "totalPages": 1, "page": 1, "limit": 20,
    "data": [
      {
        "_id": "690…b22",
        "code": "MONSOON20",
        "headline": "20% OFF up to ₹2,000",
        "description": "Monsoon offer — kisi bhi plan par",
        "discountType": "PERCENT",
        "discountPercent": 20,
        "discountAmount": 0,
        "maxDiscountAmount": 2000,
        "minOrderValue": 5000,
        "applicableActions": ["NEW", "RENEW"],
        "firstTimeOnly": false,
        "validFrom": null,
        "validTill": "2026-10-31T18:29:59.999Z",
        "usage": { "perBrandLimit": 1, "usedByYourBrand": 0, "usesLeft": 1 },
        "terms": [
          "Valid on plans priced ₹5,000 or more, after the plan's own discount.",
          "Maximum discount of ₹2,000.",
          "Valid till 31 Oct 2026.",
          "Can be used once per brand.",
          "Valid on Gold, Platinum.",
          "Valid on a new subscription, a renewal."
        ],
        "isApplicable": true,
        "reason": null,
        "savings": { "discount": 1600, "base": 8000 }
      },
      {
        "code": "FIRSTPLAN",
        "isApplicable": false,
        "reason": "This promo code is only valid on a first subscription purchase.",
        "savings": null
      }
    ]
  }
}
```

### `terms` **banaye** jaate hain

Har line code ke apne field se nikalti hai. Haath se likhi term `₹3,000` keh sakti hai jab code `₹5,000` enforce karta ho — aur kahin kuch galat nahi dikhta, rejection checkout par aata hai. `PromoCode.termsAndConditions` sirf un baaton ke liye hai jo kisi field me express hi nahi hoti, aur wo derived lines ke **baad** aati hain.

### ⚠️ Jo is response me kabhi nahi aayega

| Field | Kyun |
|---|---|
| `costBearing` | Discount kaun bhar raha hai. Vendor ko ye batana platform ka margin batana hai |
| `usedCount` · `totalUsageLimit` | Campaign ka size aur burn rate |
| `isPublic` · `createdBy` · `isDeleted` | Internal state |

`usage` sirf **aapke brand** ka hai — `usedByYourBrand`, `usesLeft`. Kisi doosre brand ki usage isme nahi ginti, aur RESERVED bhi ginti hai (khula hua order bhi kharch hai).

### ⚠️ Jo list me nahi hai, wo bhi chal sakta hai

Listing sirf `isPublic: true` codes deti hai. Jo code seedhe aapko bheja gaya ho wo list me nahi aayega aur `subscribe/preview` me type karne par chalega. Khatam/expire/abhi-shuru-nahi wale codes list me aate hi nahi; jo live hain par abhi nahi lag sakte wo `isApplicable: false` + `reason` ke saath dikhte hain.

### Kram

Jo lag sakte hain wo pehle, unme sabse zyada bachat wala upar — **page ke andar**.

### Errors
| Status | Message |
|---|---|
| `403` | Doosre brand ka `brandId` bheja |
| `404` | `Subscription plan not found!` · `Brand not found!` |
| `422` | Admin ne `brandId` nahi bheja · invalid ObjectId · `limit` > 50 |

> `isEnabled: false` error nahi hai — `data: []` aur ek `message`.

### Apply kaise hota hai

Ye endpoint kuch apply nahi karta. Code uthao aur `POST /transactions/subscribe/preview` (#70) ya `create-order` (#71) ke `promoCode` field me bhejo. Wahan wahi niyam chalte hain jo yahan `isApplicable` decide karte hain, isliye list aur checkout kabhi alag jawab nahi de sakte.

---

# My Subscription APIs

Vendor ki apni subscription state. `resolveActorBrand` se scoped.

## 68. GET /subscribeds/get

Current subscription + entitlements + usage — **vendor dashboard ka main call**.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership**

### Query Params
| Param | Type | Required | Notes |
|---|---|---|---|
| `brandId` | ObjectId | ❌ | **Vendor ke liye optional** (token se). Admin ke liye **required** |

```http
GET /subscribeds/get
```

### Success — `200` (active plan hai)
```json
{
  "success": true,
  "message": "Brand subscription details fetched successfully",
  "data": {
    "brand": {
      "_id": "68f1a2b3c4d5e6f7a8b9c3a1",
      "brandName": "cafe mocha",
      "isSubscribed": true
    },
    "isSubscribed": true,
    "subscription": {
      "_id": "68f1a2b3c4d5e6f7a8b9f001",
      "status": "ACTIVE",
      "source": "PAYMENT",
      "isFreeGrant": false,
      "startDate": "2026-08-22T00:00:00.000Z",
      "endDate": "2026-09-22T00:00:00.000Z",
      "daysRemaining": 30,
      "durationValue": 1,
      "durationUnit": "MONTH",
      "durationLabel": "1 month",
      "termDays": 31,
      "tier": 1,
      "isTrial": false,
      "creditGiven": 0,
      "extraDays": 0,
      "paidAmount": 1060.94,
      "pricing": {
        "currency": "INR",
        "listPrice": 999,
        "discountType": "PERCENT",
        "discountPercent": 10,
        "discountAmount": 99.9,
        "promoCode": null,
        "promoDiscount": 0,
        "prorationCredit": 0,
        "taxableValue": 899.1,
        "gstPercentage": 18,
        "isGstInclusive": false,
        "taxType": "CGST_SGST",
        "cgst": 80.92,
        "sgst": 80.92,
        "igst": 0,
        "gstAmount": 161.84,
        "hsnSacCode": "998315",
        "placeOfSupplyStateCode": "23",
        "placeOfSupplyState": "Madhya Pradesh",
        "roundOff": 0,
        "totalPayable": 1060.94,
        "amountInPaise": 106094,
        "youSaved": 99.9
      },
      "transactionId": "68f1a2b3c4d5e6f7a8b9m001",
      "plan": {
        "_id": "68f1a2b3c4d5e6f7a8b9k001",
        "name": "BASIC",
        "image": "https://cdn.trydood.com/images/subscription-plans/68f1a2b3c4d5e6f7a8b9k001/4c2a.png",
        "type": "MONTHLY",
        "tier": 1,
        "typeLabel": "Monthly",
        "durationValue": 1,
        "durationUnit": "MONTH",
        "durationLabel": "1 month",
        "price": 999,
        "discountedPrice": 899.1,
        "features": [ ],
        "benefits": [ ]
      }
    },
    "queuedSubscription": {
      "_id": "68f1a2b3c4d5e6f7a8b9f002",
      "status": "SCHEDULED",
      "startDate": "2026-09-22T00:00:00.000Z",
      "endDate": "2027-09-22T00:00:00.000Z",
      "durationValue": 1,
      "durationUnit": "YEAR",
      "durationLabel": "1 year",
      "termDays": 365,
      "tier": 2,
      "paidAmount": 5898.82,
      "transactionId": "68f1a2b3c4d5e6f7a8b9m002",
      "plan": { "_id": "68f1a2b3c4d5e6f7a8b9k002", "name": "PRO", "tier": 2, "…": "same shape as subscription.plan" }
    },
    "lastSubscription": null,
    "entitlements": {
      "subBrands": { "limit": 3, "isUnlimited": false },
      "franchises": { "limit": 0, "isUnlimited": false },
      "vouchers": { "limit": 20, "isUnlimited": false },
      "showcase": { "limit": 5, "isUnlimited": false },
      "dealPack": { "isEnabled": false },
      "prioritySupport": { "isEnabled": false }
    },
    "entitlementsSource": "DB",
    "entitlementsFrozen": true,
    "entitlementWarnings": [],
    "usage": {
      "subBrands":  { "used": 3, "limit": 3,  "isUnlimited": false, "overflowBy": 0 },
      "franchises": { "used": 0, "limit": 0,  "isUnlimited": false, "overflowBy": 0 },
      "vouchers":   { "used": 4, "limit": 20, "isUnlimited": false, "overflowBy": 0 },
      "showcase":   { "used": 2, "limit": 5,  "isUnlimited": false, "overflowBy": 0 },
      "syncedAt": "2026-08-22T00:00:05.000Z"
    },
    "totalSubscriptions": 2
  }
}
```

### Success — `200` (koi active plan nahi)
```json
{
  "success": true,
  "message": "Brand subscription details fetched successfully",
  "data": {
    "brand": { "_id": "…", "brandName": "cafe mocha", "isSubscribed": false },
    "isSubscribed": false,
    "subscription": null,
    "lastSubscription": {
      "_id": "68f1a2b3c4d5e6f7a8b9f000",
      "status": "EXPIRED",
      "endDate": "2026-07-21T23:59:59.000Z",
      "subscriptionId": "68f1a2b3c4d5e6f7a8b9k001"
    },
    "entitlements": null,
    "entitlementsSource": null,
    "entitlementsFrozen": null,
    "entitlementWarnings": [],
    "usage": { "subBrands": { "used": 3, "limit": 0, "isUnlimited": false, "overflowBy": 3 } },
    "totalSubscriptions": 1
  }
}
```

> ✅ Empty pe **404 nahi** — `subscription: null` aata hai. `lastSubscription` se "expired on …" dikha sakte hain.

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `No brand is linked to your account` | Vendor ka brand nahi |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | Dusre brand ka `brandId` |
| `422` | `brandId is required when acting as an admin` | Admin ne `brandId` nahi diya |
| `422` | `Invalid brandId` | Format |

### ⚠️ Edge cases & notes

**1. Ye vendor dashboard ka single source of truth hai** — plan, dates, entitlements, usage sab ek call me. "3 of 10 outlets used" render karne ke liye alag lookup ki zarurat nahi.

**2. `isSubscribed` yahan **live computed** hai** (`ACTIVE && endDate > now`, ya shuru ho chuka queued plan), `brand.isSubscribed` cache se nahi. Ispe bharosa karein.

**3. Self-healing hai** — agar koi doc `ACTIVE` claim kare par expire ho chuka ho, ye call use expire karke tab jawab deta hai; aur queued plan ka start aa gaya ho to use `ACTIVE` karke wahi `subscription` me dikhata hai.

**3b. `subscription.creditGiven` / `extraDays` / `isTrial`** — pichhle plan ki kitni value is plan me aayi (credit), usse kitne din jude (`endDate` me already shamil), aur ye trial hai ya nahi.

**3a. `queuedSubscription`** — chalu plan ke peeche queued plan (`mode: AFTER_CURRENT`), ya `null`. "Next plan: PRO, starts 22 Sep 2026" dikhane ke liye. `plan` block `subscription.plan` jaisa hi hai. Shuru hote hi ye `subscription` ban jaata hai aur ye `null`.

**4. `usage[bucket].limit: null` matlab unlimited** — UI me "∞" ya "Unlimited" dikhayein.

**5. `overflowBy` grandfathered downgrade ke baad positive hota hai** — jaise 5 outlets the aur plan 3 ka ho gaya. Existing outlets chalte rehte hain, par naye nahi ban sakte. UI me warning dikhayein.

**6. `entitlementsSource` batata hai limits kahan se aaye:**
| Value | Matlab |
|---|---|
| `DB` | Plan ka structured `entitlements` — sahi case |
| `DERIVED` | Legacy free-text `features[]` se parse kiya |
| `DEFAULT` | Kuch samajh nahi aaya, conservative fallback laga |

`DERIVED` ya `DEFAULT` ho to admin ko us plan ko theek karna chahiye. `entitlementWarnings` me detail hoti hai.

**6a. 🔒 `entitlements` = is term ki frozen limits** — jo aapne khareeda, plan aaj jo bhi kahe. `entitlementsFrozen: true` = kharidte waqt freeze · `false` = purani (freeze se pehle ki) purchase jo abhi plan ki live limits padhti hai · `null` = koi active plan nahi. Admin plan ki nayi limits aapke term par lagaye to ye badalte hain aur `SUBSCRIPTION_TERMS_UPDATED` notification + `PLAN_TERMS_APPLIED` history row aata hai.

**7. `daysRemaining` ready hai** — renewal reminder dikhane ke liye. Backend bhi `[7, 3, 1]` days pe reminder bhejta hai — par sirf wahi offset jo plan ke term se **chhota** ho (3-din plan ko sirf 1-din wala), aur `queuedSubscription` ho to koi reminder nahi (vendor renew kar chuka).

**8. `pricing` frozen snapshot hai** — jo actually charge hua tha wahi. Recompute nahi hota.

---

## 69. GET /subscribeds/history

Subscription ka audit trail.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership**

### Query Params
| Param | Type | Required | Default | Validation |
|---|---|---|---|---|
| `brandId` | ObjectId | ❌ | token ka brand | Admin ke liye required |
| `action` | string | ❌ | – | SUBSCRIPTION_HISTORY_ACTION enum |
| `page` | number | ❌ | `1` | Integer ≥ 1 |
| `limit` | number | ❌ | `10` | Integer 1–100 |

```http
GET /subscribeds/history?limit=20
```

### Success — `200`
```json
{
  "success": true,
  "message": "Subscription history fetched successfully",
  "data": {
    "total": 6,
    "page": 1,
    "limit": 20,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9n001",
        "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
        "subscribedId": "68f1a2b3c4d5e6f7a8b9f001",
        "action": "ACTIVATED",
        "performedByType": "VENDOR",
        "performedBy": { "_id": "…", "name": "rahul sharma" },
        "planName": "BASIC",
        "startDate": "2026-08-22T00:00:00.000Z",
        "endDate": "2026-09-21T23:59:59.000Z",
        "paidAmount": 1178.82,
        "note": null,
        "createdAt": "2026-08-22T00:00:05.000Z"
      },
      {
        "_id": "68f1a2b3c4d5e6f7a8b9n002",
        "action": "EXPIRED",
        "performedByType": "SYSTEM",
        "planName": "BASIC",
        "endDate": "2026-07-21T23:59:59.000Z",
        "createdAt": "2026-07-22T00:05:00.000Z"
      },
      {
        "_id": "68f1a2b3c4d5e6f7a8b9n003",
        "action": "UPGRADED",
        "performedByType": "VENDOR",
        "planName": "PREMIUM",
        "forfeitedDays": 12,
        "forfeitedValue": 399.6,
        "createdAt": "2026-06-10T00:00:00.000Z"
      }
    ]
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `No brand is linked to your account` | |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | |
| `422` | `brandId is required when acting as an admin` | |
| `422` | *(Joi message)* | Invalid `action` enum |

### ⚠️ Notes

**1. `performedByType`:**
| Value | Kab |
|---|---|
| `VENDOR` | Vendor ne khud kiya |
| `ADMIN` | Admin ne kiya (grant, cancel) |
| `SYSTEM` | Expiry job, queued plan ka start |

**1a. Queue ke actions:**
| `action` | Kab |
|---|---|
| `SCHEDULED` | `AFTER_CURRENT` purchase paid — plan queued (`snapshot.action` = RENEW / UPGRADE / …) |
| `SCHEDULE_STARTED` | Queued plan chalu plan ke `endDate` par shuru hua (`SYSTEM`) |
| `SCHEDULE_MOVED` | Ek `IMMEDIATE` purchase aage aa gaya, queued plan uske baad khisak gaya (`snapshot.fromStartDate`) |
| `SCHEDULE_CANCELLED` | Admin ne chalu plan cancel kiya, queued bhi saath gaya |

Queue me chale term ka `EXPIRED` row `reason: "Subscription period ended — the queued plan took over"` ke saath aata hai, aur vendor ko "plan expired" notification **nahi** jaata.

**2. ⚠️ `UPGRADED` rows pe `forfeitedDays` / `forfeitedValue` dekhein.** `IMMEDIATE` upgrade karne pe purana plan **turant** khatam ho jaata hai aur bache hue din **forfeit** ho jaate hain — koi proration nahi hoti. `AFTER_CURRENT` me kuch forfeit nahi hota.

Ye deliberately record hota hai taaki admin baad me compensate kar sake (`GET /subscribeds/admin/forfeited` worklist). Vendor panel ko upgrade se **pehle** ye clearly batana chahiye ki kitne din jaayenge.

**3. Vendor ko `brandId` bhejne ki zarurat nahi.**

**4. 📝 Planned (abhi build nahi hua) — `ORDER_CREATED` row par "paid hua ya nahi".** Har baar Pay dabane par ek `ORDER_CREATED` row banti hai, payment ho ya na ho. Vendor checkout band kare, promo lagaye aur phir pay kare, to do `ORDER_CREATED` rows dikhti hain — pehli bina payment ki (example, prod 13 Oct: ₹2358.82 unpaid, phir promo ke saath ₹1998.92 paid). Abhi response me aisi koi field nahi jo bataye ki pehli row ka paisa nahi kata, isliye confusion hota hai.
Owner decision (2026-10-13): har row par ek **naya key** `paymentStatus` (`PAID` / `NOT_PAID`) aayega, linked transaction ke status se — `created` / `attempted` = `NOT_PAID`. Admin (#83 super admin doc) aur vendor dono ko dikhega; panel `NOT_PAID` par grey "Not paid" label lagayega.
Rules: sirf naya key add (koi purana key nahi badlega), rows hide nahi hongi, transaction data DB me nahi badlega. Aage koi bhi naya endpoint jo subscription transactions/history laaye, wo bhi yahi key de. Claim-side payment list (`buildClaimTransactionPipeline`) pehle se `status` deti hai — wahan kuch nahi chahiye.

> 📖 Poori design — pricing, tax, forfeit policy, entitlement sync → [subscription_lifecycle_design.md](./subscription_lifecycle_design.md)

---

# Payment APIs

Razorpay checkout flow. **3 steps + 1 utility.**

```
1. POST /transactions/subscribe/preview           → price dikhao (read-only)
2. POST /transactions/subscribe/create-order      → Razorpay order
   [ Razorpay checkout widget ]
3. POST /transactions/subscribe/verify-transaction → activate
```

⚠️ **Activation browser pe depend nahi karti.** Razorpay ka webhook (`POST /transactions/webhook/razorpay`) bhi settlement karta hai — vendor tab band kar de to bhi plan activate ho jaata hai. Step 3 fast-path hai, guarantee webhook deta hai.

## 70. POST /transactions/subscribe/preview

Checkout preview — **read-only**, koi state change nahi.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership**

### Body
| Field | Type | Required | Validation |
|---|---|---|---|
| `subscriptionId` | ObjectId | ✅ | Plan ka id |
| `brandId` | ObjectId | ⚠️ | **Vendor ke liye optional** (token se), admin ke liye required |
| `promoCode` | string | ❌ | Max 40 chars, auto-uppercase + trim |
| `mode` | string | ❌ | `IMMEDIATE` *(default)* · `AFTER_CURRENT` — [SUBSCRIPTION_MODE](#subscription_mode--plan-kab-shuru-ho-checkout-par-vendor-chunta-hai) |
| `email` | string | ❌ | Valid email |
| `whatsappNumber` | string | ❌ | |

> ⚠️ **`amount` field jaanbujh kar nahi hai.** Payable amount server-side compute hota hai. Validator ka comment: *"It used to be accepted here and applied as `amount || price`, which let a caller buy any plan for ₹1."*

```json
{ "subscriptionId": "68f1a2b3c4d5e6f7a8b9k001", "promoCode": "MONSOON20" }
```

### Success — `200`
```json
{
  "success": true,
  "message": "Subscription checkout preview fetched successfully",
  "data": {
    "brand": { "_id": "68f1a2b3c4d5e6f7a8b9c3a1", "brandName": "cafe mocha", "isApproved": false },
    "plan": {
      "_id": "68f1a2b3c4d5e6f7a8b9k001",
      "name": "BASIC",
      "image": "https://cdn.trydood.com/images/subscription-plans/68f1a2b3c4d5e6f7a8b9k001/4c2a.png",
      "type": "MONTHLY",
      "typeLabel": "Monthly",
      "tier": 1,
      "price": 999,
      "discountType": "PERCENT",
      "discountPercent": 10,
      "discountedPrice": 899.1,
      "durationValue": 1,
      "durationUnit": "MONTH",
      "durationLabel": "1 month",
      "benefits": ["Listing on customer app"],
      "limitations": [],
      "features": [{ "title": "Outlets", "value": "3", "available": true }],
      "entitlements": {
        "subBrands": { "limit": 3, "isUnlimited": false },
        "vouchers": { "limit": 20, "isUnlimited": false },
        "showcase": { "limit": 5, "isUnlimited": false }
      }
    },
    "action": "NEW",
    "mode": "IMMEDIATE",
    "availableModes": ["IMMEDIATE"],
    "currentPlan": null,
    "queuedPlan": null,
    "validity": {
      "startDate": "2026-08-22T00:00:00.000Z",
      "endDate": "2026-09-22T00:00:00.000Z",
      "durationLabel": "1 month",
      "extraDays": 0
    },
    "credit": null,
    "requiresPayment": true,
    "zeroValueReason": null,
    "billingDetails": {
      "brandName": "mocha hospitality private limited",
      "address": "Shop 4, Scheme 54, Vijay Nagar, Indore, Madhya Pradesh, 452010",
      "gstin": "23AABCM1234K1ZP",
      "pan": "AABCM1234K",
      "addressSource": "BILLING"
    },
    "billingAddressRequired": false,
    "suggestedAddress": null,
    "pricing": {
      "currency": "INR",
      "listPrice": 999,
      "discountType": "PERCENT",
      "discountPercent": 10,
      "discountAmount": 99.9,
      "promoCode": null,
      "promoDiscount": 0,
      "prorationCredit": 0,
      "taxableValue": 899.1,
      "gstPercentage": 18,
      "isGstInclusive": false,
      "taxType": "CGST_SGST",
      "cgst": 80.92,
      "sgst": 80.92,
      "igst": 0,
      "gstAmount": 161.84,
      "hsnSacCode": "998315",
      "placeOfSupplyStateCode": "23",
      "placeOfSupplyState": "Madhya Pradesh",
      "roundOff": 0,
      "totalPayable": 1060.94,
      "amountInPaise": 106094,
      "youSaved": 99.9
    },
    "orderSummary": {
      "rows": [
        { "key": "ORIGINAL_PRICE", "label": "Original Price", "amount": 999, "display": "₹ 999.00" },
        { "key": "DISCOUNT", "label": "Discount (10.00% off)", "amount": -99.9, "display": "- ₹ 99.90" },
        { "key": "BILL_VALUE", "label": "Bill Value", "amount": 899.1, "display": "₹ 899.10" },
        { "key": "TAX", "label": "CGST @ 9.00%", "amount": 80.92, "display": "₹ 80.92" },
        { "key": "TAX", "label": "SGST @ 9.00%", "amount": 80.92, "display": "₹ 80.92" }
      ],
      "payable": { "label": "You'll Pay", "amount": 1060.94, "display": "₹ 1,060.94" },
      "youSaved": 99.9,
      "youSavedDisplay": "₹ 99.90",
      "savedText": "You saved ₹ 99.90 on This Plan"
    },
    "limits": {
      "subBrands": { "used": 0, "limit": 3, "isUnlimited": false, "overflowBy": 0 },
      "franchises": { "used": 0, "limit": 0, "isUnlimited": false, "overflowBy": 0 },
      "vouchers": { "used": 0, "limit": 20, "isUnlimited": false, "overflowBy": 0 },
      "showcase": { "used": 0, "limit": 5, "isUnlimited": false, "overflowBy": 0 }
    },
    "promo": {
      "supported": true,
      "applied": null,
      "message": null
    },
    "canProceed": true,
    "blockedReason": null,
    "notices": []
  }
}
```

### Success — `200` (`mode: AFTER_CURRENT`, chalu plan ke peeche queue)
```json
{
  "action": "RENEW",
  "mode": "AFTER_CURRENT",
  "availableModes": ["IMMEDIATE", "AFTER_CURRENT"],
  "currentPlan": { "_id": "…", "name": "BASIC", "tier": 1, "endDate": "2026-09-22T00:00:00.000Z", "daysRemaining": 7 },
  "queuedPlan": null,
  "validity": {
    "startDate": "2026-09-22T00:00:00.000Z",
    "endDate": "2026-10-22T00:00:00.000Z",
    "durationLabel": "1 month"
  },
  "notices": [
    "Your new plan starts on 22 Sep 2026, when your current BASIC ends. Nothing from your current plan is lost."
  ]
}
```
*(baaki fields upar jaise — sirf badle hue dikhaye)*

### Success — `200` (`IMMEDIATE` upgrade, chalu plan ki value credit)
```json
{
  "action": "UPGRADE",
  "mode": "IMMEDIATE",
  "credit": {
    "eligible": true,
    "reason": null,
    "currentPlanTermMonths": 12,
    "minCurrentPlanMonths": 12,
    "remainingDays": 183,
    "unusedValue": 500,
    "appliedToBill": 500,
    "leftover": 0,
    "extraDays": 0,
    "forfeited": 0,
    "forfeitReason": null
  },
  "requiresPayment": true,
  "zeroValueReason": null,
  "pricing": { "listPrice": 999, "discountAmount": 99.9, "prorationCredit": 500, "taxableValue": 399.1, "gstAmount": 71.84, "roundOff": 0, "totalPayable": 470.94, "amountInPaise": 47094 },
  "orderSummary": {
    "rows": [
      { "key": "ORIGINAL_PRICE", "label": "Original Price", "amount": 999, "display": "₹ 999.00" },
      { "key": "DISCOUNT", "label": "Discount (10.00% off)", "amount": -99.9, "display": "- ₹ 99.90" },
      { "key": "PRORATION_CREDIT", "label": "Unused value of current plan", "amount": -500, "display": "- ₹ 500.00" },
      { "key": "BILL_VALUE", "label": "Bill Value", "amount": 399.1, "display": "₹ 399.10" },
      { "key": "TAX", "label": "CGST @ 9.00%", "amount": 35.92, "display": "₹ 35.92" },
      { "key": "TAX", "label": "SGST @ 9.00%", "amount": 35.92, "display": "₹ 35.92" }
    ],
    "payable": { "label": "You'll Pay", "amount": 470.94, "display": "₹ 470.94" }
  },
  "notices": ["The unused value of your current BASIC (₹ 500.00) is credited to this plan."]
}
```

### Success — `200` (credit poora bill cover kare — kuch pay nahi, bache credit ke din)
```json
{
  "action": "UPGRADE",
  "credit": { "eligible": true, "unusedValue": 5000, "appliedToBill": 899.1, "leftover": 4100.9, "extraDays": 141, "forfeited": 0, "forfeitReason": null },
  "requiresPayment": false,
  "zeroValueReason": "CREDIT",
  "validity": { "startDate": "2026-08-22T00:00:00.000Z", "endDate": "2027-02-10T00:00:00.000Z", "durationLabel": "1 month", "extraDays": 141 },
  "pricing": { "prorationCredit": 899.1, "taxableValue": 0, "gstAmount": 0, "totalPayable": 0, "amountInPaise": 0 },
  "notices": [
    "The unused value of your current PREMIUM (₹ 5,000.00) is credited to this plan. It covers the whole bill, and the remaining ₹ 4,100.90 adds 141 extra day(s).",
    "Nothing to pay — the plan starts without a payment."
  ]
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Subscription plan not found!` | |
| `422` | `This subscription plan is no longer available.` | Plan `isActive: false` |
| `422` | `There is no current plan to start after. Choose IMMEDIATE to start this plan now.` | `AFTER_CURRENT`, par chalu plan nahi |
| `409` | `A plan is already queued to start on 22 Sep 2026. Only one plan can wait behind the current one.` | `AFTER_CURRENT`, par ek plan pehle se queued |
| `422` | `mode must be one of IMMEDIATE, AFTER_CURRENT` | Galat `mode` |
| `422` | `Subscription plan "BASIC" has no duration configured. Please contact support.` | Plan misconfigured |
| `422` | `This promo code is not valid.` | Strict promo mode me |

🆕 **P4 (billing):** `billingDetails.addressSource` ab `BILLING` (brand ka billing address) · `GST` · `PAN` — billing address **pehle** (pehle GST pehle tha, aur brand location `LOCATION` kehlaati thi). `billingAddressRequired: true` = billing address nahi → `create-order` `422` dega; billing form dikhao, `suggestedAddress` (GST, warna PAN) se prefill (D35). Tax (CGST+SGST / IGST) ab bhi GSTIN se; bina GSTIN state naam GST state map se milaye jaate hain ("Orissa" = "Odisha").
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | |
| `422` | `brandId is required when acting as an admin` | |
| `404` | `No brand is linked to your account` | |

### ⚠️ Edge cases & notes

**1. Safe to call repeatedly.** Read-only — koi Razorpay call nahi, koi `Transaction` row nahi. Plan card switch karte waqt har baar call kar sakte hain.

**2. Yahi amount Razorpay tak jaata hai.** Comment: *"The amount here is produced by the same code path order creation uses, so the 'You'll Pay' figure shown is the figure that reaches Razorpay."* Frontend ko koi arithmetic nahi karni.

**3. `orderSummary.rows` ko as-is render karein** — labels, amounts, display strings sab ready hain. Comment: *"The checkout page renders these in order and does no arithmetic of its own."*

**4. `canProceed` + `blockedReason` check karein** — `false` ho to pay button disable karein aur `blockedReason` dikhayein. Jaise vendor downgrade ki koshish kare (`allowVendorDowngrade: false`). Trial / free plan ke `blockedReason`:
| `blockedReason` | Kab |
|---|---|
| `A free trial is only for brands without a current plan.` | Trial plan, par chalu plan hai |
| `This brand has already used its free trial.` | Brand ne pehle kabhi trial liya tha (expire ho chuka ho tab bhi) |
| `This plan has no payable amount. An admin can grant it directly instead.` | Non-trial ₹0 plan (`zeroValueReason: FREE_PLAN`) |

**5. `action` batata hai kya ho raha hai:**
| Value | UI copy |
|---|---|
| `NEW` | "Subscribe" |
| `RENEW` | "Renew" — same tier (dusri length bhi) |
| `UPGRADE` | ⚠️ "Upgrade — bache hue X din forfeit honge" |
| `DOWNGRADE` | Vendor ke liye usually blocked |

`plan.tier` aur `currentPlan.tier` dono response me hain — action unhi se nikla hai. Chalu plan ho to `currentPlan` aisa aata hai (`tier` = jis tier par **kharida** tha, plan ka aaj ka tier nahi):

```json
"currentPlan": {
  "_id": "68f1a2b3c4d5e6f7a8b9k001", "name": "BASIC", "type": "MONTHLY", "tier": 1,
  "price": 999, "startDate": "2026-08-22T00:00:00.000Z",
  "endDate": "2026-09-22T00:00:00.000Z", "daysRemaining": 12
}
```

**6. ⚠️ `IMMEDIATE` — `credit` block dekhein.** Abhi shuru hone wala plan purana plan turant khatam karta hai.
- `credit.eligible: true` → chalu plan ki bachi value (`unusedValue`) bill se kat-ti hai (`appliedToBill`, order summary ki `PRORATION_CREDIT` row), GST uske baad. Bill se zyada ho to bacha (`leftover`) naye plan ke `extraDays` ban jaata hai (`validity.endDate` me already juda). Cap (`maxPlanDurationMonths`) se aage ka `forfeited` (`CAP_EXCEEDED`).
- `credit.eligible: false` → `reason`: `TERM_TOO_SHORT` (chalu term 12 mahine se kam) ya `CREDIT_DISABLED` — bache din forfeit, `notices` me warning.
- `credit: null` → kuch replace nahi ho raha (NEW, ya `AFTER_CURRENT`).

Bache din poore bachane hain to `mode: AFTER_CURRENT` — naya plan chalu plan ke `endDate` se shuru hota hai, kuch nahi jaata.

**6b. `requiresPayment: false`** → **Razorpay mat kholiye.** `create-order` (#71) usi request me plan activate / queue kar deta hai. `zeroValueReason` batata hai kyon (TRIAL · CREDIT · PROMO · ROUND_OFF). ₹1 se kam payable `pricing.roundOff` se ₹0 hota hai (order summary me `ROUND_OFF` row).

**6a. `mode` selector** — `availableModes` me jo ho wahi dikhayein. `AFTER_CURRENT` tabhi aata hai jab chalu plan ho aur koi plan pehle se queued na ho. `validity.startDate` chuna hua start batata hai (queue me = chalu plan ka `endDate`). `queuedPlan` pehle se queued plan (`name`, `startDate`, `endDate`) ya `null`. Queue hote hue bhi `IMMEDIATE` chal sakta hai — tab queued plan **khud peeche khisak** jaata hai (naye plan ke `endDate` se), `notices` me likha aata hai, aur uska poora term bachta hai.

**7. Promo codes default **on** hain** (`SUBSCRIPTION_DEFAULTS.isPromoCodeEnabled: true`). Admin `isPromoCodeEnabled: false` kare to `promo.supported: false` aur message `"Promo codes are coming soon"` aata hai. Code bhejne pe silently full price charge **nahi** hoga — message clearly batayega.

**8. Tax type location se decide hota hai** — `CGST_SGST` (intra-state) ya `IGST` (inter-state). Agar admin ne `companyStateCode` set nahi kiya to fallback `IGST` hota hai.

**9. `limits` naye plan ke hisaab se hain**, current ke nahi — "upgrade karne pe kya milega" dikhane ke liye.

---

## 71. POST /transactions/subscribe/create-order

Razorpay order banata hai — **ya**, jab kuch pay nahi karna (`requiresPayment: false` — trial, 100% promo, credit ne bill cover kiya, ₹1 se kam), bina Razorpay ke **usi request me** plan activate / queue kar deta hai.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN + ownership**

### Body
Same as #70 — `subscriptionId` (✅), `brandId` (⚠️), `promoCode`, `mode`, `email`, `whatsappNumber`.

```json
{ "subscriptionId": "68f1a2b3c4d5e6f7a8b9k001", "mode": "AFTER_CURRENT" }
```

> `mode` order par **freeze** hota hai (`Transaction.subscriptionMode`) — payment kabhi bhi aaye, settle wahi karta hai jo quote hua tha.

### Success — `200`
```json
{
  "success": true,
  "message": "Subscribe transaction order created successfully",
  "data": {
    "transaction": {
      "_id": "68f1a2b3c4d5e6f7a8b9m001",
      "brandId": "68f1a2b3c4d5e6f7a8b9c3a1",
      "subscriptionId": "68f1a2b3c4d5e6f7a8b9k001",
      "razorpayOrderId": "order_PxYzAbC123",
      "status": "created",
      "verified": false,
      "pricing": { "totalPayable": 1178.82, "amountInPaise": 117882, "currency": "INR" },
      "createdAt": "2026-08-22T19:00:00.000Z"
    },
    "plan": { "_id": "…", "name": "BASIC", "type": "MONTHLY", "price": 999 },
    "pricing": { "totalPayable": 1178.82, "amountInPaise": 117882, "currency": "INR" },
    "orderSummary": { "rows": [ ], "payable": { "amount": 1178.82, "display": "₹1,178.82" } },
    "billingDetails": { "brandName": "…", "gstin": "…", "pan": "…" },
    "mode": "AFTER_CURRENT",
    "validity": {
      "startDate": "2026-09-22T00:00:00.000Z",
      "endDate": "2026-10-22T00:00:00.000Z",
      "durationLabel": "1 month",
      "extraDays": 0
    },
    "credit": null,
    "requiresPayment": true,
    "razorpay": {
      "orderId": "order_PxYzAbC123",
      "amount": 117882,
      "currency": "INR",
      "keyId": "rzp_test_XXXXXXXXXXXX"
    },
    "reused": false
  }
}
```

### Success — `200` (kuch pay nahi — `requiresPayment: false`)
```json
{
  "success": true,
  "message": "No payment needed — your subscription is active",
  "data": {
    "requiresPayment": false,
    "zeroValueReason": "TRIAL",
    "transaction": {
      "_id": "68f1a2b3c4d5e6f7a8b9m004",
      "gateway": "NONE",
      "zeroValueReason": "TRIAL",
      "amount": 0,
      "status": "captured",
      "verified": true,
      "settlementStage": "COMPLETE",
      "invoiceId": "TD/SUB/26-27/000452"
    },
    "subscribed": { "_id": "68f1a2b3c4d5e6f7a8b9f004", "status": "ACTIVE", "isTrial": true, "startDate": "2026-08-22T00:00:00.000Z", "endDate": "2026-08-29T00:00:00.000Z" },
    "action": "NEW",
    "isScheduled": false,
    "alreadySettled": false,
    "invoiceId": "TD/SUB/26-27/000452",
    "invoiceDownloadUrl": "https://api.trydood.com/trydood/v1/transactions/invoice/3f9c…",
    "pricing": { "taxableValue": 0, "gstAmount": 0, "totalPayable": 0, "amountInPaise": 0 },
    "validity": { "startDate": "2026-08-22T00:00:00.000Z", "endDate": "2026-08-29T00:00:00.000Z", "durationLabel": "7 days", "extraDays": 0 },
    "credit": null,
    "limits": { "subBrands": { "used": 0, "limit": 1, "isUnlimited": false, "overflowBy": 0 } },
    "razorpay": null,
    "reused": false
  }
}
```
> Queued (`AFTER_CURRENT`) par message: `"No payment needed — your new plan is queued and starts when your current plan ends"`.

### Errors
| Status | Message | Kab |
|---|---|---|
| `409` | `Please finish the earlier onboarding steps before choosing a plan.` · `details.code: ONBOARDING_SCREEN_MISMATCH`, `details.currentScreen` | 🆕 Onboarding v2 (P1, D26): vendor abhi `SUBSCRIBE_PLAN` tak nahi pahuncha. Approved brand / onboarding poora kar chuka vendor (dashboard se renew / upgrade) pe **kabhi nahi** |
| `404` | `Subscription plan not found!` | |
| `422` | `This subscription plan is no longer available.` | |
| `403` | *(preview ka `blockedReason`)* | `canProceed: false` — jaise downgrade blocked, trial dobara, ya non-trial ₹0 plan (`This plan has no payable amount. An admin can grant it directly instead.` — pehle ye `422` tha) |
| `422` / `409` | *(preview ke `mode` errors, #70)* | `AFTER_CURRENT` bina chalu plan / queue bhari |
| `409` | `This brand has already used its free trial.` | Do trial ek saath — database ne doosra roka |
| `422` | `Please add your billing address before checkout.` · `details.code: BILLING_ADDRESS_REQUIRED`, `details.suggestedAddress` | 🆕 P4 (D35): brand ka billing address nahi (paid aur ₹0 dono order). `PUT /brands/billing-address` (#32b) karke dobara. Purane vendor bhi agle checkout pe ek baar confirm karenge |
| `503` | `Razorpay services unavailable! Please try again later` | Gateway down |
| `403` | `Forbidden: You do not have permission to perform this action on this brand.` | |
| `422` | `brandId is required when acting as an admin` | |

### ⚠️ Edge cases & notes

**1. `razorpay` object seedha checkout widget me pass karein:**
```js
const rzp = new Razorpay({
  key: data.razorpay.keyId,
  order_id: data.razorpay.orderId,
  amount: data.razorpay.amount,      // paise me
  currency: data.razorpay.currency,
  handler: (res) => {
    // res.razorpay_payment_id, razorpay_order_id, razorpay_signature
    // → POST /transactions/subscribe/verify-transaction
  },
});
```

**2. `amount` paise me hai** — `117882` = ₹1,178.82. Razorpay isi format me maangta hai.

**3. `reused: true` aa sakta hai.** Agar same brand + plan + term + **mode** ka ek order abhi bhi open hai (default 15 min ke andar), to naya nahi banta — wahi wapas milta hai. "Abhi shuru" ka order "baad me shuru" ke liye kabhi wapas nahi milta. Comment: *"rather than leaving a trail of abandoned Razorpay orders every time the page is reloaded."* Window `Setting.vendor.subscription.pendingOrderReuseMinutes` se configurable hai.

**4. `transaction._id` sambhal ke rakhein** — step 3 (#72) me `transactionId` chahiye hoga.

**5. ⚠️ `requiresPayment: false` → Razorpay widget mat kholiye, verify (#72) bhi call mat kijiye.** Order `gateway: NONE`, `amount: 0` ke saath banta hai aur usi request me settle ho jaata hai — plan live (ya queued), SUB-series invoice number, `invoiceDownloadUrl`, history, notification, sab paid order jaisa. Invoice par "Payment Status: Nothing to pay".
- **Double tap safe:** doosra tap wahi pehla result lautata hai (`alreadySettled: true`), doosra free plan nahi banta.
- Non-trial ₹0 plan checkout par nahi bikta — admin `POST /subscribeds/admin/grant` se deta hai.

**6. History me `ORDER_CREATED` entry banti hai** — `source: PAYMENT` (vendor) ya `ADMIN_PAYMENT` (admin). Snapshot me `upgradeCredit` (credit ka poora hisaab) aur zero-value ho to `zeroValueReason`.

**7. Credit order par freeze hota hai** (`Transaction.upgradeCredit`). Payment aane tak koi aur purchase chalu plan badal de (do order ek hi plan ki value par), to doosre ko quoted price hi lagta hai par **extra din nahi** milte — aur admin ko `SUBSCRIPTION_CREDIT_REUSED` alert jaata hai.

---

## 72. POST /transactions/subscribe/verify-transaction

Payment verify karke subscription activate karta hai.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN**

### Body
| Field | Type | Required | Notes |
|---|---|---|---|
| `razorpayPaymentId` | string | ✅ | Checkout handler se |
| `razorpayOrderId` | string | ✅ | Checkout handler se |
| `razorpaySignature` | string | ✅ | Checkout handler se |
| `transactionId` | ObjectId | ✅ | **#71 ke response se.** Pehle optional tha — *"which let a verify request through with nothing to verify"* |

```json
{
  "razorpayPaymentId": "pay_PxYzDeF456",
  "razorpayOrderId": "order_PxYzAbC123",
  "razorpaySignature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
  "transactionId": "68f1a2b3c4d5e6f7a8b9m001"
}
```

### Success — `200` (nayi activation)
```json
{
  "success": true,
  "message": "Payment successful! Congratulations — your subscription has been successfully activated",
  "data": {
    "alreadyVerified": false,
    "transaction": {
      "_id": "68f1a2b3c4d5e6f7a8b9m001",
      "status": "captured",
      "verified": true,
      "razorpayPaymentId": "pay_PxYzDeF456",
      "invoiceSnapshot": {
        "invoiceId": "TDI-2026-000451",
        "invoiceUrl": "https://res.cloudinary.com/drvdnqydw/raw/upload/v1/invoices/TDI-2026-000451.pdf"
      }
    },
    "subscribed": {
      "_id": "68f1a2b3c4d5e6f7a8b9f001",
      "status": "ACTIVE",
      "source": "PAYMENT",
      "startDate": "2026-08-22T00:00:00.000Z",
      "endDate": "2026-09-22T00:00:00.000Z",
      "durationValue": 1,
      "durationUnit": "MONTH",
      "termDays": 31,
      "paidAmount": 1178.82
    },
    "action": "NEW",
    "isScheduled": false,
    "limits": {
      "subBrands": { "used": 0, "limit": 3, "isUnlimited": false, "overflowBy": 0 },
      "vouchers": { "used": 0, "limit": 20, "isUnlimited": false, "overflowBy": 0 },
      "showcase": { "used": 0, "limit": 5, "isUnlimited": false, "overflowBy": 0 }
    }
  }
}
```

### Success — `200` (already verified)
```json
{
  "success": true,
  "message": "This payment has already been verified. Your subscription is active.",
  "data": { "alreadyVerified": true, "subscribed": { "status": "ACTIVE" } }
}
```

> ✅ Message alag hai. Controller ka comment: *"A replayed verification is a success, not a new activation — say so rather than congratulating the vendor twice for one payment."*

### Success — `200` (`mode: AFTER_CURRENT` — queued, abhi live nahi)
```json
{
  "success": true,
  "message": "Payment successful! Your new plan is queued and starts when your current plan ends",
  "data": {
    "alreadyVerified": false,
    "isScheduled": true,
    "action": "RENEW",
    "subscribed": {
      "_id": "68f1a2b3c4d5e6f7a8b9f002",
      "status": "SCHEDULED",
      "mode": "AFTER_CURRENT",
      "startDate": "2026-09-22T00:00:00.000Z",
      "endDate": "2026-10-22T00:00:00.000Z",
      "previousSubscribedId": "68f1a2b3c4d5e6f7a8b9f001"
    }
  }
}
```
> Replay par: `"This payment has already been verified. Your new plan starts when your current plan ends."` Chalu plan ke limits hi `limits` me rehte hain jab tak queued plan shuru na ho.

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Transaction not found!` | `transactionId` galat |
| `422` | `This transaction was not created through Razorpay.` | Manual/admin grant transaction |
| `422` | `This payment does not belong to the given transaction.` | `razorpayOrderId` mismatch |
| `403` | `You are not authorized to verify this payment request` | Dusre brand ka transaction |
| `400` | `Invalid signature. Payment may be tampered.` | HMAC fail |
| `503` | `Razorpay services unavailable! Please try again later` | Gateway down — **wahi body** se verify dobara |
| `409` | `Your payment is being confirmed. Please wait a moment.` — **`details.code: PAYMENT_PENDING`** | 🆕 Bank ne payment approve kar di (`authorized`) par Razorpay ne abhi capture nahi kiya. Server ~6 s (3 baar, har 2 s) dobara poochhta hai; phir bhi nahi to ye. **Failure nahi** — promo hold rehta hai, plan webhook se activate hoga. Panel "Payment confirm ho raha hai…" dikhaye, 2–3 s baad **wahi body** se verify dobara; **dobara Pay nahi** |
| `402` | Razorpay ki wajah (`error_description`), ya `Payment was not captured (status: …). Please try again.` | Payment sach me **fail** (`failed`) — promo hold chhoot gaya. Vendor dobara Pay kare. (🆕 `authorized` payment ab `402` nahi deti — upar `409`) |
| `422` | `This payment belongs to a different order.` | Razorpay ka `order_id` mel nahi khaata |
| `422` | `Payment amount mismatch. Expected ₹… but received ₹…. Please contact support.` | Paid amount ≠ order ka frozen `amountInPaise` |
| `422` | `transactionId is required` / `Invalid transactionId` | |
| `422` | `razorpayPaymentId is required` | |

### ⚠️ Edge cases & notes

**1. Idempotent hai** — dobara call karne pe `alreadyVerified: true` aata hai, double activation nahi hoti. Network retry safe hai.

**1a. 🆕 `409 PAYMENT_PENDING` failure nahi hai (2026-10-09).** Pehle `authorized` (capture se pehle ka pal) payment par bhi `402` aata tha aur promo hold chhoot jaata tha — jabki kuch second baad capture hota aur webhook plan activate kar deta. Vendor "fail" dekh kar dobara pay kar deta tha. Ab `409` + `PAYMENT_PENDING`: verify dobara karo; tab tak webhook activate kar chuka hoga (`alreadyVerified: true`). Error me sirf yahi `details.code` aata hai — baaki status se branch karein.

**2. Webhook race handle hota hai.** Webhook aur ye endpoint dono settle kar sakte hain. Settlement transaction ko **conditionally claim** karta hai, to jo pehle aaye wahi activate karta hai, doosra `alreadyVerified` report karta hai.

**3. Ye step **optional** hai (technically).** Agar vendor payment ke baad tab band kar de, webhook phir bhi activate kar dega. Ye fast-path hai taaki UI turant confirm dikha sake.

**4. Invoice PDF auto-generate hota hai** — `invoiceSnapshot.invoiceUrl` se download link milta hai.

**5. `limits` response me aata hai** (har pool ka `used` / `limit` / `isUnlimited` / `overflowBy`) — activation ke baad naye limits turant dikha sakte hain. Queued (`isScheduled: true`) par ye chalu plan ke hi limits hain.

**6. Signature verify HMAC se hota hai** — tampered payload `400` dega.

---

## 73. POST /transactions/invoice/regenerate

Invoice PDF dobara issue karta hai.

**Access:** Intended: Vendor + Admin · Enforced: **VENDOR+ADMIN**

### Body
| Field | Type | Required |
|---|---|---|
| `transactionId` | ObjectId | ✅ |

```json
{ "transactionId": "68f1a2b3c4d5e6f7a8b9m001" }
```

### Success — `200`
```json
{
  "success": true,
  "message": "Invoice re-issued successfully",
  "data": {
    "transactionId": "68f1a2b3c4d5e6f7a8b9m001",
    "invoice": {
      "invoiceId": "TDI-2026-000451",
      "invoiceUrl": "https://res.cloudinary.com/drvdnqydw/raw/upload/v1/invoices/TDI-2026-000451.pdf",
      "issuedAt": "2026-08-22T19:30:00.000Z"
    },
    "wasBackfilled": false
  }
}
```

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `Transaction not found!` | |
| `404` | `Brand not found!` | |
| `403` | `Forbidden: You do not have permission to access this invoice.` | Dusre brand ka transaction |
| `422` | `This transaction has no completed payment, so there is no invoice to issue.` | Unpaid order |
| `422` | `This transaction has no stored pricing breakdown, so its invoice cannot be rebuilt.` | Purana transaction bina pricing ke |
| `422` | `transactionId is required` / `Invalid transactionId` | |

### ⚠️ Notes

**1. Amounts kabhi recompute nahi hote.** Invoice transaction pe **frozen pricing** se banta hai — matlab purana invoice exactly wahi dikhata hai jo tab charge hua tha, chahe plan ka price ya GST rate baad me badal gaya ho.

**2. `wasBackfilled: true`** matlab is transaction ka invoice snapshot pehle nahi tha aur ab pricing se reconstruct kiya gaya. Purane transactions pe aisa ho sakta hai.

**3. Vendor sirf apna invoice le sakta hai**, admin koi bhi.

**4. Manual admin grants pe bhi kaam karta hai** — wo creation pe hi captured mark hote hain, to `verified` check pass ho jaata hai.

---

# Master Data APIs

Categories aur sub-categories. **Admin** manage karta hai, vendor sirf padhta hai (onboarding me brand ki category chunne ke liye).

## 74. GET /categories/getAll

**Access:** Intended: All roles · Enforced: **Public** — token ki zarurat nahi (guest bhi)

### Query Params
| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `page` | number | ❌ | `1` | |
| `limit` | number | ❌ | `10` | ⚠️ Default chhota hai |
| `search` | string | ❌ | – | `name` + `description` me |
| `name` | string | ❌ | – | Sirf `name` me |
| `isActive` | boolean\|string | ❌ | – | **Bhejein** — warna inactive bhi aayenge |
| `fromDate` · `toDate` | ISO date | ❌ | – | |
| `sortBy` | string | ❌ | `createdAt` | Validate nahi hota |
| `sortOrder` | string | ❌ | `desc` | `asc` \| `desc` |

```http
GET /categories/getAll?isActive=true&limit=50&sortBy=name&sortOrder=asc
```

### Success — `200`
```json
{
  "success": true,
  "message": "Categories fetched",
  "data": {
    "total": 12,
    "totalPages": 1,
    "page": 1,
    "limit": 50,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9c0e1",
        "name": "food & beverages",
        "description": "restaurants, cafes, and food outlets",
        "image": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/Images/food.jpg",
        "isActive": true,
        "createdAt": "2026-05-10T08:00:00.000Z",
        "stats": {
          "subCategories": { "total": 6, "active": 5 },
          "brands":        { "total": 48, "active": 41 },
          "vouchers":      { "total": 130, "active": 96 },
          "promoCodes":    { "total": 3, "active": 2 }
        }
      }
    ]
  }
}
```

**Projected fields only:** `_id`, `name`, `description`, `image`, `isActive`, `createdAt`, `stats`

### Errors
| Status | Message |
|---|---|
| `404` | `No any category found` — **empty-state** |
| `422` | *(Joi message)* |

### ⚠️ Notes
**1. Default `limit` 10 hai** — onboarding dropdown ke liye badhayein (`limit=50`).
**2. `isActive=true` bhejein.**
**3. Names lowercase me aate hain** — display pe capitalize karein.

**4. `stats` vendor panel ke liye nahi hai.** Ye endpoint teeno consumers share karte hain aur counts admin panel ke liye add hue the — onboarding ke category dropdown me inhe ignore karein. `stats.brands` platform-wide ginti hai, vendor ke apne brands ki nahi.

Shape: `subCategories` / `brands` / `vouchers` / `promoCodes`, har ek me `{ total, active }`. Poori detail super admin doc ke `GET /categories/getAll` me hai.

---

## 75. GET /categories/get/:id

**Access:** Intended: All roles · Enforced: **Public** — token ki zarurat nahi (guest bhi)

### Path Params
| Param | Type | Required |
|---|---|---|
| `id` | ObjectId | ✅ |

### Success — `200`
```json
{
  "success": true,
  "message": "Category fetched",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c0e1",
    "name": "food & beverages",
    "description": "restaurants, cafes, and food outlets",
    "image": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/Images/food.jpg",
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-05-10T08:00:00.000Z",
    "updatedAt": "2026-05-10T08:00:00.000Z",
    "stats": {
      "subCategories": { "total": 6, "active": 5 },
      "brands":        { "total": 48, "active": 41 },
      "vouchers":      { "total": 130, "active": 96 },
      "promoCodes":    { "total": 3, "active": 2 }
    }
  }
}
```

> `getAll` ke mukable **poora document** aata hai. `stats` wahi hai — [#74](#74-get-categoriesgetall) dekhein.

### Errors
| Status | Message |
|---|---|
| `404` | `Category not found` |
| `422` | `Invalid Category Id` |

---

## 76. GET /subCategories/getAll

**Access:** Intended: All roles · Enforced: **Public** — token ki zarurat nahi (guest bhi)

### Query Params
Same as [#74](#74-get-categoriesgetall), plus:

| Param | Type | Required | Notes |
|---|---|---|---|
| `categoryId` | ObjectId | ❌ | Ek category ke sub-categories. ⚠️ Invalid ObjectId pe **500** aa sakta hai (validate nahi hota) |

```http
GET /subCategories/getAll?categoryId=68f1a2b3c4d5e6f7a8b9c0e1&isActive=true&limit=50
```

### Success — `200`
```json
{
  "success": true,
  "message": "Sub-categories fetched",
  "data": {
    "total": 8,
    "totalPages": 1,
    "page": 1,
    "limit": 50,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9c0f1",
        "categoryId": "68f1a2b3c4d5e6f7a8b9c0e1",
        "name": "cafe",
        "description": "coffee shops and cafes",
        "image": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/Images/cafe.jpg",
        "isActive": true,
        "isDeleted": false,
        "createdAt": "2026-05-10T09:00:00.000Z",
        "updatedAt": "2026-05-10T09:00:00.000Z",
        "stats": {
          "brands":   { "total": 12, "active": 10 },
          "vouchers": { "total": 34, "active": 28 }
        }
      }
    ]
  }
}
```
> `stats` yahan sirf `brands` aur `vouchers` rakhta hai — `promoCodes` sirf category level pe hota hai. Vendor panel ke liye ye counts relevant nahi, [#74](#74-get-categoriesgetall) ka note dekhein.

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `No any subcategory found` | **Empty-state** |
| `500` | *(cast error)* | `categoryId` invalid ObjectId format |

### ⚠️ Note
Onboarding me brand ki category set karne ke liye `PUT /brands/update` (#32) pe `subCategoryId` bhejein — `categoryId` khud resolve ho jaata hai.

---

## 77. GET /subCategories/get/:id

**Access:** Intended: All roles · Enforced: **Public** — token ki zarurat nahi (guest bhi)

### Path Params
| Param | Type | Required |
|---|---|---|
| `id` | ObjectId | ✅ |

### Success — `200`
```json
{
  "success": true,
  "message": "Sub-category fetched",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c0f1",
    "categoryId": "68f1a2b3c4d5e6f7a8b9c0e1",
    "name": "cafe",
    "description": "coffee shops and cafes",
    "image": "https://res.cloudinary.com/drvdnqydw/image/upload/v1/Images/cafe.jpg",
    "isActive": true,
    "isDeleted": false,
    "stats": {
      "brands":   { "total": 12, "active": 10 },
      "vouchers": { "total": 34, "active": 28 }
    }
  }
}
```

### Errors
| Status | Message |
|---|---|
| `404` | `Sub-category not found` |
| `422` | `Invalid SubCategory Id` |

---

# Legal APIs

Terms & Conditions aur Privacy Policy — read-only. Admin manage karta hai.

## 78. GET /terms-and-conditions/getAll

**Access:** Intended: All roles · Enforced: **Public** — token ki zarurat nahi (guest bhi)

### Query Params
| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `page` | number | ❌ | `1` | |
| `limit` | number | ❌ | `10` | |
| `search` | string | ❌ | – | `title` + `description` |
| `title` | string | ❌ | – | |
| `isActive` | boolean\|string | ❌ | – | **Bhejein** |
| `fromDate` · `toDate` | ISO date | ❌ | – | |
| `sortBy` | string | ❌ | `createdAt` | |
| `sortOrder` | string | ❌ | `desc` | `asc` \| `desc` |

### Success — `200`
```json
{
  "success": true,
  "message": "Terms and conditions fetched",
  "data": {
    "total": 3,
    "totalPages": 1,
    "page": 1,
    "limit": 20,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9c9a1",
        "title": "vendor terms of service",
        "type": "VENDOR",
        "description": "<p>By listing on Trydood you agree to...</p>",
        "isActive": true,
        "isDeleted": false,
        "createdAt": "2026-04-01T00:00:00.000Z",
        "updatedAt": "2026-07-15T00:00:00.000Z"
      }
    ]
  }
}
```

### Errors
| Status | Message |
|---|---|
| `404` | `No any termandcondition found` — **empty-state** |
| `422` | *(Joi message)* |

### ⚠️ Notes

**1. `description` me HTML hota hai** — admin panel se rich-text aata hai. WebView ya HTML renderer use karein, plain text nahi.

**2. `type` free-form string hai** (enum nahi) — `"VENDOR"`, `"CUSTOMER"` jaisi values ho sakti hain. **API me `type` filter param nahi hai**, to vendor-relevant records **client-side** filter karne padenge.

**3. Multiple records ho sakte hain** — sections me split. `sortBy=createdAt&sortOrder=asc` se consistent order.

**4. Onboarding ke partnership deed step (#25) se pehle ye dikhana chahiye.**

---

## 79. GET /terms-and-conditions/get/:id

**Access:** Intended: All roles · Enforced: **Public** — token ki zarurat nahi (guest bhi)

### Path Params
| Param | Type | Required |
|---|---|---|
| `id` | ObjectId | ✅ |

### Success — `200`
```json
{
  "success": true,
  "message": "Term and condition fetched",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9c9a1",
    "title": "vendor terms of service",
    "type": "VENDOR",
    "description": "<p>By listing on Trydood you agree to...</p>",
    "isActive": true,
    "isDeleted": false
  }
}
```

### Errors
| Status | Message |
|---|---|
| `404` | `Term and condition not found` |
| `422` | `Invalid TermAndCondition Id` |

---

## 80. GET /privacy-and-policies/getAll

**Access:** Intended: All roles · Enforced: **Public** — token ki zarurat nahi (guest bhi)

### Query Params
Same as [#78](#78-get-terms-and-conditionsgetall).

### Success — `200`
```json
{
  "success": true,
  "message": "Privacys and policies fetched",
  "data": {
    "total": 2,
    "totalPages": 1,
    "page": 1,
    "limit": 20,
    "data": [
      {
        "_id": "68f1a2b3c4d5e6f7a8b9ca01",
        "title": "privacy policy",
        "type": "VENDOR",
        "description": "<p>We collect the following information...</p>",
        "isActive": true,
        "isDeleted": false,
        "createdAt": "2026-04-01T00:00:00.000Z"
      }
    ]
  }
}
```

> Note: success message me typo hai — `"Privacys and policies fetched"`. Backend me aisa hi hai; message pe match na karein, `success` flag pe karein.

### Errors
| Status | Message |
|---|---|
| `404` | `No any privacyandpolicy found` — **empty-state** |
| `422` | *(Joi message)* |

---

## 81. GET /privacy-and-policies/get/:id

**Access:** Intended: All roles · Enforced: **Public** — token ki zarurat nahi (guest bhi)

### Path Params
| Param | Type | Required |
|---|---|---|
| `id` | ObjectId | ✅ |

### Success — `200`
```json
{
  "success": true,
  "message": "Privacy and policy fetched",
  "data": {
    "_id": "68f1a2b3c4d5e6f7a8b9ca01",
    "title": "privacy policy",
    "type": "VENDOR",
    "description": "<p>We collect the following information...</p>",
    "isActive": true,
    "isDeleted": false
  }
}
```

### Errors
| Status | Message |
|---|---|
| `404` | `Privacy and policy not found` |
| `422` | `Invalid PrivacyAndPolicy Id` |

---

# Voucher Claim APIs 🆕

Grahak ne mere outlet par kya khareeda, aur mujhe kitna milega.

> **Phase 1 me poori tarah read-only.** Capture par claim seedhe `REDEEMED` ho jaati hai
> (`redemptionMode: AUTO`) — **payment hi redemption hai**. Outlet scan aur reversal
> Phase 2 hain, `docs/customer_voucher_claim_plan.md` §15.1 dekhein.

## ⚠️ Ek endpoint, teen shapes

Ye wahi URLs hain jo customer app use karta hai. **Scope aur projection dono token se
nikalte hain** — vendor token bhejne par vendor ka jawab aata hai, `SUB_VENDOR` token
bhejne par sirf us outlet ka.

| Field | Vendor / Outlet | Kyun |
|---|:-:|---|
| `voucher.vendorPayable` · `pricing.netBill` | ✅ | Aapko kitna milega |
| `voucher.vendorPromoCost` | ✅ | Promo me aapka hissa |
| `gatewayFee` · `netReceived` | ❌ | Razorpay ne **humse** kya liya — commercial disclosure |
| `voucher.platformPromoCost` | ❌ | Promo me hamara hissa |
| `email` · `contact` · `customerId` | ❌ | Grahak ki privacy |
| `invoiceDownloadUrl` | ❌ | Grahak ka tax invoice uske apne details rakhta hai |

Ye faisla `claimProjection()` me **ek jagah** hota hai, har endpoint par yaad nahi rakha
jaata — teen alag endpoint hote to ek jagah bhoolna leak ban jaata, aur wo listing me nahi,
detail page par milta, jise koi jaanchta nahi.

## 82. GET /voucher-claims — mere brand ki claims

**Access:** 🔒 `verifyJwtToken` — `VENDOR` aur `SUB_VENDOR` dono

`SUB_VENDOR` token isi URL par **sirf apne outlet** ki rows paata hai, brand ki poori nahi.

🔧 **Fail-closed (2026-10-27, security sweep — commit `02a93d6`, live 2026-11-04).** Ye rule payments, claims aur refunds ki
lists **aur** har ek detail / decide endpoint par ek hi helper se chalta hai
(`helpers/transactions/assertTransactionAccess.js` → `assertOwnOutlet`). Pehle check sirf tab
rokta tha jab dono taraf outlet id ho aur alag ho — outlet manager ke account par outlet na ho, ya
record par na ho, to brand ka poora jawab mil jaata tha. Ab:
- outlet manager ke account par outlet nahi → `403 "No outlet is linked to this account."`
  (list par bhi — pehle ye poore brand ki list deta tha);
- record par outlet nahi, ya dusra outlet → `403` (*"…not taken / not made at your outlet"*,
  refund par *"…at a different outlet"*).

Har voucher claim, uska payment aur refund apna outlet saath rakhte hain, to outlet manager ke
liye kuch chhoota nahi. Brand owner (`VENDOR`) par koi asar nahi.

| Param | Default | Notes |
|---|---|---|
| `page` / `limit` | `1` / `20` | `limit` max **100** |
| `status` | – | `PENDING · PAID · REDEEMED · FAILED · CANCELLED · EXPIRED · REFUNDED` |
| `outletId` | – | Outlet-wise report |
| `claimCode` | – | Poora code |
| `from` / `to` | – | ISO date. `to` **poora din** include karta hai |

⚠️ **Scope query se chaudi nahi ho sakti.** `?brandId=<dusra brand>` bhejne par **kuch
nahi** milta — apne rows nahi. Filter aur scope intersect hote hain, isliye galat filter
par khaali jawab aata hai, chup-chaap galat jawab nahi.

Khaali list `200` + `data: []` hai, `404` nahi.

### 🆕 Har row par `customer` aur `voucherVersion`

`{ fullName, uniqueId }` aur `{ versionCode, versionNumber }` — bilkul wahi do
block jo payments listing par aate hain, wahi niyam. Poora shape aur *"pehchaan
haan, sampark nahi"* wali wajah [#83](#83-get-voucher-claimspayments--mere-brand-ke-payments) me.

⚠️ `brandSnapshot` / `voucherSnapshot` waise hi frozen hain. `customer` aur
`voucherVersion` **live** reads hain, snapshot nahi — ye "ye kaun hai / ye kaunsa
version hai" ka jawab dete hain, "us din kya likha tha" ka nahi.

### Har row par `brand` (live)

`brandSnapshot` ke **bagal me** ek live `brand` block bhi aata hai — shape #83 jaisa hi:
`{ _id, brandName, logo, merchantId, subscription }` (`subscription` = `{ name, tier, isTrial, image }`
ya `null`). Snapshot us din ka naam hai; `brand` aaj ka `merchantId` aur plan badge — dono
alag sawaal hain, isliye dono aate hain (`helpers/transactions/buildClaimReadPipeline.js`).

---

## 83. GET /voucher-claims/payments — mere brand ke payments

**Access:** 🔒 `verifyJwtToken`

*"Kaunsa paisa hila"*. `status` yahan **payment** ki vocabulary hai —
`created · authorized · captured · failed`.

Settlement ke fields bhi yahin: `settlementId`, `settlementHold`, `paidToVendorAt`.

### 🆕 `brand` block

Har row ka `brand` ab `merchantId` aur `subscription` bhi leke aata hai:

```json
"brand": { "_id": "…", "brandName": "cafe mocha", "logo": "https://…", "merchantId": "TM-362P-7M7E-ZB2N", "subscription": { "name": "Pro Plus", "tier": 2, "isTrial": false, "image": null } }
```

| Field | Type | Notes |
|---|---|---|
| `brand.merchantId` 🆕 | string\|null | Merchant identifier |
| `brand.subscription` 🔴 | object\|null | **Live** plan ka badge — `{ name, tier, isTrial, image }` (ACTIVE + aage ki `endDate`, ya SCHEDULED jo shuru ho chuka). Plan lapse ho chuka ho to `null`. 🔴 2026-10-09 se pehle ye `subscriptionPlan` (sirf naam, string) tha — wo key **hat gayi**; panel `subscription?.name` padhe |

⚠️ Ye **vendor ki apni billing nahi** hai — sirf plan ka badge (naam, tier,
trial flag, image) hai, kyunki yahi field customer-facing surfaces par bhi jaati hai. Apne plan ki dates, price aur
entitlements ke liye `GET /subscribeds/...` use karein.

⚠️ `subscription` **live** hai, frozen nahi. Purane payment ki row par bhi
aaj ka plan dikhega, us waqt ka nahi — kyunki ye sawaal "ye brand aaj kaun hai"
ka jawab hai, history ka nahi.

### 🆕 `customer` block — kisne pay kiya

Pehle is row par grahak ka **kuch bhi** nahi aata tha: na naam, na koi id. Amount
aur timestamp thi, aur ye batane ka koi zariya nahi tha ki ye bikri kiski thi.

```json
"customer": { "fullName": "Asha Menon", "uniqueId": "TDC000001", "email": "asha@example.com" }
```

| Field | Type | Notes |
|---|---|---|
| `customer.fullName` 🆕 | string | Grahak ka **aaj** ka naam · 🟡 account delete ho chuka ho to **sale ke waqt ka** naam (claim snapshot) |
| `customer.uniqueId` 🆕 | string | Support conversation me quote karne wala handle |
| `customer.email` 🆕 | string | Jis bikri ke baare me aapko baat karni ho, uske liye · 🟡 deleted customer par nahi aata |
| `customer.isDeleted` 🆕 | boolean | `true` = grahak ne account delete kar diya (P12.1). Naam ke saath **"Account deleted"** badge dikhayein. Bikri, amount, settlement — kuch nahi badalta. [release guide](./release_v1_12_vendor_panel_guide.md) |

⚠️ In me se koi bhi required field nahi hai. Set na ho to key **gayab** hoti hai,
`null` nahi — `customer?.fullName ?? "—"` se padhein. Grahak ka record hi na mile
to poora `customer` block gayab hota hai.

🔴 **Number nahi milta, aur yahi asli line hai.** `mobile` aur `whatsappNumber`
is block me **nahi** aate, aur na hi `_id` / `customerId`.

Mailbox asynchronous hai — grahak khole to khole. **Number bajta hai**, aur har
counter ko har kharidne wale ka number de dena bilkul alag baat hai; yahi wo field
hai jo customer list ko bikne layak banata hai.

⚠️ **Do flag hain, ek nahi.** `viewer.canSeeCustomerContact` poochta hai *"koi
channel dikh raha hai?"* — aapke liye ab **`true`**. `viewer.canSeeCustomerPhone`
poochta hai *"number dikh raha hai?"* — aapke liye hamesha **`false`**. Agar aapka
panel poora customer block `canSeeCustomerContact` par chhupata tha, to ab use
`canSeeCustomerPhone` par chhupana hai.

⚠️ `uniqueId` diya gaya hai, `customerId` nahi. Internal ObjectId jaan-boojh kar
rok rakha hai, aur `customer._id` bhi isiliye hata diya gaya hai — warna wahi id
ek key andar se wapas mil jaati.

⚠️ Grahak ne account band kar diya ho to bhi naam aata hai. Bikri ho chuki hai
aur uska settlement aapko milna hai; row ko pehchaan-rahit kar dena aapke paas ek
aisi line chhod deta jise aap khol hi nahi sakte.

### 🆕 `voucherVersion` block — kaunsa version bika

```json
"voucherVersion": { "_id": "…", "versionCode": "VCH-00042317-V3", "versionNumber": 3 }
```

| Field | Type | Notes |
|---|---|---|
| `voucherVersion.versionCode` 🆕 | string\|null | `VCH-########-V#`. Wahi code jo voucher listing par dikhta hai |
| `voucherVersion.versionNumber` 🆕 | number\|null | Kaunsa version |

⚠️ **`voucher.versionNumber` yahan nahi aata** — payment row ka `voucher` block
aapke liye chaar field tak simta hai. Ye block hi ekmatra jagah hai jahan se
aapko pata chalta hai ki bikri kis version se hui thi.

⚠️ Version archive, pause ya delete ho chuka ho to bhi `versionCode` aata hai.
Bikri us version se hui thi, aur uska record badalta nahi.

---

## 84. GET /voucher-claims/payments/:transactionId — ek payment

**Access:** 🔒 `verifyJwtToken`

| Status | Kab |
|---|---|
| `404` | Id galat **ya** row kisi aur ka — dono ka ek hi jawab |
| `403` | Dusre brand ka, ya `SUB_VENDOR` ke liye dusre outlet ka |
| `422` | Malformed id |

### 🆕 `brand.isFollowed` / `brand.isAvoided` — aapko hamesha `false` milenge

Ye do keys customer app ke brand card ke liye hain, aur ye **jisne page khola**
uske baare me hain — brand ke baare me nahi. Vendor, sub-vendor aur admin ka koi
Customer record hota hi nahi, to unke liye dono hamesha `false` hote hain.

⚠️ **Inhe khareedne wale ka status mat samjhiye.** Ye jaan-boojh kar buyer ka
status **nahi** batate. Batana matlab aapko ye bata dena ki *"is grahak ne aapko
avoid kar rakha hai"* — wahi kism ki baat jise `canSeeCustomerContact: false`
rokta hai. Code me ye caller se resolve hote hain, `transaction.customerId` se
nahi, taaki ye galti mumkin hi na rahe.

Vendor panel me inhe render karne ki koi wajah nahi hai — ye ek hi response shape
teen audience ko dene ki keemat hain, feature nahi.

⚠️ **Apna subscription payment yahan nahi khulta.** Ek hi collection vendor subscriptions
aur customer voucher claims dono rakhti hai; `purpose` scope hi use rokta hai. Apni
subscription ke liye `/transactions/...` use karein.

`brand` ka shape #83 jaisa hi — `merchantId` 🆕 aur `subscription` 🔴 samet.

### 🆕 `customer` aur `voucherVersion` yahan **top level** par hain

Listing me ye dono row ke **andar** aate hain, kyunki wahan row hi payment hai.
Yahan response ek bundle hai, to ye dono `brand` aur `outlet` ke **bagal me**
baithte hain — inke bilkul wahi do siblings jinke saath ye listing me the:

```json
{ "payment": {…}, "claim": {…}, "brand": {…}, "outlet": {…},
  "customer": { "fullName": "Asha Menon", "uniqueId": "TDC000001", "email": "asha@example.com" },
  "voucherVersion": { "versionCode": "VCH-00042317-V3", "versionNumber": 3 } }
```

Fields aur unke niyam #83 jaise hi. Row maujood na ho to key **gayab nahi hoti**,
`null` aati hai.

---

## 🆕 84a. Paanch naye section — poori detail

Ye paanch key `payment` / `claim` / `brand` / `outlet` ke **bagal me** aati hain.
Purani keys **kuch nahi badlin** — koi app tootegi nahi.

```json
{
  "payment": {…}, "claim": {…}, "brand": {…}, "outlet": {…},
  "customer": {…}, "voucherVersion": {…}, "viewer": {…},

  "outletDetail": {…},   "voucher": {…},   "pricing": {…},
  "paymentInfo": {…},    "settlement": {…}
}
```

⚠️ Jaan-boojh kar thoda **overlap** hai — `pricing.billAmount` aur
`payment.voucher.billAmount` ek hi number hain. Ye keemat hai teen panel ek saath
na todne ki. Naye code me naye section padhein; purani keys baad me hatengi.

⚠️ Ye paanchon **`GET /voucher-claims/:claimId` aur `/code/:claimCode` par bhi**
bilkul isi shape me aate hain (#85, #86).

---

### `outletDetail` — outlet poora

```json
"outletDetail": {
  "_id": "…", "uniqueId": "TDO17…", "storeId": "TS-4K2M-9XQ7-RB3N",
  "outletType": "FRANCHISE",
  "description": "The MG Road counter",
  "logo": "https://…", "coverImage": "https://…",
  "email": "mgroad@cafemocha.com", "mobile": "9811111111", "whatsappNumber": "9811111112",
  "geo": { "type": "Point", "coordinates": [75.8577, 22.7196] },
  "address": {
    "addressLine1": "12 MG Road", "addressLine2": "Above Kalyan Jewellers",
    "landmark": "Opposite the clock tower",
    "city": "Indore", "district": "Indore", "state": "Madhya Pradesh",
    "country": "India", "zipcode": "452001",
    "formattedAddress": "12 MG Road, Indore, Madhya Pradesh 452001",
    "geo": { "type": "Point", "coordinates": [75.8577, 22.7196] }
  },
  "brandId": "…", "joinedDate": "…", "workHoursId": "…", "isActive": true
}
```

> 🔴 **`outlet.address` pehle kabhi aata hi nahi tha.** Purana code `SubBrand` se
> `.select("uniqueId storeId address")` karta tha — aur `SubBrand` par `address`
> field hai hi nahi; address alag `Location` document par `locationId` ke peeche
> hai. Aisi projection **error nahi deti**, chup rehti hai. Isliye har call par
> wo key gayab aati thi aur kahin kuch nahi kehta tha.

⚠️ Outlet ka address set na ho to `address: null` — key gayab nahi hoti.
⚠️ `geo` set na ho to **poori key gayab** hoti hai, `[0,0]` nahi — `[0,0]` Gulf of
Guinea ka asli point hai aur nearest-search use asli maanti hai.
⚠️ `email`/`mobile` **outlet ke** hain, grahak ke nahi — ye storefront par likhe
rehte hain.

---

### `voucher` — kya becha gaya

```json
"voucher": {
  "voucherId": "…", "voucherVersionId": "…", "versionNumber": 3,
  "snapshot": { "name": "Weekend Special", "bannerUrl": "https://…", "imageUrl": "https://…" },
  "offer":    { "title": "20% off", "minBillAmount": 100,
                "discountType": "PERCENTAGE", "discountValue": 20, "maxDiscountAmount": 250 },
  "version":  { "versionCode": "VCH-00042317-V3", "versionNumber": 3,
                "name": "Weekend Special", "description": "…", "tags": ["weekend"],
                "status": "PUBLISHED", "startAt": "…", "endAt": "…",
                "images": [...], "offers": [...],
                "pausedAt": null, "pauseReason": null, "isActive": true }
}
```

| Block | Kya hai |
|---|---|
| `snapshot` 🆕 | **Frozen** — jo grahak ne kharidte waqt dekha tha. Rename, republish, delete — kuch isse nahi badalta |
| `offer` 🆕 | **Frozen** — theek wahi offer jo is bikri me laga, poori terms ke saath |
| `version` 🆕 | **Live** — "ye voucher aaj kya hai" |

> 🔴 **`offer` ab tak kisi ko nahi milta tha.** `claimRecordProjection`
> `voucherSnapshot`, `brandSnapshot` aur `outletSnapshot` ko naam deti thi aur
> `offerSnapshot` ko kabhi nahi — yaani *"is bikri me kaunsa offer laga aur kin
> terms par"* ka jawab **kisi bhi surface par, kisi bhi role ke liye** tha hi
> nahi, jabki data claim par frozen pada tha.

⚠️ `snapshot` aur `version` dono jaan-boojh kar hain. Purani bikri ka hisaab
frozen copy se milta hai; uspar aaj kya karna hai wo live record batata hai.
⚠️ Moderation ki baatein (`rejectionReason`, `approvedBy`, `reviewedAt`) **sirf
admin ko**. `pauseReason` aapki apni note hai, wo aapko milti hai.

---

### `pricing` — poora frozen price

```json
"pricing": {
  "currency": "INR", "billAmount": 1000,
  "offerTitle": "20% off", "offerDiscountType": "PERCENTAGE", "offerDiscountValue": 20,
  "offerMinBillAmount": 100, "offerMaxDiscountAmount": 250, "offerDiscount": 200,
  "promoCode": "WELCOME50", "promoAppliesTo": "NET_BILL", "promoBase": 800, "promoDiscount": 50,
  "vendorPromoCost": 25,
  "netBill": 800,
  "convenienceFee": 10, "feeSlabSize": 500, "feePerSlab": 5, "feeMaxFee": 50,
  "isGstEnabled": false, "gstPercentage": 0, "isGstInclusive": true,
  "cgst": 0, "sgst": 0, "igst": 0, "gstAmount": 0, "taxOnTop": 0,
  "placeOfSupplyState": "Madhya Pradesh", "placeOfSupplyStateCode": "23",
  "totalPayable": 760, "amountInPaise": 76000, "youSaved": 250,
  "commissionPercent": 0, "commissionAmount": 0, "commissionTax": 0, "commissionDeduction": 0,
  "vendorPayable": 775,
  "amountRefunded": 0, "isRefunded": false, "refundStatus": null
}
```

Teen band hain:

| Band | Kise | Kya |
|---|---|---|
| Bikri | sabko | bill, offer terms, promo, netBill, fee, tax, total, youSaved |
| Aapka side | **vendor** + admin | `vendorPromoCost`, `commission*`, `vendorPayable` |
| Hamara side | **sirf admin** | `platformPromoCost`, `gatewayFee`, `netReceived` |

🔴 **`platformPromoCost`, `gatewayFee` aur `netReceived` aapko nahi aate.** Ye
Trydood ka margin hai — Razorpay ne humse kya liya aur campaign ka kitna hissa
humne bhara. Yahi refusal aur teen jagah likha hai.

⚠️ `commissionAmount` / `commissionDeduction` **aate hain**, aur ye jaan-boojh
kar hai: ye aapke settlement statement par pehle se dikhte hain, to per-payment
view me chhupana usi statement se takraata. Jo chhupa hai wo hamari *kamai*, jo
dikhta hai wo aapki *kataoti*.

⚠️ `convenienceFee` aur GST **grahak se** liye gaye hain, aapse kaata hua nahi.
Ye isliye dikhta hai ki warna `totalPayable` (760) aur aapki supply (800) ka
hisaab nahi milta. `feeSlabSize`/`feePerSlab` saath aate hain kyunki slab admin
config hai aur uski koi history nahi — *"₹10 kyun?"* ka jawab sirf claim par
frozen copy se milta hai.

---

### `paymentInfo` — paisa kaise aaya

```json
"paymentInfo": {
  "transactionId": "…",
  "gatewayPaymentId": "pay_RxK2…", "gatewayOrderId": "order_RxK1…",
  "invoiceNumber": "TD/VCH/26-27/000412",
  "acquirerTransactionId": "ACQ12345678",
  "amount": 760, "currency": "INR", "status": "captured", "verified": true,
  "method": { "type": "upi", "vpa": "asha@okhdfcbank", "vpaHandle": "okhdfcbank",
              "isInternational": false },
  "createdAt": "…", "paidAt": "…", "fundsReceivedAt": "…",
  "paidTo": { "brandId": "…", "brandName": "cafe mocha", "merchantId": "TM-…",
              "outletId": "…", "storeId": "TS-…", "outletUniqueId": "TDO…" }
}
```

**Teen alag waqt, aur ye aksar dinon door hote hain:**

| Field | Kab |
|---|---|
| `createdAt` | order khula |
| `paidAt` | payment capture hua, claim redeem hui |
| `fundsReceivedAt` | Razorpay ne **Trydood ke** bank me settle kiya |

⚠️ `fundsReceivedAt` hi wo ghadi hai jispar aapka payout chalta hai — `paidAt`
nahi. Isliye ye aapko dikhta hai.

> 🔴 **Google Pay aur PhonePe me farq nahi bataya ja sakta.** Razorpay UPI
> payment par sirf `method: "upi"` aur `vpa` bhejta hai — **app ka naam payload
> me hai hi nahi**. `@` ke baad ka handle PSP bank batata hai, aur convention se
> `@ok*` Google Pay aur `@ybl` PhonePe hota hai — par wo **convention hai, fact
> nahi**, aur PSP partner badalne par badal jaata hai.
>
> Isliye `vpaHandle` jo hai wahi likha jaata hai — handle — aur **usse koi app ka
> naam banaya nahi jaata**. Payment screen par galat app ka naam "UPI" likhne se
> **bura** hai: pehla ek aisa fact hai jispar padhne wala amal karega.
>
> ⚠️ `method.wallet` iska jawab **nahi** hai. Wo tabhi set hota hai jab `type`
> `wallet` ho — PhonePe *wallet* payment, PhonePe-the-UPI-app nahi.

> ⚠️ **Card ki details store hi nahi hotin.** `mapPayment` sirf `cardId` likhta
> hai — network, last4, issuer Razorpay ke payload me aate hain par likhe nahi
> jaate. To "Visa ••4242" kisi bhi payment par nahi dikhaya ja sakta, purane par
> bhi nahi. Ye settle path ka change hai aur sirf **naye** payments bharega;
> jaan-boojh kar is read ke saath nahi kiya gaya.

⚠️ `gatewayAccount`, `gateway`, `acquirerData` aur gateway ke error codes **sirf
admin ko** — wo hamari plumbing hai.

---

### `settlement` — aapka payout

> 🔴 **Ye Trydood se aapko jaane wala paisa hai — Razorpay se Trydood ko aane
> wala nahi.** Ek hi row par do alag cheezein "settlement" kehlaati hain:
>
> | | Kya |
> |---|---|
> | `settlement` section (ye) | **Trydood → vendor** |
> | `razorpaySettlementId` · `fundsReceivedAt` | Razorpay → Trydood (hamari banking) |
>
> Doosri cheez `paymentInfo` me hai aur sirf admin ko dikhti hai.

```json
"settlement": {
  "state": "PAID",
  "isSettled": true,
  "paidToVendorAt": "2026-09-14T09:12:00.000Z",
  "hold": { "isHeld": false },
  "record": {
    "_id": "…", "settlementNumber": "TD/STL/26-27/000123",
    "status": "PAID", "statusLabel": "Paid",
    "periodStart": "…", "periodEnd": "…", "cycleType": "DAILY",
    "grossCollected": 760, "commissionDeduction": 0, "vendorPromoCost": 25,
    "refundAdjustment": 0, "chargebackAdjustment": 0,
    "reserveHeld": 0, "reservePercent": 0, "reserveLabel": null,
    "netPayable": 775, "transactionCount": 1,
    "approvedAt": "…", "paidAt": "…", "payoutProvider": "MANUAL_BANK"
  },
  "bank": {
    "accountHolderName": "Cafe Mocha LLP",
    "maskedAccountNumber": "XXXXXX4521",
    "accountLast4Digits": "4521",
    "ifscCode": "HDFC0001234",
    "bankName": "HDFC Bank"
  },
  "legs": [
    { "legNumber": 1, "amount": 400, "status": "PAID", "utr": "UTR000000000001",
      "mode": "NEFT", "provider": "MANUAL_BANK", "bankLast4": "4521",
      "initiatedAt": "…", "paidAt": "…" },
    { "legNumber": 2, "amount": 375, "status": "PAID", "utr": "UTR000000000002",
      "mode": "IMPS", "provider": "MANUAL_BANK", "bankLast4": "4521",
      "initiatedAt": "…", "paidAt": "…" }
  ]
}
```

**`state` — is payment ki apni position:**

| `state` | Matlab |
|---|---|
| `NOT_SETTLED` | abhi kisi payout me nahi gaya. **Pehle ek-do din har payment aisa hi hota hai** |
| `ON_HOLD` | hold laga hai, payout se bahar hai — `hold.reason` wajah batata hai |
| `IN_SETTLEMENT` | payout ban chuka hai, abhi paisa gaya nahi |
| `PAID` | payout ho gaya |
| `PAYOUT_FAILED` | NEFT bounce hua — `record.failureReason` dekhein |

> ⚠️ **"Settlement transaction id" ek field nahi, `legs` ki list hai.** Bada
> payout do NEFT me toda ja sakta hai, aur bounce hone par retry **naya leg**
> banata hai. Yahi wajah hai ki `PayoutLeg` alag model hai — ek `payoutUtr`
> column doosra UTR chup-chaap kho deta.
>
> Jo reference aap bank statement par dhoondhenge wo `legs[].utr` hai.

> 🔴 **Poora account number kahin store hi nahi hota.** `bank` block settlement
> ke **snapshot** se aata hai, jisme `maskedAccountNumber` aur
> `accountLast4Digits` hi rakhe jaate hain — poora number sirf `Bank` document
> par hai aur wahan se yahan **kabhi copy nahi hota**. Ye design hai: payout
> statement bank settings page se kahin zyada baar padha, log aur forward hota hai.
>
> ⚠️ `bank` **snapshot** hai, aaj ka account nahi. Aapne payout ke baad bank
> badal liya ho to bhi yahan wahi dikhega **jahan paisa sach me gaya tha** — warna
> record us payout ke bare me jhoot bolta.

⚠️ `needsRevalidation`, `approvedBy`, `failureNote`, `taintedTransactionIds` aur
`legs[].providerReference` **sirf admin ko**. `record` ka shape wahi hai jo
`GET /settlements/:settlementId` deta hai — ek hi projection, do jagah, to dono
kabhi alag nahi ho sakte.

---

## 85. GET /voucher-claims/:claimId — ek claim, timeline ke saath

**Access:** 🔒 `verifyJwtToken`

`claim` · `payment` · `brand` · `outlet` · **`customer`** 🆕 · **`voucherVersion`** 🆕 ·
**`outletDetail`** 🆕 · **`voucher`** 🆕 · **`pricing`** 🆕 · **`paymentInfo`** 🆕 ·
**`settlement`** 🆕 · **`timeline`** · `viewer`

`brand` me `merchantId` 🆕 aur `subscription` 🔴 bhi aate hain (#83 dekhein).
`brandSnapshot` par koi asar nahi — wo claim ke waqt ka frozen naam hai aur
waisa hi rahega.

⚠️ **Paanchon naye section yahan bilkul wahi hain jo #84a me hain** — wahi shape,
wahi role ke niyam, wahi helper. Ye do page ek hi screen se khulte hain, to inme
se ek par section hona aur doosre par na hona sabse mushkil-se-dikhne wala bug
hai. Poora reference [#84a](#-84a-paanch-naye-section--poori-detail) me hai.

`customer` aur `voucherVersion` ka shape bhi #84 jaisa hi hai. `GET /voucher-claims`
listing ki har row par bhi yahi dono block aate hain (par paanch naye section
**sirf detail par** hain, listing par nahi — ek listing row par poora settlement
aur poora voucher version bhejna page ko bhaari kar deta).

Timeline har audience ke liye **banayi** jaati hai, chhaani nahi. Aapko har row se
`label` · `at` · `fromStatus` → `toStatus` · `by` milta hai. Kaccha audit row `snapshot`
me poora pricing block rakhta hai (`platformPromoCost` samet) aur `reason` staff ka note
hai — dono me se kuch nahi aata.

---

## 86. GET /voucher-claims/code/:claimCode — counter par verify

**Access:** 🔒 `verifyJwtToken`

Counter par grahak code dikhaata hai, staff yahan daalta hai: **kitna pay hua, kaunsa
offer, kab, kaunsa outlet** — aur ab **kaun** aur **kaunsa version** bhi.

### 🆕 `customer`, `voucherVersion` aur paanchon section

Ye #85 wala hi endpoint hai — **service ek hi hai**, to response bilkul wahi.
`customer.fullName` aur `customer.uniqueId` top level par aate hain, aur
`outletDetail` · `voucher` · `pricing` · `paymentInfo` · `settlement` bhi
([#84a](#-84a-paanch-naye-section--poori-detail)).

Counter par sabse kaam ke do badlaav:

- staff ab code ke saath **naam** bhi milaa sakta hai, ObjectId padhne ki jagah;
- `voucher.offer` batata hai ki **is bikri me kaunsa offer laga tha aur kin terms
  par** — jo pehle kahin dikhta hi nahi tha.

⚠️ Grahak ka **number** phir bhi nahi aata (`viewer.canSeeCustomerPhone: false`).
Code sahi hai aur naam mel khaata hai — pehchaanne ke liye itna hi chahiye; grahak
ko phone karna counter ka kaam nahi hai.

⚠️ **Code lookup ko narrow karta hai, authorise nahi karta.** Dusre brand ya dusre outlet
ka code `403` deta hai — kisi aur ki screen se padha gaya code kuch nahi kholta.

Code `TD-` + 6 characters `34679ACDEFGHJKMNPQRTUVWXY` me se. `0/O`, `1/I/L`, `5/S`, `2/Z`,
`8/B` chhode gaye hain kyunki ye counter par bolkar padhe jaate hain. Galat character wale
code par `422` *"mistyped character"* — `404` lagta hai claim maujood hi nahi.

> **Phase 2 me yahi surface redeem karega.** Uske saath dobara-scan ka samajhdaar jawab
> aur reversal bhi aayenge — teeno ek saath. Sirf scan deploy karna grahak ko phansa deta
> hai: scan chala nahi, saamaan mila nahi, aur *"already redeemed"*.

---

# Refund APIs 🆕

**Aap tay karte hain, Trydood sirf nikaalta hai.** Normal raaste par Trydood doosra gate
nahi hai — aap approve karein, paisa chala jaata hai.

## ⚠️ Aapke paas ek window hai

`refund.vendorApprovalHours` (default **24**), aur wo `vendorRespondBy` par row me likhi
hoti hai. Beet gayi to request **aapki rehti hi nahi** — Trydood ke paas chali jaati hai,
aur aap uspar kuch nahi kar sakte (`409` *"already gone to Trydood for review"*). Do
reminder pehle aate hain, taaki timeout kabhi achanak na ho.

Ek chup outlet grahak ka paisa nahi rok sakta — par window ke andar faisla aapka hi hai.

## 87. GET /refunds — mere brand ki refunds

**Access:** 🔒 `verifyJwtToken` — `VENDOR` aur `SUB_VENDOR` dono

`SUB_VENDOR` token isi URL par **sirf apne outlet** ki rows paata hai.

| Param | Notes |
|---|---|
| `open=true` | **Worklist** — sabse purani upar, kyunki wahi timeout ke sabse kareeb hai aur usi grahak ne sabse lamba intezaar kiya |
| `status` | `REQUESTED · VENDOR_APPROVED · VENDOR_REJECTED · VENDOR_TIMEOUT · ADMIN_APPROVED · ADMIN_REJECTED · ADMIN_OVERRIDE · PROCESSING · COMPLETED · FAILED · CANCELLED` |
| `claimCode` · `outletId` · `from` / `to` | Narrow karne ke liye |

### Aapko kya dikhta hai

| Field | Aapko | Kyun |
|---|:-:|---|
| `reasonNote` | ✅ | Grahak ne kya kaha — aapke faisle ka poora aadhaar |
| `split.vendorClawback` | ✅ | Aapse kitna katega |
| `split.vendorPromoReversal` | ✅ | Promo me aapka hissa, wapas |
| `split.platformPromoReversal` · `gatewayFeeAbsorbed` | ❌ | Hamara margin — commercial disclosure |
| `vendorNote` | ✅ (apna) | |
| `adminNote` · `overrideReason` | ❌ | Staff-to-staff, aur override aapke khilaf liya faisla naam leta hai |
| `customerId` | ❌ | Privacy |

⚠️ `split` me hamara promo hissa aur MDR **usi sub-document par** hain jis par
`vendorClawback` hai, jo aapko sach me chahiye. Isiliye ye faisla `refundProjection()` me
**ek jagah** hota hai.

`canDecide` response me **bataya** jaata hai — panel ko status se andaza nahi lagana chahiye.

---

## 88. PATCH /refunds/:requestId/approve — haan

**Access:** 🔒 `isVendorOrSubVendor` — `VENDOR` / `SUB_VENDOR` (apne outlet ka)

| Field | Zaroori | Notes |
|---|:-:|---|
| `approvedAmount` | — | Na do to poora |
| `note` | — | |

### ⚠️ Rakam **ghat** sakti hai, **badh nahi**

*"Aadha order theek tha, starter nahi"* asli jawab hai, aur rakam kam karna use dene ka
tareeka hai. Badhana grahak ne jo maanga uski approval nahi — wo naya faisla hai, aur is
step par ek extra shunya **das guna** pay out kar deta us aadmi ko jisne maanga hi nahi.
`422` milega.

Split wahin **dobara freeze** hota hai — jo paisa asal me hilega wahi block me likha hona
chahiye.

Hold **laga rehta hai**: paisa abhi bhi wapas jaana hai.

> **Do log ek hi request nahi tay kar sakte.** `status` update filter ka hissa hai. Owner
> aur outlet manager ek hi request dekh sakte hain; iske bina dono clicks lagte aur doosra
> pehle ko chup-chaap mita deta — yaani grahak ka jawab is par nirbhar karta ki kaun dheema
> tha. Haarne wale ko `409` milta hai jo **batata hai kya hua**, sirf ye nahi ki nakaam raha.

---

## 89. PATCH /refunds/:requestId/reject — na

**Access:** 🔒 `isVendorOrSubVendor` — `VENDOR` / `SUB_VENDOR`

`note` **zaroori** (min 3 chars). Jab grahak inkaar ko chunauti de, admin ke paas sameeksha
karne ko yahi ek cheez hoti hai — akela *"rejected"* har appeal ko phone call bana deta hai.

⚠️ Aapka note **grahak ko kabhi nahi dikhta**. Wo staff ke liye hai.

### `settlementHold` yahin hattta hai

Refund maangte hi aapke us claim ka paisa har settlement se bahar ho jaata hai. Reject
karne par wo **wapas aa jaata hai**.

> Ye ulta utna hi khatarnak hai: jo hold koi na hataaye wo aapka paisa **hamesha ke liye**
> har aane wali settlement se bahar kar deta hai — chup-chaap, kyunki eligibility predicate
> bas match karna band kar deta hai. Koi error nahi aata. Isiliye teeno terminal states se
> release bulaya jaata hai.

Ek apwaad: us payment par **chargeback** khula ho to hold nahi hattta. Use hataana explicit
admin action hai — refund ki logic se hataane ka matlab hota wo paisa settle kar dena jise
bank usi waqt wapas kheench raha hai.

---

## 90. GET /refunds/:requestId — ek refund

**Access:** 🔒 `verifyJwtToken`

`refund` · `claim` · **`timeline`** · `viewer`. Timeline claim ki hai, aur har audience ke
liye **banayi** jaati hai — kaccha audit row `snapshot` me poora pricing block rakhta hai
(`platformPromoCost` samet).

---

## Refund ke notifications

| Kab | Severity | Kya |
|---|:-:|---|
| Refund maanga gaya | ⚠️ WARNING | *"Please respond by \<date\> — after that it goes to Trydood"* |
| Window band ho rahi hai | ⚠️ WARNING | Do nudges, adhe aur teen-chauthai par |

WARNING isliye ki deadline hai, aur use chookne par faisla aapke haath se nikal jaata hai.

---

# Appendix A — Not For Vendor Panel

Ye 62 endpoints backend me hain par vendor panel inko use na kare. Zyada tar ab properly gated hain (`403` denge), par kuch pe abhi bhi role check nahi hai — un pe app ko khud discipline rakhni hogi.

### 🔒 Properly gated — `403` aayega

| Module | Endpoints | Gate |
|---|---|---|
| **Promo Codes — sirf management** ⚠️ | `POST /promoCodes/create` · `GET /get-all` · `GET /reports` · `GET /get/:id` · `PUT /update/:id` · `DELETE /delete/:id` | `router.use(isAdmin)` |

> ⚠️ **`/promoCodes` poora module ab is appendix me nahi hai.** `GET /promoCodes/vendor/get-all` **vendor panel ka apna endpoint hai** — [#67a](#67a-get-promocodesvendorget-all-) me documented. Upar wali list sirf **management** ki hai; `GET /get-all` (admin listing) aur `/vendor/get-all` (vendor listing) do alag endpoints hain, ek naam ki wajah se confuse mat kariye.
| **Subscription admin ops** | `POST /subscribeds/admin/grant` · `PUT /admin/cancel` · `GET /admin/get-all` · `GET /admin/forfeited` · `PUT /admin/forfeited/compensate` · `PUT /admin/resync` | `isAdmin` |
| **Webhook ops** | `GET /transactions/webhook/events` · `GET /webhook/events/:eventId` · `POST /webhook/replay/:eventId` · `GET /transactions/disputes` | `isAdmin` |
| **Voucher approval** | `POST /vouchers/review/:versionId` | `isAdmin` |
| **Brand verification review** | `GET /brands/admin/verifications` · `PUT /brands/admin/verifications/:brandId/review` | `isAdmin` |
| **Notification broadcast** | `POST /notifications/broadcast` | `isAdmin` |
| **Platform settings** | `GET /settings/get` · `PUT /settings/update` | `isAdmin` |
| **Subscription plan writes** | `POST /subscriptions/create` · `PUT /update/:id` · `DELETE /delete/:id` | `isAdmin` |
| **Master data writes** | `POST /categories/create` · `PUT /update/:id` · `DELETE /delete/:id` · `POST /subCategories/:categoryId/create` · `PUT /update/:id` · `DELETE /delete/:id` | `isAdmin` |
| **Legal writes** | `POST\|PUT\|DELETE /terms-and-conditions/*` (3) · `POST\|PUT\|DELETE /privacy-and-policies/*` (3) | `isAdmin` |
| **Admin auth** | `POST /auth/register` | `isAdmin` — pehla admin `scripts/seedAdmin.js` se banta hai |
| **Password sign-in** 🆕 | `POST /auth/login` · `POST /auth/set-password` · `POST /auth/forgot-password` · `POST /auth/reset-password` | ADMIN-only. `login`/`forgot`/`reset` routes public hain par unke validator `role` ko `ADMIN` tak seemit karte hain → vendor ko `422`. `set-password` pe `isAdmin` hai → `403`. [Details](#79-password-flow---ab-vendor-ke-liye-nahi) |

### ⚠️ Reachable hai, par vendor ke liye nahi — app khud na call kare

Neeche wale endpoints pe koi **role** gate nahi hai (sirf `verifyJwtToken`), to vendor token
technically pahunch jaata hai. Wo vendor panel ke liye design nahi hue — inhe call karna
matlab customer ka data ya customer ka behaviour vendor UI me le aana.

| Endpoint | Kyun nahi |
|---|---|
| `GET /vouchers/customer/get-all` · `/get/:voucherId` · `POST /customer/voucher/preview` · `GET /brands/customer/get-all` · `/get/:brandId` · `/get/:brandId/vouchers` | ⚠️ **Ye chhe `optionalAuth` par hain** — vendor token bhi chal jaata hai. Customer browsing (brand cards, profile, voucher list, checkout preview). Vendor ke liye iska koi matlab nahi; viewer flags (`isFollowed`, `isUsed` …) vendor ke liye hamesha `false` |
| `POST\|PUT\|GET\|DELETE /banners/*` (5) | ✅ Ab `isAdmin` — vendor token pe `403` |
| `POST\|PUT\|GET\|DELETE /promotionalTickers/*` (5) | ✅ Ab `isAdmin` — `403` |
| `GET /banners/customer/active` · `GET /promotionalTickers/customer/active` | 🌐 **Public** (guest app ke home screen ke liye) — vendor ko bhi `200`. Panel inhe call na kare |
| `POST /locations/upsert` | ✅ Ab `isCustomer` — `403` |
| `POST /follows/toggle/:brandId` · `GET /follows/get-all` | ✅ Ab `isCustomer` — `403` |
| `POST /brandAvoidances/toggle/:brandId` · `GET /brandAvoidances/get-all` | ✅ Ab `isCustomer` — `403` |
| `GET /showcase/get-brand-showcase/:brandId` · `GET /showcase/:brandId/video-clips` | 🌐 **Public** (guest brand profile) — vendor ko bhi `200`. Panel apne showcase ke liye vendor wale endpoints use kare. 🆕 (P3, live 2026-11-04): brand ka location wala outlet (ya switch ON par album) na ho to `404 BRAND_NOT_AVAILABLE` — isliye "preview" ke liye bhi ise mat padhein |
| `POST /transactions/webhook/razorpay` | Razorpay ka endpoint (public, HMAC-verified) |

> Jin rows pe ✅ hai wo pehle **bilkul ungated** the — is doc ke pichhle version me
> "gate nahi hai, discipline se mat call karo" likha tha. Ab discipline ki zarurat nahi,
> backend hi refuse karta hai.

Full categorization → [endpoints_category.md](./endpoints_category.md)

---

# Dispute evidence — vendor ka bayaan

Bank ne ek payment wapas maang liya (chargeback). Razorpay ko jawab bhejne se pehle vendor apna paksh record karta hai.

## `POST /disputes/:disputeId/evidence`
## `POST /transactions/disputes/:disputeId/evidence`

**Access:** 🔒 `isVendorOrSubVendor` — **outlet manager tak**, par 🔧 (2026-10-27, live 2026-11-04) outlet manager sirf **apne outlet** ke dispute par.

Body: `{ "note": "Customer ne counter par voucher redeem kiya, CCTV timestamp ke saath." }`

⚠️ **Gate `SUB_VENDOR` tak jaan-boojh kar pahunchta hai.** Jo insaan counter par tha wahi aksar jaanta hai ki hua kya — use bahar rakhne ka matlab hota sabse achhi gawahi ka na aana.

🔧 **Outlet tak seemit (2026-10-27, security sweep — live 2026-11-04).** Pehle check sirf brand ka tha, to koi bhi outlet manager apne brand ke **doosre outlet** ke dispute ka note badal sakta tha. Ab dispute ke peeche wala payment jis outlet par hua, sirf usi ka manager note de sakta hai; doosre outlet ka dispute `404 "Dispute not found."` (jaise maujood hi na ho). Outlet manager ke account par outlet na ho to `403`. Brand owner (`VENDOR`) pehle jaisa — brand ke saare disputes.

⚠️ Ye faisla **nahi** karta, sirf record karta hai. Dispute jeetne ya haarne ka jawab Razorpay se webhook par aata hai, aur wo bhi **out of order** aa sakta hai: `ledger_type_dispute_unique` isiliye dispute par keyed hai, transaction par nahi — ek der se aaya `lost` ek `won` ke baad aa sakta hai.

⚠️ **Do mount, ek hi handler.** `/disputes` naya saaf raasta hai, `/transactions/disputes/...` purana. Dono live hain, isliye dono documented hain — naya kaam naye wale par likhein.

Worklist (`GET /disputes`) khud is collection me nahi hai: uska gate koi role nahi maangta aur scope token se aata hai, isliye wo [admin doc](./super_admin_panel_api_doc.md) me hai. Vendor wahi endpoint call karke apne hi brand ke disputes dekh sakta hai; 🔧 outlet manager (2026-10-27, live 2026-11-04) sirf apne outlet ke — list aur `GET /disputes/:disputeId` dono me, ginti bhi usi ki.

| Code | Kab |
|---|---|
| `200` | Bayaan record ho gaya |
| `403` | `Only the outlet can add evidence to a dispute.` (admin / customer) · `No brand on this account.` · `No outlet is linked to this account.` (outlet manager ke account par outlet nahi — 🔧) |
| `404` | `Dispute not found.` — maujood nahi, **dusre brand ka**, ya 🔧 outlet manager ke liye **dusre outlet ka** (teeno ek jaisa jawab, taaki id ka hona pata na chale) |
| `409` | Dispute ka faisla ho chuka — note ab kuch nahi badalta |
| `422` | `note` khaali / 3 akshar se chhota |

---

# Appendix B — Known Issues

Ye backend issues hain jo vendor panel ko directly affect karte hain. **Status 2026-08-22 ko code ke against verify kiya gaya.** Full detail → [security_findings.md](./security_findings.md)

---

## ⚠️ Settlement aapka record hai, aapka form nahi

Settlement par vendor ke liye **koi write endpoint nahi** hai — na approve, na dispute,
na edit. Ye hamara record hai ki hum aapko kya de rahe hain. Ikhtilaf support se hota
hai, kyunki uske peechhe aksar koi disputed payment ya chargeback hota hai jispar
faisla abhi hua hi nahi.

`SUB_VENDOR` ko is baar **poora brand** dikhta hai, apna outlet nahi. Settlement poore
brand ke ek din ka hai; outlet se kaat kar dikhane ka matlab ek aisa figure jo aapke
dekhe kisi bhi cheez se match nahi karta — aur wo paisa chhup jaata jo brand ka sach
me bakaya hai. (Owner ne 2026-10-27 ke security sweep me ise **jaan-boojh kar** aise hi
rakhna maana — payments, claims, refunds aur disputes outlet tak seemit hain, settlement
nahi.)

---

## 91. GET /settlements — mere payouts

**Access:** 🔒 `verifyJwtToken` — `VENDOR` aur `SUB_VENDOR` dono

| Param | Notes |
|---|---|
| `status` | `DRAFT · PENDING_APPROVAL · APPROVED · PROCESSING · PAID · FAILED · ON_HOLD · REVERSED · CANCELLED · ABANDONED · CARRIED_FORWARD` |
| `open=true` | Jo abhi chal rahe hain |
| `settlementNumber` · `from` / `to` | Narrow karne ke liye |
| `page` · `limit` (max 100) | Default 20 |

Sort **`periodEnd` desc** — ye list *"pichhle hafte ka paisa aaya?"* ka jawab dene ke
liye padhi jaati hai.

> **Khaali list `404` nahi deti.** Pehle hafte wale brand ke paas koi settlement nahi
> hoti, aur wo bilkul sahi jawab hai — use "kuchh gadbad hai" jaisa dikhana galat hoga.

### Aapko kya dikhta hai

| Field | Aapko | Kyun |
|---|:-:|---|
| `grossCollected` · `commissionAmount` · `commissionTax` | ✅ | Apni kitaab se milane ke liye |
| `vendorPromoCost` · `refundAdjustment` · `chargebackAdjustment` | ✅ | Kya-kya kata |
| `reserveHeld` · `reserveReleased` · `netPayable` | ✅ | |
| `bankSnapshot.accountLast4Digits` · `bankName` | ✅ | Kahan bheja |
| 🆕 `bankSnapshot.accountHolderName` · `maskedAccountNumber` · `ifscCode` | ✅ | Kahan bheja, **theek-theek** — neeche dekhein |
| `bankSnapshot` me poora account number | ❌ | **Store hi nahi hota** — neeche dekhein |
| `payoutProvider` 🆕 | ✅ | NEFT/IMPS manually bheja gaya ya provider se |
| `needsRevalidation` | ❌ | Andar ka review state — aapke liye sach *"payout ruka hai"* hai |
| `taintedTransactionIds` | ❌ | Faisla hone se pehle disputed payments ke naam |
| `failureNote` | ❌ | Staff-to-staff — aapko `failureReason` (category) milta hai |
| `approvedBy` · `idempotencyKey` | ❌ | Kis admin ne sign kiya, aur andar ki plumbing |

### 🆕 `bankSnapshot` ab poora pata deta hai — par account number kabhi nahi

```json
"bankSnapshot": {
  "accountHolderName": "Cafe Mocha LLP",
  "maskedAccountNumber": "XXXXXX4521",
  "accountLast4Digits": "4521",
  "ifscCode": "HDFC0001234",
  "bankName": "HDFC Bank"
}
```

Pehle sirf `accountLast4Digits` + `bankName` aate the. Wo us ek sawaal ka jawab
nahi de paate jo payout na aane par hamesha poochha jaata hai — *"aapne kis
account me bheja?"* — kyunki ek hi bank me do account rakhne wale brand ko dono
haal me wahi do shabd dikhte hain.

> 🔴 **Poora account number yahan kabhi nahi aayega, kyunki wo yahan rakha hi
> nahi jaata.** Settlement ka `bankSnapshot` shuru se sirf masked form aur last 4
> rakhta hai; poora number sirf `Bank` document par hai aur wahan se yahan copy
> nahi hota. Ye design hai — payout statement bank settings page se kahin zyada
> baar padha, log aur forward hota hai.

⚠️ Ye **snapshot** hai, aaj ka account nahi. Payout ke baad aapne bank badla ho to
bhi yahan wahi dikhega **jahan paisa sach me gaya tha**. `paySettlement` bhi isi
frozen copy se bhejta hai, live record se nahi — warna approve aur NEFT ke beech
account badalne par ek aisa payout redirect ho jaata jise koi insaan pehle hi sign
kar chuka hai, aur **NEFT wapas nahi aata**.

### `statusLabel` — aapko enum nahi dikhta

| Status | Aap padhte hain |
|---|---|
| `DRAFT` / `PENDING_APPROVAL` | Being prepared |
| `APPROVED` | Scheduled for payout |
| `PROCESSING` | On its way to your bank |
| `PAID` | Paid |
| `FAILED` | Payout failed — we are on it |
| `ON_HOLD` | On hold — being checked |
| `REVERSED` | Reversed by the bank |
| `CANCELLED` / `ABANDONED` | Cancelled |
| `CARRIED_FORWARD` | Carried forward to the next payout |

`PENDING_APPROVAL` aapko waise kabhi nahi dikhta: aapki taraf se kuchh *"pending"* nahi
hai, paisa bas aa raha hai.

> ⚠️ Doosre brand ka `brandId` bhejne par **khaali page** milta hai, apne rows nahi.
> Scope aur filter kaate jaate hain, upar-neeche rakhe nahi — filter ka "chal gaya"
> dikhna wahi tareeka hai jisse koi aisi report bana leta hai jo kabhi lagi hi nahi thi.

---

## 92. GET /settlements/:settlementId — ek payout, legs ke saath

**Access:** 🔒 `verifyJwtToken` — apne brand ka

`settlement` · **`legs`** · `timeline` · `viewer`.

### `legs` — yahan UTR milta hai

Ek payout do NEFT me bhi ja sakta hai (badi rakam), aur bounce ke baad retry **nayi
leg** banata hai. Har leg apna `utr`, `mode`, `paidAt` aur `amount` rakhti hai.

**UTR wahi ek cheez hai** jo aap teen din baad apne bank statement par dhoondh sakte
hain jab paisa nahi dikhta. Isi liye ek `payoutUtr` field kaafi nahi thi.

### `timeline`

Har status badla, tareekh ke saath — sabse purana upar. `reason`, `performedBy` aur
`snapshot` **sirf admin ko** jaate hain: wo notes staff ne staff ke liye likhe hain aur
aksar kisi aise dispute ka naam lete hain jispar faisla hua hi nahi.

---

## 93. GET /settlements/:settlementId/transactions — statement lines

**Access:** 🔒 `verifyJwtToken` — apne brand ka

| Param | Notes |
|---|---|
| `page` · `limit` (max 200) | Default 50 |

Ye alag se paged hai kyunki vyast brand ka ek cycle sau-sau rows ka hota hai, aur
detail call zyadatar sirf *"kitna, aur kab"* ke liye padha jaata hai.

| Field | Aapko |
|---|:-:|
| `invoiceId` · `verifiedAt` · `fundsReceivedAt` · `amount` | ✅ |
| `voucher.billAmount` · `netBill` · `vendorPayable` · `vendorPromoCost` | ✅ |
| `voucher.platformPromoCost` · `gatewayFee` · `netReceived` | ❌ |

⚠️ Aakhri teen hamara margin hain, aur wo **usi sub-document par** baithe hain jispar
aapka `vendorPayable` hai — isi liye ye faisla ek jagah hota hai.

`fundsReceivedAt` **`verifiedAt` se alag** hai: pehla matlab Razorpay ne hamare bank me
paisa bheja, doosra matlab grahak ne pay kiya. T+N doosri se nahi, **pehli** se ginta
hai — warna hum wo paisa baant rahe hote jo abhi aaya hi nahi.

---

## Settlement ke notifications

| Kab | Severity | Kya |
|---|:-:|---|
| Payout bheja gaya | ℹ️ INFO | Rakam, account ke aakhri 4 digit, aur **UTR** |
| Payout bounce hua | ⚠️ WARNING | Category (account band, galat IFSC…), staff note nahi |
| Payout hold par gaya | ⚠️ WARNING | *"On hold — being checked"*, bina tafseel ke |

Har state ke liye notice **nahi** hai. `PENDING_APPROVAL` aur `APPROVED` aisi cheezein
hain jinke baare me aap kuchh kar nahi sakte, aur jispar amal na ho sake wo
notification logon ko un notifications ko ignore karna sikhaati hai jo matter karti
hain.

Hold wali notice me tafseel jaan-boojh kar nahi hai: jo cheez check ho rahi hai wo
aksar ek disputed payment hoti hai, aur uska naam lena do din ki der ko ek aise
chargeback par behes bana deta hai jispar abhi kisi ne faisla nahi kiya. Support
poochhne par bata deta hai — wo baat-cheet hai, push notification nahi.

**Poora settlement flow → [`settlement_flow.md`](./settlement_flow.md).**

---

## ✅ Jo fix ho gaya

### Shared default password — FIXED
**Pehle:** har OTP account (vendor + outlet included) ek hi hardcoded password pe banta tha, aur badalne ka koi raasta nahi tha.

**Ab:** `User.password` optional hai — OTP accounts bina password ke bante hain, aur password login **fail-closed** hai (jinhone set nahi kiya unpe chalta hi nahi).

**Vendor panel pe impact:** ⚠️ **"Set password" screen mat banayein.** Fix ke baad ek aur decision liya gaya — password sign-in **sirf admin** ke liye rakha gaya, kyunki vendor WhatsApp OTP se aata hai aur uspe password sirf ek chori hone layak credential hota. Poora flow [#7–9](#79-password-flow---ab-vendor-ke-liye-nahi) me hai.

### Subscription expiry — FIXED
**Pehle:** `brand.isSubscribed` kabhi `false` nahi hota tha, koi expiry job nahi tha.

**Ab:** `SUBSCRIBED_STATUS` source of truth hai, `getActiveSubscription` **read pe self-heal** karta hai (`status === ACTIVE && endDate > now`; queued `SCHEDULED` plan ka start aa gaya ho to use promote karta hai), aur 4 background jobs chalte hain (`expireSubscriptions`, `expireVouchers`, `sendExpiryReminders`, `releaseStalePromoReservations`).

**Vendor panel pe impact:** `GET /subscribeds/get` (#68) ke `isSubscribed` pe bharosa karein, `brand.isSubscribed` pe nahi.

### Checkout amount tampering — FIXED
**Pehle:** `amount` field checkout pe accept hota tha aur `amount || price` apply hota tha — koi bhi plan ₹1 me khareed sakta tha.

**Ab:** `amount` validator se hata diya gaya. Payable amount server-side compute hota hai.

### Outlet reactivation bug — FIXED
**Pehle:** `PUT /subBrands/update` pe `isActive` ka `.default(true)` tha — koi bhi update deactivated outlet ko chup-chaap reactivate kar deta tha.

**Ab:** `isActive` sirf tab apply hota hai jab explicitly bheja jaye.

---

## ✅ Pichhle round me jo band ho gaya

Ye sab is doc ke v1.0.0 me **open** listed the. Ab nahi hain — agar aapne inke liye
frontend me workaround likha tha, wo hata sakte hain.

| Tha | Ab |
|---|---|
| **Role enforcement — 35 endpoints ungated** | ✅ 149/149 accounted. Sirf 10 public hain (9 auth entry + Razorpay webhook). Showcase, locations, brandFeatures, workHours, subBrands, voucher versions — sab gated |
| **`?userId` param se kisi bhi user ka data** | ✅ Param hata diya gaya. `GET|PUT /users/*` hamesha token wale user pe chalte hain |
| **`GET /brands/get` PAN/GST/Bank customer ko** | ✅ Ab `isVendorOrAdmin`. Customer ke liye alag `/brands/customer/get/:brandId` hai jisme sensitive join **build hi nahi hota** |
| **`showcase/section/get-all` brand-scoped nahi** | ✅ Vendor apne brand pe pinned, admin global. `brandId` param ab support hota hai. **Ye endpoint ab bharosemand hai** |
| **Showcase ownership missing** | ✅ `resolveSectionForActor` — saare 11 showcase endpoints ab verify karte hain ki section aapke brand ka hai |
| **Verification history customer ko dikhti thi** | ✅ Ab `isVendorOrAdmin`, aur service me har role explicitly named hai |
| **Auth response me password hash** | ✅ `sanitizeUser()` — `password` aur `otp` har auth response se strip |
| **`FIXED` discount type kaam nahi karta** | ✅ Ab `FLAT` ka alias hai. Voucher offer form me teeno types dikha sakte hain |
| **Signup adha-adhoora reh jaata tha** | ✅ `User` + `Brand` ek transaction me. Purane toote accounts agli login pe khud repair ho jaate hain |
| **`isFirst` retry pe `false` ho jaata tha** | ✅ Ab verification state pe based hai. OTP na aaye to retry pe bhi `true` |
| **`brands/verifications/history` har request pe 500** | ✅ `isVendor is not defined` — live run me pakda gaya, 2026-08-27 |
| **Dono showcase reorder endpoints har request pe 500** | ✅ `id` vs `sectionId`/`mediaId` mismatch — live run me pakda gaya, 2026-08-27. Ye endpoints **kabhi** kaam nahi kiye the |

---

## ✅ Blockers (production se pehle) — band ho gaya

### 1. ✅ RESOLVED (2026-09-23) — WhatsApp OTP verify hota hi nahi tha

Pehle kisi ka WhatsApp number pata ho to koi bhi 6-digit OTP daal ke uske vendor
account me login kiya ja sakta tha. Dono lines — `sendOtp` aur `verifyOtp` — ab
live hain aur asli number par end-to-end test pass hua: code jaata hai, verify hota
hai, use hone ke baad dobara nahi chalta, 5 galat try pe mar jaata hai (5 = default; P12.0 (live 2026-11-04) se admin
setting `security.otp.maxVerifyAttempts`).

Ye vendor ke liye khaas matter karta tha: password login band hone ke baad WhatsApp
OTP hi ekmatra primary entry point hai.

**Vendor panel pe impact — ab actually karna hai:** naye error cases endpoint
[#2](#2-post-authverify-otp-whatsapp) ke notes me listed hain (`401` galat/expired,
`403` max attempts, `429` throttle). Inhe handle karna ab optional nahi hai.

> Email aur Mobile OTP flows hamesha intact the — bug sirf WhatsApp path me tha.

---

## 🟠 Ownership — abhi bhi khuli hai

Role gate lag gaya hai (customer ab in pe nahi aa sakta), par **vendor A abhi bhi vendor B
ka resource** touch kar sakta hai — service sirf ye check karti hai ki caller vendor hai,
ye nahi ki wo **is** brand ka vendor hai.

**Har vendor-*write* par ab check hai.** `resolveActorBrand`,
`resolveSectionForActor` aur `resolveLocationTarget` 28 services me chal rahe
hain; naya vendor-write likhte waqt inme se ek use karna hai, warna route ka gate
sirf itna kehta hai ki caller *koi* vendor hai.

### ✅ Do **read** endpoints bhi band ho gaye

`GET /subBrands/get-all` aur `GET /vouchers/versions/get-all` par role gate to
tha, par service `brandId` **query se** leti thi — to bina bheje **poore platform
ka data** aata tha, aur doosre brand ka `brandId` bhejne par uska.

Dono par ab wahi `scopeToActor` hai jo locations par laga, aur **har
caller-supplied filter ke baad** chalta hai, taaki upar ka koi filter dayra
badha na sake.

| Endpoint | Vendor | Outlet manager | Admin |
|---|---|---|---|
| `GET /subBrands/get-all` | apna brand | **sirf apna outlet** | sab |
| `GET /vouchers/versions/get-all` | apna brand | **apne brand ke sab** | sab |

Doosre brand ka `brandId` bhejne par ab `403` — chup-chaap apne rows nahi, kyunki
wo "filter ignore ho gaya" jaisa padha jaata.

⚠️ Outlet manager ke liye dono jaan-boojh kar alag hain: outlet listing usko
**sirf apne outlet** tak rakhti hai (bhai-outlets ke manager ki contact details
uska kaam nahi), par voucher listing **poore brand** ke vouchers deti hai —
voucher brand ka hota hai aur har counter par redeem hota hai, to outlet-level
cut wahi vouchers chhupa deta jo us counter par chalte hain.

🔴 Aur ek asli bug isi me mila: voucher listing me sub-vendor ko
`resolveActorBrand` se nahi guzara ja sakta. Wo helper `brand.userId ===
actor.userId` dekhta hai, aur outlet manager ka user id brand par hota hi nahi —
to wo apne hi brand ke vouchers par `403` khaata. Brand ab uske **outlet row se**
padha jaata hai, token se nahi.

### ✅ Band ho chuke

| Endpoint | |
|---|---|
| `POST /brandFeatures/add` | ✅ `resolveActorBrand` — vendor sirf apna brand |
| `PUT /brandFeatures/update/:featureId` | ✅ Feature ke `brandId` ke against |
| `DELETE /brandFeatures/delete/:featureId` | ✅ Wahi |
| `POST /locations/create` | ✅ `resolveLocationTarget` |
| `PUT /locations/update/:id` | ✅ Row ke maalik ke against |
| `DELETE /locations/delete/:id` | ✅ Wahi |
| `GET /locations/getAll` | ✅ Vendor ko sirf apna brand + outlets — **pehle koi scope tha hi nahi** |
| `POST /vouchers/publish/:versionId` | ✅ Voucher ke `brandId` ke against |

⚠️ Publish wala sabse mehenga tha: wo sirf ek status nahi badalta, wo **jo version
live hai use archive** kar deta hai. Yaani koi bhi vendor doosre brand ka chalta
hua voucher hata kar dusra live kar sakta tha — aur approval history me uska apna
naam darj hota, ek aise brand par jisse uska koi rishta nahi.

Tests: `__tests__/money/brandFeatureOwnership.test.js` (13),
`__tests__/money/locationOwnership.test.js` (42),
`__tests__/money/voucherVersionLifecycle.test.js` (12).

**Vendor panel pe impact:** apne hi resources ke ids use karein. Ye "defensive coding"
wali salaah nahi hai — ye batana hai ki backend abhi aapko rok nahi raha, to accidental
cross-brand id (galat list se copy-paste, stale cache) **chup-chaap kaam kar jayegi**.

---

## 🟡 Functional gaps

📋 Scheduled → [super admin doc, Appendix C1 #1](./super_admin_panel_api_doc.md#appendix-c--future-work).

### 2. `SUB_VENDOR` accounts kuch nahi kar sakte
Outlet signup pe `SUB_VENDOR` user banta hai aur OTP bhi jaata hai, par **koi route
`SUB_VENDOR` role handle nahi karta**. `isSubVendor` middleware ab exist karta hai par
kisi route pe laga nahi hai, aur `verifyJwtToken` un ke liye `req.brandId` set nahi karta.

⚠️ Poori tarah sach nahi raha — **chaar** endpoints ab `SUB_VENDOR` lete hain:

```
POST  /disputes/:disputeId/evidence
POST  /transactions/disputes/:disputeId/evidence
PATCH /refunds/:requestId/approve
PATCH /refunds/:requestId/reject
```

Yaani outlet manager refund decide kar sakta hai aur dispute par bayaan de sakta hai — **aur bas**. Apne outlet ki claims, vouchers ya timings kuch nahi dekh sakta.

**Vendor panel pe impact:** outlet-level login screen sirf in chaar kaamon ke liye ban sakta hai. Baaki outlet management vendor ke through hi hogi.

📋 Poora daayra dena scheduled hai → [Appendix C2 #5](./super_admin_panel_api_doc.md#appendix-c--future-work). ⚠️ Blast radius bada hai: `resolveActorBrand` abhi `brand.userId === actor.userId` check karta hai aur SUB_VENDOR ka `userId` brand par hota hi nahi — wo helper **11 services** use karti hain.

### 3. ✅ `DELETE /users/delete` — v1.12 me customer-only (live 2026-11-04)
Pehle har role ke liye no-op tha. v1.12 me ye customer ka asli delete hai; vendor token par `403`
(upar §13 dekhein).

**Vendor panel pe impact:** "Delete account" button mat dikhayein — vendor deletion abhi scope me nahi
([account_deletion_plan.md](./account_deletion_plan.md) Appendix A).

📋 Scheduled → [Appendix C1 #2](./super_admin_panel_api_doc.md#appendix-c--future-work).

### 4. ✅ Redeem endpoint nahi hai — **par ye bug nahi hai**

Yahan pehle likha tha *"redemption flow exist nahi karta"* aur *"`usageType`
enforce nahi hota"*. **Dono galat the** — 2026-09-06 ko code ke against verify
kiya gaya.

Phase 1 me claim ka `redemptionMode` `AUTO` hota hai
([createVoucherClaimOrder.js:270](../services/voucherClaims/createVoucherClaimOrder.js#L270)),
aur us par payment capture hote hi claim seedhe `REDEEMED` ho jaati hai
`redeemedAt` ke saath
([settleVoucherClaimPayment.js:312](../helpers/voucherClaims/settleVoucherClaimPayment.js#L312)).
**Counter par paisa dena hi redemption hai** — alag se mark karne ko kuch bacha
hi nahi.

`usageType` bhi enforce hota hai, aur database me — upar `VOUCHER_USAGE_TYPE`
dekhein.

**Vendor panel par iska matlab:** claims screen Phase 1 me **read-only** hai.
`GET /voucher-claims/code/:claimCode` counter par code padhne ke liye hai — wo
ek read hai, aur use likhna bhi nahi chahiye. Dobara wahi code padhna koi
samasya nahi, kyunki padhna kuch badalta nahi.

📋 Phase 2 (outlet scan) ka poora plan →
[Appendix C4](./super_admin_panel_api_doc.md#appendix-c--future-work).
⚠️ Wo ek flag ka kaam nahi hai: refund window ka clock, golden rule ka hisaab
aur settlement eligibility teeno saath badalne padenge.

### 5. ✅ RESOLVED — Email verification ab hai

**Pehle:** email change pe `isEmailVerified: false` ho jaata tha, aur wapas `true` karne ka koi raasta nahi tha. Badge sirf ek hi taraf ja sakta tha.

**Ab:** [`POST /auth/email/send-verification`](#19c-post-authemailsend-verification-) aur [`POST /auth/email/verify`](#19d-post-authemailverify-) — dono `verifyJwtToken` ke peeche, **koi role gate nahi**. Wahi do endpoint customer app bhi use karti hai.

**Vendor panel pe impact:** verified badge aur email-change flow ab banaya ja sakta hai.

### 6. ✅ RESOLVED — logout ab sach me logout karta hai

**Pehle:** endpoint `200` deta tha aur **server par kuch nahi hota tha** — na flags, na push, na token. Ek chori hua JWT apni poori umr chalta rehta, aur notifications us phone par aati rehti jisse user sign out kar chuka tha.

**Ab:** flags set hote hain, push deactivate hota hai, aur `allDevices: true` par **har** purana JWT khatam. Response me `sessionsEnded`, `pushDeactivated`, `activeDevices` aate hain.

**Vendor panel pe impact:** `PUT /deviceTokens/unregister` alag se call karne ki zarurat nahi — body me `pushToken` bhej dein. Kho gaye laptop ke liye `allDevices: true`.

### 7. ✅ RESOLVED — promo codes ab default me on hain

**Pehle:** `isPromoCodeEnabled: false` default tha aur checkout preview *"Promo codes are coming soon"* deta tha.

**Ab:** dono defaults `true` hain — vendor subscription (`SUBSCRIPTION_DEFAULTS`) aur customer claim (`CUSTOMER_PROMO_DEFAULTS`).

⚠️ **`preview.promo.supported` phir bhi check karein.** Default badla hai, switch nahi hata: `PUT /settings/update` se admin ise ek call me band kar sakta hai agar koi campaign wapas lena ho — bina deploy ke. Field hardcode karke mat dikhayein.

⚠️ `allowWhenNoOffer` alag se **off** hai aur rahega. Jis voucher par vendor ka koi offer hi nahi, us par promo lagana bina supply ke pura giveaway hai — wo alag se on karna padta hai.

### 8. ✅ RESOLVED — `brand.isApproved` likha bhi jaata hai aur ab filter bhi karta hai

**Pehle:** ye finding kehti thi ki dono fields kabhi set nahi hote aur `isApproved` par "kabhi bharosa na karein". **Dono baatein galat thin.** `reviewBrandVerification` teeno action par likhta hai:

| Action | `isApproved` | `status` |
|---|---|---|
| APPROVED | `true` | `APPROVED` |
| REJECTED | `false` | `REJECTED` |
| REVOKED | `false` | `REVOKED` |

⚠️ Aur ye galti mehngi padi. Do service files me yahi baat **comment me likhi thi**, isliye customer-facing queries `isApproved` par filter karti hi nahi thin — sirf `isActive` par. Nateeja: koi bhi brand jo delete nahi hua tha, customer directory me aa jaata tha, jismein chhe aise bhi the **jinka owner `User` hi maujood nahi tha**.

**Ab:** ek shared filter `customerVisibleBrandFilter` paanchon customer surfaces par lagta hai — directory, brand detail, voucher feed, global search, aur showcase/clips.

**Vendor panel pe impact:** jab tak brand verify nahi hota, uske vouchers **customer ko dikhte hi nahi**. Onboarding screen par ye saaf batayein — vendor ko lagega uska voucher live hai jabki wo feed me hai hi nahi. Approval status ke liye `systemVerify.status` ya `GET /brands/verifications/history` ([#33](#33-get-brandsverificationshistory)) dekhein; `isApproved` ab bharose layak hai par history usme nahi hai.

---

# 🆕 Uploads — frontend action items (2026-10-07)

> **Kiske liye:** vendor panel team (`Vendor2.0`). Ye list deployed `stage` branch
> ke code ko backend ke code se mila kar nikali gayi hai — har item ke peeche
> dono taraf ki file aur line hai. Backend par jo badla wo **section D** me hai.
>
> **Ek line me:** showcase ke teen flow aaj toote hue hain (video add, video
> replace, clip toggle), voucher edit me ek image add karna toot-ta hai, business
> hours save hi nahi hote, aur showcase ko voucher ki tarah presigned upload par
> le jaana hai. Backend me showcase ke liye presign **pehle se ready** hai — koi
> backend change ka intezaar nahi.

| # | Kya | Severity | Section |
|---|---|---|---|
| V-0 | Staging domain S3 CORS me nahi tha → "Could not reach storage" | 🔴 infra (frontend code nahi) | [A](#a-pehle-infra--s3-cors) |
| V-1 | Showcase me **video add** hamesha `422` | 🔴 High | [B](#b-bugs--abhi-theek-karne-hain) |
| V-2 | Showcase me **video replace** hamesha `422` | 🔴 High | [B](#b-bugs--abhi-theek-karne-hain) |
| V-3 | **"Show in Video Clips"** toggle hamesha `400` | 🔴 High | [B](#b-bugs--abhi-theek-karne-hain) |
| V-4 | Voucher edit me **exactly 1 nayi image** → `409` | 🟠 Medium | [B](#b-bugs--abhi-theek-karne-hain) |
| V-5 | **Business Hours** save hi nahi hote (200 aata hai, kuch save nahi) | 🟠 Medium | [B](#b-bugs--abhi-theek-karne-hain) |
| V-6 | Onboarding feature editor bina icon ke Save hone deta hai → `400` | 🟡 Low | [B](#b-bugs--abhi-theek-karne-hain) |
| V-7 | Showcase ko presigned upload par le jaana | 🟠 Planned | [C](#c-showcase-ko-presigned-upload-par-le-jaana) |
| V-8 | `uploadApi.js` ke chhote sudhaar | 🟡 Low | [C](#c-showcase-ko-presigned-upload-par-le-jaana) |

## A. Pehle infra — S3 CORS

Ye panel ka code nahi hai, par iske bina presigned upload (aaj voucher, kal
showcase) kisi naye domain par chalega hi nahi.

**Symptom:** voucher create par `"Could not reach storage to upload the file."`
— `src/services/uploadApi.js` ka `fetch` throw karta hai.

**Wajah:** browser se file **seedha S3** par jaati hai. S3 bucket
`trydood-nonprod-public` ki CORS list me `staging.vendor.trydood.com` /
`staging.admin.trydood.com` nahi the. S3 ne file le li (staging DB me 12 aise
intents mile, saari files S3 par maujood) par CORS header nahi diya, to browser
ne response chhupa liya aur panel ne confirm kabhi nahi bheja.

**Fix:** AWS → S3 → bucket → Permissions → CORS → `AllowedOrigins` me har panel
domain (exact, `https://…`, aakhir me `/` nahi). **Naya domain Vercel par jodo to
yahan bhi jodo.** Showcase aaj kaam karta hai kyunki wo abhi multipart se backend
ko file bhejta hai — presign par jaate hi wo bhi isi CORS par nirbhar hoga.

## B. Bugs — abhi theek karne hain

### V-1 🔴 Showcase: video add hamesha `422`

| | |
|---|---|
| Symptom | Brand → Showcase par video add karo (ya video ke saath naya section) → `422 "A video needs a poster image…"` |
| Panel | `features/brand/services/brandApi.js` `addShowcaseMedia` → `formData.append('thumbnail', thumbnail)` |
| Backend | add-media poster **`thumbnails`** (plural) se padhta hai — `services/showcases/addSectionMedia.js:103` |
| Doosri dikkat | UI poore batch ke liye **ek** poster leta hai (`ShowcaseGroup.jsx`, `AddShowcaseSectionModal.jsx`). Poster position se judta hai, to `[photo, video]` ya do video naam theek karke bhi fail honge |

**Fix:**
1. Field `thumbnails` karein (ya seedha section C wala presigned raasta lein).
2. UI **har video ke liye alag poster** le.
3. Batch me **videos pehle, photos baad me**, posters usi kram me — #48 ka 🔴
   pairing box dekhein. Ya har video alag request me (`files=[video]`,
   `thumbnails=[poster]`) — onboarding wala `ShowcaseAlbumsEditor` yahi karta hai.
4. Upload se pehle panel khud check kare: har video ka poster hai, poster still
   image hai (GIF nahi), 10 MB se chhota hai. Beech me fail hone par pehle ki
   files ke ids jal jaate hain (#48 ⚠️ box).

> Ye bug backend ke ek galat message ne chhupaya tha: wo kehta tha `Attach one as
> "thumbnail"`. Wo replace ka field hai. Message theek kar diya gaya — section D.

### V-2 🔴 Showcase: video replace hamesha `422`

| | |
|---|---|
| Symptom | Kisi video ko nayi video se replace karo → `422 "A video needs a poster image…"`. Photo replace theek chalta hai |
| Panel | `brandApi.js` `replaceShowcaseMedia` sirf `file` bhejta hai; `ShowcaseMediaRow.jsx` ka picker `video/*` leta hai par poster nahi maangta |
| Backend | `replaceSectionMedia.js:87-94` — video par poster zaroori |

**Fix:** video replace karte waqt poster bhi maangein aur bhejein — multipart me
`thumbnail` (**singular**, is endpoint par), ya presigned me `thumbnailUploadId`.

### V-3 🔴 "Show in Video Clips" toggle hamesha `400`

| | |
|---|---|
| Symptom | Video ke 3-dot menu me "Show in Video Clips" → `400 "Please upload exactly one media file."` |
| Panel | `features/brand/pages/ShowcasePage.jsx` `handleToggleMediaClip` → `replaceShowcaseMedia(sectionId, mediaId, { isShowInVideoClips })`, bina file ke |
| Backend | Replace ka validator ye field leta hi nahi (chup-chaap drop), aur replace ek file maangta hai |

**Fix:** toggle ko #49 par bhejein:

```js
await api.patch(`/showcase/section/${sectionId}/media/update/${mediaId}`, {
  isShowInVideoClips,            // true | false — JSON body chalega
});
```

Photo par ye `422` deta hai — UI photo par toggle dikhata hi nahi, to theek hai.

### V-4 🟠 Voucher edit: exactly 1 nayi image → `409`

| | |
|---|---|
| Symptom | Voucher edit me **ek** nayi image jodo → `409 "That upload has already been used."`, poora edit fail |
| Panel | `VoucherService.js` `appendArrayField` — ek value ho to use **do baar** append karta hai. `newImageUploadIds=[id, id]` jaata hai |
| Backend | `acceptUploads` har id accept karta hai; doosri baar wahi id → `409` (`services/storage/accept.js:281-285`) |

Create par bhi yahi code hai, par wahan UI kam se kam 3 image maangta hai, isliye
dikhta nahi.

**Fix:** upload ids ke liye har id **ek hi baar** append karein. Backend akeli
string ko list maan leta hai (`jsonTolerantArray`). Duplicate wali trick sirf
`tags` / `subBrandIds` ke liye rakhein — wahan backend dedupe karta hai.

```js
function appendIdList(formData, key, ids) {
  ids.forEach((id) => formData.append(key, id));   // kabhi duplicate nahi
}
// imageUploadIds, newImageUploadIds, removeImageIds → appendIdList
// tags, subBrandIds → appendArrayField (jaisa hai)
```

### V-5 🟠 Business Hours save hi nahi hote

| | |
|---|---|
| Symptom | Business Hours tab me Save → success dikhta hai, refresh par purane hours |
| Panel | `features/brand/pages/BusinessHoursPage.jsx:78` → `updateBrandDetails(brandId, { workHours: hours })` — FormData me object `"[object Object]"` ban jaata hai |
| Backend | `PUT /brands/update` ka validator `workHours` leta hi nahi — chup-chaap drop, `200` |

**Fix:** `brandApi.js` me pehle se maujood `upsertWorkHours` use karein —
`POST /workHours/upsert` ([#37](#37-post-workhoursupsert)), body ka shape #37 ke
hisaab se (`monday … sunday: { start, end, isOpen }` + `subBrandId`).

### V-6 🟡 Onboarding feature editor: bina icon Save → `400`

`oulet/New folder/components/brandOutlet/ListingFeaturesEditor.jsx` ka Save button
icon ke bina bhi enable rehta hai; backend `POST /brandFeatures/add` par icon
zaroori hai → `400 "Feature icon is required!"`. **Fix:** icon chune bina Save
disable — jaise `features/brand/services/brandApi.js` ka `addBrandFeature` pehle se
check karta hai.

## C. Showcase ko presigned upload par le jaana

Backend me koi badlaav nahi chahiye — teeno endpoint `uploadId` pehle se lete hain
(#48, #49, #50). Voucher jaisa hi pattern: `uploadFileViaPresign` se id lo, phir
**JSON body** bhejo (FormData nahi). Purposes `SHOWCASE_MEDIA` aur
`SHOWCASE_THUMBNAIL` `uploadApi.js` me pehle se hain.

**Shart:** section A wala CORS pehle. Warna showcase bhi "Could not reach
storage" dene lagega.

### Add media (#48)

```js
// items: [{ file, poster }] — poster sirf video ke liye, aur zaroori
export async function addShowcaseMedia(sectionId, items, { isShowInVideoClips = true } = {}) {
  const isVideo = (f) => f.type.startsWith('video/');
  const videos = items.filter((i) => isVideo(i.file));
  const photos = items.filter((i) => !isVideo(i.file));

  // 1. Pehle check, phir upload — beech me fail hone par ids jal jaate hain
  for (const v of videos) {
    if (!v.poster) throw new Error(`"${v.file.name}" ke liye poster chahiye.`);
    if (!/^image\/(jpeg|png|webp)$/.test(v.poster.type)) throw new Error('Poster JPG/PNG/WebP hona chahiye.');
    if (v.poster.size > 10 * 1024 * 1024) throw new Error('Poster 10 MB se chhota hona chahiye.');
  }

  // 2. Videos pehle, photos baad me — poster `thumbnailUploadIds[i]` → `uploadIds[i]`
  const uploadIds = [];
  for (const { file } of [...videos, ...photos]) {
    uploadIds.push(await uploadFileViaPresign(file, UPLOAD_PURPOSES.SHOWCASE_MEDIA, { entityId: sectionId }));
  }
  const thumbnailUploadIds = [];
  for (const { poster } of videos) {
    thumbnailUploadIds.push(await uploadFileViaPresign(poster, UPLOAD_PURPOSES.SHOWCASE_THUMBNAIL, { entityId: sectionId }));
  }

  const { data } = await api.post(`/showcase/section/${sectionId}/add-media`, {
    uploadIds,                 // asli JSON array — string mat banaiye
    thumbnailUploadIds,
    isShowInVideoClips,
  });
  return data;
}
```

⚠️ Arrays **asli JSON array** hon — `JSON.stringify` karke string mat bhejiye,
showcase ka validator string ko list nahi maanta.

⚠️ Section ki media limits (15 total / 15 photo / 5 video, admin-configurable) bhi
upload se pehle check kar lein — backend inhe confirm se pehle hi refuse karta
hai, par vendor ka time bachega.

### Replace (#50)

```js
const body = {
  uploadId: await uploadFileViaPresign(file, UPLOAD_PURPOSES.SHOWCASE_MEDIA, { entityId: sectionId }),
};
if (file.type.startsWith('video/')) {
  body.thumbnailUploadId = await uploadFileViaPresign(poster, UPLOAD_PURPOSES.SHOWCASE_THUMBNAIL, { entityId: sectionId });
}
await api.put(`/showcase/section/${sectionId}/media/replace/${mediaId}`, body);
```

Photo ki jagah photo, video ki jagah video — type badalne par `400`.

### Update details / poster (#49)

```js
const body = { title, altText };                       // jo badla wahi
if (posterFile) {
  body.thumbnailUploadId = await uploadFileViaPresign(posterFile, UPLOAD_PURPOSES.SHOWCASE_THUMBNAIL, { entityId: sectionId });
}
await api.patch(`/showcase/section/${sectionId}/media/update/${mediaId}`, body);
```

`isShowInVideoClips` aur `isActive` bhi isi body me ja sakte hain (V-3).

### Jo cheezein dhyan rakhni hain

- **`fileName` hamesha bhejein** presign par (`uploadFileViaPresign` bhejta hai) —
  showcase media ka default title usi se banta hai.
- **Upload + confirm Save par karein**, picker khulte hi nahi — `uploadId` presign
  se 60 min me mit jaata hai, confirm se ghadi nahi badhti (#95 ⚠️ box).
- **Ek id ek hi baar** — kisi request me wahi id do baar nahi, aur fail hui request
  ki ids dobara nahi (wo jal chuki ho sakti hain — naya upload karein).
- Purana multipart raasta backend par **chalta rahega** (Cloudinary ke liye
  rakha gaya hai) — panel ko use chhodna hai, backend use nahi hata raha.

### Optional — baaki surfaces bhi presign-ready hain

| Surface | Field | Purpose |
|---|---|---|
| Brand logo / cover (`PUT /brands/update`) | `logoUploadId` / `coverImageUploadId` | `BRAND_LOGO` / `BRAND_COVER` |
| Brand feature icon (`/brandFeatures/add`, `/update`) | `iconUploadId` | `BRAND_FEATURE_ICON` |

`uploadApi.js` ke `UPLOAD_PURPOSES` me ye teen jodne honge. Uska comment ("brand
logo is still multipart-only") purana hai.

### V-8 🟡 `uploadApi.js` ke chhote sudhaar

| Kya | Abhi | Sudhaar |
|---|---|---|
| Khaali `file.type` | `application/octet-stream` bhejta hai → presign `422` | Extension se type nikaalein, ya picker par hi rok dein |
| S3 ka 4xx | Body (XML, asli wajah) phenk deta hai → `"Upload to storage failed (status 403)"` | `await res.text()` se `<Message>` nikaal kar dikhayein |
| Network / CORS fail | `"Could not reach storage…"` — dono ek jaise | Theek hai, par console me `url` aur origin log karein — debugging me yahi chahiye tha |
| Comment line 4-7 | "Showcase media … accept an uploadId — currently Showcase media and Voucher" | Showcase abhi multipart par hai — migration ke baad sahi hoga |

## D. Backend me kya badla (2026-10-07)

Sirf error **messages** — koi field, status code ya behaviour nahi badla.

| Endpoint | Pehle | Ab |
|---|---|---|
| #48 add-media | `A video needs a poster image. Attach one as "thumbnail", or name its upload as "thumbnailUploadIds".` | `A video needs a poster image. Attach one in "thumbnails" at the same position as the video in "files", or send its upload in "thumbnailUploadIds" at the same position as the video's id in "uploadIds".` |
| #54, #59 voucher banner | `Please attach the banner file as "media".` | `Please attach the banner file as "media", or send its upload as "bannerUploadId".` |
| #54, #59 voucher banner | `A video banner needs a poster image. Attach one as "poster".` | `A video banner needs a poster image. Attach one as "poster", or send its upload as "bannerPosterUploadId".` |

Agar panel kahin in messages ka **exact text** match karta ho to update karein
(behtar hai status code par chalein, text par nahi).

**Backend par pending (jab tak fix na ho, upar ke niyam follow karein):**

| Kya | Panel kaise bache |
|---|---|
| add-media poster position = media position (photos bhi) | Videos pehle, photos baad me |
| Batch beech me fail → pehle ki files nahi hatti, ids jal jaati hain | Upload se pehle poster/size/count khud check |
| Voucher create: banner ki galti par image ids jal jaate hain | Video banner ke saath poster pehle check (panel karta hai) |
| Voucher update: max images check upload ke **baad** | Upload se pehle `kept + new ≤ maxImages` check |
| `uploadId` presign se 60 min, confirm se nahi badhta | Upload + confirm Save par |

## E. Test checklist (staging)

- [ ] `staging.vendor.trydood.com` se voucher create — 3+ images + video banner + poster
- [ ] Showcase: ek section me **2 video + 2 photo** ek saath (poster dono video ke)
- [ ] Showcase: video ko video se replace (poster ke saath)
- [ ] Showcase: "Show in Video Clips" on/off
- [ ] Showcase: video ka poster badalna (#49)
- [ ] Voucher edit: **sirf 1** nayi image jodna
- [ ] Business Hours save → refresh → wahi dikhe
- [ ] Onboarding feature: bina icon Save disable
- [ ] Browser DevTools → Network: S3 POST `204`, uske baad `/uploads/confirm` `200`

---

# Frontend Integration Checklist

**Response handling**
- [ ] **404 = empty list** — list endpoints pe 404 pe empty-state, error toast nahi
- [ ] **Nested `data.data`** — pagination responses me
- [ ] **`DELETE /users/delete` standard envelope use nahi karta**
- [ ] **Token expiry pe login screen** — `401 "Your session has expired..."`
- [ ] **`subscribeds/get` empty pe `null` deta hai**, 404 nahi

**Request formatting**
- [ ] **`role: "VENDOR"` bhejein** auth calls pe — WhatsApp flow ka default `CUSTOMER` hai, email/mobile ka `ADMIN`
- [x] **Scoping ab backend karta hai** — `subBrands/get-all`, `locations/getAll` aur `vouchers/versions/get-all`, teeno. `brandId` bhejna ab ek filter hai; doosre brand ka bhejne par `403` milega, chup-chaap sab kuch nahi
- [ ] **Coordinates `[longitude, latitude]`** order me — ulta karna sabse common bug
- [ ] **`limit` default 10 hai** — categories/plans pe badhayein
- [ ] **`isActive=true` bhejein** master data + legal pe
- [ ] **Multipart file field names exact hone chahiye** — `images`, `newImages`, `icon`, `logo`, voucher banner `media` + `poster`, showcase add-media `files` + `thumbnails` (**plural**), replace `file` + `thumbnail`. ~~`bannerImage`/`bannerVideo`/`bannerGif`~~ ab nahi hain
- [ ] **Uploads ka poora action list** — [Uploads — frontend action items](#-uploads--frontend-action-items-2026-10-07)
- [ ] **`offers` JSON string ke roop me bhej sakte hain** multipart me

**Onboarding**
- [ ] **`GET /brands/onboarding/status` se resume karein** (#20a) — `currentScreen` + sidebar groups + progress. Panel kabhi `currentScreen` nahi bhejta
- [ ] **`add-basic-details` step-scoped hai** — `step` = jo screen save ho rahi hai; har step pe sirf uske fields, warna `forbidden` error
- [ ] **`409 ONBOARDING_SCREEN_MISMATCH` pe `details.currentScreen` pe jao** aur data refresh karo
- [ ] **KYC do-step hai** — pehle `verify-*`, phir `add-*-details`
- [ ] **`add-*-details` pe sirf `verificationId` bhejein** (onboarding v2, P0) — provider ka jawab server khud save karta hai; `isVerified`, naam, `verificationResponse` ab nahi liye jaate. Fail hua verification save nahi hota (`422 VERIFICATION_FAILED`)
- [ ] **UNREGISTERED: owner verification zaroori** (#23a) — PAN (recommended) ya ID upload; Aadhaar **masked** hi
- [ ] **KYC files:** PDF ya JPG / PNG (chhoti side ≥ 800 px), max 5 MB; `fileUrl` signed aur kuch minute ka — store mat karo
- [ ] **KYC_DOCUMENTS se aage:** ≥ 1 document → `continue`, zero → `skip`. Replace ke baad naya `document._id` rakho
- [ ] **Saved PAN / GST / bank vendor nahi badal sakta** (`409 DETAIL_ALREADY_PROVIDED`) — support ka raasta dikhao
- [ ] **Setup screens `continue` se aage** (#23g) — `PUT /brands/update` ab screen nahi badalta (`isOnboarding` hata)
- [ ] **Submit = `POST /brands/onboarding/submit`** (#24) — review page pe `status.systemChecks`; `missing[]` codes dikhao
- [ ] **Profile strength** (#32c / #20a `profileStrength`) — score + level, aur har `items[].points > 0` pe "+N" hint `action` ke saath. `available: false` wale items mat dikhao
- [ ] **Deed popup** (#20a `deed.requiresDeedConfirmation`) — login pe blocking popup, "Accept" = #25 (kisi bhi screen se). Popup ke bina aage na jaane do
- [ ] **Voucher submit / publish `403`** — `BRAND_NOT_APPROVED` / `BANK_REQUIRED` / `PLAN_REQUIRED` pe sahi CTA (approval ka wait / bank add karo / plan lo). Draft hamesha ban sakta hai
- [ ] **Billing address** (#32a / #32b) — checkout se pehle; `preview.billingAddressRequired` pe form, `suggestedAddress` / `gstAddress` se prefill; GSTIN ho to wahi state. Brand address `/locations` se ab nahi
- [ ] **Submit ke baad sirf add** — `409 ONBOARDING_LOCKED` pe "review ke baad badal sakenge" dikhao; `editable` map se button grey karo
- [ ] **Approval status `systemverifies[0].status` se lein**, `brand.isApproved` se nahi (wo kabhi set hi nahi hota)

**Subscription & limits**
- [ ] **`GET /subscribeds/get` dashboard ka single call hai** — plan + entitlements + usage sab ek jagah
- [ ] **`usage[bucket].limit: null` = unlimited**
- [ ] **`overflowBy > 0` pe warning dikhayein** — grandfathered downgrade
- [ ] **`orderSummary.rows` as-is render karein** — koi arithmetic nahi
- [ ] **`canProceed` + `blockedReason` check karein** pay button se pehle
- [ ] **⚠️ Upgrade pe forfeit warning** — bache hue din chale jayenge, koi proration nahi
- [ ] **Razorpay `amount` paise me hai** — `117882` = ₹1,178.82
- [ ] **`transactionId` sambhal ke rakhein** create-order se verify tak
- [ ] **Verify optional hai** — webhook bhi activate karta hai; retry safe hai (`alreadyVerified`)

**Limits & gates**
- [ ] **`403` "requires an active subscription"** → subscribe screen pe bhejein
- [ ] **`403` "limit reached"** → upgrade prompt dikhayein
- [ ] **Outlets aur franchises alag pools hain** — `outletType` se decide hota hai

**Vouchers**
- [ ] **`FIXED` discount type ab kaam karta hai** — `FLAT` ka alias. Teeno types dikha sakte hain
- [ ] **Status-wise editability** — `UNDER_REVIEW`/`EXPIRED`/`ARCHIVED` pe edit block
- [ ] **Update delta-based hai** — `newOffers`/`removedOfferIds`, poori list nahi
- [ ] **`publish` ko `versionId` chahiye**, `voucherId` nahi
- [ ] **Outlet ki location zaruri hai** — bina uske voucher customer ko nahi dikhega

**Showcase**
- [ ] **Media limits combined check hote hain** — existing + naye
- [ ] **Media reorder pe poori list bhejein** — partial allowed nahi
- [ ] **Aakhri media delete nahi hoti** — section hi delete karein
- [ ] **Section delete slot release karta hai**, `isActive: false` nahi

**Security discipline**
- [ ] **`?userId` param support hi nahi hota** — hata diya gaya, token se user resolve hota hai
- [ ] **`password` ab response me aata hi nahi** — `sanitizeUser()` har auth response se strip karta hai
- [x] **Ownership ab backend enforce karta hai** — pehle 5 endpoints par check missing tha, ab ek bhi nahi ([Appendix B](#-ownership--abhi-bhi-khuli-hai)). Apne hi resources ke ids bhejna phir bhi sahi aadat hai: cross-brand id ab **403** degi, chup-chaap chalegi nahi
- [ ] **Password / "Set password" screen mat banayein** — vendor ke liye wo flow band hai
- [ ] **`brand.isApproved` pe bharosa na karein** — hamesha `false` rehta hai; `SystemVerify.status` dekhein
- [ ] **Appendix A ke endpoints kabhi call na karein**

**Push notifications**
- [ ] **Login ke baad `register` call karein** — role sahi map hone ke liye
- [ ] **`deviceId` zaroor bhejein** — reinstall pe dead rows na bane
- [ ] **Logout pe `unregister` + `logout` dono**
- [ ] **`test` endpoint pe `delivered` flag dekho**, `success` nahi

---

**Doc version:** 1.2.1 · **Last verified:** 2026-08-28 against a running server (99 requests · 228 assertions · 105 captured examples · all pass)
**Related docs:** [endpoints_category.md](./endpoints_category.md) · [security_findings.md](./security_findings.md) · [brand_verification_future_updates.md](./brand_verification_future_updates.md) · [subscription_lifecycle_design.md](./subscription_lifecycle_design.md) · [brand_rejection_remediation_design.md](./brand_rejection_remediation_design.md) · [customer_mobile_api_doc.md](./customer_mobile_api_doc.md)
**Pending:** Super admin panel doc (phase 3)

---

## 94. POST /uploads/presign 🆕

File seedha S3 par bhejne ki **ijazat** maangta hai. File is server tak aati hi nahi.

**Access:** koi bhi signed-in caller · **Any auth**

### Body
| Field | Type | Required | Notes |
|---|---|---|---|
| `purpose` | String | ✅ | Surface — bucket, allowed types aur size cap isi se tay hote hain |
| `contentType` | String | ✅ | Jo aap bhej rahe hain (`image/png`, `video/mp4`, …) |
| `sizeBytes` | Number ≥ 1 | ✅ | File ka size. ⚠️ Ye sirf **padhne-layak 413** deta hai — asli limit S3 lagata hai |
| `fileName` | String | ❌ | Extension ke liye — **aur** showcase media ka default `title`/`altText` isi se banta hai. Na bhejo to presigned showcase media bina title ke aati hai. **Hamesha bhejein** |

### Success — `200`
```json
{
  "success": true,
  "message": "Upload authorised.",
  "data": {
    "uploadId": "68f1a2b3c4d5e6f7a8b9e001",
    "url": "https://trydood-nonprod-public.s3.ap-south-1.amazonaws.com/",
    "fields": {
      "key": "staging/68f1.../9f2c....png",
      "Content-Type": "image/png",
      "Policy": "eyJ…",
      "X-Amz-Signature": "…"
    },
    "expiresInSeconds": 900,
    "stagingKey": "staging/68f1.../9f2c....png",
    "typePrefix": "images"
  }
}
```

### 🔴 Ab client ko kya karna hai

`url` par ek **multipart POST** bhejiye — **`fields` ke saare field pehle, file sabse aakhir me**. S3 file part ke baad kuch nahi padhta, to baad me bheja gaya field laga hi nahi.

```js
const form = new FormData();
Object.entries(data.fields).forEach(([k, v]) => form.append(k, v));
form.append("file", file);            // sabse aakhir me
await fetch(data.url, { method: "POST", body: form });
```

S3 seedha `204` deta hai (koi body nahi). Ab aapke paas ek `uploadId` hai, aur
usse do tarah chal sakte hain — **dono chalti hain**:

| | Kya karein | Kab chunein |
|---|---|---|
| **A. Pehle confirm** | `/uploads/confirm` (#95), phir wahi `uploadId` surface ko | ✅ **Suggested.** Vendor ko galat file / badi file ka pata **picker khula hone par** hi chal jata hai, poora form bharne ke baad nahi |
| **B. Seedha surface ko** | `uploadId` seedha surface ko (`/vouchers/create` waghairah) — confirm bilkul mat bulaiye | File ka object key me row ki id bhi aa jaati hai (`images/vouchers/<voucherId>/…`), jo bucket browse karte waqt suvidha deti hai |

⚠️ **Dono bhejna nahi hai** — `uploadId` ke saath wahi file `file` field me bhi
attach karenge to `422` milega ("either a file or an uploadId, not both").

> ### 🔴 Pehle raasta A toota hua tha — ab nahi
>
> Ye doc hamesha se raasta A batati thi, par surface `uploadId` lene par file ko
> **dobara** confirm karti thi, aur dusri baar replay guard lag jaata tha. Nateeja:
> ek hi baar upload ki gayi file par `409 "That upload has already been used."` —
> aur voucher create uske upar `500 "Failed to upload voucher images."` de deta tha.
>
> Ye **saari** presigned surfaces par tha (logo, cover, avatar, showcase, category,
> banner, ticker, voucher), kyunki sab ek hi facade se guzarti hain. Ab guard
> *"confirm ho gaya"* par nahi, *"kisi row ne le liya"* par hai — to dono raaste
> chalte hain aur ek upload phir bhi sirf ek hi row par lag sakti hai.

### Errors
| Status | Message | Kab |
|---|---|---|
| `401` | Token nahi / invalid | |
| `503` | `Presigned upload is turned off for this platform. …` | 🆕 Admin ne `storage.upload.presignEnabled` off rakha hai. **Multipart abhi bhi chalta hai** — wahi file usi request me file field me bhej dijiye |
| `409` | `Presigned upload only works on S3, and this platform is set to CLOUDINARY. …` | 🆕 Platform Cloudinary par hai. Ye raasta sirf S3 par likhta hai, to isse do provider par row ban jaatin |
| `422` | `CATEGORY_IMAGE does not accept video/mp4.` | Surface wo type nahi leta |
| `422` | `SHOWCASE_MEDIA does not accept application/octet-stream.` | Browser ne `file.type` khaali diya aur panel ne `application/octet-stream` bhej diya. ⚠️ Vendor panel ka `uploadApi.js` yahi fallback karta hai — type khaali ho to extension se nikaalein ya picker par hi rok dein |
| `400` | `SVG files are not accepted — they can carry scripts.` (HEIC/AVIF/HTML ke apne messages) | 🆕 Platform jo types kabhi nahi leta, wo **signature se pehle** hi ruk jaate hain |
| `413` | `That file is 12 MB. The limit here is 5 MB.` | Surface ke cap se bada. 🔴 Ye number **admin ka** hai — `min(code ka ceiling, Setting.storage.limits, surface override)` |
| `422` | `Unknown upload purpose. Allowed: …` | Galat purpose |

> ### 🔴 S3 par POST ke liye **CORS** chahiye — har panel domain ka
>
> Step 2 browser se **seedha S3** par jaata hai, to bucket ki CORS list me panel ka
> exact origin hona chahiye. Na ho to S3 file **le leta hai** (multipart POST par
> preflight nahi lagta) par browser response padhne nahi deta — `fetch` throw
> karta hai, vendor panel `"Could not reach storage to upload the file."` dikhata
> hai, aur confirm kabhi nahi chalta. 2026-10-07 ko `staging.vendor.trydood.com`
> aur `staging.admin.trydood.com` isi wajah se fail the (`trydood-nonprod-public`
> par 403). Naya domain jodte waqt Vercel ke saath S3 CORS bhi update karein —
> [`aws_s3_setup.md` §2.3](./aws_s3_setup.md).

> ### ⚠️ `expiresInSeconds` hardcoded nahi hai
>
> Wo `storage.upload.presignTtlMinutes` se aata hai (default 15 min). **Jo value
> response me mile usi par chalein** — kisi constant par nahi, kyunki admin use
> kabhi bhi badal sakta hai.
>
> ### 🔴 Poster ke purpose sirf still lete hain
>
> `SHOWCASE_THUMBNAIL`, `BANNER_POSTER` aur `VOUCHER_BANNER_POSTER` ab **`GIF`
> nahi** lete — sirf still image. Pehle presign GIF ke liye signature de deta tha
> aur surface uske baad `422` deta, yaani vendor ki bandwidth kharch hone ke
> **baad**. Ab refusal presign par hi ho jaata hai, upload se pehle.
>
> 🆕 `TICKER_ICON` bhi (U-7b, 2026-10-08) — ticker sirf jpeg/png/webp leta hai.

---

## 95. POST /uploads/confirm 🆕

Upload hui file ko uski asli jagah par le jaata hai, aur batata hai wo **sach me kya hai**.

**Access:** koi bhi signed-in caller · **Any auth**

### Body
| Field | Type | Required | Notes |
|---|---|---|---|
| `uploadId` | ObjectId | ✅ | Presign se mila |
| `entityId` | ObjectId | ❌ | Kis row ki file hai — sirf S3 key ka folder, aur kuch nahi. 🔧 (2026-10-27, live 2026-11-04) Vendor / outlet manager ka `entityId` sirf tab maana jaata hai jab wo **apna** brand, outlet ya user id ho; warna chup-chaap hata diya jaata hai aur file bina us folder ke save hoti hai (refuse **nahi** — section / voucher id bhejna chalta rahega, upload pehle jaisa hoga). Pehle kisi bhi brand ki id se uske folder me file rakh sakte the |

### Success — `200`
```json
{
  "success": true,
  "message": "Upload confirmed.",
  "data": {
    "storage": {
      "provider": "AWS_S3",
      "publicId": null,
      "bucket": "trydood-nonprod-public",
      "key": "images/categories/68f1a2b3c4d5e6f7a8b9c101/9f2c....png"
    },
    "metadata": {
      "contentType": "image/png",
      "kind": "IMAGE",
      "sizeBytes": 184320,
      "width": 1200,
      "height": 800
    }
  }
}
```

Ye `storage` object aap kahin bhejte **nahi** — agla step surface ka apna endpoint
hai, aur use sirf `uploadId` chahiye.

### ⚠️ Ye step **optional** hai

Surface khud bhi confirm kar leti hai. Ise bulane ka ek hi faayda hai, aur wo
bada hai: **vendor ko galat file ka pata turant chal jata hai**, poora form
bharne aur Save dabane ke baad nahi. File ki asli pehchaan (magic bytes) aur asli
size yahin naapa jaata hai.

Chhoti si keemat: yahan `entityId` aksar pata nahi hota (create ke waqt row bani
hi nahi hoti), to object key me `<rowId>/` wala segment nahi aayega. Ye sirf
bucket browse karne ki suvidha hai — code kahin bhi key se id nahi padhta.

> ### ⚠️ `uploadId` ki umar **presign** se ginti hai, confirm se nahi (audit 2026-10-07)
>
> Har `uploadId` presign ke `storage.upload.intentTtlMinutes` (default **60 min**)
> baad mit jaata hai. Confirm karne se ye ghadi **reset nahi hoti**. To agar panel
> form khulte hi file upload + confirm kar le aur vendor ek ghante baad Save
> dabaye, surface `404 "That upload was not found."` dega aur file S3 par anath
> pad jaayegi. **Upload + confirm Save dabane par karein** (vendor panel ka
> `VoucherService` yahi karta hai) — form khulne par nahi. Backend par ise
> confirm ke waqt badhana pending hai.

**Kaun si surfaces `uploadId` leti hain:** ab **saari**. Voucher (images, banner,
poster), showcase (media + thumbnail), brand logo/cover, sub-brand logo/cover,
brand feature icon, category, sub-category, banner + poster, ticker icon, aur
profile image. Har ek ke apne section me field ka naam diya hai.

⚠️ Ye line pehle kehti thi *"Vendor panel ki koi surface abhi `uploadId` nahi
leti"* — wo U-2 ke waqt sach thi aur U-4/U-5 ke baad kabhi update nahi hui. Usi
purani line ki wajah se ye nahi pakda gaya ki raasta A kabhi test hi nahi hua tha.

### Errors
| Status | Message | Kab |
|---|---|---|
| `404` | `That upload was not found.` | Galat id, **ya kisi aur ki id** |
| `409` | `That upload has already been used.` | Dobara confirm |
| `400` | `That file was never uploaded, or has already expired.` | S3 par kuch hai hi nahi |
| `400` | `That file type is not supported.` | Bytes kisi jaani-pehchani file ki nahi |
| `422` | `USER_AVATAR does not accept MP4/MOV files.` | Bytes surface ke hisaab se galat |
| `413` 🆕 | `That file is 3 MB. The limit here is 2 MB.` | **Asli** size limit se bada. Object wahin delete ho jaata hai |

### ⚠️ Notes

**1. 🔴 Yahi ek jagah hai jahan file ki asli pehchaan hoti hai.** Is se pehle har check us `Content-Type` par tha jo **client ne chuna**. Yahan object ke apne pehle bytes padhe jaate hain, aur stored type unse aata hai. PNG ke naam par bheja gaya GIF `gifs/` me landta hai — theek us resize step se bahar jo uski animation khatam kar deta.

**2. Kisi aur ka `uploadId` `404` deta hai, `403` nahi.** Jo id maujood hai uske baare me "ye aapki nahi" keh dena, ye bata dena hai ki wo id asli hai.

**3. Ek upload ek hi row par.** Warna ek hi file do alag rows par lag jaati, aur doosri wo file rakhti jiske liye usne kuch diya hi nahi.

> 🔴 **Ye guard ab confirm par nahi, "kisi row ne le liya" par hai.** Pehle dono
> ek hi cheez thi, aur isi wajah se raasta A (confirm → phir surface) kabhi kaam
> nahi karta tha: confirm guard laga deta, aur surface ko `409` mil jaata.
>
> Ab: **confirm** dobara karoge to `409` (neeche wali table) — kyunki file to
> `staging/` se ja hi chuki hai, dobara karne ko kuch bacha hi nahi. Aur **surface
> ko wahi id do baar** doge to bhi `409`, us row ke liye jo doosre number par aayi.
> Ek confirm + ek surface = bilkul theek, aur yahi normal raasta hai.

**4. 🔴 Size ki limit admin ki hai, aur wahi dono jagah lagti hai.** Ek hi number
teen se banta hai — `min(code ka ceiling, Setting.storage.limits, surface
override)` — aur wahi signed policy ke `content-length-range` me jaata hai, yaani
**S3 khud** use lagata hai. Aapka bheja `sizeBytes` sirf padhne-layak `413` ke
liye hai: size chhota bata kar bada file bhejna kaam nahi karega, wo S3 par hi
ruk jaayega.

⚠️ **`confirm` par ye dobara naapa jaata hai, asli byte count se.** Signature ek
baar likhi jaati hai aur pandrah minute chalti hai; admin us beech limit ghata
sakta hai aur aapke haath ki signature nahi badalti. Isliye jo file policy se nikal
gayi wo bhi yahan ruk sakti hai — aur ruk jaaye to object wahin delete ho jaata hai.

⚠️ Aur limit **verified kind** ki hoti hai, declared ki nahi. GIF ka apna bada
ceiling hai, to PNG ko GIF bata kar bhejna warna GIF ka allowance muft me de deta.

**5. Reject hui file wahin delete ho jaati hai.** Aur jo `staging/` me pada reh gaya, use bucket ka apna lifecycle rule uthata hai.

