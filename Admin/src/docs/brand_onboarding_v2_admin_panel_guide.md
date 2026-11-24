# Brand Onboarding v2: Admin Panel Guide

**Kiske liye:** admin panel (web) ke frontend developers
**Date:** 2026-10-11 · **Revised:** 2026-11-18 (naya Basic Details + Business Verification flow, design D66–D96)
**Status:** ✅ **Backend stage pe live (2026-11-19, owner ka manual deploy) — production pe abhi nahi.** P0–P8 aur P6b sab stage pe chalte hain; tests green (unit 1787, money suite 162 files / 2926); stage pe purane approved brands migrate ho chuke hain (P9, 18 / 18). Exact shapes [super_admin_panel_api_doc.md](./super_admin_panel_api_doc.md) #23, #24, #25a–#25j mein: §3 tabs NEW / WAITING / LIVE + `stageCounts` (khaali tab bhi `200`), §5 admin se onboarding (create #25h + 15 routes `?brandId=`), §6 legal corrections kisi bhi state mein (P6b, owner ki screen guard phir bhi), §7 documents review (#25d), §8 billing address (#25e / #25f), §10 review + score (#23 / #24), §11 verified badge (#25i) + strength (#25j), §12 offline deed (#25g), settings `vendor.onboarding.*`, `vendor.kyc.reuseDays`, `vendor.brandFeatures.maxActive`, `customer.claim.requireVendorVerifiedBank` (default OFF). Stage URL: `https://staging-api.trydood.com/trydood/v1`.
**Source of truth:** [brand_onboarding_v2_design.md](./brand_onboarding_v2_design.md). Fark dikhe to design doc sahi hai.
**Saathi docs:** [vendor panel guide](./brand_onboarding_v2_vendor_panel_guide.md) · [phases](./brand_onboarding_v2_phases.md) · purane endpoints: [super_admin_panel_api_doc.md](./super_admin_panel_api_doc.md)
**Related (live 2026-11-04):** [brand_feed_outlet_rule_plan.md](./brand_feed_outlet_rule_plan.md) — brand list ka `customerVisibility` + `?isCustomerVisible=` filter aur `requireShowcase` setting; v2 ke tabs inhe rakhein (design §21.2b) · [verified_signup_outlet_plan.md](./verified_signup_outlet_plan.md) — account states aur outlet verification.

---

## 0. Index

1. Admin ke kaam ek nazar mein
2. Common rules
3. Brands list: 3 tabs (NEW / WAITING / LIVE)
4. Brand detail page
5. Admin se onboarding (naya brand banana aur steps bharna)
6. Legal details badalna (kabhi bhi)
7. Owner ID aur KYC documents review
8. Billing address form
9. Subscription grant / order
10. Verification review: approve, reject, revoke, reviewed
11. Verified badge
12. Partnership deed (offline)
13. Revoke vs deactivate vs hide
14. Settings jo admin set karta hai
15. Error code → panel action
16. Edge scenarios
17. Aaj ke admin panel se kya badla
18. QA checklist

---

## 1. Admin ke kaam ek nazar mein

| Kaam | API |
|---|---|
| Tabs + list | `GET /brands/admin/get-all?onboardingStage=NEW\|WAITING\|LIVE` |
| Brand ki onboarding state | `GET /brands/onboarding/status?brandId=` |
| Brand ki poori details | `GET /brands/get?brandId=` |
| Timeline / history | `GET /brands/verifications/history?brandId=` |
| Verification queue | `GET /brands/admin/verifications` (filters: `status`, `isReviewed`, `isRejected`, `isRevoked`, `isAdminApproved`, `isSuperseded`, `minScore` / `maxScore`, `attemptNumber`, `reviewedByAdminId`, `search`, `fromDate` / `toDate`, `sortBy` NEWEST / OLDEST / SCORE). Har row poora attempt: `kycPath`, `checks[]`, `skippedItems`, `latestScore` |
| Naya brand banana | `POST /brands/admin/onboarding/create` |
| Onboarding ke steps bharna | Vendor wale onboarding APIs + `?brandId=` (§5) |
| PAN / GST / bank verify (paid) | `POST /verification/brands/onboarding/verify-pan\|verify-gst\|verify-bank?brandId=` |
| Owner ID / documents list | `GET /brands/onboarding/documents?brandId=` |
| Owner ID / documents review | `PUT /brands/admin/onboarding/documents/:documentId/review` |
| Billing address | `GET` / `PUT /brands/billing-address?brandId=` |
| Plan dena | `POST /subscribeds/admin/grant` |
| Deed offline | `PUT /brands/admin/:brandId/deed` |
| Approve / reject / revoke / reviewed | `PUT /brands/admin/verifications/:brandId/review` |
| Verified badge | `PUT /brands/admin/:brandId/verified-badge` |
| Profile strength | `GET /brands/profile-strength?brandId=` |
| Account on/off, customer se chhupana | `PUT /brands/admin/:brandId/status` (existing) |

---

## 2. Common rules

1. **Naye aur onboarding APIs pe admin `?brandId=` query param bhejta hai.** Vendor kabhi nahi bhejta.
   - **Query mein `brandId`:** onboarding status, add-basic-details, update-basic-details, verify-*, add-*-details, owner-verification, documents, skip, continue, submit, billing address, profile strength, `GET /brands/get`, `PUT /brands/update`.
   - **Body mein `brandId` / `subBrandId`** (existing APIs, jaise aaj hain): `subscribe/preview`, `create-order`, `subscribeds/admin/grant`, `showcase/section/add`, `brandFeatures/add`, `subBrands/signUp-with-whatsapp`, `workHours/upsert`, `locations/create`.
2. **Screen hamesha brand ke vendor ki badalti hai,** chahe kaam admin kare. Vendor login karega to wahin se aage badhega, aur admin ka bhara kuch dobara nahi maanga jayega.
3. **Admin vendor ke locks ke paar badal sakta hai** (PAN / GST / bank save ke baad, status lock, submit ke baad pending ya approved — legal bhi). Vendor ke liye locked cheezein ("support se badlega") yahin se badalti hain. **Do cheezein admin pe bhi lagti hain:**
   - owner ki screen se aage ka step → `409 ONBOARDING_SCREEN_MISMATCH`;
   - content rules: GSTIN active, PAN GSTIN wala, entity GST se, GSTIN state = billing state, duplicate PAN / GST / bank (`DOCUMENT_IN_USE`).
   - **History:** submit se pehle kuch nahi (attempt hi nahi hota); remediation (reject / revoke ke baad) mein `REMEDIATION_UPDATED` (actor `ADMIN`); pending / approved brand pe `LEGAL_EDIT_BY_ADMIN` (§6).
4. **Admin aur vendor ek saath kaam karein:** jo peeche reh gaya use `409 ONBOARDING_SCREEN_MISMATCH` milega (`details.currentScreen` ke saath). Refresh karo.
5. Branching hamesha `details.code` pe karo (§15).

