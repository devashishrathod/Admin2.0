# Brand Onboarding v2: Server-Driven Tracker, Three KYC Paths, Admin Onboarding, Billing Address, Verified Badge

**Status:** ✅ **APPROVED by the owner (2026-10-11), revised and re-approved (2026-11-18).** All decisions locked (D1–D117; where a 2026-11-18 decision replaces an older one, the older row says so). No open questions. **Production already has data**, so §21 carries a production rollout. **P0–P10 done and committed** (branch `feature/brand-onboarding-v2`; unit suite 93 / 1787 and full money suite 162 files / 2926 tests green on 2026-11-19). **Stage: live since 2026-11-19** — indexes + approved-brand migration applied before the deploy (P9 / P11), D112 redeploy verified 2026-11-20. **Production: not yet** (§21 rollout on the owner's order). Vendor panel work is in progress against stage (Milestone A code done 2026-11-20).
**Created:** 2026-10-11 · **Last updated:** 2026-11-19
**Companion docs (kept in sync with this one):**

- [brand_onboarding_v2_vendor_panel_guide.md](./brand_onboarding_v2_vendor_panel_guide.md): vendor panel (web), screen by screen
- [brand_onboarding_v2_admin_panel_guide.md](./brand_onboarding_v2_admin_panel_guide.md): admin panel (web)
- [brand_onboarding_v2_phases.md](./brand_onboarding_v2_phases.md): implementation phases, effort, order

Both frontends here are **web panels**: the vendor panel and the admin panel. The only mobile app in this doc is the **customer app** (§17, §14.2).

**Rules for this document**

- Statements about today's code were checked against the code and carry a file reference. §1 was verified on 2026-10-11; the rows re-checked on 2026-11-18 say so. Statements about the new design are owner-confirmed decisions. Nothing here is a guess.
- **This doc is the source of truth.** The vendor guide, admin guide and phases doc restate it for their readers. When any decision changes, update this doc first, then the three companions in the same step, then add a §22 change-log row.
- Error codes and response field names in §19 are the **planned contract**. If implementation refines one, every doc that names it changes in the same step.

---

## 0. Contents

1. Why v2 (problems in today's flow)
2. Locked decision log
3. Final screen list and sidebar groups
4. Tracker rules (server-driven)
5. Step-by-step flow
6. Edit modes and the field matrix
7. Registration status, the three paths, skips and switching
8. Owner verification and KYC documents
9. System verification and scoring
10. Profile strength
11. Verified badge (`Brand.isVerified`)
12. Bank skip and the "can sell to customers" gate
13. Partnership deed
14. Billing address
15. Admin onboarding
16. Admin brand tabs
17. Revoke, deactivate, hide: what each one does
18. Data model changes
19. API changes and planned error codes
20. Open questions
21. Migration, impact on existing vendors, tests and docs
22. Change log
23. Future notes
24. Things only the frontend can confirm

---

## 1. Why v2: problems in today's flow (verified)

| # | Problem today | Where |
|---|---|---|
| P1 | A new vendor's `currentScreen` is never set at signup (null until the client sends one). The vendor doc wrongly says `BUSINESS_NAME`. **Re-checked 2026-11-18: still true.** **🛠️ Fixed in P1 (branch, not deployed): signup writes `BRAND_NAME`, login heals an empty screen.** | `services/auth/loginOrSignUpWithWhatsapp.js` (no `currentScreen` write), `models/User.js` (no default) |
| P2 | `currentScreen` is client-controlled. `verify-otp-*` accept any string (an invalid one fails at save with a Mongoose enum 422, a valid one is written as is). `update-basic-details` and `add-pan/gst/bank-details` accept any `SCREENS` value, `DASHBOARD` included. **Re-checked 2026-11-18: still true.** **🛠️ Fixed in P1 (branch, not deployed): every `currentScreen` input is gone; only the server moves the screen.** | `validator/auth.js:159,201,244`, `validator/brands.js`, `validator/pan.js:134`, `validator/gst.js:145`, `validator/bank.js:115` |
| P3 | `add-basic-details` requires `currentScreen` (one of REGISTRATION_STATUS / REGISTRATION_ENTITY_TYPE / PAN_VERIFICATION) and saves it, so the value is the *next* screen. The vendor doc describes it the other way round. The response is a Brand with `userId` populated, not a user. **🛠️ Fixed in P1 (branch, not deployed): `{ step }`, response `{ brand, currentScreen }`.** | `services/brands/addOrUpdateBasicDetails.js:102-110` |
| P4 | No step order is enforced on the server. **🛠️ Fixed in P1 (branch, not deployed): screen guards + `advanceOnboarding` compare-and-swap.** | all onboarding services |
| P5 | Every system-verify run, a resubmit after rejection included, sets `PARTNERSHIP_DEED`, so a resubmit sends the vendor back, contradicting the remediation design. **Re-checked 2026-11-18: still true.** **🛠️ Fixed in P3 (branch, not deployed): `POST /brands/onboarding/submit` replaces it; a resubmit never moves the screen (`verifyVendor.js` is deleted on the branch).** | `services/systemVerify/verifyVendor.js:380` |
| P6 | `PUT /brands/update {isOnboarding:true}` is the only setter of `UNDER_REVIEW` and does not check `isOnBoardingCompleted`, so it can push a dashboard vendor back. **Re-checked 2026-11-18: still true.** **🛠️ Fixed in P3 (branch, not deployed): `isOnboarding` is stripped; `PUT /brands/update` never moves the screen.** | `services/brands/updateBrand.js:255-272` |
| P7 | Admin can approve as soon as system verify ran. `acknowledge-approval` does not check the screen. A vendor mid-funnel can jump to `DASHBOARD`. **🛠️ Fixed in P3 (branch, not deployed): approve / reject need a submit (`409 SUBMIT_REQUIRED`).** | `reviewBrandVerification.js`, `acknowledgeBrandApproval.js` |
| P8 | After a revoke, a resubmit sets `PARTNERSHIP_DEED`. `accept-partnership` does not move a completed vendor, so the vendor is stuck. **🛠️ Fixed in P3 / P5 (branch, not deployed): a resubmit keeps the screen; `accept-partnership` works only on `PARTNERSHIP_DEED` or as the popup confirmation (D43).** | `verifyVendor.js:380`, `acceptPartnership.js:46` |
| P9 | `UNREGISTERED` is saved first, then a 400 is thrown. **Re-checked 2026-11-18: still true.** **🛠️ Fixed in P1 / P2 (branch, not deployed): UNREGISTERED is a path (D72).** | `addOrUpdateBasicDetails.js:84` |
| P10 | 🔴 **Bank `isVerified` is client-supplied.** `createBank` computes `isverified` (lowercase, not in schema, so dropped). The client's `isVerified` is saved via `...rest`. Settlement trusts it. Payouts work today only because the vendor panel sends `true`. **Re-checked 2026-11-18: still live.** The code comment "client-supplied isverified/verifiedAt is never trusted" is wrong: the schema field is `isVerified` (`required: true`), and `verificationResponse` itself is client-sent. **🛠️ Fixed in P0 (2026-11-18, branch, uncommitted, not deployed): `isVerified` now comes only from the stored `KycVerification`.** | `services/bank/createBank.js:53,73-98`, `models/Bank.js:90`, `buildSettlements.js:688`, `paySettlement.js:641` |
| P11 | 🔴 PAN/GST `verificationStatus` / `isVerified` are client-supplied, and the system score reads them. `verify-*` return the provider response to the client and store nothing. **🛠️ Fixed in P0 (2026-11-18, branch, not deployed).** | `validator/pan.js:78,130`, `validator/gst.js:141`, `services/cgpeyAPIs/verify*AndFetchDetails.js` |
| P12 | When the score is below 75, the attempt gets `isRejected=true` (rejectedBy SYSTEM), and the edit window opens REMEDIATION before any admin looked. **🛠️ Fixed in P3 (branch, not deployed): the score is advisory; only an admin reject / revoke opens REMEDIATION.** | `verifyVendor.js:272-317`, `helpers/brands/onboardingEditWindow.js` |
| P13 | The customer "verified" badge has 3 definitions: `SystemVerify.status === APPROVED` (profile, search) vs `Brand.isApproved` (feed, voucher listing). **Re-checked 2026-11-18: still true** (line numbers moved). **🛠️ Fixed in P7 (branch, not deployed): all four read `Brand.isVerified`.** | `getCustomerBrand.js:181`, `helpers/search/buildBrandSection.js:169`, `customerBrandFeed.js:862`, `customerListing.js:1948` |
| P14 | Invoice address order is GST → brand location → PAN. For a GST brand, an edited brand address never reaches the invoice. A blank address is possible (tax then falls back to IGST). **🛠️ Fixed in P4 (branch, not deployed): billing → GST → PAN.** | `helpers/subscribeds/buildBillingDetails.js:75-120`, `calculatePricing.js:21-53` |
| P15 | The customer brand profile sends the brand-level `location` and `workHours` to customers. Once that location becomes the billing address, it could be a vendor's home address. **🛠️ Fixed in P4 (branch, not deployed): the keys come from the selected outlet (D90).** | `services/brands/getCustomerBrand.js:105-133` |
| P16 | The invoice address is read at **settle** time, while tax is computed at order time. An address change between the two can disagree with the tax. **Re-checked 2026-11-18: still true.** **🛠️ Fixed in P4 (branch, not deployed): `Transaction.billingSnapshot` frozen at create-order (D37).** | `helpers/subscribeds/settleSubscriptionPayment.js:471` |
| P17 | There is no state-name → GST-state-code map anywhere. `Location` stores only a state name. **🛠️ Fixed in P0 (branch, not deployed): `GST_STATE_CODES` (`constants/gstState.js`).** | grep, `calculateVoucherPricing.js:195-198` comment |
| P18 | ✅ **Fixed 2026-10-27 (hotfix S0, live on stage + prod, PR #15 / #16).** It was: a vendor passing another brand's `?brandId` to `GET /brands/get` / `PUT /brands/update` could read or edit that brand. Both now resolve the brand through `resolveActorBrand`. `POST /workHours/upsert` got the same ownership fix. | `services/brands/getBrand.js:239-240`, `services/brands/updateBrand.js:92` |
| P19 | `verify-*` reuse a stored response when the saved record says `verificationStatus === SUCCESS`. That stored response and status were client-supplied (P11), so the reuse can feed forged data back as if it came from the provider. **🛠️ Fixed in P0 (2026-11-18, branch, not deployed): reuse only from `KycVerification` (D47, D98).** | `verifyPanAndFetchDetails.js:34-44`, `verifyBankAndFetchDetails.js:35-47` |
| P20 | `verify-*` already refuse a PAN/GST/bank number used by another brand (plain 400, no code). So the −20 duplicate penalty can only ever fire for WhatsApp / email duplicates. **🛠️ P0 (branch, not deployed): the refusal now carries `DOCUMENT_IN_USE` (D48).** | `verifyPanAndFetchDetails.js:25-30`, `verifyBankAndFetchDetails.js:24-31` |
| P21 | `create-order` reuses an open CREATED order inside `pendingOrderReuseMinutes`, matching amount, term and mode only. **🛠️ Fixed in P4 (branch, not deployed): the reuse also matches the frozen GSTIN and billing state (D50).** | `services/transactions/createSubscribeOrder.js:103-160` |
| P22 | `buildClaimPreview` blocks a brand **softly** (`canClaim=false`, `BRAND_NOT_ACCEPTING`) and deliberately never tells the customer which internal state the brand is in. Its plan rule (`isBrandClaimable`, with grace days) is shared with the customer listings so the two never disagree. | `helpers/vouchers/buildClaimPreview.js:288-343` |
| P23 | **(2026-11-18)** Since P10 verified signup (live 2026-11-04), a new outlet is created **unverified** (`SubBrand.isWhatsappVerified: false` + a 72 h number hold). Until the manager gives the OTP, location, work hours and every other edit on it answer `409 OUTLET_NOT_VERIFIED`. The 2026-10-11 vendor guide said "onboarding does not wait for the manager", which the code no longer allows. | `services/subBrands/signUpSubBrandWithWhatsapp.js:262-263`, `helpers/subBrands/outletVerification.js` |
| P24 | **(2026-11-18)** A self-signup VENDOR is created `accountState: PENDING`. The hourly sweep soft-deletes a PENDING, never-verified account after `security.signup.pendingAccountDays`, and admin lists hide PENDING by default. An admin-created vendor (§15) has no OTP, so it must not be PENDING. **🛠️ Handled in P6 (branch, not deployed): admin create writes `accountState: ACTIVE` (D91).** | `services/auth/loginOrSignUpWithWhatsapp.js:87`, `services/auth/sweepPendingAccounts.js:58` |
| P25 | **(2026-11-18)** A brand holds **one** `subCategoryId`, read by 23 service / helper files: customer feed, search, taxonomy counts, voucher create / update (the voucher copies the brand's subcategory), promo evaluation and claim snapshots. **🛠️ Fixed in P8 (branch, not deployed): `subCategoryIds[]`, readers match any of them (D89).** | `services/vouchers/createVoucher.js:113,135`, grep `subCategoryId` |
| P26 | **(2026-11-18)** The active-feature limit is hardcoded to 10 in two services. **🛠️ Fixed in P8 (branch, not deployed): `vendor.brandFeatures.maxActive` (D84).** | `services/brandFeatures/addBrandFeature.js:41`, `updateBrandFeature.js:52` |

---

## 2. Locked decision log

**How to read this table:** D1–D65 are the 2026-10-11 decisions. Where the 2026-11-18 revision (D66–D96) replaced or changed one, the row ends with ⛔ **Replaced by …** or ✏️ **Changed by …**. The newer decision wins.

| ID | Decision |
|---|---|
| D1 | Server sets `currentScreen = BUSINESS_NAME` when a VENDOR is created (self signup and admin create). A vendor with no screen is healed to `BUSINESS_NAME` at login. ✏️ **Changed by D66:** the first screen is `BRAND_NAME`. |
| D2 | Only the server writes `currentScreen`, through one compare-and-swap helper. Every client `currentScreen` input is removed (`stripUnknown`, so old clients get no 422). |
| D3 | `add-basic-details` takes `step` (the screen being saved) instead of `currentScreen`. **Breaking change for the vendor panel and the admin panel.** ✏️ **Changed by D66–D71:** the steps are `BRAND_NAME`, `BUSINESS_CATEGORY`, `REGISTRATION_STATUS`, `REGISTRATION_ENTITY_TYPE`. |
| D4 | Screen list as in §3. `OUTLET_PAGE` and `SYSTEM_VERIFICATION` are removed. ✏️ **Changed by D66–D72:** new §3 list (`BUSINESS_NAME` also removed). |
| D5 | System verification runs at final submit and at every resubmit: `POST /brands/onboarding/submit`. |
| D6 | PAN, GST, KYC documents and Bank are skippable during onboarding. Status per item: `NOT_STARTED / PROVIDED / SKIPPED`. ⛔ **Replaced by D74:** only KYC documents, bank and professional details are skippable. |
| D7 | Unregistered path: entity = `PROPRIETORSHIP` automatically (screen skipped). Then `KYC_DOCUMENTS` (skippable), then `PAN_VERIFICATION` (personal PAN, skippable). ⛔ **Replaced by D72.** |
| D8 | Branch switch rules as in §7.3. ⛔ **Replaced by D75.** |
| D9 | Category + subcategory sit on `BUSINESS_CATEGORY`, right after `BUSINESS_NAME`. They are legal fields. ✏️ **Changed by D68:** one category, several subcategories, right after `BRAND_NAME`. |
| D10 | Setup is three server screens: `BRAND_BASIC_DETAILS`, `BRAND_PROFESSIONAL_DETAILS` (skippable), `OUTLET_DETAILS`. Each advances only through `POST /brands/onboarding/continue`. |
| D11 | One review screen `ONBOARDING_REVIEW`: a Setup section, then legal, plan, and a timeline. Skipped items can be filled here. |
| D12 | Admin APPROVE / REJECT only after submit. The REVIEWED toggle works any time. |
| D13 | Only an **admin** reject or revoke opens REMEDIATION. The system verdict is advisory. |
| D14 | Legal vs basic matrix as in §6. `brandName` is legal. After approval: vendor may **add** a missing PAN/GST/bank/document once. Changing one is admin only. ✏️ **Changed by D76:** a saved PAN / GST / bank is locked for the vendor from the moment it is saved, before submit too. |
| D15 | Selling to customers needs a verified bank. Generic helper `assertCanSellToCustomers(brand)` on voucher submit/publish, claim preview and every future paid feature. Drafts are allowed. |
| D16 | Every paid CGPey verification is stored server-side (`KycVerification`). Save APIs send `verificationId`. Status, name, address and `isVerified` are derived from the stored response. No second charge. |
| D17 | Scoring as in §9. A missing item never gives negative marks. The only negative is duplicates (−20). ✏️ **Changed by D81:** per-path check sets, a skipped item scores 0. |
| D18 | Profile strength as in §10. Computed live, never stored. |
| D19 | `Brand.isVerified` badge as in §11. Set manually by admin. It never blocks access or visibility. Existing approved brands are backfilled `true` (legacy). ✏️ **Changed by D93:** dummy brands are not backfilled. |
| D20 | Deed as in §13. Admin can record an offline acceptance with proof. The vendor confirms through a blocking popup at first login. |
| D21 | A revoke keeps the vendor on `DASHBOARD` (banner + remediation). `acknowledge-approval` also works from `DASHBOARD` after re-approval. |
| D22 | Admin can onboard a brand end to end (§15). The vendor resumes where the admin stopped. |
| D23 | Admin tabs NEW / WAITING / LIVE via `onboardingStage` + `stageCounts` (§16). |
| D24 | KYC documents as in §8: 3 slots, category hint, PDF preferred, JPG/PNG at least 800px short side, 5 MB, private bucket, masked Aadhaar. ⛔ **Replaced by D73 (documents) and D72 (owner ID).** |
| D25 | The `isOnboarding` flag is removed from `PUT /brands/update`. `User.isOnBoardingCompleted` stays. |
| D26 | `accept-partnership` only on `PARTNERSHIP_DEED`. During onboarding a subscription order is allowed only from `SUBSCRIBE_PLAN` onward. Dashboard vendors are unchanged. |
| D27 | Vendor "under review" and admin "awaiting review" notices fire at submit. |
| D28 | Every outlet added during onboarding needs a location and work hours before `continue` on `OUTLET_DETAILS`. More outlets are allowed within the plan limit. ✏️ **Changed by D85:** every outlet must also be verified. |
| D29 | Badge "at risk": strength falls below 75 after the grant → the badge stays and the admin list flags it. |
| D30 | **Billing address = brand location** (`locations` kind BRAND, `Brand.locationId`), always and everywhere. GST → PAN are a fallback only when no billing address exists, and only for automatic documents (settlement statement, chargeback advice), which must never fail. |
| D31 | The vendor panel / admin panel sends a full address + coordinates (Google APIs, same as the outlet form). No model change: coordinates stay required. |
| D32 | A "Same as GST" checkbox only **prefills** the form from the server-stored GST address (D16). No auto-sync when GST changes later. |
| D33 | **GSTIN state rule.** For a brand with a GSTIN, the billing address state must equal the GSTIN state. Enforced for vendor and admin, in both directions: on billing save (against GSTIN), and on GST save/change (against the existing billing address, error "update the billing address first"). Needs a new GST state code map (§14.4). |
| D34 | Dedicated `PUT /brands/billing-address` (upsert, `isVendorOrAdmin`, any time). Generic `/locations` create/update/delete refuse kind BRAND. A billing address can be edited, never deleted. |
| D35 | Existing vendors without a billing address confirm one at their next checkout, prefilled through `suggestedAddress` (GST, else PAN). |
| D36 | Admin panel has a billing-address form for any vendor, any time. Admin grant and any admin-driven order require a billing address. |
| D37 | A billing snapshot is frozen on the `Transaction` at `create-order`. The invoice uses that snapshot (fixes P16). |
| D38 | The customer brand profile stops returning the **brand's own** `location` and `workHours` (fixes P15; the customer app does not use them, D63). Brand-level work hours are no longer collected. The HQ-outlet idea is dropped. ✏️ **Changed by D90:** the keys stay, filled from the selected outlet. Brand-level hours are still not collected. |
| D39 | PAN type vs entity: **soft warning only** (`PAN_ENTITY_MISMATCH` + `suggestedEntity`) for the reliable groups (PROPRIETORSHIP→P, PARTNERSHIP/LLP→F, PRIVATE/PUBLIC/OPC→C). Admin remark in system verify. Never blocks, no negative points. No check for TRUST, SOCIETY, NGO, OTHERS or UNREGISTERED. ⛔ **Replaced by D71:** entity comes from GST (path A) or is suggested from the PAN type (path B); a different choice is a remark only. |
| D40 | Profile strength counts documents in state UPLOADED or ACCEPTED. REJECTED counts 0. ✏️ **Changed by D82:** the count rule changes; UPLOADED / ACCEPTED / REJECTED stays. |
| D41 | `BRAND_BASIC_DETAILS` → `continue` requires a logo. Cover and description are optional (they still count in strength). ✏️ **Changed by D83:** email and contact number are required too. |

**D42–D56: gaps found by the 2026-10-11 cross-doc audit and filled in.** Each one follows from a decision above. None changes a business rule the owner set. They are listed separately so the owner can object to any of them.

| ID | Decision |
|---|---|
| D42 | **Security fix (P18).** `GET /brands/get` and `PUT /brands/update` resolve the brand through `resolveActorBrand`: a vendor gets only their own brand, an admin passes `?brandId`. Lands in P1. ✅ **Done ahead of v2:** hotfix S0, live 2026-10-27 (P18). |
| D43 | **Deed endpoints.** `accept-partnership` is **vendor only**. On `PARTNERSHIP_DEED` it accepts and moves the screen. When `deed.requiresDeedConfirmation` is true it works **from any screen** as a confirmation only, without moving the screen. Anywhere else it returns `409 ONBOARDING_SCREEN_MISMATCH`. The admin offline deed (`PUT /brands/admin/:brandId/deed`) is allowed on `PARTNERSHIP_DEED`, where it moves the screen exactly like a vendor accept, and on any later screen, where it only replaces the record or proof. Earlier screens → `409 ONBOARDING_SCREEN_MISMATCH`. |
| D44 | **System status floor.** On the UNREGISTERED path, or when any KYC item is skipped, the advisory status is **set to** MANUAL_REVIEW, as both floor and cap. The numeric score is shown as computed. Reason: with skipped items the 75 threshold is unreachable (unregistered max = 55), so a bare REJECTED would mislead the admin. A REGISTERED brand with nothing skipped follows the normal thresholds. ⛔ **Replaced by D81.** |
| D45 | **Branch-switch rewind.** `advanceOnboarding` records `Brand.onboarding.furthestScreen` (the furthest screen in canonical order ever reached). A branch switch in FIRST_PASS sends the vendor to the first screen of the new branch. When that branch's KYC block ends (the move that would land on `BANK_VERIFICATION`), the server moves to `furthestScreen` if it is beyond `BANK_VERIFICATION`, otherwise to `BANK_VERIFICATION`. Deed, plan and setup screens already done are never repeated. ✏️ **Still the rule**, applied to the three paths of D70–D72 (§7.4). |
| D46 | `GET /brands/billing-address` always returns `gstAddress` (the server-stored GST address) when a GSTIN exists, so "Same as GST" also works when editing an existing billing address. `suggestedAddress` is returned only when no billing address exists. |
| D47 | `verify-*` reuse a previous result **only from `KycVerification`**, never from the client-written PAN/GST/bank record (P19). |
| D48 | A PAN/GST/bank number already used by another brand stays a hard refusal at `verify-*`, now with code `DOCUMENT_IN_USE` (400). The −20 duplicate penalty therefore applies to WhatsApp / email duplicates (P20). |
| D49 | **Customer claim side** (production switch-on: D62). The bank check inside `buildClaimPreview` is a **soft block** with the existing `BRAND_NOT_ACCEPTING` code and message, and the same check is added to `isBrandClaimable` so the customer listings agree (P22). The 403 codes `BANK_REQUIRED` / `BRAND_NOT_APPROVED` / `PLAN_REQUIRED` are for vendor and admin routes only. The customer app sees no new code. ✏️ **Completed by D101:** behind `customer.claim.requireVendorVerifiedBank`, default OFF. |
| D50 | The pending-order reuse filter also matches the frozen billing state code, so a changed billing state creates a new order with the new tax split (P21). |
| D51 | **Strength normalisation.** Items a brand cannot earn (showcase switched off globally, or a plan with no showcase entitlement) are excluded, and `score = round(earned / available × 100)`. So every vendor can still reach 100. |
| D52 | Plan activation moves the screen only from `SUBSCRIBE_PLAN` while onboarding is not complete (today's `advanceOnboardingAfterPlan` rule, kept). A renewal from any other screen never moves it. |
| D53 | Transactions with no `billingSnapshot` (older ones, invoice regeneration, settle-resume) use `buildBillingDetails` with its GST → PAN fallback. |
| D54 | Badge fields are `badgeGrantedAt` / `badgeGrantedByAdminId`. `Brand.verifiedAt` / `verifiedBy` already exist as the SystemVerify mirror (`models/Brand.js:110-116`) and keep that meaning. |
| D55 | **Admin tabs.** NEW = not submitted **and** not approved. The migration backfills `onboarding.submittedAt` for **every** brand with a live attempt (approved and revoked included), so no brand shows in two tabs. |
| D56 | Brand-level work hours: `POST /workHours/upsert {brandId}` keeps working, but nothing reads brand-level hours any more and the panels stop calling it. Retiring the endpoint is a later cleanup. |

**D57–D59: owner answers on 2026-10-11.**

| ID | Decision |
|---|---|
| D57 | **Deed text and version.** The deed version string lives in `Setting` (admin-editable) and is recorded on every acceptance. The deed text stays where the vendor panel keeps it today. (Closes OPEN-A.) ✏️ **Narrowed by D103:** `vendor.onboarding.deedVersion`, default `"v1"`; a new version asks nobody to accept again. |
| D58 | **Rollout.** Backend is deployed to **stage** first. Both panels are changed and tested against stage. Then production. No compatibility shim for old panel params. **Production already has data**, so §21 adds a production migration and release plan. (Replaces OPEN-C.) |
| D59 | **Security fix P18** lands in P1 with the rest of onboarding v2. `master_execution_plan.md` gets a pointer to the phases doc once the plan is approved. (Closes OPEN-B. Pointer added as Part 5C on plan approval, 2026-10-11.) ✅ **P18 was fixed ahead of v2** (hotfix S0, 2026-10-27), so it is no longer P1 work. |

**D60–D65: owner answers on production, and the plan approval (2026-10-11).** The owner approved D42–D56 and the phases plan.

| ID | Decision |
|---|---|
| D60 | **Three databases.** Stage keeps its **own existing data** and is where both panels are tested. Production is **cloned into a new, separate rehearsal database**, where every migration script and the bank report run (dry-run → owner review → apply) before production. If any server is ever pointed at the rehearsal clone, it runs with: the admin notification platform switch **off** for WhatsApp and email (the first check in `isChannelAllowed`, `docs/notification_preferences.md`), or contacts masked; `ENABLE_JOBS=false`; Razorpay **test** keys. The clone holds real people's numbers and emails. (Closes OPEN-D. Corrected 2026-10-11: stage is not the clone.) The rehearsal clone is the permanent `Trydood_Prod_rehearsal` on the production cluster, refreshed from production before each use. |
| D61 | **Production release window.** Backend, vendor panel and admin panel deploy in the same window, at a quiet hour, with the migrations right after the backend. (Closes OPEN-E.) |
| D62 | **Customer-side bank check.** The owner says every existing bank was verified. Today's flags were sent by the panel (P10), so this is confirmed with a **read-only report on the rehearsal clone of production** before release: approved brands whose bank is missing, has `isVerified !== true`, or whose stored provider verdict (`verificationStatus`) is not `SUCCESS` (census report 3a, `scripts/onboardingV2Census.js`). If the report is empty, the check (D49) goes live with the release. If not, those vendors re-verify first. Either way the check sits behind a setting, kept as a kill switch. (Closes OPEN-F.) |
| D63 | **Customer profile keys.** The customer app does not use brand `location` / `workHours` (owner), so D38 stands as written: the keys are removed. (Closes OPEN-G.) ⛔ **Replaced by D90.** |
| D64 | **CLAUDE.md updated:** the dev databases are disposable, production is not, and releases go stage first. (Closes OPEN-H.) |
| D65 | **Existing KYC records.** The PAN / GST / bank records stay the **one place every reader looks** for verified status (score, strength, badge, selling gate, settlement). From P0 on only the server writes those fields, from `KycVerification`. Production's existing values are kept, and the D62 report checks the bank ones. No `KycVerification` backfill is needed. Reuse of an old result still comes only from `KycVerification` (D47), so a legacy brand that re-verifies pays for one fresh call. |

**D66–D96: owner revision of the middle of the flow, 2026-11-18.** The owner changed the Basic Details and Business Verification part of the flow (screens shown in the panel's design screenshots) and answered every question raised while confirming it. Everything after `BANK_VERIFICATION`, admin onboarding, badge, selling gate, deed, billing and the tracker rules stay as decided.

| ID | Decision |
|---|---|
| D66 | **Basic Details group = `BRAND_NAME` → `BUSINESS_CATEGORY` → `REGISTRATION_STATUS`.** `BRAND_NAME` takes the brand name only. `BUSINESS_NAME` is removed. A new vendor (self signup or admin create) starts on `BRAND_NAME`, and a vendor with no screen is healed to it at login. |
| D67 | **`legalBusinessName` is derived by the server, never typed.** Path GST: the GST legal name, at GST save. Path NO_GST: the name on the PAN, at PAN save. Path UNREGISTERED: the owner's PAN name when the owner verified by PAN, otherwise the brand name, at owner-verification save. An admin may still edit it (legal edit, history row). |
| D68 | **Category: one category, several subcategories.** Every chosen subcategory must belong to the chosen category. Limit = new setting `vendor.onboarding.maxSubCategories`, default 3 (`422 SUBCATEGORY_LIMIT`). Stored as `Brand.subCategoryIds[]`; `Brand.subCategoryId` is kept and always equals the **first** chosen one, for every reader not yet changed and for old customer app builds (D89). Category and subcategories are legal fields. |
| D69 | **`REGISTRATION_STATUS` has three options:** `GST` ("I have GST"), `NO_GST` ("Registered, no GST") and `UNREGISTERED`. The choice is stored as `Brand.onboarding.kycPath`. `businessRegistrationStatus` keeps its two values: `REGISTERED` for GST and NO_GST, `UNREGISTERED` for UNREGISTERED, so today's readers keep working. |
| D70 | **Path GST:** `GST_VERIFICATION` → `PAN_VERIFICATION` → `REGISTRATION_ENTITY_TYPE` → `KYC_DOCUMENTS` (skippable). GST and PAN are mandatory. A GSTIN whose provider status is cancelled or suspended is refused at save (`422 GSTIN_NOT_ACTIVE`, message suggests "Registered, no GST"). The PAN must be the one inside the GSTIN (characters 3–12), else `422 PAN_NOT_IN_GSTIN`; the panel prefills it. At GST save the server sets the entity from the GST constitution (`GST_TO_BRAND_ENTITY_MAP`). The entity screen is then read-only: a different value answers `409 ENTITY_FROM_GST`. Only when the constitution cannot be mapped may the vendor choose. |
| D71 | **Path NO_GST:** `PAN_VERIFICATION` (mandatory, business **or** personal PAN) → `REGISTRATION_ENTITY_TYPE` → `KYC_DOCUMENTS` (skippable). `verify-pan` returns `suggestedEntity` from the PAN type (4th character: P → PROPRIETORSHIP, C → PRIVATE_LIMITED, F → PARTNERSHIP, E → LLP, T → TRUST; other types no suggestion; `constants/kyc.js` `PAN_TYPE_ENTITY_SUGGESTION`). The panel preselects it; the vendor confirms or changes it. A choice that differs from the PAN type is a system-verify **remark** only. GST is not asked now: it can be added later from the profile, once, with every GST rule (D70 PAN-in-GSTIN, D33); adding it moves `kycPath` to `GST`. |
| D72 | **Path UNREGISTERED:** `OWNER_VERIFICATION` (mandatory) → `KYC_DOCUMENTS` (skippable). Entity is set to `PROPRIETORSHIP` automatically, no screen. Owner verification is **either** the PAN (same `verify-pan` API, preferred) **or** one uploaded ID: Aadhaar (masked, last 4 digits only), Driving Licence, Passport or Voter ID, as PDF or JPG/PNG (≥ 800 px short side), max 5 MB, private bucket, reviewed by an admin. |
| D73 | **KYC documents have no slots.** A list of documents, each with a required **title** (2–80 chars) and a `docType` code: the code of a recommended chip when the vendor picked one, else `OTHER`. Max = new setting `vendor.onboarding.maxKycDocuments`, default 10 (`422 KYC_DOCUMENT_LIMIT`). PDF or JPG/PNG (≥ 800 px short side), 5 MB, private bucket. Any saved document sets `documentsStatus = PROVIDED`. Recommendations come from `Category.kycDocumentHints[]` (admin-set list of `docType` codes, replaces the planned `kycLicenseHint`). Food categories still show the FSSAI warning on skip (never blocks). Admin reviews each document UPLOADED → ACCEPTED / REJECTED (+ reason). |
| D74 | **Skippable screens:** `KYC_DOCUMENTS`, `BANK_VERIFICATION`, `BRAND_PROFESSIONAL_DETAILS`. Nothing else (`422 SCREEN_NOT_SKIPPABLE`). Item statuses: `NOT_STARTED`, `PROVIDED`, `SKIPPED`, `NOT_APPLICABLE` (an item outside the brand's path). |
| D75 | **Registration status lock.** The status can be changed (from the Basic Details preview, or back-navigation) until the path's first legal save: GST saved on path GST, PAN saved on path NO_GST. After that it is read-only for the vendor (`409 REGISTRATION_STATUS_LOCKED`). Path UNREGISTERED can always move to GST or NO_GST: before submit, in remediation, and after approval as an upgrade (D94). Moving from GST / NO_GST to UNREGISTERED after the lock is admin only. An admin reject or revoke reopens the status like every other locked field. On a switch, data carries over: an owner PAN becomes the NO_GST PAN without a new paid call; on a move to GST the PAN must still match the GSTIN, else it is re-verified. Documents always stay. |
| D76 | **Lock on save.** A saved PAN, GST or bank is read-only for the vendor in every mode except REMEDIATION, before submit too (`409 DETAIL_ALREADY_PROVIDED`). A change goes through support (admin). The owner verification of path UNREGISTERED and the NO_GST entity stay editable until submit. |
| D77 | **Sidebar groups and progress come from the server.** `status.groups[]`: `BASIC_DETAILS`, `BUSINESS_VERIFICATION` (screens depend on the path), `PAYOUT`, `AGREEMENT_PLAN`, `BRAND_OUTLET`, each with its screens and state. `status.progress { group, groupCount, percent }`, percent = done screens / applicable screens. Clicking a finished group opens a **preview** in the panel: edits there use the normal save APIs and never move the screen. |
| D78 | **While pending (`UNDER_REVIEW`, admin decision not taken): add only.** The vendor may add what is missing or was skipped (documents, bank, GST on path NO_GST, logo / cover / description when empty, showcase albums, features, **new** outlets within the plan limit). Changing anything already saved answers `409 ONBOARDING_LOCKED`. The billing address stays editable (renewals and invoices need it). |
| D79 | **Re-check without a new attempt.** When a scored item (PAN, GST, bank) is added while pending, or after approval, the same scorer re-runs on the **live** attempt: `latestScore`, `latestStatus`, `latestScoredAt` change, the submit-time `score` / `status` stay, history gets `DETAIL_ADDED`, the admin gets one notice (deduped per attempt and item). No new `SystemVerify` document. Documents and profile items change no score and write only the history row. |
| D80 | **System checks never block submit** (D13 stands). `GET /brands/onboarding/status` returns `systemChecks[]`, computed live from stored results (no document written, no paid call), so the review page shows what passes and what would raise the score **before** submit. `submit` returns the same list. The server checks "document has a title and a valid file" only; whether it is readable is the admin's call. |
| D81 | **System score per path** (§9.3). Only checks that exist on the brand's path are counted, each path totals 100. A check the vendor **skipped** scores 0 (skipping never helps). Duplicate WhatsApp / email −20. Thresholds ≥ 90 APPROVED · ≥ 75 MANUAL_REVIEW · else REJECTED. Status is **capped and floored at MANUAL_REVIEW** when any item was skipped or the owner verified by an uploaded ID. Path UNREGISTERED with owner PAN and nothing skipped follows the normal thresholds. "PAN inside GSTIN" and "entity from GST" are hard rules at save (D70), not points. ✏️ **Changed by D100:** the cap is the skipped bank and the owner ID only; skipped documents are a remark. |
| D82 | **Profile strength weights** (§10.2). Identity (10) = PAN verified on GST / NO_GST, owner PAN verified or owner ID UPLOADED / ACCEPTED on UNREGISTERED. Business proof (10) = the higher of GST verified (10) or documents (1 → 5, 2 or more → 10; UPLOADED / ACCEPTED count, REJECTED 0). Every item returns its `points` and an `action`, so the panel can show "+N" hints for anything skipped or missing, on every path. Every path can reach 100. |
| D83 | **`BRAND_BASIC_DETAILS` `continue` needs a logo, an email and a contact number** (`missing`: `LOGO`, `EMAIL`, `MOBILE`). Their OTP verification happens later from the profile (strength +3 / +2). "Same as WhatsApp number" for the contact number sends `useWhatsappAsMobile: true`: the server copies the owner's **verified** WhatsApp number into `mobile` and marks it verified; it never trusts a number sent with the flag. The panel may show `BRAND_BASIC_DETAILS` and `BRAND_PROFESSIONAL_DETAILS` on one page: the server keeps two screens, the per-card "Skip for now" is panel-only, and the panel calls `continue` (basic) then `continue` or `skip` (professional). |
| D84 | **Limits come from the server, never hardcoded in a panel.** Showcase album count: the plan (`Subscription.entitlements.showcase`). Minimum items per album: `Setting.vendor.showcase.minItemsPerSection`. Active features: new setting `vendor.brandFeatures.maxActive`, default 10, replacing the hardcoded 10 (P26). |
| D85 | **Outlets must be verified.** `OUTLET_DETAILS` `continue` and `submit` need every live outlet verified (manager OTP) with a location and work hours. New `missing` code `OUTLET_NOT_VERIFIED:<outletId>`. A pending outlet can be resent or cancelled (existing P10 routes). The P10 gate (`409 OUTLET_NOT_VERIFIED` on edits of a never-verified outlet) stays as it is (P23). |
| D86 | **Outlet "Same as brand WhatsApp number".** `POST /subBrands/signUp-with-whatsapp { useOwnerNumber: true }` without `whatsappNumber` (both → 422). The server reads the brand owner's number. It works only when that number is verified (`isWhatsappVerified` and `firstVerifiedAt`), else `422 OWNER_NUMBER_NOT_VERIFIED`, so an admin-created vendor who never signed in uses the normal OTP. The outlet and its SUB_VENDOR account are created verified: `firstVerifiedAt` set, no hold, signup attempt `VERIFIED`, `SubBrand.verifiedVia = OWNER_NUMBER`. One number holds one live SUB_VENDOR on the whole platform (`user_whatsappNumber_role_unique`), so a second outlet on the same number is refused like today. An admin may use the flag under the same condition. ✏️ **Changed by D108:** no signup-attempt row is written (no code is sent); `SubBrand.verifiedVia = OWNER_NUMBER` is the record. |
| D87 | **Vendor's WhatsApp number changes while an outlet still uses the old one** (self change or admin contact change): the vendor and the admin get a notice "outlet X still uses the old number, update it". Nothing is blocked automatically. |
| D88 | **Voucher subcategory.** Brand with one subcategory → the voucher takes it automatically (today's behaviour). Brand with several → `subCategoryId` is required on voucher create and must be one of the brand's (`422 SUBCATEGORY_NOT_IN_BRAND`); the same on update. When a subcategory is later removed from the brand, live vouchers keep theirs; new and edited vouchers use the current list. ✏️ **Confirmed by D107:** one subcategory per voucher; none sent on a multi-subcategory brand → `422 SUBCATEGORY_REQUIRED`. |
| D89 | **Customer app compatibility for subcategories.** Customer responses keep the single `subCategoryId` / `subCategory` keys (the first chosen) and add `subCategories[]`. Feed, search, filters and taxonomy counts match a brand on **any** of its subcategories. |
| D90 | **Customer profile `location` / `workHours` keys stay**, filled from the **selected outlet**, never from the billing address (old app builds keep working, no private address leaks; the v1.12 customer app guide §9 rule "nothing is removed" holds). Brand-level hours are still not collected (D38, D56). |
| D91 | **Admin-created vendor is `accountState: ACTIVE`** (never PENDING): not swept, not hidden from admin lists (P24). |
| D92 | **No owner-verification check for admin-created brands.** Customer visibility keeps checking only the outlet manager's WhatsApp verification (P10 D1). |
| D93 | **Dummy brands (`isDummy: true`) are not backfilled with the legacy badge** (`isVerified` stays false). The rest of the migration leaves them as they are (they stay on `DASHBOARD`). |
| D94 | **Upgrade from UNREGISTERED after approval.** From the profile the vendor adds GST and/or PAN (add-missing rules). Approval stays. `kycPath` and `businessRegistrationStatus` change, the server updates `legalBusinessName` from GST / PAN (history row), the entity is set once (from GST on path GST, chosen once on NO_GST, then locked), the score re-runs (D79) and the admin gets a notice. |
| D95 | **Documents after approval:** new documents may be added. Replacing or deleting an existing one is admin only, or the vendor in REMEDIATION. |
| D96 | **Showcase skip vs the brand-visibility switch.** Skipping `BRAND_PROFESSIONAL_DETAILS` stays allowed. When `Setting.customer.brandVisibility.requireShowcase` is ON, `status.customerVisibilityHints` says an album is needed to be shown to customers, and the panel warns on skip. |

**D97–D98: owner answers while building P0, 2026-11-18.**

| ID | Decision |
|---|---|
| D97 | **A failed verification cannot be saved.** `add-pan|gst|bank-details` with the id of a check the provider did not pass answers `422 VERIFICATION_FAILED` (the provider's reason as the message). The failed check itself stays in `KycVerification` for audit — it was a paid call. Records therefore only ever hold verified PAN / GST / bank data. |
| D98 | **Reuse window.** `verify-*` reuses this brand's own verified answer for the same number (bank: same number **and** IFSC) only if it is at most `Setting.vendor.kyc.reuseDays` old — default 30, `0` = never reuse, whole days, no upper limit. Same for PAN, GST and bank. Older → a fresh paid call (a GSTIN can be cancelled after it was checked). |
| D99 | **The unregistered owner's PAN is personal** (owner, 2026-11-18, while building P2). On path UNREGISTERED a PAN whose 4th character is not `P` (company, firm, LLP, trust, …) is refused with `422 OWNER_PAN_NOT_PERSONAL` — at `verify-pan` before the paid call, and at `owner-verification`. Such a business is registered: the vendor chooses `NO_GST`. The status-switch carry-over onto UNREGISTERED (D75) only takes a personal PAN as the owner's proof. A review of an owner ID or document notifies the vendor in P3, with the other onboarding notices. |
| D100 | **The score cap is the bank and the owner ID only** (owner, 2026-11-18, while building P3 — narrows D81). The advisory status is set to MANUAL_REVIEW (floor and cap) when the **bank** was skipped or the owner verified by an uploaded ID. Skipped KYC documents carry no points and are a remark (`DOCUMENTS_SKIPPED`), never a cap — a GST brand with PAN, GST and bank verified can read APPROVED without documents. The admin decides either way. |
| D101 | **The customer-side bank switch ships OFF** (owner, 2026-11-19, while building P5 — completes D49 / D62). `Setting.customer.claim.requireVendorVerifiedBank`, default `false`: the deploy changes nothing for customers. At the release the D62 bank report runs on the rehearsal clone; when it is empty an admin switches it on. On, a brand without a verified bank (`Brand.BankId`, live, `isVerified`) drops out of every claim listing and its claim preview says `BRAND_NOT_ACCEPTING`. The vendor-side gate (`assertCanSellToCustomers`) is not behind the switch. |
| D102 | **The vendor's own deed acceptance is never replaced** (owner, 2026-11-19, while building P5). An admin offline deed (`PUT /brands/admin/:brandId/deed`) on a brand whose vendor accepted it themselves — the click, or the pre-P5 `hasAcceptedPartnershipDeed` flag — is refused with `409 DEED_ALREADY_ACCEPTED`, checked again inside the write. An admin may replace their own offline record / proof; a vendor confirmation already given is kept. |
| D103 | **A new deed version asks nobody to accept again** (owner, 2026-11-19, while building P5 — narrows D57). `Setting.vendor.onboarding.deedVersion` (default `"v1"`) is recorded on every acceptance and confirmation; changing it only affects acceptances from then on. Re-acceptance on a version change is later work. |
| D104 | **In P6 an admin works under the vendor's locks** (owner, 2026-11-19, while building P6 — defers part of §6). An admin filling a vendor's onboarding (`?brandId=`) follows the owner's screen order and the same edit windows: `ONBOARDING_LOCKED` while pending, `LEGAL_FIELD_LOCKED` after approval, `DETAIL_ALREADY_PROVIDED` on a saved PAN / GST / bank, `REGISTRATION_STATUS_LOCKED`. The §6 rule "an admin may edit everything in every state, with a history row" (and `LEGAL_EDIT_BY_ADMIN`, re-scoring after an approved change) is a separate phase **P6b**. |
| D105 | **Admin-created vendors are not messaged** (owner, 2026-11-19, while building P6). `POST /brands/admin/onboarding/create` sends nothing; the admin tells the vendor, who signs in with the normal WhatsApp OTP. No new template. |
| D106 | **The deed's strength points include the vendor's confirmation** (owner, 2026-11-19, while building P7 — §10.2 "deed accepted by the vendor themselves"). The 5 points are earned by the vendor's own click, the pre-P5 flag, **or** the vendor confirming an admin's offline deed in the popup (`deed.vendorConfirmedAt`). An unconfirmed admin deed earns 0 with a "+5" hint. So an admin-created vendor can still reach 100. |
| D107 | **A voucher keeps one subcategory** (owner, 2026-11-19, while building P8 — confirms D88). From the brand's own list; automatic when the brand has one, required (`422 SUBCATEGORY_REQUIRED`) when it has several, and refused off the list (`422 SUBCATEGORY_NOT_IN_BRAND`). Several subcategories per voucher is a future note (§23). The same day, a live bug was fixed in P8: the voucher's `categoryId` / `subCategoryId` exist only on the **version** (the master `Voucher` schema has neither), and the claim preview read them off the master — so every category-scoped promo code was refused and every claim snapshot froze no category. Both now read the version. |
| D108 | **An outlet on the owner's number has no signup-attempt row** (owner, 2026-11-19, while building P8 — narrows D86). No code is sent, and a signup attempt is the record of a send; `SubBrand.verifiedVia = OWNER_NUMBER` is the record instead. |
| D109 | **The D87 outlet-number notice goes in-app + push + email, no WhatsApp** (owner, 2026-11-19, while building P8). No Meta template is needed. Types `OUTLET_ON_OLD_OWNER_NUMBER` (vendor) and `BRAND_OUTLETS_ON_OLD_OWNER_NUMBER` (admin). |
| D110 | **An admin moving a brand off path GST takes the GSTIN off the brand** (owner, 2026-11-19, while building P6b). `Brand.GSTId` and `onboarding.gstStatus` are unset; the GST record stays (never deleted). The score, strength and invoice then read the new path only; back on GST the GSTIN is verified and saved again. A vendor cannot reach this (D75 locks the status once the GST is saved). |
| D111 | **The vendor is told when an admin corrects their legal details** (owner, 2026-11-19, while building P6b). Any admin correction of a **submitted** brand (name, legal name, category, status, entity, PAN, GST, bank, owner verification, documents) sends `BRAND_DETAILS_UPDATED_BY_ADMIN` — in-app + push + email, no WhatsApp — next to the `LEGAL_EDIT_BY_ADMIN` history row. |
| D112 | **A brand name is 2–25 characters** (owner, 2026-11-19, from the vendor panel audit — the panel had 15, the server 120 / 150). One constant (`BRAND_NAME_LIMITS`, `constants/onboarding.js`) on every write: `add-basic-details` (BRAND_NAME), `update-basic-details`, admin create, `PUT /brands/update`. Existing longer names are not touched; a rename must fit. `GET /brands/onboarding/status` now returns `limits { brandNameMinLength, brandNameMaxLength, maxSubCategories, maxKycDocuments, maxActiveFeatures }` (audit Q8) so the panel hardcodes nothing. |
| D113 | **No server "prefill" field after a refresh** (owner, 2026-11-20, from the vendor panel's Milestone A questions §4.5 / §4.6). `panFromGstin` and `suggestedEntity` stay in the `verify-*` answers only. After a page refresh the panel derives them from saved records, by fixed government formats: GST path PAN = `GET /brands/get` → `gst.gstNumber` characters 3–12 (the same slice the server uses); NO_GST suggestion = `pan.pan`'s 4th character (P PROPRIETORSHIP · C PRIVATE_LIMITED · F PARTNERSHIP · E LLP · T TRUST · else none — `PAN_TYPE_ENTITY_SUGGESTION`). GST path needs nothing: the GST save already writes `businessEntityType` on the brand. No backend change, no deploy. |
| D114 | **CGPEY gets only the fields it takes; GST address printed once** (owner, 2026-11-20, from the vendor panel's GST-path stage run). (1) `verify-bank` forwarded the request body, so the `beneficiaryName` the docs asked for reached CGPEY, which refuses extra keys (`400 "beneficiaryName" is not allowed`) — no bank could be verified. CGPEY now gets exactly `{ accountNumber, ifscCode }` (PAN `{ pan }`, GST `{ gstNumber }`), and the validator no longer takes `beneficiaryName` (stripped, no error). (2) The account holder comes from the bank's answer only — the vendor-typed name no longer fills in (it made a nameless drop "verified"). (3) A provider refusal / transport failure answers its own status with `details.code: PROVIDER_ERROR` (KYC routes only, not `fetchAPI`). (4) The GST address is one rule (`helpers/gst/gstAddress.js`, the invoice's) for the GST card `addressOnRecord` and the billing "Same as GST" `addressLine1`: parts the provider's `location` already holds are dropped — it was printed twice. Rebuilt on read, so stored answers need no migration. |
| D115 | **A failed check sent with an error status is an answer, not an outage** (owner, 2026-11-20, from the panel's second GST-path bank try — a mistyped account, request `REQ_1795170007374_r6gxkvujg`). CGPEY answers a failed penny drop with **HTTP 400** and the bank's result in the body (`status: FAILED`, `result.is_valid: false`, `recommended_action: AC_RETRY_TXN`, `chargeble: "false"`); axios throws on every non-2xx, so D114 turned it into `PROVIDER_ERROR` ("the service is not responding") — wrong for a wrong account number, and against the API doc's "a failed drop is `200 isVerified: false`". `runKycVerification` now treats an error body carrying the check's own result (bank `result.is_valid` / `recommended_action`; PAN / GST `data.status`) as the answer: parsed, stored as FAILED (never reused), `200 isVerified: false` with the provider's reason. `PROVIDER_ERROR` stays for bodies without one. The customer bank flow has the same gap — not touched (P-58). |
| D116 | **Milestone B fixes** (owner, 2026-11-21, from the vendor panel's Milestone B report). (1) `GET /brands/get` gives a **vendor** the bank **masked**: `bank.accountNumber`, the raw `bank.verificationResponse` (it repeats the number) and the provider's `bank.user` are `$unset` for every non-admin caller (`services/brands/getBrand.js`); the admin keeps the whole record. A stolen vendor session must not hand over a full account number; the panel shows the last four only. (2) `POST /subBrands/signUp-with-whatsapp` with `useOwnerNumber` answered *"created, but the OTP could not be sent"* because `otpSent` is `false` there by design — the controller now checks `isVerified` first: *"Outlet/Sub-Brand created and verified with the brand owner's WhatsApp number."* (3) Doc only: the vendor history row (#33) carries `reason` (with `previousStatus` / `newStatus`), never `rejectionReason` — the old example was wrong. Checked, **not** a bug: the outlet resend cooldown — stage's two GST-outlet codes went 61 s apart under the live 60 s / 5-per-hour throttle; a resend inside it is `429` + `retryAfterSeconds`. |
| D117 | **`status.customerVisibilityHints.showcaseReady` means "a customer-visible album exists", whatever the switch** (owner, 2026-11-21). It is computed with `withShowcase: true`, the same as `GET /brands/get`'s `customerVisibility.showcaseReady`; before, with `requireShowcase` OFF it was never checked and read `false`. Hiding is unchanged: a missing album hides the brand only with the switch ON (`NO_VISIBLE_SHOWCASE`). |

---

## 3. Final screen list and sidebar groups

```
Login → BRAND_NAME → BUSINESS_CATEGORY → REGISTRATION_STATUS
  ├─ GST          → GST_VERIFICATION → PAN_VERIFICATION → REGISTRATION_ENTITY_TYPE (from GST) → KYC_DOCUMENTS (skip) ─┐
  ├─ NO_GST       → PAN_VERIFICATION → REGISTRATION_ENTITY_TYPE (suggested) → KYC_DOCUMENTS (skip) ───────────────────┤
  └─ UNREGISTERED → OWNER_VERIFICATION → KYC_DOCUMENTS (skip)   [entity = PROPRIETORSHIP] ─────────────────────────────┤
                                                                                                                       ↓
BANK_VERIFICATION (skip) → PARTNERSHIP_DEED → SUBSCRIBE_PLAN (billing address required)
→ BRAND_BASIC_DETAILS (logo, email, contact) → BRAND_PROFESSIONAL_DETAILS (skip) → OUTLET_DETAILS
→ ONBOARDING_REVIEW → (submit) UNDER_REVIEW → (approve + acknowledge) DASHBOARD
```

**`SCREENS` (new):** `BRAND_NAME, BUSINESS_CATEGORY, REGISTRATION_STATUS, GST_VERIFICATION, PAN_VERIFICATION, REGISTRATION_ENTITY_TYPE, OWNER_VERIFICATION, KYC_DOCUMENTS, BANK_VERIFICATION, PARTNERSHIP_DEED, SUBSCRIBE_PLAN, BRAND_BASIC_DETAILS, BRAND_PROFESSIONAL_DETAILS, OUTLET_DETAILS, ONBOARDING_REVIEW, UNDER_REVIEW, DASHBOARD`.

**Removed:** `BUSINESS_NAME`, `SYSTEM_VERIFICATION`, `OUTLET_PAGE`.

**Canonical order** (used for `furthestScreen`, §4): the order of the list above. Screens outside the brand's path are `NOT_APPLICABLE` and are never landed on.

**Sidebar groups (D77):**

| Group | Screens |
|---|---|
| `BASIC_DETAILS` | `BRAND_NAME`, `BUSINESS_CATEGORY`, `REGISTRATION_STATUS` |
| `BUSINESS_VERIFICATION` | GST: `GST_VERIFICATION`, `PAN_VERIFICATION`, `REGISTRATION_ENTITY_TYPE`, `KYC_DOCUMENTS` · NO_GST: `PAN_VERIFICATION`, `REGISTRATION_ENTITY_TYPE`, `KYC_DOCUMENTS` · UNREGISTERED: `OWNER_VERIFICATION`, `KYC_DOCUMENTS` |
| `PAYOUT` | `BANK_VERIFICATION` |
| `AGREEMENT_PLAN` | `PARTNERSHIP_DEED`, `SUBSCRIBE_PLAN` |
| `BRAND_OUTLET` | `BRAND_BASIC_DETAILS`, `BRAND_PROFESSIONAL_DETAILS`, `OUTLET_DETAILS` |

"GST Review" / "PAN Review" in the panel are sub-steps of one server screen (fetch → show → confirm and save), not screens.

**Why server screens at this granularity:**

- a vendor who closes the panel or logs out resumes on the exact sub-step;
- an admin sees where a vendor is stuck;
- each screen has its own completion rule.

---

## 4. Tracker rules (server-driven)

1. **One writer.** `advanceOnboarding(userId, from, to)` runs `User.updateOne({_id, currentScreen: from}, {$set:{currentScreen: to}})`. If it matches nothing, the call answers `409 ONBOARDING_SCREEN_MISMATCH` with the real `currentScreen`. This keeps an admin and the vendor acting at the same moment safe. It also records `Brand.onboarding.furthestScreen`.
2. **The tracker belongs to the brand owner.** Whoever acts, `brand.userId`'s screen is the one that moves.
3. **Forward only.** Re-saving an earlier step never moves the screen back. The one exception is a registration status switch (§7.4, D45), which runs the new path's verification screens and then returns to the furthest screen reached.
4. **Back and preview are client navigation.** Earlier screens are prefilled from the server. What may still be edited is decided by §6.
5. **The panel (vendor or admin) always navigates to the `currentScreen` in the response.**
6. **Data-save APIs never move the screen** for the setup screens (brand update, billing address, showcase, features, subBrands, locations, workHours) and for documents. Only these move it:
   - a legal step save, in FIRST_PASS and on its own screen (`add-basic-details`, `add-gst-details`, `add-pan-details`, `owner-verification`, `add-bank-details`)
   - `skip`
   - `continue`
   - `submit`
   - `accept-partnership` (vendor, on `PARTNERSHIP_DEED`) and the admin offline deed (on `PARTNERSHIP_DEED`) (D43)
   - plan activation (`advanceOnboardingAfterPlan`, only from `SUBSCRIBE_PLAN` while not completed, target `BRAND_BASIC_DETAILS`) (D52)
   - `acknowledge-approval`
7. **`GET /brands/onboarding/status`** is the single routing read. It returns:
   - `currentScreen`, `editMode`, `kycPath`
   - `groups[]` and `progress` (D77)
   - per-screen status `DONE / SKIPPED / MISSING / NOT_APPLICABLE`
   - item statuses and the editable-field map from §6
   - `systemChecks[]` (D80)
   - `deed.requiresDeedConfirmation`
   - the rejection or revoke reason
   - `hasBillingAddress`, `profileStrength`, `customerVisibilityHints`

---

## 5. Step-by-step flow

"Guard" is the screen the call must be on in FIRST_PASS. In REMEDIATION the legal saves need no screen guard and never move the screen. While an admin decision is pending, a change to anything saved answers `409 ONBOARDING_LOCKED` (D78). After approval a vendor's legal edit answers `409 LEGAL_FIELD_LOCKED`, and a change to an existing PAN/GST/bank answers `409 DETAIL_ALREADY_PROVIDED` (§6).

| Screen | API | Guard / rule | Saved | Next |
|---|---|---|---|---|
| Login | `POST /auth/loginOrSignUp-with-whatsapp`, `POST /auth/verify-otp-whatsapp` | New VENDOR → `BRAND_NAME`. Admin-created vendor resumes. Route by `currentScreen`, never by `isFirst` | — | — |
| BRAND_NAME | `add-basic-details {step:"BRAND_NAME", brandName}` | 2–25 chars (D112) | `brandName` | BUSINESS_CATEGORY |
| BUSINESS_CATEGORY | `add-basic-details {step:"BUSINESS_CATEGORY", categoryId, subCategoryIds[]}` | All subcategories of that category, 1 … `maxSubCategories` (D68) | category, subcategories (`subCategoryId` = first) | REGISTRATION_STATUS |
| REGISTRATION_STATUS | `add-basic-details {step:"REGISTRATION_STATUS", kycPath}` | `GST` / `NO_GST` / `UNREGISTERED`. Changeable until the lock (D75) | `kycPath`, `businessRegistrationStatus` (+ entity `PROPRIETORSHIP` on UNREGISTERED) | GST → GST_VERIFICATION · NO_GST → PAN_VERIFICATION · UNREGISTERED → OWNER_VERIFICATION |
| GST_VERIFICATION (path GST) | `verify-gst` → `add-gst-details {verificationId}` | Mandatory. Active GSTIN (`GSTIN_NOT_ACTIVE`). GSTIN state rule against an existing billing address (D33) | GST, `gstStatus`, entity from constitution, `legalBusinessName` (D67). Locks the status (D75) | PAN_VERIFICATION |
| PAN_VERIFICATION (GST, NO_GST) | `verify-pan` → `add-pan-details {verificationId}` | Mandatory. GST path: PAN inside GSTIN (`PAN_NOT_IN_GSTIN`). NO_GST: business or personal PAN | PAN, `panStatus`; NO_GST also `legalBusinessName` and the status lock | REGISTRATION_ENTITY_TYPE |
| REGISTRATION_ENTITY_TYPE (GST, NO_GST) | `add-basic-details {step:"REGISTRATION_ENTITY_TYPE", businessEntityType}` | GST: must equal the GST-derived entity (`ENTITY_FROM_GST`) unless unmappable. NO_GST: any; `suggestedEntity` from `verify-pan` | entity | KYC_DOCUMENTS |
| OWNER_VERIFICATION (UNREGISTERED) | `verify-pan` → `POST /brands/onboarding/owner-verification {method:"PAN", verificationId}`, **or** `{method:"ID_DOCUMENT", idType, file \| uploadId}` | Mandatory (D72) | owner PAN or owner ID document, `ownerVerificationStatus`, `legalBusinessName` | KYC_DOCUMENTS |
| KYC_DOCUMENTS (all paths) | `POST /brands/onboarding/documents` (repeat), then `continue`, or `skip` | 0–`maxKycDocuments`, each titled (D73) | `BrandKycDocument`, `documentsStatus` | BANK_VERIFICATION (or `furthestScreen` after a switch, §7.4) |
| BANK_VERIFICATION | `verify-bank` → `add-bank-details {verificationId}`, or `skip` | `isVerified` derived on the server (D16) | Bank, `bankStatus` | PARTNERSHIP_DEED |
| PARTNERSHIP_DEED | `PUT /brands/onboarding/accept-partnership` (vendor), or admin `PUT /brands/admin/:brandId/deed` | D43 | deed (§13) | SUBSCRIBE_PLAN, or BRAND_BASIC_DETAILS if a plan is already live |
| SUBSCRIBE_PLAN | `PUT /brands/billing-address`, `GET /subscriptions/getAll`, `POST /transactions/subscribe/preview`, `create-order`, `verify-transaction` / webhook, or admin grant | Order allowed from SUBSCRIBE_PLAN onward. **`create-order` needs a billing address** (`BILLING_ADDRESS_REQUIRED`). Billing snapshot frozen on the order (D37) | billing address, plan | BRAND_BASIC_DETAILS (on activation) |
| BRAND_BASIC_DETAILS | `PUT /brands/update` (logo, cover, description, email, mobile or `useWhatsappAsMobile`), then `continue` | `continue` needs logo, email, mobile (D83) | brand profile | BRAND_PROFESSIONAL_DETAILS |
| BRAND_PROFESSIONAL_DETAILS | showcase + brandFeatures APIs, then `continue`, or `skip` | Skippable. Limits from plan / settings (D84). Visibility warning (D96) | showcase, features | OUTLET_DETAILS |
| OUTLET_DETAILS | `POST /subBrands/signUp-with-whatsapp {isFirstOutlet:true}` (or `useOwnerNumber:true`), manager OTP, `POST /locations/create {isSubBrandAddress:true}`, `POST /workHours/upsert`, repeat, then `continue` | ≥ 1 outlet, every live outlet verified + location + work hours (D85) | outlets | ONBOARDING_REVIEW |
| ONBOARDING_REVIEW | `GET /brands/onboarding/status` (incl. `systemChecks`), `GET /brands/get`, `GET /brands/verifications/history`, then `POST /brands/onboarding/submit` | Re-checks the path's mandatory items, billing address, live plan, logo / email / mobile, outlets (the `missing` codes in §19.1). System checks never block (D80) | `onboarding.submittedAt`, new `SystemVerify`, notices | UNDER_REVIEW |
| UNDER_REVIEW | Vendor: add-only (D78). Admin: `PUT /brands/admin/verifications/:brandId/review` | APPROVE/REJECT need submit (D12) + deed precondition (§13) | decision; re-check on adds (D79) | stays (congrats when `isApproved && !isApprovalAcknowledged`) |
| Congrats | `PUT /brands/onboarding/acknowledge-approval` | From UNDER_REVIEW, or DASHBOARD after re-approval (D21) | `isOnBoardingCompleted=true` | DASHBOARD |

---

## 6. Edit modes and the field matrix

**Edit modes** (`helpers/brands/onboardingEditWindow.js`, adjusted by D5 + D13):

| Mode | When |
|---|---|
| `FIRST_PASS` | Not submitted yet |
| `LOCKED` | Submitted and waiting for an admin (add-only, D78), or approved (legal fields) |
| `REMEDIATION` | Live attempt rejected or revoked **by an admin** |

**Field matrix** (vendor. An admin may edit everything in every state, and each admin edit writes a history row):

| Field | Before submit | Pending | Rejected / revoked | Approved |
|---|---|---|---|---|
| Brand name, category, subcategories | ✅ | ❌ | ✅ | ❌ admin only |
| Registration status | ✅ until the lock (D75); UNREGISTERED always | ❌ | ✅ | UNREGISTERED → registered upgrade only (D94); else admin |
| Entity | GST: read-only (from GST) · NO_GST: ✅ · UNREGISTERED: n/a | ❌ | ✅ | ❌ admin (set once in an upgrade, D94) |
| PAN / GST / bank | Add ✅ · change ❌ once saved (D76) | Add missing ✅ · change ❌ | ✅ add and change | Add missing once · change admin only |
| Owner verification (UNREGISTERED) | ✅ (a new PAN verify is a new paid call) | ❌ | ✅ | Add missing · change admin only |
| KYC documents | ✅ add, rename, replace, delete | Add new only | ✅ | Add new only · replace / delete admin (D95) |
| Logo, cover, description, email, mobile | ✅ | Add when empty only | ✅ | ✅ |
| Showcase, features | ✅ | Add only | ✅ | ✅ |
| Outlets (register, location, work hours, more outlets) | ✅ | New outlets only | ✅ | ✅ |
| **Billing address** | ✅ | ✅ | ✅ | ✅ (GSTIN state rule always applies) |
| Plan, deed | read-only | read-only | read-only | read-only |

"Legal" (for `LEGAL_FIELD_LOCKED` / `ONBOARDING_LOCKED`) = `legalBusinessName`, `brandName`, category, subcategories, registration status, entity, PAN, GST, bank, owner verification, KYC documents.

**Shared APIs (onboarding + vendor profile + admin):**

| API | Change |
|---|---|
| `PUT /brands/update` | Brand resolved through `resolveActorBrand` (already live, P18). Logo/cover (multipart files or `logoUploadId` / `coverImageUploadId`), description, email, mobile or `useWhatsappAsMobile` (D83). `brandName` and subcategories follow the legal rule: vendor gets `409 ONBOARDING_LOCKED` while pending and `409 LEGAL_FIELD_LOCKED` after approval; admin is always allowed. `isOnboarding` ignored. Never moves the screen. While pending, a change to a non-empty field answers `409 ONBOARDING_LOCKED` (D78). |
| `GET /brands/get` | Brand resolved through `resolveActorBrand` (already live). Returns the raw `subCategoryIds`, `subCategories: [{ _id, name, image }]` in the brand's own order (the `subCategoryIds` list, or the single legacy `subCategoryId`), and the old single `subCategory` (= the first) — built in P10. |
| `PUT /brands/onboarding/update-basic-details` | Legal-edit endpoint for vendor (per matrix) and admin (`brandId`). |
| `add-pan/gst/bank-details`, `verify-*`, `owner-verification`, documents | Per matrix. Admin any state. |
| showcase, brandFeatures, subBrands, workHours, outlet locations | They never moved the screen. Gates stay as today: showcase / brandFeatures / subBrands / workHours `isVendorOrAdmin` (showcase also `requireShowcaseEnabled`), `/locations` create/update `isBrandSideOrAdmin`, delete `verifyJwtToken` + ownership in the service. For these existing routes an admin sends `brandId` (or `subBrandId`) **in the body**, as today. **New:** the pending add-only guard (D78) and the server-read limits (D84). Brand-level work hours: D56. |
| `/locations` create/update/delete | Refuse kind BRAND (`USE_BILLING_ADDRESS_ENDPOINT`). Outlet and customer addresses unchanged. |

⚠️ **Behaviour change for existing approved vendors:** `brandName`, category and subcategories become read-only in the vendor profile.

---

## 7. Registration status, the three paths, skips and switching

### 7.1 The three paths

| `kycPath` | Panel label | `businessRegistrationStatus` | Business Verification screens | Mandatory | Skippable |
|---|---|---|---|---|---|
| `GST` | I have GST | REGISTERED | GST → PAN → entity (read-only) → documents | GST, PAN | documents |
| `NO_GST` | Registered, no GST | REGISTERED | PAN → entity (suggested) → documents | PAN | documents |
| `UNREGISTERED` | Not registered | UNREGISTERED | owner verification → documents | owner verification | documents |

Bank (`BANK_VERIFICATION`) follows on every path and is skippable.

### 7.2 Skip

`POST /brands/onboarding/skip {screen}` is valid only when `currentScreen === screen` and the screen is one of `KYC_DOCUMENTS`, `BANK_VERIFICATION`, `BRAND_PROFESSIONAL_DETAILS` (D74). It sets the matching status to `SKIPPED` and moves to the next screen.

### 7.3 Item statuses

`Brand.onboarding.panStatus | gstStatus | bankStatus | documentsStatus | ownerVerificationStatus` ∈ `NOT_STARTED, PROVIDED, SKIPPED, NOT_APPLICABLE`. `NOT_APPLICABLE` = outside the brand's path (GST on NO_GST until added, owner verification on GST / NO_GST, PAN and GST on UNREGISTERED when the owner used an ID). Providing an item later (review, pending add, add-missing after approval, upgrade) sets `PROVIDED`.

### 7.4 Switching the status

| When | Rule |
|---|---|
| Before the lock (FIRST_PASS) | Any direction. Screen → the first screen of the new path. |
| After the lock on GST / NO_GST | `409 REGISTRATION_STATUS_LOCKED`. Admin only. |
| UNREGISTERED → GST or NO_GST | Allowed in FIRST_PASS, REMEDIATION, and after approval as an upgrade (D94). |
| REMEDIATION | Any direction (the lock is reopened). The screen never moves; the page shows the new path's sections. |

**Carry-over (D75):** an owner PAN becomes the NO_GST PAN (no new paid call, `panStatus = PROVIDED`, the status locks); on a move to GST the PAN must match the GSTIN, else it is re-verified; documents always stay; an owner ID document stays as extra proof.

**Rewind (D45).** In FIRST_PASS a switch made from a later screen (even from `ONBOARDING_REVIEW`) sends the vendor through the new path's verification screens only. When that block ends (the move that would land on `BANK_VERIFICATION`), the server returns the vendor to `onboarding.furthestScreen` if it is beyond `BANK_VERIFICATION`, otherwise to `BANK_VERIFICATION`. Deed, plan and setup are never repeated.

---

## 8. Owner verification and KYC documents

### 8.1 Owner verification (path UNREGISTERED, D72)

| Method | How | Stored |
|---|---|---|
| `PAN` (preferred) | `verify-pan` (paid, reused from `KycVerification`), then `owner-verification {method:"PAN", verificationId}` | PAN record (personal), `ownerVerificationMethod = PAN` |
| `ID_DOCUMENT` | Upload one of `AADHAAR` (**masked**, last 4 digits only, as UIDAI requires), `DRIVING_LICENCE`, `PASSPORT`, `VOTER_ID`. PDF or JPG/PNG ≥ 800 px short side, 5 MB | `BrandKycDocument` with `purpose: OWNER_ID`, one live per brand; admin review UPLOADED → ACCEPTED / REJECTED |

Replacing the owner ID (before submit, or in remediation) soft-deletes the old row and keeps it for audit.

### 8.2 KYC documents (all paths, D73)

- A list, not slots. Each document: `title` (required, 2–80 chars), `docType` (recommended code or `OTHER`), the file.
- **Max** `Setting.vendor.onboarding.maxKycDocuments` (default 10).
- **Recommendations:** `Category.kycDocumentHints[]` (admin-set `docType` codes, for example Food → `FSSAI`, Pharmacy → `DRUG_LICENCE`, Home & Living → `SHOP_ESTABLISHMENT`, `TRADE_LICENCE`; others → `UDYAM`, `SHOP_ESTABLISHMENT`, `TRADE_LICENCE`). The panel shows them as chips; a chip fills `docType` and a default title.
- **Skip.** The whole screen is skippable. Any saved document sets `documentsStatus = PROVIDED`. Food categories show an FSSAI warning on skip (FSSAI is mandatory for food businesses by law). The warning never blocks.
- **Format.** PDF, or JPG/PNG at ≥ 800 px on the short side. 5 MB max.
- **Storage.** PRIVATE bucket, `UPLOAD_PURPOSE.KYC_DOCUMENT`. The admin views through signed links. Private-document infrastructure exists (`constants/storage.js` `DOCUMENT`, `STORAGE_BUCKET.PRIVATE`).
- **Edit** follows §6: rename, replace, delete (soft delete, kept for audit) before submit and in remediation; add-only while pending and after approval (D95).
- **Admin review.** `UPLOADED → ACCEPTED / REJECTED (+ reason)`. No system points (§9). Strength counts UPLOADED and ACCEPTED (D82).

---

## 9. System verification and scoring

### 9.1 When

At `POST /brands/onboarding/submit` (first submit from `ONBOARDING_REVIEW`, resubmit from remediation).

- It creates a new attempt, supersedes the previous one, and sets `Brand.status = UNDER_REVIEW` and `onboarding.submittedAt` (first time).
- It writes history and sends the notices (D27).
- A resubmit never moves the screen.
- **Before submit** the same scorer runs read-only for `status.systemChecks` (D80).
- **After an add** while pending or after approval it re-runs on the live attempt (D79).

### 9.2 Inputs

The PAN / GST / bank records, whose verified fields are written **only by the server** from `KycVerification` from P0 on (D16, D65). Existing production values are kept as they are.

### 9.3 Checks and points per path (D81)

| Check | GST | NO_GST | UNREGISTERED |
|---|---|---|---|
| GST verified | 15 | — | — |
| GST active | 15 | — | — |
| PAN verified (business / personal / owner) | 15 | 30 | 30 (owner ID upload instead → 0) |
| GST legal name ↔ PAN name ≥ 85 | 15 | — | — |
| Bank verified | 20 | 35 | 35 |
| Bank holder name ↔ GST legal name / PAN name / owner PAN name ≥ 85 | 20 | 35 | 35 |
| **Total** | **100** | **100** | **100** |
| Duplicate WhatsApp / email (PAN / GST / bank duplicates are refused at `verify-*`, D48) | −20 | −20 | −20 |

- A **skipped** item (bank) scores 0 on its checks. "—" means the check does not exist on that path, so it is not counted.
- On path GST the bank holder name is compared with the better of the GST legal name and trade name.
- **Hard rules, not points:** PAN inside GSTIN and entity from GST (D70) are enforced at save.
- **Remarks only (no points):** `ENTITY_DIFFERS_FROM_PAN_TYPE` (NO_GST), `GST_CONSTITUTION_UNMAPPED` (GST), `OWNER_ID_MANUAL` (UNREGISTERED with an ID), documents count and titles, and every "skipped by vendor" kept apart from "verification failed".

### 9.4 Status (advisory)

- ≥ 90 APPROVED · ≥ 75 MANUAL_REVIEW · else REJECTED.
- **Set to MANUAL_REVIEW** (floor and cap) when the **bank** was skipped, or the owner verified by an uploaded ID (D81, narrowed by D100: skipped documents are a remark only). The numeric score is still shown as computed.
- Never opens REMEDIATION, never approves or rejects the brand.

### 9.5 Stored on the attempt

`kycPath`, `skippedItems[]`, `checks[]` (key, points, max, passed, skipped), `remarkCodes[]` (+ the `remarks[]` text), submit-time `score` / `status`, and `latestScore` / `latestStatus` / `latestScoredAt` (D79).

### 9.6 Adds while pending and after approval

- The approval (or the pending decision) stays.
- The submit-time score is kept.
- The same scorer writes `latestScore` / `latestStatus` / `latestScoredAt`.
- Strength updates live.
- History `DETAIL_ADDED` + one admin notice (D79).
- **No new attempt.**

---

## 10. Profile strength

### 10.1 API

`GET /brands/profile-strength` (`isVendorOrAdmin`, admin passes `?brandId`). Also embedded in `onboarding/status` and in each `admin/get-all` row.

```
{ score, level: LOW (<50) | MEDIUM (50–74) | STRONG (≥75),
  sections: [{ key, label, earned, max, items: [{ key, label, done, available, points, max, action }] }],
  badgeEligible, badgeBlockers: ["NOT_APPROVED","STRENGTH_BELOW_75","BANK_NOT_VERIFIED","NO_IDENTITY_PROOF"] }
```

Every not-done, available item carries `points` and `action`, so the panel shows "+N" hints (for example "Add a cover image +5") on the review page, under review and on the dashboard (D82).

### 10.2 Weights (total 100, every path can reach it)

| Section | Item | Points |
|---|---|---|
| Legal (50) | Brand name + legal name | 5 |
| | Category + subcategories | 5 |
| | **Identity:** PAN verified (GST, NO_GST) · owner PAN verified or owner ID UPLOADED / ACCEPTED (UNREGISTERED) | 10 |
| | **Business proof: the higher of** GST verified (10) **or** documents (1 → 5, 2 or more → 10. UPLOADED / ACCEPTED count, REJECTED 0) | 10 |
| | Bank verified | 15 |
| | Deed accepted by the vendor themselves | 5 |
| Profile (30) | Logo 5 · Cover 5 · Description ≥ 50 chars 5 · Email verified 3 · Mobile verified 2 | 20 |
| | ≥ 1 showcase section with media | 5 |
| | ≥ 2 brand features | 5 |
| Outlets (20) | ≥ 1 verified outlet with location + work hours | 15 |
| | Every outlet complete (verified, location, hours) | 5 |

**Normalisation (D51).** An item the brand cannot earn is excluded (showcase switched off globally, or a plan with no showcase entitlement), and `score = round(earned / available × 100)`. Each item in the response carries `available: false` when excluded.

### 10.3 Storage

Never stored. One helper computes it on every read. The admin list computes it only for the rows on the page. The only stored copy is the snapshot in the history row of a badge grant or removal.

---

## 11. Verified badge (`Brand.isVerified`)

| | `isApproved` (existing) | `isVerified` (new) |
|---|---|---|
| Set by | Admin review | Admin, manually |
| Means | Allowed to be live | Trust badge |
| Affects access / customer visibility | Yes | **No.** Badge display only (customer, vendor, admin) |

- **Grant rules (hard):**
  - approved
  - strength ≥ 75
  - bank verified
  - at least one identity proof (PAN verified, or an **accepted** owner ID document)
- **API:** `PUT /brands/admin/:brandId/verified-badge {isVerified, note}`. Writes a history row with a strength snapshot. Refused with `BADGE_NOT_ELIGIBLE` + blockers.
- **Fields:** `Brand.isVerified`, `badgeGrantedAt`, `badgeGrantedByAdminId` (D54: `verifiedAt` / `verifiedBy` already mean the SystemVerify verdict).
- **Automatic removal:** only on admin reject or revoke.
- **At risk:** strength below 75 later → the badge stays, the admin list flags `badgeAtRisk` (D29).
- **Default `false`.** Approved brands backfilled `true` (LEGACY), **except dummy brands** (D93). Admin can change any of them.
- **One source:** profile, search, feed and voucher listing all read `Brand.isVerified` (fixes P13).

---

## 12. Bank skip and the "can sell to customers" gate

### 12.1 What a missing bank means (verified 2026-10-11)

| Area | Effect |
|---|---|
| Settlement | Build does not crash. `bankSnapshot` is empty and approve refuses "no verified bank account" (`approveSettlement.js:77`). Customer money comes in, the vendor payout is stuck. |
| Subscription, refunds, chargebacks | No effect |
| System score | Path GST −40, NO_GST / UNREGISTERED −70 possible, and the status is capped at MANUAL_REVIEW (§9) |
| Identity | Bank name match is the main real cross-check for NO_GST and UNREGISTERED vendors |
| Bank change after approval | Already handled by `needsRevalidation` (`paySettlement.js`) |

### 12.2 Gate

`assertCanSellToCustomers(brand)` checks approved + verified bank + live plan. Codes: `BRAND_NOT_APPROVED`, `BANK_REQUIRED`, `PLAN_REQUIRED`.

Called from:

- `POST /vouchers/submit-review/:voucherId`
- `POST /vouchers/publish/:versionId`
- every future paid / customer-money feature on vendor/admin routes

Drafts are allowed. Today the only customer-money path is the voucher claim.

**Customer side (D49).** `buildClaimPreview` gets the bank check as a **soft block** (`canClaim=false`, existing `BRAND_NOT_ACCEPTING` code and message), and `isBrandClaimable` gets the same check so the customer listings never show a voucher that cannot be claimed. The customer app sees no new code. The 403 codes above are never returned to a customer. Under the brand visibility plan (live 2026-11-04) a brand failing it is not hidden: it shows as a no-voucher card when it has a located outlet and a visible album (§21.2b).

### 12.3 Adding a bank later

From the profile: add once, with penny-drop. Changing it is admin only.

---

## 13. Partnership deed

- **Vendor:** `accept-partnership` stores `deed {acceptedByType: VENDOR, acceptedBy, acceptedAt, mode: ONLINE, version}`. `vendorConfirmedAt` / `vendorConfirmedBy` / `vendorConfirmedVersion` are written only when the vendor confirms an admin's offline deed (the popup below).
- **Admin offline:** `PUT /brands/admin/:brandId/deed` with a mandatory note **and** a signed copy (`proofDocument`), stored as `acceptedByType: ADMIN, mode: OFFLINE`. The admin flow is never blocked.
- **Which screen (D43):**
  - `accept-partnership` is vendor only. On `PARTNERSHIP_DEED` it accepts and moves the screen. With `deed.requiresDeedConfirmation` it confirms from any screen and does not move it. Elsewhere → `409 ONBOARDING_SCREEN_MISMATCH`.
  - The admin deed on `PARTNERSHIP_DEED` moves the screen like a vendor accept. On a later screen it only replaces the record or proof. Before `PARTNERSHIP_DEED` → `409`.
- **Vendor confirmation:**
  - When `acceptedByType = ADMIN` and `vendorConfirmedAt` is empty, `onboarding/status` returns `deed.requiresDeedConfirmation = true`.
  - The vendor panel shows a **blocking popup** at login.
  - Accept stores the vendor's own record (timestamp, version), then the vendor continues to `currentScreen` or the dashboard.
  - The popup is a gate, not a screen, so the tracker is untouched.
- **Approval precondition:** the vendor's own acceptance, or an admin offline acceptance **with** proof. Otherwise `DEED_NOT_ACCEPTED`.
- **Legal:** the vendor's own click-accept with timestamp and version is the strongest evidence. The deed text and versioning should be confirmed by the legal team.
- **Deed text / version source (D57):** version string in `Setting`, recorded on acceptance. Text stays in the vendor panel.
- **Backfill:** `hasAcceptedPartnershipDeed=true` → `deed {acceptedByType: VENDOR, mode: ONLINE, version: "legacy"}` with no acceptance time (`DEED_LEGACY_VERSION`); `presentDeed` reads it as `isLegacy: true` (P9).

---

## 14. Billing address

### 14.1 Today (verified 2026-10-11)

- No billing-address endpoint exists.
- `buildBillingDetails` order: GST address → `Brand.locationId` (`locations` kind BRAND) → PAN address (`buildBillingDetails.js:75-120`).
- A brand address is written by `POST /locations/create {isBrandAddress:true}` / `PUT /locations/update/:id`, which set `Brand.locationId` (`createLocation.js:99-104`). Only one live brand address is allowed (partial unique index). It can be deleted (`deleteLocation.js:57-62`).
- Tax: GSTIN's first 2 digits decide CGST+SGST vs IGST. Without a GSTIN, state **names** are compared. If that cannot be proven, IGST (`calculatePricing.js:21-53`).
- **Readers of billing details:** checkout preview, subscription invoice (at settle), admin grant, invoice regeneration, settlement statement, chargeback advice. Issued documents are snapshots.
- **Not affected:** the customer voucher-claim invoice. Its seller is Trydood, with the company address (`buildVoucherInvoiceSnapshot.js:184-187`).

### 14.2 Design

| Topic | Rule |
|---|---|
| What it is | **Billing address = brand location** (`locations` kind BRAND, `Brand.locationId`), for every brand, GST or not (D30) |
| Order in `buildBillingDetails` | Billing address → (fallback) GST → PAN. The fallback exists only for automatic documents when no billing address was ever saved |
| How it is saved | `PUT /brands/billing-address` (upsert, vendor + admin, any time, also while pending). Full address + coordinates from Google, same fields as the outlet form (D31, D34) |
| "Same as GST" | Prefill from the server-stored GST address. The panel (vendor or admin) geocodes and saves. No auto-sync later (D32) |
| `suggestedAddress` | Returned by `POST /transactions/subscribe/preview` and `GET /brands/billing-address`, when no billing address exists: GST address, else PAN address |
| `gstAddress` | Returned by `GET /brands/billing-address` whenever a GSTIN exists, so "Same as GST" also works when editing an existing billing address (D46). The outlet form's "GST address is the outlet address" prefill reads the same field |
| Delete | Not allowed (`BILLING_ADDRESS_NOT_DELETABLE`) |
| Generic `/locations` | Refuse kind BRAND (`USE_BILLING_ADDRESS_ENDPOINT`) |
| Checkout | `create-order` refuses `BILLING_ADDRESS_REQUIRED` without one. Existing vendors confirm once at their next checkout (D35) |
| Admin | Billing form for any vendor. Admin grant and admin-driven orders require it (D36) |
| Snapshot | Frozen on the `Transaction` at `create-order`. The invoice uses it (D37). The pending-order reuse also matches the frozen billing state code (D50). Transactions without a snapshot use the fallback (D53) |
| Customer | The profile's `location` / `workHours` come from the selected outlet, never from the billing address (D90) |

### 14.3 GSTIN state rule (D33)

- Applies when the brand has a GSTIN.
- **Billing save** (vendor or admin): the billing state's GST code must equal `GSTIN[0..2]`, else `422 BILLING_STATE_GSTIN_MISMATCH`.
- **GST save / change** (vendor on path GST, NO_GST add-later, upgrade, or admin): if a billing address exists and its state code ≠ the new GSTIN's code, then `422 BILLING_STATE_GSTIN_MISMATCH`, with a message to update the billing address first. The billing address is editable any time, so nobody gets stuck.
- **No GSTIN:** no rule. Tax uses the billing state name vs `companyState`, normalised through the same map.
- **Tax decision unchanged:** GSTIN decides it when present, state names otherwise, IGST when unproven. The one change is that state names are normalised through the new map (§14.4) before they are compared.

### 14.4 GST state code map (new constant)

- All GST state codes 01–38 (+ 97 "Other Territory"), with name aliases.
- Must handle:
  - Delhi / NCT of Delhi
  - Odisha / Orissa
  - Puducherry / Pondicherry
  - Dadra & Nagar Haveli and Daman & Diu (26)
  - Ladakh (38)
  - Andhra Pradesh's two codes (28 old, 37 new). Both map to Andhra Pradesh.
- Used by the D33 rule and to normalise name matching.

---

## 15. Admin onboarding

- `POST /brands/admin/onboarding/create {whatsappNumber, brandName?}` creates the VENDOR `User` + `Brand` in one transaction, no OTP, `currentScreen = BRAND_NAME` (or `BUSINESS_CATEGORY` when `brandName` was given), `accountState = ACTIVE` (D91). If a VENDOR already exists on that number → `409 VENDOR_ALREADY_EXISTS`. A CUSTOMER account on the same number is fine (accounts are unique per number **and role**).
- **No owner-verification check** for customer visibility (D92).
- **Exception:** `accept-partnership` stays vendor only. An admin records the deed only through the offline route (D43), so a `VENDOR` acceptance can never be written by an admin.
- **All onboarding routes become `isVendorOrAdmin`.** An admin passes `brandId`, resolved by `helpers/brands/resolveActorBrand.js`. Services resolve the owner through `brand.userId`.
- **Billing address:** the admin form (D36). **Plan:** admin grant (needs a billing address). **Deed:** offline with proof (§13). **Outlets:** the manager's OTP is still needed; `useOwnerNumber` only when the owner's number is verified (D86).
- **Every action records its actor** (VENDOR / ADMIN).
- **Vendor login after an admin started:** `isFirst` is true (WhatsApp not yet verified). The vendor panel routes by `currentScreen`. Nothing the admin filled is asked again.

---

## 16. Admin brand tabs

`GET /brands/admin/get-all?onboardingStage=NEW|WAITING|LIVE`:

| Tab | Rule (Brand fields, matched before joins) |
|---|---|
| NEW | `onboarding.submittedAt` absent **and** `isApproved !== true` (D55) |
| WAITING | submitted and `isApproved !== true` (rejected/revoked included, with a status chip) |
| LIVE | `isApproved === true` |

**Status chips in WAITING:** Under review (submitted, decision pending) · Rejected · Revoked · Resubmitted (`attemptNumber > 1`).

- The response adds `stageCounts {NEW, WAITING, LIVE}`, plus per row `onboardingStage`, `waitingChip` (`UNDER_REVIEW` / `REJECTED` / `REVOKED` / `RESUBMITTED`, null outside WAITING), `profileStrength {score, level}`, `isVerified`, `badgeGrantedAt`, `badgeAtRisk`, `onboarding.kycPath`, `onboarding.submittedAt`.
- The row adds `onboarding.hasBillingAddress` (same fact as `onboarding.hasLocation`: `Brand.locationId`; `hasLocation` is kept for panels that read it). `onboarding.hasWorkHours` (brand-level work hours) is dropped, since brand-level hours are no longer collected (D38).
- The list keeps the `customerVisibility` row field and the `?isCustomerVisible=` filter of the brand visibility plan (§21.2b), and its `accountState` default filter (P10).
- **Empty tab** (owner, 2026-11-19): with `onboardingStage` and no matching row the list answers `200` with `data: []`, `total: 0` and `stageCounts`, so the other tabs' badges still show. Without `onboardingStage` an empty result keeps the old `404`.

---

## 17. Revoke, deactivate, hide (verified 2026-10-11)

| Action | Vendor panel | Outlet staff | Customer profile / directory | Customer voucher listing | New claims | Past paid claims / settlement |
|---|---|---|---|---|---|---|
| **Revoke** (`isApproved=false`) | Stays on DASHBOARD + banner + remediation (D21) | Works | Hidden | Hidden (`customerListing.js:51-54`) | Blocked (`buildClaimPreview.js:310`) | Continue |
| **Deactivate account** (`User.isActive=false`) | 401 on every request, sessions ended, push devices retired | Works (own `isActive`, `assertAccountAccess.js:37`) | Visible unless hidden | Visible | Allowed | Continue |
| **Hide from customers** (`Brand.isActive=false`) | **Works normally**, login not blocked (`assertAccountAccess.js:31-35`) | Works | Hidden | Hidden | Blocked | Continue |

- Hide and deactivate are independent switches (`toggleBrandStatus.js`).
- The badge affects none of this.

---

## 18. Data model changes

| Where | Change |
|---|---|
| **New `KycVerification`** | brandId, type (PAN/GST/BANK), documentNumber, ifscCode (bank), provider, providerRequestId, providerTransactionId, response, status (SUCCESS/FAILED), isVerified (derived), message, nameOnRecord, `fields` (the mapped PAN / GST / bank record fields), `derived` (GST: isActive, suggestedEntity, panFromGstin, gstStateCode, addressOnRecord · PAN: panType, suggestedEntity · bank: bank / branch name), actorType, actorId, isDeleted, createdAt |
| **New `BrandKycDocument`** | brandId, purpose (`OWNER_ID` / `BUSINESS`), title, docType, idType (OWNER_ID), media (private), status UPLOADED/ACCEPTED/REJECTED, reviewedByAdminId, reviewedAt, reason, uploadedByType, uploadedBy, isDeleted. Partial unique `{brandId, purpose}` where `purpose: "OWNER_ID", isDeleted: false` (one live owner ID). No slot field |
| `Brand` | `subCategoryIds[]` (new; `subCategoryId` kept = first) · `onboarding {kycPath, panStatus, gstStatus, bankStatus, documentsStatus, ownerVerificationStatus, ownerVerificationMethod, submittedAt, furthestScreen}` (no `submittedBy`: the actor is on the history row; `NOT_APPLICABLE` is never stored) · `deed {acceptedByType, acceptedBy, acceptedAt, mode, version, proofDocument, note, vendorConfirmedAt, vendorConfirmedBy, vendorConfirmedVersion}` · `isVerified`, `badgeGrantedAt`, `badgeGrantedByAdminId` (D54). `locationId` keeps its field, with a new meaning: billing address |
| `SystemVerify` | `kycPath`, `skippedItems`, `checks` (key, max, points, passed, skipped), `remarkCodes` (next to the existing `remarks` text), `latestScore`, `latestStatus`, `latestScoredAt` |
| `Transaction` (subscription purpose) | `billingSnapshot` frozen at `create-order` (D37) |
| `User` | `SCREENS` enum updated. `isOnBoardingCompleted` unchanged |
| `SubBrand` | `verifiedVia` (`OTP` / `OWNER_NUMBER`, optional) (D86) |
| `Category` | `kycDocumentHints[]` (docType codes) |
| `Setting` | `vendor.onboarding.maxSubCategories` (3), `vendor.onboarding.maxKycDocuments` (10), `vendor.brandFeatures.maxActive` (10), `vendor.kyc.reuseDays` (30, D98 — **added in P0**), deed version (D57) |
| `Location` | **No change** (coordinates stay required, D31) |
| `BrandVerificationHistory` | Submit keeps the existing `SYSTEM_VERIFIED` / `RESUBMITTED`. New actions: DETAIL_ADDED (`metadata.item`, incl. `REGISTRATION` for the D94 upgrade and `ENTITY`), BILLING_ADDRESS_CHANGED, DOCUMENT_REVIEWED, DEED_ACCEPTED, DEED_CONFIRMED, BADGE_GRANTED, BADGE_REMOVED, LEGAL_EDIT_BY_ADMIN |
| Constants | `UPLOAD_PURPOSE.KYC_DOCUMENT` (private), `KYC_PATH`, `ONBOARDING_ITEM_STATUS`, `ONBOARDING_GROUP`, `KYC_DOCUMENT_PURPOSE`, `KYC_DOCUMENT_TYPE`, `OWNER_ID_TYPE`, `PAN_TYPE_ENTITY_SUGGESTION`, `ONBOARDING_STAGE`, `GST_STATE_CODES` |
| Profile strength | Not stored |

---

## 19. API changes and planned error codes

**New**

| Method + path | Gate | Purpose |
|---|---|---|
| `GET /brands/onboarding/status` | isVendorOrAdmin | Routing, groups, progress, checklist, edit map, system checks, strength |
| `POST /brands/onboarding/skip` | isVendorOrAdmin | Skip a skippable screen |
| `POST /brands/onboarding/continue` | isVendorOrAdmin | Advance KYC_DOCUMENTS / setup screens after their rule |
| `POST /brands/onboarding/submit` | isVendorOrAdmin | Submit / resubmit (system verify) |
| `POST /brands/onboarding/owner-verification` | isVendorOrAdmin | Owner verification (PAN or ID document) |
| `POST /brands/onboarding/documents`, `GET …/documents`, `PUT …/documents/:documentId`, `DELETE …/documents/:documentId` | isVendorOrAdmin | KYC documents: add, list (+ hints), rename / replace, soft delete (per §6) |
| `PUT /brands/admin/onboarding/documents/:documentId/review` | isAdmin | Accept / reject a document (owner ID included) |
| `POST /brands/admin/onboarding/create` | isAdmin | Admin creates vendor + brand |
| `PUT /brands/admin/:brandId/deed` | isAdmin | Offline deed with proof |
| `GET /brands/billing-address`, `PUT /brands/billing-address` | isVendorOrAdmin | Read (+ `suggestedAddress`, `gstAddress`) / upsert billing address |
| `GET /brands/profile-strength` | isVendorOrAdmin | Profile strength |
| `PUT /brands/admin/:brandId/verified-badge` | isAdmin | Grant / remove badge |

**Changed**

| API | Change |
|---|---|
| `POST /auth/verify-otp-*` | `currentScreen` input removed. Server sets / heals the screen (`BRAND_NAME`) |
| `POST /brands/onboarding/add-basic-details` | `step` replaces `currentScreen`. Steps `BRAND_NAME`, `BUSINESS_CATEGORY`, `REGISTRATION_STATUS`, `REGISTRATION_ENTITY_TYPE`. `isVendorOrAdmin` |
| `PUT /brands/onboarding/update-basic-details` | Legal edit (vendor per §6, admin always) |
| `POST /brands/onboarding/add-pan/gst/bank-details` | `verificationId`. Client status fields ignored. Lock on save (D76). GST: active GSTIN, D33, entity + legal name. PAN: in GSTIN on path GST, legal name on NO_GST |
| `POST /verification/brands/onboarding/verify-*` | Store `KycVerification`, return its `verificationId`. `verify-pan` adds `panType`, `suggestedEntity`. `verify-gst` adds `isActive`, `constitution`, `suggestedEntity`, `panFromGstin`. `isVendorOrAdmin` |
| `PUT /brands/onboarding/accept-partnership` | Vendor only. On PARTNERSHIP_DEED: accept + move. With `deed.requiresDeedConfirmation`: confirm from any screen, no move. Elsewhere 409 (D43). Response `{ deed, currentScreen }` |
| `PUT /brands/onboarding/acknowledge-approval` | From UNDER_REVIEW, or DASHBOARD after re-approval |
| `PUT /brands/update` | `isOnboarding` removed. Legal rule for `brandName` / subcategories. `useWhatsappAsMobile` (D83). Pending add-only (D78). No screen move |
| `PUT /brands/admin/verifications/:brandId/review` | APPROVE/REJECT need submit. Deed precondition. Reject/revoke clears the badge |
| `POST /transactions/subscribe/preview` | Adds `billingAddressRequired`, `suggestedAddress` |
| `POST /transactions/subscribe/create-order` | Onboarding guard (D26): a vendor still before `SUBSCRIBE_PLAN` → `409 ONBOARDING_SCREEN_MISMATCH` (never an approved brand or a vendor who finished onboarding — **built in P1**). `BILLING_ADDRESS_REQUIRED`. Freezes `billingSnapshot` |
| `POST /subscribeds/admin/grant` | `BILLING_ADDRESS_REQUIRED` |
| `POST /subBrands/signUp-with-whatsapp` | `useOwnerNumber` (D86) |
| showcase, brandFeatures, subBrands, workHours, outlet `/locations` | Pending add-only guard (D78). Feature limit from setting (D84) |
| `POST /vouchers/submit-review/:voucherId`, `POST /vouchers/publish/:versionId` | `assertCanSellToCustomers` (403 codes) |
| Voucher create / update | `subCategoryId` required when the brand has several, must be the brand's (D88) |
| Customer claim preview / listings | Bank check as a soft block (`BRAND_NOT_ACCEPTING`), mirrored in `isBrandClaimable` (D49) |
| `POST /verification/brands/onboarding/verify-*` (duplicates) | Number used by another brand → `400 DOCUMENT_IN_USE` (D48). Reuse only from `KycVerification` (D47) |
| `/locations` create / update / delete | Refuse kind BRAND |
| `GET /brands/admin/get-all` | `onboardingStage`, `stageCounts`, strength, badge, at-risk, `kycPath` |
| `GET /brands/customer/get/:brandId` | `location` / `workHours` from the selected outlet (D90). `isVerified` from `Brand.isVerified`. Adds `subCategories[]` (D89) |
| Customer feed / search / voucher listing | `isVerified` from `Brand.isVerified`. Subcategory match on any of the brand's (D89) |

**Removed / replaced:** `GET /brands/onboarding/system-verify` is replaced by `POST /brands/onboarding/submit`.

### 19.1 Planned request / response shapes

These are the shared shapes both panel guides use. All responses keep the standard envelope `{ success, message, data }`. Errors put the code in `details.code` (and any extra data in `details`).

**Admin acting on a brand.** Every **new or onboarding** route (onboarding status, add-basic-details, update-basic-details, verify-*, add-*-details, owner-verification, documents, skip, continue, submit, billing address, profile strength) plus `GET /brands/get` / `PUT /brands/update` takes `?brandId=` as a **query parameter** when the caller is an admin. A vendor never sends it: their own brand is used. **Existing** routes keep their current convention, with `brandId` (or `subBrandId`) **in the body**: `subscribe/preview`, `create-order`, `subscribeds/admin/grant`, `showcase/section/add`, `brandFeatures/add`, `subBrands/signUp-with-whatsapp`, `workHours/upsert`, `locations/create`.

**`GET /brands/onboarding/status` → `data`**
```jsonc
{
  "brandId": "…",
  "currentScreen": "PAN_VERIFICATION",
  "editMode": "FIRST_PASS",            // FIRST_PASS | LOCKED | REMEDIATION
  "editLock": null,                    // PENDING | APPROVED when editMode is LOCKED, else null
  "kycPath": "GST",                    // GST | NO_GST | UNREGISTERED | null (before REGISTRATION_STATUS)
  "isOnBoardingCompleted": false,
  "groups": [
    { "key": "BASIC_DETAILS", "state": "DONE", "screens": [ { "screen": "BRAND_NAME", "status": "DONE" } ] },
    { "key": "BUSINESS_VERIFICATION", "state": "IN_PROGRESS", "screens": [ … ] }
  ],                                   // state: DONE | IN_PROGRESS | UPCOMING; screen status: DONE | SKIPPED | MISSING | NOT_APPLICABLE
  "progress": { "group": 2, "groupCount": 5, "percent": 53 },
  "items": { "gst": "PROVIDED", "pan": "PROVIDED", "ownerVerification": "NOT_APPLICABLE",
             "documents": "NOT_STARTED", "bank": "NOT_STARTED",
             "ownerVerificationMethod": null, "documentCount": 0 },   // NOT_APPLICABLE is read off the path, never stored
  "registrationStatusLocked": true,
  "editable": {
    "legal": true,                     // brand name, category, subcategories (§6)
    "registrationStatus": false,
    "entity": false,
    "kyc": { "add": { "pan": false, "gst": false, "bank": true }, "change": false },   // change only in REMEDIATION (D76)
    "ownerVerification": false,        // path UNREGISTERED only
    "documents": { "add": true, "change": true },
    "profile": { "add": true, "change": true },
    "setup": { "add": true, "change": true },   // showcase, features, outlets
    "billingAddress": true
  },
  "systemChecks": [                    // D80: per check only — never the total or the advisory status (admin triage)
    { "key": "BANK_VERIFIED", "points": 20, "passed": false, "skipped": false }   // points = what the check is worth
  ],
  "customerVisibilityHints": {         // D96
    "isVisible": false, "requireShowcase": true, "showcaseReady": false, "reasons": [ … ]
  },
  "verification": {
    "status": null, "attemptNumber": 0, "submittedAt": null,
    "isApproved": false, "isApprovalAcknowledged": false,
    "isRejected": false, "rejectionReason": null, "isRevoked": false, "revokeReason": null
  },
  "deed": { "accepted": false, "acceptedByType": null, "mode": null, "version": null, "acceptedAt": null,
            "isLegacy": false, "hasProof": false, "proofUrl": null, "note": null,
            "vendorConfirmedAt": null, "vendorConfirmedVersion": null, "requiresDeedConfirmation": false },
  "hasBillingAddress": false,          // a live BRAND Location — the same check submit makes
  "isVerified": false,
  "profileStrength": { /* §10.1 */ },
  "limits": { "brandNameMinLength": 2, "brandNameMaxLength": 25, "maxSubCategories": 3, "maxKycDocuments": 10, "maxActiveFeatures": 10 }   // D112 + vendor panel audit Q8: the same values the saves enforce
}
```

**Screen status rules** (`helpers/onboarding/statusView.js` `screenStatuses`): the KYC screens follow their item (`PROVIDED` → DONE, `SKIPPED` → SKIPPED, else MISSING); `BRAND_NAME`, `BUSINESS_CATEGORY`, `REGISTRATION_STATUS`, `REGISTRATION_ENTITY_TYPE` are DONE when the value is saved; `PARTNERSHIP_DEED` when the deed is accepted; `SUBSCRIBE_PLAN` when a plan is live. `BRAND_BASIC_DETAILS` is DONE with a logo, email and mobile (D83); `BRAND_PROFESSIONAL_DETAILS` once the vendor is past it (current or furthest screen beyond it, `submittedAt` set, or approved); `OUTLET_DETAILS` with ≥ 1 live outlet, each verified with a location and work hours (D85).

**`add-basic-details` body by `step`**

| `step` | Body |
|---|---|
| `BRAND_NAME` | `{ brandName }` |
| `BUSINESS_CATEGORY` | `{ categoryId, subCategoryIds: ["…"] }` |
| `REGISTRATION_STATUS` | `{ kycPath: "GST" \| "NO_GST" \| "UNREGISTERED" }` |
| `REGISTRATION_ENTITY_TYPE` | `{ businessEntityType }` |

Response: `{ brand: { brandName, legalBusinessName, categoryId, subCategoryIds, businessRegistrationStatus, businessEntityType, onboarding: { kycPath } }, currentScreen }`.

**`verify-pan | verify-gst | verify-bank` → `data`** (built in P0): `{ verificationId, type, isVerified, status, message, reused, verifiedAt, nameOnRecord, details /* mapped record fields for the review sub-step */, providerResponse }` plus: PAN `panType`, `suggestedEntity`; GST `isActive`, `registrationStatus`, `constitution`, `suggestedEntity`, `panFromGstin`, `gstStateCode`, `addressOnRecord`; bank `bankName`, `branchName`, `isNameMatch`. A failed check is still `200` with `isVerified: false` (it is stored, D97). A number another brand holds → `400 DOCUMENT_IN_USE` before any paid call.

**`add-pan-details | add-gst-details | add-bank-details` body:** `{ verificationId }` (bank also `accountType?` — the provider does not return it and nothing decides on it). Response (built in P2): `{ record /* PAN / GST / bank, masked where sensitive */, itemStatus: "PROVIDED", currentScreen, derived: { legalBusinessName?, businessEntityType? } }`. `currentScreen` left the body in P1.

**`owner-verification` body:** `{ method: "PAN", verificationId }` or multipart `{ method: "ID_DOCUMENT", idType: "AADHAAR" | "DRIVING_LICENCE" | "PASSPORT" | "VOTER_ID", file }` / `{ …, uploadId }` → `{ ownerVerification: { method, status, document? }, legalBusinessName, currentScreen }`.

**`skip` body:** `{ screen }` → `{ currentScreen }`.

**`continue`:** no body → `{ currentScreen }`, or `422 ONBOARDING_STEP_INCOMPLETE` with `details.missing`:

| Screen | `continue` requires | `missing` codes |
|---|---|---|
| `KYC_DOCUMENTS` | ≥ 1 document (with none, use `skip`) | `DOCUMENT` |
| `BRAND_BASIC_DETAILS` | logo, email, mobile | `LOGO`, `EMAIL`, `MOBILE` |
| `BRAND_PROFESSIONAL_DETAILS` | nothing (skip and continue both just move on) | — |
| `OUTLET_DETAILS` | ≥ 1 outlet, every live outlet verified with location + work hours | `OUTLET`, `OUTLET_NOT_VERIFIED:<outletId>`, `OUTLET_LOCATION:<outletId>`, `OUTLET_WORK_HOURS:<outletId>` |

**`submit`:** no body → `{ currentScreen: "UNDER_REVIEW", attemptNumber, submittedAt, systemChecks }`, or `422 ONBOARDING_STEP_INCOMPLETE` with `missing` from: `BRAND_NAME`, `CATEGORY`, `REGISTRATION`, `GST`, `PAN`, `ENTITY`, `OWNER_VERIFICATION`, `DEED` (P5), `BILLING_ADDRESS`, `LIVE_PLAN`, `LOGO`, `EMAIL`, `MOBILE`, `OUTLET`, `OUTLET_NOT_VERIFIED:<id>`, `OUTLET_LOCATION:<id>`, `OUTLET_WORK_HOURS:<id>`.

**Documents.**

- `POST /brands/onboarding/documents`: multipart `file` **or** `uploadId` (purpose `KYC_DOCUMENT`), plus `title`, `docType?` → `{ document, documentsStatus }`.
- `PUT …/documents/:documentId`: `{ title? }` and / or a new `file` / `uploadId` → `{ document }`.
- `DELETE …/documents/:documentId` → `{ documentsStatus }` (soft delete).
- `GET …/documents` → `{ documents: [ { _id, purpose, title, docType, idType, status, reason, fileUrl /* signed, short-lived */, uploadedByType, createdAt } ], hints: ["SHOP_ESTABLISHMENT", "TRADE_LICENCE"], limit: 10, count /* live business documents */ }`.
- Admin review body: `{ status: "ACCEPTED" | "REJECTED", reason /* required when REJECTED */ }`.

**Billing address.**

- `GET /brands/billing-address` → `{ billingAddress /* Location or null */, suggestedAddress /* { source: "GST" | "PAN", addressLine1, city, state, zipcode, … }, only when no billing address */, gstAddress /* stored GST address whenever a GSTIN exists, for "Same as GST" */, gstin, gstStateCode }`.
- `PUT /brands/billing-address` body = the outlet-address fields: `addressLine1, addressLine2?, landmark?, city, district?, state, zipcode, country?, formattedAddress?, coordinates: [lng, lat]` → `{ billingAddress }`.
- `POST /transactions/subscribe/preview` adds `billingAddressRequired` and `suggestedAddress` to its existing response.

**Outlet.** `POST /subBrands/signUp-with-whatsapp` body as today, **or** `{ brandId, useOwnerNumber: true, outletType, isFirstOutlet? }` (no `whatsappNumber`) → today's response with `subBrand.verifiedVia: "OWNER_NUMBER"` and `otpSent: false`.

**Admin.**

- Create body `{ whatsappNumber, brandName? }` → `{ brandId, userId, currentScreen }`.
- Deed body: multipart `file` **or** `proofUploadId`, plus `note` → `{ deed }`.
- Badge body `{ isVerified, note? }` → `{ isVerified, badgeGrantedAt, profileStrength }`.

**`GET /brands/admin/get-all` additions:** top-level `stageCounts { NEW, WAITING, LIVE }`. Per row: `onboardingStage`, `waitingChip` (`UNDER_REVIEW` \| `REJECTED` \| `REVOKED` \| `RESUBMITTED`, null outside WAITING), `profileStrength { score, level }`, `isVerified`, `badgeGrantedAt`, `badgeAtRisk`, `subCategories[]`, `onboarding.submittedAt`, `onboarding.kycPath`, `onboarding.hasBillingAddress` (`hasLocation` kept). A tab (`?onboardingStage=`) with no rows answers `200` with `data: []`, `total: 0` and `stageCounts`; without `onboardingStage` an empty list stays `404` (§16).

**Planned error codes** (`details.code`):

| Code | HTTP | When |
|---|---|---|
| `ONBOARDING_SCREEN_MISMATCH` | 409 | Step called on the wrong screen (data carries `currentScreen`) |
| `ONBOARDING_LOCKED` | 409 | Change of a saved value while an admin decision is pending (D78) |
| `ONBOARDING_STEP_INCOMPLETE` | 422 | `continue` / `submit` with requirements missing (data carries `missing[]`) |
| `SCREEN_NOT_SKIPPABLE` | 422 | `skip` on a mandatory screen |
| `REGISTRATION_STATUS_LOCKED` | 409 | Status change after the path's first legal save (D75) |
| `GSTIN_NOT_ACTIVE` | 422 | Cancelled / suspended GSTIN (D70) |
| `PAN_NOT_IN_GSTIN` | 422 | PAN differs from the PAN inside the GSTIN (D70) |
| `ENTITY_FROM_GST` | 409 | Entity differs from the GST-derived one on path GST (D70) |
| `SUBCATEGORY_LIMIT` | 422 | More subcategories than `maxSubCategories` (D68) |
| `SUBCATEGORY_NOT_IN_BRAND` | 422 | Voucher subcategory not one of the brand's (D88) |
| `SUBCATEGORY_REQUIRED` | 422 | Voucher create / update with no `subCategoryId` on a brand with several subcategories (D107) |
| `FEATURE_LIMIT` | 400 | One more active feature than `vendor.brandFeatures.maxActive` (D84) |
| `KYC_DOCUMENT_LIMIT` | 422 | More documents than `maxKycDocuments` (D73) |
| `KYC_FILE_TYPE` | 422 | A KYC file that is not PDF / JPG / PNG by its bytes (P2) |
| `KYC_IMAGE_TOO_SMALL` | 422 | A KYC image under 800 px on its short side, or one whose size cannot be read (P2) |
| `KYC_STORAGE_UNAVAILABLE` | 503 | KYC upload while the storage provider is not S3 (no private bucket on Cloudinary, P2) |
| `OWNER_ID_DOCUMENT` | 422 | Rename / replace / delete of the owner ID through the documents routes (P2) |
| `OWNER_PAN_NOT_PERSONAL` | 422 | Owner verification with a non-personal PAN on path UNREGISTERED (D99) |
| `OWNER_NUMBER_NOT_VERIFIED` | 422 | `useOwnerNumber` / `useWhatsappAsMobile` while the owner's WhatsApp is not verified (D83, D86) |
| `LEGAL_FIELD_LOCKED` | 409 | Vendor edits a legal field after approval |
| `DETAIL_ALREADY_PROVIDED` | 409 | Vendor changes a saved PAN/GST/bank (any mode but REMEDIATION), or replaces / deletes a document after approval |
| `DOCUMENT_IN_USE` | 400 | PAN/GST/bank number already used by another brand (D48) |
| `PROVIDER_ERROR` | provider's | `verify-*`: CGPEY refused the call itself or was unreachable; nothing stored (D114). An error status whose body carries the check's own result (bank `result.is_valid` / `recommended_action`, PAN / GST `data.status`) is an answer instead — `200 isVerified: false`, stored (D115). Added in `runKycVerification`, not `fetchAPI` — the customer bank flow shares `fetchAPI` and must not get a coded 401 |
| `VENDOR_ALREADY_EXISTS` | 409 | Admin create on a number that already has a VENDOR |
| `VERIFICATION_NOT_FOUND` | 422 | Unknown / foreign / mismatched `verificationId` |
| `VERIFICATION_FAILED` | 422 | Save of a check the provider did not pass (D97) |
| `BILLING_ADDRESS_REQUIRED` | 422 | Order / grant without a billing address |
| `BILLING_STATE_GSTIN_MISMATCH` | 422 | D33, either direction |
| `BILLING_ADDRESS_NOT_DELETABLE` | 409 | Delete attempt |
| `USE_BILLING_ADDRESS_ENDPOINT` | 409 | Generic `/locations` on kind BRAND |
| `BRAND_NOT_APPROVED`, `BANK_REQUIRED`, `PLAN_REQUIRED` | 403 | `assertCanSellToCustomers` |
| `SUBMIT_REQUIRED` | 409 | Admin approve/reject before submit |
| `DEED_NOT_ACCEPTED`, `DEED_PROOF_REQUIRED` | 409 / 422 | Approval precondition / offline deed without proof |
| `DEED_ALREADY_ACCEPTED` | 409 | Admin offline deed when the vendor accepted it themselves (D102) |
| `BADGE_NOT_ELIGIBLE` | 409 | Badge grant with blockers (data carries `badgeBlockers`) |
| `OUTLET_NOT_VERIFIED` | 409 | Existing P10 code: edit of a never-verified outlet (unchanged) |

**Dropped from the 2026-10-11 contract:** `BRANCH_SWITCH_GST_SAVED` (replaced by `REGISTRATION_STATUS_LOCKED`) and the `PAN_ENTITY_MISMATCH` warning (replaced by `suggestedEntity` + a remark, D71).

---

## 20. Open questions

**No open questions.** OPEN-A…C were closed by D57–D59 and OPEN-D…H by D60–D64. The 2026-11-18 revision questions were all answered by the owner the same day (D66–D96), and every question raised while building P0–P8 and P6b too (D97–D111), and the vendor panel audit (D112). The original wording of the production questions stays below for the record.

<details><summary>Closed production questions (OPEN-D…H)</summary>


| ID | Question | Recommendation |
|---|---|---|
| OPEN-D | **Stage database.** Is stage a copy of production data, or separate test data? The migration reports (§21.2) are only meaningful on production-shaped data. | Restore a recent production copy to stage, run every migration script there (dry-run → owner review → apply), and test both panels on it before production. |
| OPEN-E | **Production release window.** Old panels break against the new backend (`step`, `verificationId`, `submit`, billing endpoint). | Deploy backend + vendor panel + admin panel **in the same window**, run the migrations right after the backend, at a quiet hour. |
| OPEN-F | 🔴 **Bank check vs live vouchers.** D49 adds the bank check to `isBrandClaimable` (`helpers/brands/brandClaimability.js:107`), which feeds both the customer listings and the claim. In production, every approved brand without a verified bank would have its **live vouchers hidden from customers** on release day. Today's bank `isVerified` values were client-supplied (P10), so the count is unknown. | Ship the vendor-side gate (D15, new submit/publish only) on release. Keep the **customer-side** check (D49) behind a setting, **off**. Run the §21.2 bank report on production, get the affected vendors to re-verify, then switch it on. |
| OPEN-G | **Customer app's old versions.** D38 removes brand `location` / `workHours` from the profile response. Customers' phones run older app versions that may read those keys, and a mobile app cannot be force-updated in one day. | Keep both keys but fill them from the **selected outlet** (the outlet context already has its location and hours), never from the billing address. Old versions keep working and no private address leaks. |
| OPEN-H | **CLAUDE.md says "Production starts on a fresh, empty database at launch"** (section "Databases here are disposable"). That is no longer true, and several working rules lean on it. | Update that CLAUDE.md section with the owner's wording. It is the repo's instruction file, so it changes only with the owner's yes. |

</details>

---

## 21. Migration, impact on existing vendors, tests and docs

### 21.1 No impact

- Customer app flows (the badge source changes; profile keys stay, D90; subcategory keys stay, D89)
- Outlet staff
- DASHBOARD vendors' screen
- Renew / upgrade screen rules
- Settlement logic
- Customer voucher-claim invoice

### 21.2 Impact (dry-run-first scripts in `scripts/`)

| What | Handling |
|---|---|
| **Scope (owner, P9, 2026-11-19)** | **Only approved, non-dummy brands migrate** (`scripts/migrateOnboardingV2ApprovedBrands.js`, rules in `scripts/lib/onboardingV2Plan.js`, shared with the census). Never-approved brands are hard-deleted on the owner's order and onboard again on v2; waiting brands with complete data are approved in the current admin panel before release; revoked brands migrate. The rows below marked ⛔ were planned for non-approved brands and are not built |
| `kycPath` | **Derived from the facts on the brand:** a GST record → `GST`; `UNREGISTERED` → `UNREGISTERED`; otherwise `NO_GST` (every migrated brand is approved, so it is never left empty) |
| Owner screen (built) | Legacy or empty screen → `DASHBOARD`; approval not acknowledged and not on `UNDER_REVIEW` / `DASHBOARD` → `UNDER_REVIEW`; anything else unchanged |
| Old screen values ⛔ (not built — non-approved brands do not migrate) | **Derived from the facts, never mapped blindly** (production has real vendors): `isOnBoardingCompleted` → `DASHBOARD` · approved, not acknowledged → `UNDER_REVIEW` · live attempt + `UNDER_REVIEW` → `UNDER_REVIEW` · otherwise: null / `BUSINESS_NAME` → `BRAND_NAME`; `REGISTRATION_STATUS`, `REGISTRATION_ENTITY_TYPE`, `PAN_VERIFICATION`, `GST_VERIFICATION` with `kycPath` empty → `REGISTRATION_STATUS` (saved PAN / entity are kept and carried over, D75); `BANK_VERIFICATION` → `BANK_VERIFICATION`; `SYSTEM_VERIFICATION` → `PARTNERSHIP_DEED`; `PARTNERSHIP_DEED` / `SUBSCRIBE_PLAN` unchanged; `OUTLET_PAGE` → `BRAND_BASIC_DETAILS`. The dry-run prints every vendor's old → new screen and `kycPath` for the owner to review |
| Vendors mid-onboarding on release day ⛔ (replaced by the P9 scope: approved first, or hard-deleted and onboarded again) | They land on the derived screen with everything already filled. New items (`BUSINESS_CATEGORY` subcategories, email / mobile, outlet verification) show as `MISSING` in `status`, and the review screen shows what is left |
| `subCategoryIds` | `[subCategoryId]` where a subcategory exists |
| `legalBusinessName` | Existing values kept, never overwritten by the derivation (D67 applies to new saves) |
| Migrated brands with an attempt | `onboarding.submittedAt` = attempt `createdAt` (D55, so no brand sits in two tabs) |
| Attempt exists, brand not approved/revoked and vendor not on UNDER_REVIEW ⛔ (not built — no attempt is touched) | Mark the attempt superseded so FIRST_PASS reopens |
| `onboarding.furthestScreen` | Set from the owner's screen after the mapping |
| Status flags | `panStatus` / `gstStatus` / `bankStatus` = `PROVIDED` where the record is on the brand. `NOT_APPLICABLE` is never stored (`status` reads it off the path) |
| Deed | `VENDOR / ONLINE / version "legacy"`, no acceptance time (`DEED_LEGACY_VERSION`; `presentDeed` → `isLegacy: true`) |
| Badge | `isVerified=true` (LEGACY) for approved brands, **not for dummy brands** (D93) |
| Existing data vs new hard rules | PAN-in-GSTIN, active GSTIN and entity-from-GST apply to new saves only. A report lists approved GST brands whose PAN is not inside the GSTIN, for the admin to look at |
| **Bank report** (D62) | Read-only, run on the rehearsal clone of production before release: approved brands whose bank is missing, `isVerified !== true`, or whose stored provider verdict (`verificationStatus`) is not `SUCCESS` (census report 3a). Empty → customer-side check live at release. Not empty → those vendors re-verify first |
| Customer profile keys | `location` / `workHours` from the selected outlet (D90) |
| **Billing address** | Report: (a) GST brands whose brand location state ≠ GSTIN state, because their future invoices will switch from the GST address to that location; (b) brands with no billing address (they confirm at next checkout) |
| Vendor profile | `brandName`, category and subcategories read-only after approval |
| Vendor panel / admin panel | §24 + the two panel guides |

**Production has data (D58).** Every script runs in this order: dev → stage → rehearsal clone of production (D60) → production. Each step is a dry-run first, the owner reviews the printed report, then `--apply`. Scripts are idempotent, so a re-run changes nothing.

### 21.2a Release order (D58)

1. Backend phases land on `develop`, then deploy to **stage** (stage's own data). Run the migrations on stage too, so stage matches the new schema. New indexes ship through `scripts/ensureIndexes.js` (stage and production run `MONGO_AUTO_INDEX=false`).
2. Vendor panel + admin panel are built against stage and tested end to end (both QA checklists).
3. Refresh the rehearsal clone (`Trydood_Prod_rehearsal`) from production (D60). Run every migration script and the bank report (D62) there: dry-run → owner review → apply. This is the real test of the production data.
4. Production, in one quiet window (D61): backend → `ensureIndexes` → migrations (dry-run → review → apply) → both panels. The customer-side bank check goes live here if the rehearsal report was empty.

### 21.2b Sequencing with the brand visibility plan and P10 verified signup

[brand_feed_outlet_rule_plan.md](./brand_feed_outlet_rule_plan.md) and [verified_signup_outlet_plan.md](./verified_signup_outlet_plan.md) are **live on stage and production since 2026-11-04** (`main` PR #18). They touch the same customer files (`services/brands/getCustomerBrand.js`, `helpers/brands/customerBrandFeed.js`, `helpers/search/buildBrandSection.js`, `helpers/brands/customerBrandVisibility.js`), the admin brand list and outlet creation. When v2 is built:

- **D49** (bank check inside `isBrandClaimable`): a brand that fails it is not hidden. In the new feed mode it becomes a **no-voucher card**, shown when it has a verified, located outlet and a visible album.
- **§16** admin brand tabs (`GET /brands/admin/get-all?onboardingStage=`) must keep the `customerVisibility` row field, the `?isCustomerVisible=` filter and the `accountState` default filter.
- **P13 / §11** badge work changes `isVerified` on the same feed card. Merge with it, do not overwrite it.
- **D85 / D86** build on the P10 outlet verification (P23). **D91** on the P10 account states (P24).

### 21.3 Tests

- Update `__tests__/money/subscriptionPhase6.test.js` (deed from GST_VERIFICATION → 409. Plan target → `BRAND_BASIC_DETAILS`).
- Update `__tests__/unit/promoScopeAndOnboarding.test.js`.
- Update `__tests__/money/locationOwnership.test.js`: it creates brand addresses through `/locations` with `isBrandAddress: true`, which D34 refuses. Those cases move to `PUT /brands/billing-address`.
- Update `__tests__/unit/brandPlanLookup.test.js:314,326`: it pins customer `isVerified` to `isApproved`, which D19 changes.
- `subscriptionPhase6.test.js:172` calls `accept-partnership` from DASHBOARD. Under D43 that is a 409 unless a confirmation is pending.
- Outlet tests (`outletVerification`, `outletSignupResend`): add `useOwnerNumber` cases (verified owner, unverified owner, second outlet on the same number).
- Voucher tests: subcategory choice for multi-subcategory brands (D88).
- New unit tests: tracker transitions, the three paths, status lock and switch carry-over, strength, per-path scoring, GST state map, D33, PAN-type suggestion.
- Money-suite additions where money is touched: billing snapshot on the transaction, bank gate in claim preview.
- **Every suite run is proposed first and waits for the owner's yes.**

### 21.4 Docs

- `vendor_panel_api_doc.md`
- `super_admin_panel_api_doc.md`
- `customer_mobile_api_doc.md`
- `brand_rejection_remediation_design.md`
- `endpoints_category.md`
- `setting_fields_reference.json` + `setting_default_response.json` (new settings)
- Postman (generator + re-seed + re-capture)
- `verifyApiCoverage.js`
- the companion guides of this doc

---

## 22. Change log

| Date | Change |
|---|---|
| 2026-10-11 | Created. D1–D29 locked. OPEN-1…7 recorded. |
| 2026-10-11 | Owner answers: billing address = brand location (D30–D38). PAN type soft warning (D39). Documents strength rule (D40). Logo required (D41). OPEN-1…7 closed. HQ outlet dropped. Coordinates stay required (no `Location` change). New P14–P17. OPEN-A (deed text/version), OPEN-B (master plan) added. Companion vendor/admin guides and phases doc created. |
| 2026-10-11 | Owner correction: the vendor frontend is a **web panel**, not an app (the admin side is a panel too). Wording fixed across this doc. Companion guides named `brand_onboarding_v2_vendor_panel_guide.md` and `brand_onboarding_v2_admin_panel_guide.md`. |
| 2026-10-11 | Added §19.1 (shared request/response shapes, admin `?brandId=` convention, `continue`/`submit` missing codes) so both panel guides use one definition. Admin list field `onboarding.hasLocation` renamed `hasBillingAddress`, and `hasWorkHours` dropped. OPEN-C (rollout) added. Vendor panel guide, admin panel guide and phases doc written. |
| 2026-10-11 | Independent cross-doc + code audit. New P18–P22. **P18 is a live security bug today:** any vendor can read or edit another brand through `GET /brands/get` / `PUT /brands/update`. Gaps filled as D42–D56: ownership fix, deed endpoint rules, system status floor, branch-switch rewind, `gstAddress`, verify reuse only from `KycVerification`, `DOCUMENT_IN_USE`, customer-side soft block, order reuse matches billing state, strength normalisation, plan-activation rule, legacy snapshot fallback, badge field names, admin-tab overlap, brand-level work hours. Corrected: voucher submit/publish are POST, `/locations` gates, line references, `Brand.verifiedAt` collision. Added 3 affected tests to §21.3. |
| 2026-10-11 | Owner answers: deed version in `Setting` (D57), stage-first rollout (D58), P18 in P1 + master-plan pointer after approval (D59). **Production already has data**, contradicting the earlier "fresh database" assumption. §21 rewritten for production: screens derived from facts, dev → stage → production script order, release order §21.2a. New OPEN-D…H (stage data, release window, bank check vs live vouchers, customer app old versions, CLAUDE.md statement). |
| 2026-10-11 | **Plan approved** by the owner, D42–D56 accepted. OPEN-D…H closed as D60–D64 (stage clone with notifications/jobs off, one release window, bank report before the customer-side check, profile keys removed, CLAUDE.md updated). D65 added: the PAN/GST/bank records stay the single read source, server-written from P0. `master_execution_plan.md` Part 5C pointer added. **No open questions remain.** |
| 2026-10-11 | Owner correction to D60: stage keeps its own data and is not cloned. Production is cloned into a **new rehearsal database** for the migration dry-run/apply. §21.2a release order updated. |
| 2026-10-24 | Cross-reference only (no v2 decision changed): §21.2b added — the brand visibility plan ([brand_feed_outlet_rule_plan.md](./brand_feed_outlet_rule_plan.md)) lands first; D49 interplay, §16 admin list field and P13 badge merge noted. Companion docs got a one-line pointer. |
| 2026-11-18 | **Owner revision of the middle of the flow, D66–D96** (from the panel design screenshots and the owner's answers the same day). Basic Details = `BRAND_NAME` → `BUSINESS_CATEGORY` (several subcategories) → `REGISTRATION_STATUS` (three options). Business Verification has three paths: GST (GST → PAN → entity from GST → documents), NO_GST (PAN → suggested entity → documents), UNREGISTERED (owner verification → documents). Legal name derived by the server. Documents without slots (titled list). Registration status lock, lock on save for PAN / GST / bank, pending add-only with re-check on the same attempt, live system-check preview, per-path scoring, new strength identity / document rules. Sidebar groups + progress from `status`. Logo, email and contact required on brand details. Outlets must be verified; `useOwnerNumber` and `useWhatsappAsMobile`. Voucher subcategory choice. Customer app keeps old subcategory and profile keys (D89, D90, replacing D63). Admin-created vendor ACTIVE, no owner check, dummy brands without legacy badge. Code re-checked: P18 already fixed live (2026-10-27); P10 bank `isVerified` bug still live; new P23–P26. §3–§21 rewritten; replaced decisions marked in §2. |
| 2026-11-18 | **P0 written** (branch, uncommitted, not deployed). Owner answers while building it: D97 (a failed verification cannot be saved, `VERIFICATION_FAILED`), D98 (reuse window `vendor.kyc.reuseDays`, default 30). Provider answer shapes read from stage (21 PAN / 22 GST / 17 bank, read-only): PAN `panType` arrives null (read off the 4th character), GST dates `dd/mm/yyyy`, bank verdict `recommended_action: "PROCEED"` (the vendor doc said `ACCEPT`). §19.1 verify / save shapes made concrete; P10, P11, P19 marked fixed on the branch. |
| 2026-11-18 | **P1 written** (branch, uncommitted, not deployed): new `SCREENS`, `advanceOnboarding` (compare-and-swap + `furthestScreen`), signup on `BRAND_NAME` + login heal, `currentScreen` removed from every input, `add-basic-details { step }` with several subcategories (`vendor.onboarding.maxSubCategories`, default 3) and `kycPath`, PAN / GST / bank saves move the screen along the path, `accept-partnership` only on `PARTNERSHIP_DEED`, plan activation → `BRAND_BASIC_DETAILS`, the create-order guard (D26), `GET /brands/onboarding/status` (P1 fields). The status switch, its rewind (D45) and the status lock (D75) were built in P1 rather than P2 — the tracker needs them to be coherent. Legacy screen values stay valid on `User` until the P9 migration. |
| 2026-11-18 | **P2 written** (branch, uncommitted, not deployed): item statuses on `Brand.onboarding` (`NOT_APPLICABLE` read off the path, never stored); lock on save (D76, `409 DETAIL_ALREADY_PROVIDED`, checked at `verify-*` too so no paid call is wasted); PAN-in-GSTIN (D70) at verify and save; GST path sets legal name + entity from the GST (`ENTITY_FROM_GST` on a different entity, D70); NO_GST sets the legal name from the PAN (D67); status-switch carry-over (owner PAN ↔ business PAN, no new paid call, D75); `POST /brands/onboarding/owner-verification` (D72); `BrandKycDocument` + the documents routes + admin review (D73); `skip` (D74) and `continue` (KYC_DOCUMENTS); `UPLOAD_PURPOSE.KYC_DOCUMENT` (private, PDF / JPG / PNG ≥ 800 px, 5 MB — refused while the provider is Cloudinary, `503 KYC_STORAGE_UNAVAILABLE`, because Cloudinary has no private bucket); `Category.kycDocumentHints`, `vendor.onboarding.maxKycDocuments`; `add-pan/gst/bank-details` answer the wrapped §19 shape (`record`, `itemStatus`, `currentScreen`, `derived`). Found while building: a phone JPEG keeps its size past the first 1 KB the storage layer reads, so KYC images are measured from up to 256 KB; and a presigned private object was copied with the public year-long `Cache-Control` (now `private, no-store`). The new P2 writes are `isVendor`; P6 opens them to the admin (the document list is already vendor-or-admin, the admin reviews from it). |
| 2026-11-18 | **P3 written** (branch, uncommitted, not deployed). `POST /brands/onboarding/submit` replaces `GET /brands/onboarding/system-verify` (#29 removed, #257 added): first submit from `ONBOARDING_REVIEW` only, resubmit in REMEDIATION from anywhere without moving the screen, `422 ONBOARDING_STEP_INCOMPLETE` with the §19.1 `missing` codes (billing P4, deed P5). Per-path scorer (`helpers/systemVerify/scoreBrand.js`, pure; §9.3 table, D81 + **D100** cap) — advisory: a low score no longer sets `isRejected`, and only an **admin** reject / revoke opens REMEDIATION (design P12; an attempt rejected by the old system score now reads as pending). The attempt stores `kycPath`, `checks[]`, `skippedItems[]`, `remarkCodes[]`, `latestScore` / `latestStatus` / `latestScoredAt`; `Brand.onboarding.submittedAt`. `continue` for `BRAND_BASIC_DETAILS` (logo, email, mobile), `BRAND_PROFESSIONAL_DETAILS`, `OUTLET_DETAILS` (verified + location + hours per live outlet). `PUT /brands/update`: `isOnboarding` / `subCategoryId` removed (stripped), brand name a legal field, add-only while pending. Edit window: LOCKED split into `PENDING` / `APPROVED` (`ONBOARDING_LOCKED` / `LEGAL_FIELD_LOCKED`). D78 add-only guard on showcase (7 writes), features (2), outlet update, existing work hours, outlet address update / delete — vendor only, billing address never. D79: a missing PAN / GST / bank / owner verification / document can be added after submit; scored items re-run the score on the live attempt (`DETAIL_ADDED`, `BRAND_DETAIL_ADDED` admin notice, no new attempt); a GSTIN must carry the saved PAN and moves NO_GST / UNREGISTERED to GST (D71, D94); after approval the UNREGISTERED → GST / NO_GST upgrade and an entity never chosen (once). Documents after submit: add yes, change `ONBOARDING_LOCKED` (pending) / `DETAIL_ALREADY_PROVIDED` (approved, D95). Review route: `409 SUBMIT_REQUIRED` before a submission (D12). Document review notifies the vendor (`BRAND_DOCUMENT_REVIEWED`, D99) and writes `DOCUMENT_REVIEWED`. Status: `editLock`, full `editable`, `systemChecks` (D80), `customerVisibilityHints` (D96). |
| 2026-11-18 | **P4 written** (branch, uncommitted, not deployed). Billing address (§14): `GET` / `PUT /brands/billing-address` (#258, #259, `isVendorOrAdmin`, admin `?brandId=`) — the brand's one `Location` kind BRAND, upsert (edit in place, else create + `Brand.locationId`), no delete, any time (no edit-window or D78 guard); `BILLING_ADDRESS_CHANGED` history once an attempt exists. GET: `suggestedAddress` only while none is saved (GST, else PAN), `gstAddress` whenever a GSTIN exists (D46). D33 both ways: billing save `422 BILLING_STATE_GSTIN_MISMATCH`, and `verify-gst` / `add-gst-details` refuse a GSTIN from another state while a billing address exists (before the paid call). Generic `/locations`: create / update of a brand address `409 USE_BILLING_ADDRESS_ENDPOINT`, delete `409 BILLING_ADDRESS_NOT_DELETABLE`. `buildBillingDetails`: billing → GST → PAN, `addressSource` `BILLING` / `GST` / `PAN` (was GST first, location `LOCATION`), adds `hasBillingAddress` / `suggestedAddress`; tax still from the GSTIN, the no-GSTIN name compare now goes through the §14.4 map. Preview: `billingAddressRequired`, `suggestedAddress`. `create-order` (paid and ₹0) and the admin grant: `422 BILLING_ADDRESS_REQUIRED` (grant checks before taking a document number). `Transaction.billingSnapshot` frozen at create-order and grant (D37); settle and invoice regeneration read it, older transactions fall back to the live brand (D53); pending-order reuse matches the frozen GSTIN **and billing state** and never reuses a pre-P4 order (D50). Submit `missing` gains `BILLING_ADDRESS`. Customer profile (`GET /brands/customer/get/:brandId`): top-level `location` / `workHours` are the selected outlet's, `null` when none is selected (D90; the keys are now always present). Admin brand list: `onboarding.hasBillingAddress` added, `hasWorkHours` removed (`hasLocation` kept). |
| 2026-11-19 | **P5 written** (branch, uncommitted, not deployed). Owner answers D101–D103. **Selling gate** (§12.2): `assertCanSellToCustomers` / `sellingBlocker` (`helpers/brands/sellingGate.js`) — approved (`isApproved`, not revoked) → verified bank (`Brand.BankId`, live, `isVerified`, the account a settlement snapshots) → live plan, `403 BRAND_NOT_APPROVED` / `BANK_REQUIRED` / `PLAN_REQUIRED`, on `POST /vouchers/submit-review/:voucherId` and `POST /vouchers/publish/:versionId` (admin publish too). **Customer side** (D49): `isBrandClaimable` / `buildBrandClaimableStages` add the verified-bank condition behind `customer.claim.requireVendorVerifiedBank` (default OFF, D101); the claim preview keeps `BRAND_NOT_ACCEPTING`. **Deed** (§13): `Brand.deed` record (`acceptedByType`, `acceptedBy`, `acceptedAt`, `mode`, `version`, `proofDocument` (private bucket), `note`, `vendorConfirmedAt` / `By` / `Version`); `hasAcceptedPartnershipDeed` kept and set on every acceptance (alone = legacy vendor acceptance). `accept-partnership`: confirm an admin's offline deed from any screen without moving it, else accept on `PARTNERSHIP_DEED` only; response adds `deed`. New `PUT /brands/admin/:brandId/deed` (#260, `isAdmin`): `file` / `proofUploadId` + `note`, `422 DEED_PROOF_REQUIRED` before any upload, `409 DEED_ALREADY_ACCEPTED` (D102), D43 screen rule. `Setting.vendor.onboarding.deedVersion` (D57, D103). Status `deed` = full record + signed `proofUrl` + `requiresDeedConfirmation`; the tracker's deed screen reads the same rule. Submit `missing` gains `DEED`; approve `409 DEED_NOT_ACCEPTED` (vendor's own, legacy flag, or admin offline with proof). History `DEED_ACCEPTED` / `DEED_CONFIRMED` once an attempt exists. |
| 2026-11-19 | **P6 written** (branch, uncommitted, not deployed). Owner answers D104 (admin under the vendor's locks; "edit anything any time" → P6b) and D105 (no message on create). New `POST /brands/admin/onboarding/create` (#261, `isAdmin`): VENDOR user + brand in one transaction, no OTP, `accountState: ACTIVE` (D91), screen `BRAND_NAME` / `BUSINESS_CATEGORY` with a name, `409 VENDOR_ALREADY_EXISTS`. 15 onboarding routes move to `isVendorOrAdmin` with `?brandId=` for an admin: `add-basic-details`, `update-basic-details`, `add-pan` / `gst` / `bank-details`, `verify-pan` / `gst` / `bank`, `owner-verification`, documents add / update / delete, `skip`, `continue`, `submit`. `accept-partnership` and `acknowledge-approval` stay vendor only. One resolver (`helpers/onboarding/resolveOnboardingOwner.js`): vendor → own brand; admin → `resolveActorBrand` + the owner from `brand.userId` (owner deactivated → 409). Every guard, screen move and lock is the owner's. History rows (`SYSTEM_VERIFIED` / `RESUBMITTED`, `DETAIL_ADDED`, `REMEDIATION_UPDATED`) name the acting admin (`performedByType: ADMIN`). Admin list: `?onboardingStage=NEW\|WAITING\|LIVE` (D55), per row `onboardingStage`, `waitingChip` (`UNDER_REVIEW` / `REJECTED` / `REVOKED` / `RESUBMITTED`), `onboarding.kycPath` / `submittedAt`, top-level `stageCounts` (every filter but the tab). Pre-v2 pending brands read NEW until the P9 `submittedAt` backfill. |
| 2026-11-19 | **P7 written** (branch, uncommitted, not deployed). Owner answer D106. Profile strength (§10): pure `helpers/brands/profileStrength.js` (weights §10.2, every path 100, D51 normalisation for an unavailable showcase — off globally or not in the plan, "+N" `points` + `action` per open item, `badgeEligible` / `badgeBlockers`), facts loader `services/brands/profileStrength.js` (PAN / GST / bank records, owner ID + business documents by status, showcase with media, features, live outlets, owner's email / mobile verified). Never stored. New `GET /brands/profile-strength` (#262, `isVendorOrAdmin`); embedded in `onboarding/status` with `isVerified`; admin list rows get `profileStrength { score, level }` (page rows only), `isVerified`, `badgeGrantedAt`, `badgeAtRisk` (D29). Verified badge (§11): `Brand.isVerified` (default false), `badgeGrantedAt`, `badgeGrantedByAdminId` (D54); `PUT /brands/admin/:brandId/verified-badge` (#263, `isAdmin`) — grant needs approved + strength ≥ 75 + verified bank + verified PAN or **accepted** owner ID, else `409 BADGE_NOT_ELIGIBLE` with blockers; remove any time; history `BADGE_GRANTED` / `BADGE_REMOVED` with a strength snapshot (only when an attempt exists). Admin reject / revoke clears the badge (`badgeRemoved: true` in the review response, automatic history row). Customer badge (P13 fixed): profile, search, brand feed and voucher listing all read `Brand.isVerified` — approved brands show no badge until the P9 legacy backfill (D93). |
| 2026-11-19 | **P8 written** (branch, uncommitted, not deployed). Owner answers D107–D109. **Voucher subcategory** (D88, D107): `resolveVoucherSubCategory` on create / update (`subCategoryId` body field; update keeps its own, a change must be in the brand's current list; a new version on a published one). **Live bug fixed:** the claim preview, the promo scope (`validateCustomerPromoCode` via `voucherScope`, also the promo listing) and the claim snapshot read the voucher's taxonomy from the **version**. **Brand subcategory readers** (D89, `helpers/brands/brandSubCategories.js`): "in subcategory X" = X in `subCategoryIds` or the single `subCategoryId` (legacy); brand feed filter, admin brand list filter, taxonomy stats and search taxonomy counts (a brand counts in each), and `subCategories[]` (brand's order) on the customer profile, feed cards and admin list rows, `subCategoryIds[]` on search brand rows — the single keys stay. **Shortcuts:** `POST /subBrands/signUp-with-whatsapp { useOwnerNumber }` (D86: owner's verified number read by the server, outlet + manager verified at creation, `SubBrand.verifiedVia = OWNER_NUMBER`, no code, no signup row D108; `422 OWNER_NUMBER_NOT_VERIFIED`), `PUT /brands/update { useWhatsappAsMobile }` (D83: owner's verified WhatsApp saved as a **verified** mobile). **D87:** after the vendor's own OTP change or an admin contact change of the vendor's WhatsApp, live outlets still on the old number trigger a vendor + admin notice (D109). **D84:** `Setting.vendor.brandFeatures.maxActive` (default 10) replaces the hardcoded 10; `400` now carries `FEATURE_LIMIT` + `limit`. No new route. |
| 2026-11-19 | **P6b written** (branch, uncommitted, not deployed). Owner answers D110, D111. The §6 admin column: an admin (`?brandId=`) corrects in every state — `addOrUpdateBasicDetails` skips the pending / approved lock and the D75 status lock for an admin and accepts an admin-only `legalBusinessName` (a vendor sending it gets `403`); `createPan` / `createGst` / `createBank` and `verify-*` skip the add-only rule and the D76 change lock for an admin; owner verification may be redone; KYC documents may be replaced / deleted after submit (D95). Content rules still apply (D33, D70, `GSTIN_NOT_ACTIVE`, `OWNER_PAN_NOT_PERSONAL`, `DOCUMENT_IN_USE`). Leaving path GST unlinks the GSTIN (D110). Every correction of a submitted brand: `LEGAL_EDIT_BY_ADMIN` history (`services/brands/recordAdminLegalEdit.js`), the live attempt re-scored (not for documents / a rename), vendor notice `BRAND_DETAILS_UPDATED_BY_ADMIN` (D111); approval untouched, screen never moves. An admin rename through `PUT /brands/update` records the same. The vendor's own locks are unchanged. |
| 2026-11-19 | **P9 started — census first, then the owner decides per brand** (owner). Only approved brands migrate (not dummies, D93); never-approved brands are hard-deleted on the owner's order with their related rows and stored files, and their vendors onboard again on v2; waiting brands with complete data are approved in the current admin panel before release; revoked brands migrate. Order: stage (dev skipped — not in use) → rehearsal clone → production; production release ships backend + both panels together. New read-only `scripts/onboardingV2Census.js` (refuses `--target prod`; per-brand bucket, KYC, attempt, deed, outlets, vouchers, plan, money rows, the §21 reports and what the migration would write). `scripts/deleteAbandonedBrands.js` gains `--include-onboarded` (KYC / attempts / outlets / features / showcase / signup attempts + stored files) and `--include-money` (**stage only** — the owner's one-time order for test data: SUBSCRIPTION transactions, plans, plan history, webhook events, invoice PDFs; production keeps "money records are never deleted"). Stage run: 11 never-approved brands removed (120 rows, 15 files, 0 left); Royal Paint St and Royal GYM to be approved by the owner. |
| 2026-11-19 | **P9 migration script written** (branch, uncommitted; stage dry run only). `scripts/migrateOnboardingV2ApprovedBrands.js` writes the §21.2 rows on approved, non-dummy brands, from one rule set shared with the census (`scripts/lib/onboardingV2Plan.js`): only absent fields, one transaction per brand + owner with an `updatedAt` / screen guard, `updatedAt` untouched, a re-read after apply must plan nothing, no messages. Two details settled while writing it: the deed record for a pre-P5 acceptance is `VENDOR / ONLINE / version "legacy"` with **no** acceptance time (none was kept, none is invented) and `presentDeed` reads it as `isLegacy: true` (`DEED_LEGACY_VERSION`); the legacy badge sets `isVerified` only — no `badgeGrantedAt` / admin. `furthestScreen` = the owner's screen after the mapping (§21.2), so an approved brand whose approval is not acknowledged gets `UNDER_REVIEW`. Owner, same day: Royal GYM submitted on stage with the deployed stage code and approved by the owner; Royal Paint St's screen left for the migration. Stage: 18 approved, 0 never-approved. |
| 2026-11-19 | **P10 docs audit + code fixes** (branch, uncommitted, not deployed). The four design / phase docs, both panel guides, the vendor / admin / customer API docs, the endpoint map, the settings reference and the template doc were audited line by line against the code and corrected where they disagreed (§1 rows marked fixed on the branch, §16, §18, §19.1 status shape, §21.2 scope, D71 `E → LLP`, D86 / D108). Code fixes found on the way: (1) **sidebar** — `screenStatuses` now reads the brand's facts: `BRAND_BASIC_DETAILS` DONE with logo + email + mobile (D83), `BRAND_PROFESSIONAL_DETAILS` DONE once the vendor is past it (screen or `furthestScreen` beyond it, `submittedAt`, or approved), `OUTLET_DETAILS` DONE with ≥ 1 live outlet, each verified + location + work hours (D85); `status.hasBillingAddress` = a live BRAND `Location`, the same check submit makes. (2) `GET /brands/get` returns `subCategories: [{ _id, name, image }]` in the brand's order, next to `subCategoryIds` and the single `subCategory`. (3) Census report 3a also flags a bank whose stored provider verdict (`verificationStatus`) is not `SUCCESS` (D62). (4) The P9 legacy deed marker: a `VENDOR` record with version `"legacy"` (`DEED_LEGACY_VERSION`) reads `isLegacy: true` in `presentDeed`. (5) Owner decision: an admin tab (`?onboardingStage=`) with no rows answers `200`, `data: []`, `total: 0` + `stageCounts`; without `onboardingStage` the empty `404` stays (§16). |
| 2026-11-19 | **Vendor panel audit answers** (owner). D112: brand name 2–25 on every write (validators share `BRAND_NAME_LIMITS`). `GET /brands/onboarding/status` adds `limits` (brand name min / max, `maxSubCategories`, `maxKycDocuments`, `maxActiveFeatures`) from the same settings helpers the saves use. Docs fixed from the audit: the panel docs' "branch, deploy nahi" notes now say "stage pe live 2026-11-19, prod pe abhi nahi"; the notifications sample keeps `deepLink` inside `meta` (as `notify.js` writes it) and shows `totalPages`; the FSSAI warning keys on `hints` containing `FSSAI`. Stage had no brand name longer than 25. |
| 2026-11-20 | **Vendor panel Milestone A answers** (owner). D113: no server prefill field — after a refresh the panel derives the GST-path PAN (GSTIN characters 3–12) and the NO_GST entity suggestion (PAN 4th character) from `GET /brands/get`. Billing coordinates from Google geocode are accepted (no map pin needed; customer distance uses outlet locations, not the billing address). The vendor Postman "Verify PAN" 400 example was a stale legacy capture ("PAN details already in use.", no code) — re-captured on `Trydood2_postman`: `400` "This PAN is already used by another brand." with `details.code: DOCUMENT_IN_USE`. Status header brought up to date (P0–P10 committed, stage live, prod not yet). |
| 2026-11-20 | **D114 — bank verify fix + GST address** (owner, from the panel's GST-path stage run: `verify-bank` → 400 `"beneficiaryName" is not allowed` from CGPEY, requestId `REQ_1795122451778_rbumzcyxt`; no `KycVerification` stored; and the GST card showed the address twice). `verifyBankAndFetchDetails` sends `{ accountNumber, ifscCode }` only (PAN / GST services made explicit the same way); validator drops `beneficiaryName`; the bank parser takes the holder from the bank only; `runKycVerification` adds `PROVIDER_ERROR`; `helpers/gst/gstAddress.js` shared by the invoice, `addressOnRecord` (also rebuilt in `presentKycVerification`) and `addressFromGst`. Docs: vendor API doc #23 / #28–#30, both guides (§4.9, §12), this file (§19 codes). |
| 2026-11-20 | **D115 — failed check in an error status** (owner). `runKycVerification.callProvider` returns a verdict body (bank `result`, PAN / GST `data.status`) as the answer instead of `PROVIDER_ERROR`; money tests for a bank 400 verdict (stored FAILED, save refused, not reused), a PAN verdict, and an IP refusal staying `PROVIDER_ERROR`. Docs: vendor API doc #28–#30, both guides (§4.9, §12), §19 codes. Customer bank flow gap logged as `pending_work.md` P-58. The test body is the real stage answer (`REQ_1795170007374_r6gxkvujg`, redacted `details.raw` from the panel team): `failure_reason: "Bank verification failed"`, `account_holder_name` / `npci_error_code` / `rrn` null, `recommended_action: AC_RETRY_TXN`, `chargeble: "false"`. A second try with the correct account (`REQ_1795184004309_pg9hjor8h`) got the same answer — a bank-side failure, not the input. |
| 2026-11-21 | **D116 — Milestone B fixes** (owner). Vendor `brands/get` bank masked (money test in `brandActorScope`: vendor sees no full number / raw answer / `user`, admin sees all, a brand without a bank still loads); owner-number outlet message; vendor API doc #31 (masked bank example + note 2), #33 (real vendor row shape, `reason`), #34 (owner-number success example). The outlet `addressLine1: "6"` the panel saw is the panel's own parse — `POST /locations/create` stores the `addressLine1` the client sends. Stage: the QA GST brand rejected once from the backend (same admin service, dry run first) so the panel can run remediation → resubmit; the second bank account passed on stage (`SUCCESS` · `PROCEED`, 2026-11-20 14:35 UTC), which closes the "one real v2 bank verify before prod" item. |
| 2026-11-21 | **Docs only — Milestone C answers** (owner, all R). `onboarding.submittedAt` stays the **first** submit (as §7 / D55 already say; admin tabs read it) — vendor doc #20a + guide §6 now say so, latest submit = the `RESUBMITTED` history row. The vendor doc's NOTIFICATION_TYPES list lacked the five brand-review notices the code has always sent (`BRAND_UNDER_REVIEW`, `BRAND_RESUBMITTED`, `BRAND_APPROVED`, `BRAND_REJECTED`, `BRAND_APPROVAL_REVOKED`) — added with their logical `deepLink` paths; guide §7.4. Stage: the QA GST brand's approval revoked once from the backend (same admin service, dry run first) for the panel's revoke test. |
| 2026-11-21 | **D117 — `status.customerVisibilityHints.showcaseReady` agrees with `brands/get`** (owner). `getOnboardingStatus` called `resolveBrandVisibility` without `withShowcase`, so with `requireShowcase` OFF the album was never checked and `showcaseReady` read `false` for every brand, while `GET /brands/get` (`withShowcase: true`) said `true` — found by the vendor panel on stage ("QA Stage GST Cafe", 3 live photos). Now `withShowcase: true`; one extra indexed `exists` per status read. Hiding rules unchanged (the album hides only with the switch ON). Money test in `customerVisibilityPanels` (both switch states, status = brands/get). Docs: vendor doc #20a, both guides. |

---

## 23. Future notes

- Multiple categories per brand by plan (more customer visibility). `BUSINESS_CATEGORY` and the legal rule extend to a list of categories; subcategories already are a list (D68).
- OCR / automatic checks could later give KYC documents and the owner ID system points.
- Serving the deed text from `PartnershipDeed` with admin CRUD (D57 keeps the text in the panel for now).
- **Several subcategories per voucher** (owner, 2026-11-19 — D107 keeps one for now). A voucher would carry `subCategoryIds[]` from the brand's list. What it touches, measured on the code: `VoucherVersion` field + index (`subCategoryId` kept = first), create / update validation + a limit, the customer filters (brand feed voucher cards, voucher feed, search) as "any of", the voucher listing grouping (`$first: "$subCategoryId"`), admin versions list filter + lookup, voucher detail lookup, taxonomy voucher counts (a voucher would count in each of its subcategories, so the per-subcategory totals add up to more than the vouchers), the promo scope and the claim snapshot ("any of"), customer responses keeping the single key + adding a list, both panels' multi-select, and a P9-style backfill `subCategoryIds = [subCategoryId]` on every version — published ones are immutable, so that is a reviewed data migration. Roughly 12–14 files and 2–3 days.
- Retiring `POST /workHours/upsert {brandId}` (brand-level hours, D56).

---

## 24. Things only the frontend can confirm

1. What the vendor panel sends as `isVerified` on `add-bank-details` today (P10 says the server trusts it). Becomes moot once P0 lands (`verificationId` only).
2. ~~Whether the customer app reads brand-level `location` / `workHours` from the profile~~: owner confirmed it does not (D63); the keys stay anyway (D90).
3. Which endpoint the current "edit address" button calls (D34 moves it to `PUT /brands/billing-address`).
4. Where the deed text shown in the vendor panel comes from (D57 keeps it there; the panel sends nothing, the server records the `Setting` version).