---

## 3. Brands list: 3 tabs

> 🆕 **P6 likha (2026-11-19, branch).** Row pe `onboardingStage` aur `waitingChip` (`UNDER_REVIEW` / `REJECTED` / `REVOKED` / `RESUBMITTED`), top pe `stageCounts` (baaki filters ke saath, tab ke bina). `profileStrength { score, level }`, `isVerified`, `badgeGrantedAt`, `badgeAtRisk` har row pe (P7 likha). ⚠️ v2 se pehle approved brands ka `onboarding.submittedAt` P9 migration bharti hai (attempt ka `createdAt`; attempt na ho to khaali rehta hai); bina `submittedAt` wala aisa brand revoke ho to `NEW` tab mein dikhega. Kabhi approve na hue purane brands release se pehle owner ke order pe saaf hote hain.

**Khaali tab (owner, 2026-11-19):** `onboardingStage` ke saath koi brand na ho to bhi `200` — `data: []`, `total: 0` aur `stageCounts` (teeno badges) aate hain, to badges hamesha sahi. Bina `onboardingStage` wali call (purani list) pe kuch match na kare to pehle jaisa `404 No any brand found`.

`GET /brands/admin/get-all` (existing filters same rehte hain, `customerVisibility` aur `accountState` bhi) + naya `onboardingStage`:

| Tab | `onboardingStage` | Kaun aata hai |
|---|---|---|
| **New onboardings** | `NEW` | `onboarding.submittedAt` nahi, aur `isApproved` true nahi |
| **Waiting brands** | `WAITING` | `onboarding.submittedAt` hai, `isApproved` true nahi. **Rejected aur revoked bhi yahin**, status chip ke saath |
| **Live brands** | `LIVE` | `isApproved = true` |

`onboardingStage` na bhejo to saare brands. Tab sirf brand ke fields se tay hota hai.

**Response mein naya:**

| Field | Kahan | Use |
|---|---|---|
| `stageCounts { NEW, WAITING, LIVE }` | top-level | Tab badges, ek hi call mein |
| `onboardingStage` | har row | `NEW` / `WAITING` / `LIVE` |
| `waitingChip` | har row | WAITING chip (neeche); NEW / LIVE pe `null` |
| `profileStrength { score, level }` | har row | Column (sirf dikhane ke liye — server is pe sort / filter nahi karta; strength page ki rows ke liye hi banti hai) |
| `isVerified`, `badgeGrantedAt` | har row | Verified badge, kab diya |
| `badgeAtRisk` | har row | Badge hai par strength 75 se neeche gir gayi: warning chip |
| `onboarding.submittedAt` | har row | Kab submit hua (pehla submit; resubmit pe nahi badalta) |
| `onboarding.kycPath` | har row | GST / NO_GST / UNREGISTERED chip (path na chuna ho to `null`) |
| `onboarding.hasBillingAddress` | har row | Billing address hai ya nahi. `onboarding.hasLocation` wahi fact, purane panels ke liye abhi bhi aata hai |
| `subCategories[]` (`{ _id, name, image }`, brand ki order mein) + `subCategoryIds` | har row | Saari subcategories |
| `vendor.currentScreen` | har row (existing) | NEW tab mein dikhao "kahan atka hai" |

**List pe ye filters nahi hain:** `kycPath`, `isVerified`, `badgeAtRisk`. 🆕 **`waitingChip` filter hai** (D118, 2026-11-25): `?onboardingStage=WAITING&waitingChip=UNDER_REVIEW,RESUBMITTED` = jin brands pe admin ka faisla baaki hai; dashboard ka "pending review" isi ka `total` (`limit=1`). Ye brand ke chip se ginta hai — `#23` queue ka `isAdminApproved=false` v2 se pehle approve hue brands ko bhi pending gin leta tha. `stageCounts` pe asar nahi. Sort bhi sirf purane `sortBy` values (NEWEST / OLDEST / NAME / FOLLOWERS / VOUCHERS / OUTLETS / SUBSCRIPTION_END / STATUS_CHANGED).

⚠️ `onboarding.hasWorkHours` (brand-level work hours) **hata diya gaya hai**. Brand ke apne hours ab nahi liye jaate, outlets ke hours hi hain.

**Status chips (WAITING tab):**

| Chip | Kab |
|---|---|
| Under review | Submitted, decision pending |
| Rejected | Admin ne reject kiya, vendor fix kar raha hai |
| Revoked | Approval wapas li gayi |
| Resubmitted | `attemptNumber > 1` |

- `waitingChip` values: `REVOKED` > `REJECTED` > `RESUBMITTED` > `UNDER_REVIEW` (isi priority mein, pehla jo sach ho).
- Resubmit pe `isRejected` / `isRevoked` false ho jaate hain, isliye reject ke baad resubmit = `RESUBMITTED`.

`currentScreen` filter purana hi hai, sirf nayi screen values ke saath (design §3: `BRAND_NAME`, `OWNER_VERIFICATION` naye; `BUSINESS_NAME`, `SYSTEM_VERIFICATION`, `OUTLET_PAGE` hat gaye).

---

## 4. Brand detail page

**Data:** `GET /brands/onboarding/status?brandId=` + `GET /brands/get?brandId=` + `GET /brands/verifications/history?brandId=`

**`GET /brands/onboarding/status?brandId=` ye deta hai** (screen hamesha owner ki):

| Field | Kya |
|---|---|
| `currentScreen`, `editMode`, `editLock` | `editLock`: `PENDING` (submitted, sirf add) / `APPROVED` / `null` |
| `kycPath`, `isOnBoardingCompleted`, `groups[]`, `progress { group, groupCount, percent }` | Sidebar |
| `items`, `registrationStatusLocked`, `editable { … }` | Vendor abhi kya badal sakta hai |
| `systemChecks[]` | Abhi ke stored records pe score ki checks (paid call nahi) |
| `verification { status, attemptNumber, submittedAt, isApproved, isApprovalAcknowledged, isRejected, rejectionReason, isRevoked, revokeReason }` | Review state |
| `deed { … }` | §12 wala shape |
| `hasBillingAddress` | Brand ka live billing address (submit wala hi check) |
| `isVerified`, `profileStrength` (poora, §11) | Badge + strength |
| `customerVisibilityHints { isVisible, requireShowcase, showcaseReady, reasons }` | Customer ko kyun nahi dikh raha. `showcaseReady` = dikhne layak album hai ya nahi, `requireShowcase` switch ON ho ya OFF (D117, 2026-11-21 se `GET /brands/get` ke `customerVisibility` jaisa) |

**Dikhane layak blocks:**

1. **Header:**
   - brand name, legal name, uniqueId, merchantId
   - `currentScreen`, `editMode`, `progress`
   - `kycPath` (GST / NO_GST / UNREGISTERED)
   - Verified badge, profile strength
2. **Steps checklist:** `status.groups[].screens[]` (`DONE / SKIPPED / MISSING`; sirf brand ke path ki screens) aur `items { gst, pan, ownerVerification, documents, bank }` (`PROVIDED / NOT_STARTED / SKIPPED / NOT_APPLICABLE`) + `items.ownerVerificationMethod`, `items.documentCount`.
   - `BRAND_BASIC_DETAILS` DONE = logo + email + contact number.
   - `BRAND_PROFESSIONAL_DETAILS` DONE = vendor isse aage nikal gaya (current / furthest screen aage, ya submitted / approved).
   - `OUTLET_DETAILS` DONE = kam se kam 1 live outlet, aur har outlet verified + location + work hours.
3. **Legal:**
   - brand name, legal name, category + subcategories, path, entity, PAN, GST, owner verification, bank
   - har ek ka saved record: `GET /brands/get` ke `pan`, `gst`, `bank` (verified fields server ke verify se copy hote hain; `KycVerification` rows ka koi read API nahi)
   - subcategories ke naam list row ke `subCategories[]` se; `/brands/get` mein `subCategoryIds` (ids) + purana single `subCategory`
4. **Owner ID + KYC documents** with review buttons (§7).
5. **Billing address** + edit (§8).
6. **Plan + deed:** deed `acceptedByType` VENDOR/ADMIN, mode ONLINE/OFFLINE, proof link.
7. **System verify (latest attempt):**
   - submit wala `score` / `status`
   - `latestScore` / `latestStatus` / `latestScoredAt` (review ke dauraan ya approve ke baad vendor ne PAN / GST / bank add kiya to badalta hai; submit wala score nahi badalta, naya attempt nahi banta)
   - `kycPath`, `checks[]` (path ke hisaab se), `skippedItems`
   - remarks: "skipped by vendor" alag, "verification failed" alag; `ENTITY_DIFFERS_FROM_PAN_TYPE`, `GST_CONSTITUTION_UNMAPPED`, `OWNER_ID_MANUAL`, documents ki ginti
   - flags, duplicates
   - `remarkCodes[]` (label ke liye): `BANK_SKIPPED`, `DOCUMENTS_SKIPPED`, `DOCUMENTS_PROVIDED`, `OWNER_ID_MANUAL`, `ENTITY_DIFFERS_FROM_PAN_TYPE`, `GST_CONSTITUTION_UNMAPPED`, `DUPLICATE_WHATSAPP`, `DUPLICATE_EMAIL`, `CHECK_FAILED`. Saath mein `nameMatch`, `bankNameMatch`, `entityMatch`, `duplicateDetails`
8. **Timeline (`action`):** `SYSTEM_VERIFIED` (pehla submit), `RESUBMITTED`, `DETAIL_ADDED` (`metadata.item`: PAN / GST / BANK / OWNER_VERIFICATION / DOCUMENT / REGISTRATION / ENTITY), `REVIEWED` / `UNREVIEWED`, `APPROVED`, `REJECTED` (reason), `REVOKED` (reason), `APPROVAL_ACKNOWLEDGED`, `REMEDIATION_UPDATED`, `BADGE_GRANTED` / `BADGE_REMOVED`, `DEED_ACCEPTED` / `DEED_CONFIRMED`, `LEGAL_EDIT_BY_ADMIN`, `DOCUMENT_REVIEWED`, `BILLING_ADDRESS_CHANGED`. History tabhi banti hai jab attempt ho (submit ke baad).
9. **Profile strength breakdown:** `sections[].items[]` (§11).

⚠️ **System ka verdict sirf salah hai.** System ka "REJECTED" vendor ka edit nahi kholta aur brand reject nahi karta. Faisla hamesha admin ka hai.

**System score path ke hisaab se** (har path 100 mein se):

| Check | GST | NO_GST | UNREGISTERED |
|---|---|---|---|
| GST verified | 15 | — | — |
| GST active | 15 | — | — |
| PAN verified | 15 | 30 | 30 (owner ID upload kiya to 0) |
| GST naam ↔ PAN naam ≥ 85 | 15 | — | — |
| Bank verified | 20 | 35 | 35 |
| Bank holder naam match ≥ 85 | 20 | 35 | 35 |
| Duplicate WhatsApp / email (dono hon tab bhi ek hi baar) | −20 | −20 | −20 |

- ≥ 90 APPROVED · ≥ 75 MANUAL_REVIEW · warna REJECTED.
- Kuch skip hua ho (bank), ya owner ne ID upload ki ho, to status **hamesha MANUAL_REVIEW**. Score ka number jaisa bana waisa dikhta hai.
- Duplicate PAN/GST/bank verify pe hi rok diya jaata hai (`DOCUMENT_IN_USE`). "PAN GSTIN ke andar" aur "entity GST se" save pe hi enforce hote hain, score mein nahi.

---

## 5. Admin se onboarding

> 🆕 **P6 likha (2026-11-19, stage pe live 2026-11-19, prod pe abhi nahi).** Create ke response mein `{ userId, brandId, whatsappNumber, brandName, currentScreen, accountState, createdBy }` (`201`). Vendor ko koi message nahi jaata (D105). Har step pe `?brandId=` zaroori; owner ki screen se aage ka step `409 ONBOARDING_SCREEN_MISMATCH` (screen guard admin pe bhi); vendor ke legal locks admin pe nahi (P6b, §6). Vendor deactivated → `409` (bina `details.code`). Poora: [#25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-).

### 5.1 Naya brand banana

- `POST /brands/admin/onboarding/create { whatsappNumber, brandName? }`
- Response (`201`): `{ userId, brandId, whatsappNumber, brandName, currentScreen, accountState: "ACTIVE", createdBy }` (`currentScreen`: `BRAND_NAME`, ya `brandName` diya ho to `BUSINESS_CATEGORY`)
- Vendor user + brand ek saath bante hain, bina OTP ke, `accountState: ACTIVE` (pending sweep inhe kabhi nahi hatata, list mein chhupte nahi).
- Us number pe pehle se VENDOR ho → `409 VENDOR_ALREADY_EXISTS`; `details` mein `userId`, `brandId`, `accountState` — panel seedha wahi brand khol sakta hai. (Usi number pe customer account hona theek hai: account number **aur role** dono se unique hai.)
- Customer ko brand dikhne ke liye owner ka verification **nahi** chahiye. Sirf outlet manager ka verification dekha jaata hai (P10 rule).

### 5.2 Steps bharna

Vendor panel guide ki har screen wahi API use karti hai. Admin bas `?brandId=` jodta hai:

| Screen | Admin API |
|---|---|
| BRAND_NAME / BUSINESS_CATEGORY / REGISTRATION_STATUS / REGISTRATION_ENTITY_TYPE | `POST /brands/onboarding/add-basic-details?brandId=` `{ step, … }` |
| GST / PAN / BANK | `POST /verification/brands/onboarding/verify-*?brandId=` → `POST /brands/onboarding/add-*-details?brandId= { verificationId }`, bank pe `skip` bhi |
| OWNER_VERIFICATION | `POST /brands/onboarding/owner-verification?brandId=`: `{ method: "PAN", verificationId }` (verify-pan ka id) ya `{ method: "ID_DOCUMENT", idType, uploadId }` / multipart `file` (`idType`: `AADHAAR` / `DRIVING_LICENCE` / `PASSPORT` / `VOTER_ID`) |
| KYC_DOCUMENTS | `POST /brands/onboarding/documents?brandId=` (title ke saath), phir `continue?brandId=` ya `skip?brandId=` |
| PARTNERSHIP_DEED | **Admin vendor ki taraf se online accept nahi kar sakta** (`accept-partnership` sirf vendor ka hai). `PUT /brands/admin/:brandId/deed` se offline accept karta hai, proof ke saath. Isse screen aage badhti hai (§12) |
| SUBSCRIBE_PLAN | Pehle billing address (§8), phir `POST /subscribeds/admin/grant` (§9) |
| BRAND_BASIC_DETAILS | `PUT /brands/update?brandId=` (logo, cover, description, email, mobile), phir `continue?brandId=` |
| BRAND_PROFESSIONAL_DETAILS | Showcase + brandFeatures APIs (`brandId` ke saath), phir `continue` ya `skip` |
| OUTLET_DETAILS | `POST /subBrands/signUp-with-whatsapp { brandId, … }` → manager ka OTP → `POST /locations/create { subBrandId, isSubBrandAddress: true, … }` → `POST /workHours/upsert { subBrandId, … }`, phir `continue?brandId=` |
| ONBOARDING_REVIEW | `POST /brands/onboarding/submit?brandId=` |

- **Same rules lagte hain:** path ke zaroori steps, skip sirf documents / bank / professional pe, continue ki requirements, GSTIN active, PAN GSTIN wala, entity GST se, GSTIN state rule.
- **Outlet:** manager ke number pe OTP chahiye; **ya** `useOwnerNumber: true` (`whatsappNumber` ke bina — dono ek saath nahi). Owner ka WhatsApp verified ho to outlet bina OTP verified ban jaata hai, warna `422 OWNER_NUMBER_NOT_VERIFIED`. Admin ka banaya vendor jisne kabhi login nahi kiya, uske outlet normal OTP se banenge.
- **Admin beech mein chhod de, to vendor login karke wahin se aage badhega.** Vendor panel `isFirst: true` dikha sakta hai (WhatsApp abhi verify nahi hua), lekin routing `status` se hoti hai.
- **Deed:** admin ne offline accept ki ho to vendor ko login pe ek blocking deed popup dikhega, aur vendor ka apna acceptance bhi record hoga.

---

## 6. Legal details badalna (kabhi bhi)

> ✅ **P6b likha (2026-11-19, stage pe live 2026-11-19, prod pe abhi nahi).** Exact rules: [super_admin_panel_api_doc.md #25h](./super_admin_panel_api_doc.md#25h-admin-onboarding--vendor-ki-taraf-se-poora-onboarding-) note 2. Legal name `legalBusinessName` (sirf admin) bhi `update-basic-details` se. GST path se hatane pe GSTIN brand se hat jaata hai (D110): `GSTId` aur `onboarding.gstStatus` hat jaate hain, GST record delete nahi hota (submit se pehle ke switch pe bhi); wapas GST path pe GSTIN dobara verify + save. Submitted brand pe har correction pe vendor ko notice `BRAND_DETAILS_UPDATED_BY_ADMIN` (D111).

Vendor ke liye jo locked hai (PAN / GST / bank save ke baad, status lock ke baad, approve ke baad legal), wo admin badalta hai (vendor support se request karta hai):

| Field | Admin API |
|---|---|
| Brand name, legal name, registration status (`kycPath`), entity type | `PUT /brands/onboarding/update-basic-details?brandId=` |
| Category / subcategories | `PUT /brands/onboarding/update-basic-details?brandId=` |
| PAN / GST / bank | verify (paid) → `add-*-details?brandId= { verificationId }` |
| Owner verification | `POST /brands/onboarding/owner-verification?brandId=` |

**Rules jo admin pe bhi lagte hain:**

- **GSTIN state rule:** naya GST save karte waqt, agar billing address ki state naye GSTIN ki state se alag hai → `422 BILLING_STATE_GSTIN_MISMATCH`. Pehle billing address theek karo (§8), phir GST.
- **GSTIN active hona chahiye** (`GSTIN_NOT_ACTIVE`), aur GST path pe PAN GSTIN wala (`PAN_NOT_IN_GSTIN`).
- **Entity:** GST path pe GST constitution se (`409 ENTITY_FROM_GST`, `details.acceptedEntityTypes`); UNREGISTERED pe entity bhejna `422` (apne aap Proprietorship).
- **Screen guard:** owner ki screen se aage ka step `409 ONBOARDING_SCREEN_MISMATCH`.
- **Subcategory hatayi** aur kisi live voucher pe wahi lagi thi → voucher waisa hi chalta rahega. Naye / edit hone wale voucher current list se chunenge.
- **Timeline:** submitted brand (pending / approved) pe har admin correction `LEGAL_EDIT_BY_ADMIN` (`metadata.section`, `fields`, re-scored `latestScore` / `latestStatus`) + vendor ko `BRAND_DETAILS_UPDATED_BY_ADMIN`. `PUT /brands/update` se brand name badalna bhi (re-score nahi). Submit se pehle koi history / notice nahi; remediation mein `REMEDIATION_UPDATED`; locked brand pe admin ka naya document `DETAIL_ADDED`.

⚠️ **Bank badalna:** approved brand ka bank badalne pe existing settlement guard (`needsRevalidation`) pending payout ko rok deta hai jab tak dobara check na ho. Ye pehle se bana hua hai.

⚠️ **Vendor ka WhatsApp number badla** (admin contact change) aur koi outlet abhi bhi purana number use kar raha hai → vendor aur admin dono ko notice: "Outlet X purana number use kar raha hai". Kuch apne aap block nahi hota.

---

## 7. Owner ID aur KYC documents review

- **List:** `GET /brands/onboarding/documents?brandId=` → `documents[]` (`purpose` `OWNER_ID` ya `BUSINESS`, `title`, `docType`, `idType`, `status`; `fileUrl` signed hai, thodi der chalta hai, link expire ho to dobara fetch karo).
  - Response `{ documents, hints, limit, count }` — owner ID pehle; `limit` / `count` sirf business documents (owner ID ginti mein nahi); `hints` category ke, warna default `UDYAM / SHOP_ESTABLISHMENT / TRADE_LICENCE`.
- **Review:** `PUT /brands/admin/onboarding/documents/:documentId/review`
  - Body: `{ "status": "ACCEPTED" }` ya `{ "status": "REJECTED", "reason": "Photo saaf nahi hai" }` (reject pe reason zaroori)
  - Response `{ document }`. Dobara review ho sakta hai (latest faisla row pe). Vendor ko `BRAND_DOCUMENT_REVIEWED` notice; attempt ho to timeline `DOCUMENT_REVIEWED`.
- **Admin upload / rename / replace / delete (business documents):** wahi document APIs `?brandId=` ke saath, submit ke baad bhi. Vendor ki screen `KYC_DOCUMENTS` ya aage honi chahiye, warna `409 ONBOARDING_SCREEN_MISMATCH`. Replace = naya `_id`, status `UPLOADED`. File: PDF / JPG / PNG, max 5 MB, image ki chhoti side ≥ 800px.
- **Owner ID yahan se nahi badalta** (`422 OWNER_ID_DOCUMENT`) — `owner-verification` se.

**Documents ab slot mein nahi hain:** har brand ki list (max setting se, default 10), har document ka title. `docType` vendor ne recommended chip se chuna ho to code hota hai (`FSSAI`, `SHOP_ESTABLISHMENT`, `TRADE_LICENCE`, `UDYAM`, `DRUG_LICENCE`…), warna `OTHER`.

**Owner ID** (sirf unregistered path, jab owner ne PAN ki jagah ID di): Aadhaar (**masked** hona chahiye, last 4 digit), Driving Licence, Passport ya Voter ID. Ek brand ka ek live owner ID.

**Asar:**

- **Profile strength:** UPLOADED aur ACCEPTED ginte hain, REJECTED ka 0. Documents: 1 → 5, 2+ → 10 (business proof, GST se jo zyada ho).
- **Badge ki "identity proof" condition:** **accepted** owner ID, ya verified PAN.
- **System score:** documents aur owner ID ka koi point nahi (system padh nahi sakta). Owner ID wale brand ka system status MANUAL_REVIEW rehta hai. Faisla admin ka.

**Category ke recommended documents:** category edit karte waqt admin `kycDocumentHints[]` (docType codes ki list) set karta hai. Vendor ko yahi chips dikhte hain.

---

## 8. Billing address form

- **Read:** `GET /brands/billing-address?brandId=` → `{ billingAddress, suggestedAddress, gstAddress, gstin, gstStateCode }`. `suggestedAddress` sirf tab aata hai jab billing address na ho. `gstAddress` hamesha aata hai jab GSTIN ho.
- **Save:** `PUT /brands/billing-address?brandId=`
  - Body outlet address jaisa hi: `addressLine1, addressLine2?, landmark?, city, district?, state, zipcode, country?, formattedAddress?, coordinates: [lng, lat]` (Google Places se).
- **"Same as GST" checkbox:** `gstAddress` prefill karta hai. Panel geocode karke coordinates nikale. Ye sirf prefill hai, baad mein GST badle to billing apne aap nahi badlega.
- **GST wala brand:** state = GSTIN ki state, warna `422 BILLING_STATE_GSTIN_MISMATCH`.
- **Delete nahi hota** (`409 BILLING_ADDRESS_NOT_DELETABLE`).
- Kisi bhi vendor ka, kabhi bhi (vendor khud bhi apne profile ke billing tab se badal sakta hai, review ke dauraan bhi).
- **Yahi address har jagah jaata hai:** subscription invoice, checkout preview, admin grant, invoice regenerate, settlement statement, chargeback document.
- **Customer ke voucher claim invoice pe asar nahi** (wahan seller Trydood hai).
- ⚠️ Generic `/locations` APIs ab brand ka address nahi likhte (`409 USE_BILLING_ADDRESS_ENDPOINT`). Outlet aur customer ke address pehle jaise.

---

## 9. Subscription grant / order

- `POST /subscribeds/admin/grant` (existing body) **ab billing address ke bina nahi chalega** → `422 BILLING_ADDRESS_REQUIRED` (`details.suggestedAddress` se billing form prefill karo). Grant form mein pehle billing check karo, na ho to billing form wahin kholo.
- Admin ki taraf se `create-order` bhi isi rule pe chalta hai.
- **Onboarding vendor ko grant diya:**
  - Agar vendor `SUBSCRIBE_PLAN` pe tha → screen `BRAND_BASIC_DETAILS` ho jaati hai.
  - Agar vendor abhi KYC pe hai → deed ke baad SUBSCRIBE_PLAN skip ho jayega.
- Dashboard vendor ke grant, renew ya upgrade se screen nahi hilti (existing rule).

---

## 10. Verification review

`PUT /brands/admin/verifications/:brandId/review` (existing endpoint, naye rules):

| Action | Naya rule |
|---|---|
| `APPROVED` | Sirf **submit ke baad** (`409 SUBMIT_REQUIRED`). Deed chahiye: vendor ka khud ka accept, ya admin offline accept **proof ke saath** (`409 DEED_NOT_ACCEPTED`) |
| `REJECTED` | Sirf submit ke baad. Reason zaroori. Vendor ke **saare locked fields khulte hain** (PAN, GST, entity, status, bank, documents) (remediation), vendor UNDER_REVIEW pe hi rehta hai |
| `REVOKED` | Approved brand pe. Reason zaroori. Vendor DASHBOARD pe rehta hai (banner + remediation, saare fields khule). **Badge apne aap hat jaata hai** |
| `REVIEWED` | Sirf submit ke baad, approved brand pe nahi (`409`). `isReviewed` optional: na bhejo to flip, bhejo to wahi set (same value → `400`). History `REVIEWED` / `UNREVIEWED`, vendor ko notice nahi |

- **Body:** `{ action, rejectionReason, revokeReason, note?, isReviewed? }` — `rejectionReason` sirf `REJECTED` ke saath (zaroori), `revokeReason` sirf `REVOKED` ke saath (zaroori), max 1000 characters.
- **Aur `409`:** already approved ko approve; approved ko reject (revoke karo); ek attempt ka doosra reject (pehle vendor resubmit kare); non-approved ko revoke; superseded attempt (refresh karo).
- **Rejected ya revoked attempt ko approve kar sakte ho**, vendor ke resubmit ke bina (admin ne galti se reject kiya, ya revoke wapas lena ho). Sirf **dobara reject** pe `409` hai. Panel approve pe confirm maange: "Vendor ne abhi resubmit nahi kiya" (code: `reviewBrandVerification.js`, 2026-11-24 doc mein saaf kiya). 🔧 D119 (2026-11-25): aise re-approve (aur usi attempt ka dusra revoke) pe bhi vendor ko notice jaata hai (`isVendorNotified: true`) — pehle dedupe use pehle wale ka duplicate maan ke daba deta tha.
- **Response mein** `badgeRemoved` (badge is faisle ke saath hata) aur `isVendorNotified`.
- Reject pe bhi badge hat jaata hai (approval badge ki shart hai).
- **Vendor resubmit kare** → naya attempt, WAITING tab mein "Resubmitted". Vendor ki screen nahi badalti.
- **Review ke dauraan vendor ne kuch add kiya** (sirf add allowed hai): PAN / GST / bank pe system score usi attempt pe dobara banta hai (`latestScore`), admin ko ek notice, timeline mein `DETAIL_ADDED`. Naya attempt nahi.
- **Notice:** vendor ka "under review" aur admin ka "awaiting review" notice **submit pe** aata hai.

**Admin ko aane wale notices:**

| Type | Kab |
|---|---|
| `BRAND_AWAITING_REVIEW` / `BRAND_AWAITING_RE_REVIEW` | Submit / resubmit |
| `BRAND_DETAIL_ADDED` | Submit ke baad scored item add (PAN / GST / bank / owner verification / registration upgrade / entity); documents pe nahi |
| `BRAND_OUTLETS_ON_OLD_OWNER_NUMBER` | Owner ka number badla, outlet purane number pe |

Vendor ko (admin ke kaam se): `BRAND_APPROVED`, `BRAND_REJECTED`, `BRAND_APPROVAL_REVOKED`, `BRAND_DOCUMENT_REVIEWED`, `BRAND_DETAILS_UPDATED_BY_ADMIN`. Offline deed aur badge grant / remove pe koi notice nahi.

---

## 11. Verified badge

> **Detail page pe "at risk" (2026-11-25):** `badgeAtRisk` sirf list row (`get-all`) pe aata hai, `brands/get` pe nahi. Detail pe wahi baat: `isVerified: true` **aur** `GET /brands/profile-strength?brandId=` ke `badgeBlockers` mein `STRENGTH_BELOW_75` — dono ek hi rule (D29).

> 🆕 **P7 likha (2026-11-19, stage pe live 2026-11-19, prod pe abhi nahi).** Exact shape: [super_admin_panel_api_doc.md #25i](./super_admin_panel_api_doc.md#25i-put-brandsadminbrandidverified-badge-). Reject / revoke pe badge apne aap hatta hai (`badgeRemoved: true`). ⚠️ Purane approved brands ko legacy badge P9 migration deti hai (script likha, kahin apply nahi; `isVerified: true`, `badgeGrantedAt` nahi bharta) — tab tak customer app pe badge kahin nahi dikhega.

`PUT /brands/admin/:brandId/verified-badge { "isVerified": true, "note": "…" }` → `{ brandId, isVerified, badgeGrantedAt, badgeGrantedByAdminId, profileStrength { score, level, sections, badgeEligible, badgeBlockers } }`. `note` optional. Pehle se badge ho to grant pe kuch nahi badalta (`200`).

(Field ka naam `badgeGrantedAt` hai, kyunki brand pe `verifiedAt` pehle se system-verify ke verdict ke liye use hota hai.)

**Dene ki shartein** (sab zaroori):

- brand approved
- profile strength ≥ 75
- bank verified
- identity proof: verified PAN **ya** accepted owner ID

Koi shart poori na ho to → `409 BADGE_NOT_ELIGIBLE` + `details.badgeBlockers` (`NOT_APPROVED`, `STRENGTH_BELOW_75`, `BANK_NOT_VERIFIED`, `NO_IDENTITY_PROOF`) + `details.profileStrength { score, level }`. Grant button ke paas hi blockers dikhao (`GET /brands/profile-strength?brandId=` se pehle hi pata chal jata hai).

**Badge kya karta hai aur kya nahi:**

- Sirf customer, vendor aur admin ko badge dikhata hai.
- Vendor ka koi access nahi rokta, customer visibility nahi badalta.
- **Hatana:** `{ "isVerified": false, "note": "…" }`, kabhi bhi. Reject ya revoke pe apne aap hat jaata hai.
- **At risk:** badge ke baad strength 75 se neeche gire to badge **rehta hai**, list mein `badgeAtRisk` chip aata hai. Admin decide kare.
- **Purane approved brands:** migration mein `isVerified = true` (legacy) milega, **dummy brands ko nahi**. Admin kisi ko bhi manually badal sakta hai.
- Admin ka grant / remove history mein strength snapshot ke saath (sirf jab attempt ho; v2 se pehle wale approved brand pe sirf field badalta hai). Reject / revoke wala automatic remove `metadata.automatic: true`, snapshot ke bina.

**Profile strength** (`GET /brands/profile-strength?brandId=` → `{ brandId, isVerified, score, level, sections, badgeEligible, badgeBlockers }`; status mein bhi poora, list row mein `{ score, level }`):

- `level`: `LOW` (< 50) · `MEDIUM` (50–74) · `STRONG` (≥ 75).
- `sections[]` = `LEGAL` / `PROFILE` / `OUTLETS`, har item `{ key, label, done, available, earned, max, points, action }`.
- Items (max): brand + legal name 5, category 5, identity 10, business proof 10, bank 15, deed 5, logo 5, cover 5, description (≥ 50 chars) 5, email verified 3, mobile verified 2, showcase 5, features (≥ 2) 5, ek ready outlet 15, saare outlets complete 5.
- Plan mein showcase na ho (ya showcase band) to woh item hata ke score 100 pe normalise.
- ⚠️ Deed ke 5 points sirf vendor ki apni acceptance pe (ya admin ki offline deed vendor ke confirm karne ke baad).

---

## 12. Partnership deed (offline)

`PUT /brands/admin/:brandId/deed`:

- Multipart `file` **ya** `proofUploadId` (signed deed ki copy), aur `note` (zaroori)
- Response: `{ deed: { accepted, acceptedByType, mode, version, acceptedAt, isLegacy, hasProof, proofUrl, note, vendorConfirmedAt, vendorConfirmedVersion, requiresDeedConfirmation }, currentScreen }` (`proofUrl` signed link)
- ⚠️ Profile strength ka deed point (5) vendor ke confirm karne par hi milta hai.
- `isLegacy: true` = P9 migration wala purana record (`version: "legacy"`, `acceptedAt` nahi).
- Proof ke bina → `422 DEED_PROOF_REQUIRED`
- 🆕 Vendor ne **khud** accept kar li ho (P5 se pehle wala flag bhi) → `409 DEED_ALREADY_ACCEPTED` — vendor ki apni acceptance kabhi replace nahi hoti (owner, D102)
- 🆕 P5 likha (2026-11-19, branch): exact shape [super_admin_panel_api_doc.md #25g](./super_admin_panel_api_doc.md#25g-put-brandsadminbranddeed-)

**Kya hota hai:**

- Deed `acceptedByType: ADMIN, mode: OFFLINE` ke saath save hoti hai. Admin ka flow nahi rukta.
- **Kis screen pe:**
  - Vendor `PARTNERSHIP_DEED` pe ho → screen aage badhti hai (SUBSCRIBE_PLAN, ya plan pehle se live ho to BRAND_BASIC_DETAILS).
  - Baad ki kisi screen pe → sirf record ya proof replace hota hai.
  - Pehle ki screen pe → `409 ONBOARDING_SCREEN_MISMATCH` (pehle verification steps pure karo).
- Vendor jab login karega, use deed ka blocking popup dikhega. Uska accept `vendorConfirmedAt` mein save hota hai.
- Detail page pe dikhao: kisne accept kiya, kab, mode, version, proof link, aur vendor ne confirm kiya ya nahi.
- Deed ka version admin `Setting` mein rakhta hai, aur har acceptance pe wahi version save hota hai. Deed ka text vendor panel mein hi rehta hai (design D57).

---

## 13. Revoke vs deactivate vs hide

| Action | API | Vendor panel | Outlet staff | Customer ko brand aur vouchers | Naye claims | Purane paid claims / settlement |
|---|---|---|---|---|---|---|
| **Revoke** | verification review `REVOKED` | DASHBOARD + banner + remediation | Chalta hai | ❌ Chhupa | ❌ | Chalte rahenge |
| **Deactivate account** | `PUT /brands/admin/:brandId/status { isActive: false, reason? }` | ❌ 401, logout | Chalta hai | ✅ Dikhta hai (agar hide nahi) | ✅ | Chalte rahenge |
| **Hide from customers** | `PUT /brands/admin/:brandId/status { isActive: true, hideFromCustomers: true }` | ✅ **Normal chalta hai, login bhi** | Chalta hai | ❌ Chhupa | ❌ | Chalte rahenge |

- Hide aur deactivate do alag switch hain, ek doosre ka "bada version" nahi.
- Badge in teeno mein se kisi pe asar nahi daalta (revoke pe badge apne aap hatta hai, approval ki shart ki wajah se).

---

## 14. Settings jo admin set karta hai

| Setting | Default | Kya karta hai |
|---|---|---|
| `vendor.onboarding.maxSubCategories` | 3 | Ek brand kitni subcategories chun sakta hai |
| `vendor.onboarding.maxKycDocuments` | 10 | Ek brand ke kitne KYC documents |
| `vendor.brandFeatures.maxActive` | 10 | Kitne active features (pehle code mein 10 fix tha) |
| `vendor.kyc.reuseDays` | 30 | Same PAN / GSTIN / bank dobara verify karne pe brand ka apna verified jawab itne din reuse (paid call nahi). `0` = kabhi reuse nahi. **Backend P0 mein ban chuka** |
| `vendor.showcase.minItemsPerSection` | 3 (existing) | Album dikhne ke liye kam se kam kitni photos / videos |
| Plan `entitlements.showcase` | (plan wise) | Kitne albums |
| `vendor.onboarding.deedVersion` | `v1` | Har deed acceptance pe record; badalne se kisi se dobara accept nahi maanga jaata |
| `customer.brandVisibility.requireShowcase` | false (existing) | ON ho to album ke bina brand customer ko nahi dikhta. Vendor ko showcase skip pe warning milti hai |
| `customer.claim.requireVendorVerifiedBank` | false | ON ho to bina verified bank wale brand ke vouchers customer listing se hatte hain, claim preview `BRAND_NOT_ACCEPTING` |
| Category `kycDocumentHints[]` | — | Category ke recommended documents |

---

## 15. Error code → panel action

| `details.code` | HTTP | Admin panel |
|---|---|---|
| `ONBOARDING_SCREEN_MISMATCH` | 409 | Refresh. Vendor ya doosre admin ne beech mein kuch kiya |
| `ONBOARDING_LOCKED` | 409 | Vendor ke liye hota hai. Admin ko submit pe milta hai jab brand pehle se review mein ho |
| `LEGAL_FIELD_LOCKED` | 409 | Approved brand: vendor ka legal edit / submit. Admin ko submit pe milta hai jab brand approved ho |
| `ONBOARDING_STEP_INCOMPLETE` | 422 | `details.missing` dikhao |
| `SCREEN_NOT_SKIPPABLE` | 422 | Skip mat dikhao |
| `REGISTRATION_STATUS_LOCKED` | 409 | Vendor ke liye. Admin `update-basic-details` se badal sakta hai |
| `GSTIN_NOT_ACTIVE` | 422 | GSTIN active nahi, NO_GST path chuno |
| `PAN_NOT_IN_GSTIN` | 422 | GSTIN wala PAN verify karo |
| `ENTITY_FROM_GST` | 409 | GST path pe entity GST se hi |
| `SUBCATEGORY_LIMIT` | 422 | Setting ki limit |
| `KYC_DOCUMENT_LIMIT` | 422 | Setting ki limit |
| `OWNER_NUMBER_NOT_VERIFIED` | 422 | Owner ka WhatsApp verified nahi, outlet ke liye normal OTP |
| `VERIFICATION_NOT_FOUND` | 422 | Verify dobara karo |
| `VERIFICATION_FAILED` | 422 | Wo verify fail hua tha — fail result kabhi save nahi hota. Sahi number se dobara verify |
| `DOCUMENT_IN_USE` | 400 | Ye PAN / GST / bank kisi aur brand pe hai |
| `PROVIDER_ERROR` | provider ka | `verify-*` pe CGPey ne call mana ki ya pahunch nahi paaye (D114) — kuch save nahi. Bank / PAN / GST ne number mana kiya (CGPey ka HTTP 400 bhi) to ye nahi: `200 isVerified: false` + reason (D115). "Verification service abhi jawab nahi de rahi"; `details.requestId` support ke liye. `verify-bank` mein `beneficiaryName` ab nahi jaata (server hata deta hai) |
| `VENDOR_ALREADY_EXISTS` | 409 | Us number pe pehle se vendor hai: list mein dhoondho |
| `BILLING_ADDRESS_REQUIRED` | 422 | Billing form kholo (grant / order se pehle) |
| `BILLING_STATE_GSTIN_MISMATCH` | 422 | Billing state GSTIN state pe set karo, ya pehle billing theek karke phir GST |
| `BILLING_ADDRESS_NOT_DELETABLE` | 409 | Delete mat dikhao |
| `USE_BILLING_ADDRESS_ENDPOINT` | 409 | Brand address ke liye billing endpoint |
| `SUBMIT_REQUIRED` | 409 | "Vendor ne abhi submit nahi kiya": approve/reject button disable karo jab tak `submittedAt` na ho |
| `DEED_NOT_ACCEPTED` | 409 | Deed accept karwao ya offline deed proof ke saath |
| `DEED_PROOF_REQUIRED` | 422 | Proof upload karo |
| `DEED_ALREADY_ACCEPTED` | 409 | Vendor ne khud accept kar li hai — offline deed ki zaroorat nahi (D102) |
| `BADGE_NOT_ELIGIBLE` | 409 | `badgeBlockers` dikhao |
| `OUTLET_NOT_VERIFIED` | 409 | Outlet ke manager ka OTP pending (existing P10 code) |
| `OWNER_ID_DOCUMENT` | 422 | Owner ID documents API se nahi badalta — `owner-verification` se |
| `OWNER_PAN_NOT_PERSONAL` | 422 | UNREGISTERED owner verification mein personal PAN chahiye |
| `KYC_FILE_TYPE` | 422 | Sirf PDF / JPG / PNG |
| `KYC_IMAGE_TOO_SMALL` | 422 | Image ki chhoti side ≥ 800px |
| `KYC_STORAGE_UNAVAILABLE` | 503 | KYC files ke liye private S3 chahiye; provider S3 na ho to refuse. Baad mein try karo |
| `FEATURE_LIMIT` | 400 | `vendor.brandFeatures.maxActive` ki limit |
| `BRAND_NOT_APPROVED` / `BANK_REQUIRED` / `PLAN_REQUIRED` | 403 | Selling gate: voucher submit / publish ke liye approved + verified bank + live plan |
| (bina code) | 409 | Admin ka onboarding write, vendor account deactivated: pehle account activate karo |

**Kaam ke `details`:** `BILLING_ADDRESS_REQUIRED` → `suggestedAddress` · `BILLING_STATE_GSTIN_MISMATCH` → `billingState`, `gstinState`, `gstinStateCode` · `BADGE_NOT_ELIGIBLE` → `badgeBlockers`, `profileStrength` · `ENTITY_FROM_GST` → `acceptedEntityTypes` · `PAN_NOT_IN_GSTIN` → `panFromGstin` · `VENDOR_ALREADY_EXISTS` → `userId`, `brandId`, `accountState` · `ONBOARDING_STEP_INCOMPLETE` → `missing[]`.

---

## 16. Edge scenarios

| Scenario | Kya hoga |
|---|---|
| Admin ne brand banaya aur aadha bhara, vendor ne login kiya | Vendor wahin se aage badhta hai, kuch dobara nahi maanga jaata |
| Admin aur vendor ek hi screen pe ek saath | Peeche wale ko `409 ONBOARDING_SCREEN_MISMATCH` |
| Admin approve karna chahe, vendor ne submit nahi kiya | `409 SUBMIT_REQUIRED` |
| Vendor ne galat GST save kar diya (submit se pehle) | Vendor ke liye 🔒. Admin `add-gst-details?brandId=` se sahi GST daalta hai |
| Vendor GST path pe tha, GST nahi hai | Status lock se pehle vendor khud NO_GST chun sakta hai. Lock ke baad admin `update-basic-details` se |
| Unregistered brand approve ke baad registered ban gaya (upgrade) | Approval rehta hai. `latestScore` update, timeline `DETAIL_ADDED` (`metadata.item: REGISTRATION`, ya GST save se `item: GST` + `upgradedFrom`), admin ko `BRAND_DETAIL_ADDED` notice |
| Approved brand ka GST badalna, billing doosre state ka | `422 BILLING_STATE_GSTIN_MISMATCH` → pehle billing badlo |
| Purana vendor, billing address nahi, admin grant karna chahe | `422 BILLING_ADDRESS_REQUIRED` → form se add karo, phir grant |
| Strength 80 pe badge diya, vendor ne outlet delete kiya, strength 70 | Badge rehta hai, `badgeAtRisk` chip |
| Revoke kiya | Badge hata, customer se brand chhupa, vendor dashboard pe banner |
| Review ke dauraan vendor ne bank add kiya | Usi attempt pe `latestScore` update, timeline `DETAIL_ADDED`, admin ko notice |
| Unregistered brand, owner ID upload + sab skip | Allowed. System MANUAL_REVIEW dikhayega. Owner ID accept / reject admin karega |
| Brand ka bank verified nahi | Approve ho sakta hai, lekin vendor voucher submit/publish nahi kar payega (`BANK_REQUIRED`), aur badge nahi milega |
| Dummy brand | Legacy badge nahi milta. Baaki pehle jaisa |

---

## 17. Aaj ke admin panel se kya badla

| Pehle | Ab |
|---|---|
| Ek hi list, filter manually | `onboardingStage` tabs + `stageCounts` |
| `onboarding.hasLocation`, `onboarding.hasWorkHours` | `onboarding.hasBillingAddress` (`hasLocation` alias abhi bhi aata hai). `hasWorkHours` hata. Naya `onboarding.kycPath` |
| Registered / unregistered | Teen path: GST / NO_GST / UNREGISTERED |
| Ek subcategory | Kai subcategories (setting se limit) |
| System-verify hote hi admin approve kar sakta tha | Approve/reject sirf submit ke baad |
| System ka REJECTED vendor ka edit khol deta tha | Sirf admin ka reject/revoke kholta hai (saare locked fields) |
| System score ek table | Path ke hisaab se score, review ke dauraan add pe usi attempt pe re-check |
| Admin onboarding steps nahi bhar sakta tha | Saare onboarding APIs `?brandId=` ke saath |
| PAN/GST/bank admin se nahi badalte the | Admin kabhi bhi badal sakta hai (verify + save). Vendor ke liye save ke baad lock |
| Documents | Owner ID + titled KYC documents list, review ke saath |
| Billing = GST address | Billing = brand ka billing address, admin form ke saath |
| Grant bina address ke | Grant ke liye billing address zaroori |
| Verified badge = approved | Alag `isVerified`, admin manually deta hai |
| Deed sirf ek boolean | Deed record (kisne, kab, mode, proof, vendor confirm) |

---

## 18. QA checklist

- [ ] Teeno tabs + `stageCounts` sahi, `kycPath` chip
- [ ] Naya brand banana → `BRAND_NAME`, `accountState: ACTIVE`, us number pe pehle se VENDOR ho to 409
- [ ] Admin se poora onboarding teeno path pe (GST, NO_GST, UNREGISTERED), phir vendor login → sahi screen
- [ ] Admin ne aadha chhoda → vendor ne baaki pura kiya
- [ ] Vendor ke locked PAN / GST / status admin se badalna + timeline `LEGAL_EDIT_BY_ADMIN`
- [ ] Owner ID accept / reject (reason zaroori), documents accept / reject → strength badalti hai
- [ ] Offline deed bina proof → 422, proof ke saath → vendor ko popup
- [ ] Grant bina billing → `BILLING_ADDRESS_REQUIRED`
- [ ] Billing "Same as GST", GST state mismatch, delete nahi
- [ ] Submit se pehle approve → `SUBMIT_REQUIRED`
- [ ] Review ke dauraan vendor ka add → `latestScore` + notice
- [ ] Reject → vendor ke saare locked fields khule. Resubmit → WAITING mein "Resubmitted"
- [ ] Revoke → badge hata, vendor dashboard banner
- [ ] Badge: blockers dikhna, grant, at-risk chip, dummy brand pe legacy nahi
- [ ] Outlet `useOwnerNumber`: owner verified → outlet verified; owner unverified → 422
- [ ] Settings: subcategory / documents / features limits
- [ ] Hide vs deactivate: vendor panel aur customer pe asar
