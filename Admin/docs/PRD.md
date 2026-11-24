# Trydood Admin Panel: Product Requirements Document

| | |
|---|---|
| **Product** | Trydood 2.0 Super Admin Panel (web) |
| **Code** | `Admin/` (React 19 + Vite) |
| **Version** | Draft 1.0, 2026-11-23 |
| **Backend** | Trydood 2.0 REST API, base path `/trydood/v1` (stage: `https://staging-api.trydood.com/trydood/v1`) |
| **Related docs** | [Super admin API doc](./super_admin_panel_api_doc.md) · [Brand onboarding v2: admin guide](../src/docs/brand_onboarding_v2_admin_panel_guide.md) · [Brand onboarding v2: design](../src/docs/brand_onboarding_v2_design.md) |

---

## 1. Summary

Trydood is a voucher marketplace. **Brands** (vendors) publish vouchers, **customers** claim them in the app (paid claims go through Razorpay), and customers redeem them at the brand's **outlets**. Trydood keeps a convenience fee and tax, and settles the rest to the brand.

The **admin panel** is the internal web tool the Trydood team uses to run the platform:

- move brands from sign-up to live (onboarding, KYC review, approval, verified badge)
- approve vouchers and voucher banners before customers see them
- run the money: transactions, refunds, settlements, plan grants
- curate what customers see (categories, banners, ticker, promo codes, dummy and "coming soon" brands)
- reach users with notifications
- configure the platform without code (settings, plans, legal text)

## 2. Goals and non-goals

### Goals

| # | Goal |
|---|---|
| G1 | One place to take a brand from sign-up to live, including onboarding a brand **on the vendor's behalf** |
| G2 | Keep quality on the customer app: nothing goes live (brand, voucher, banner) without an admin decision |
| G3 | Run money operations safely, with an audit trail for every decision |
| G4 | Change platform rules (fees, limits, OTP, storage, legal) from Settings, not code |
| G5 | Let ops find any brand, voucher, customer or payment quickly (server-side paging, filters, search) |

### Non-goals

- Vendor self-service. That is the separate **vendor panel**.
- The customer app and the outlet app.
- Deep BI reporting. The panel has operational analytics only; the vendor and customer report pages exist but are hidden.

## 3. Users

The system has **one admin role** (`ADMIN` in the JWT). There are no sub-roles or per-module permissions today (see [Open questions](#13-open-questions)).

| Who (in practice) | What they do in the panel |
|---|---|
| Verification / onboarding team | Onboard brands, review KYC documents, approve / reject / revoke brands, give the verified badge |
| Catalog / quality team | Review vouchers and banners, manage categories, mark dummy / "coming soon" brands |
| Finance / ops | Watch transactions, decide refunds, run settlements, grant or cancel plans |
| Marketing | Banners, promotional ticker, promo codes, notification broadcasts |
| Platform owner | Settings, plans, legal documents |

People affected by admin actions, who never use the panel: the **vendor** (brand owner), the **outlet manager** (`SUB_VENDOR` login) and the **customer**.

## 4. Information architecture

Left navigation, grouped in the order an admin works (source: `src/constants/navGroups.js`).

| Group | Page | Route |
|---|---|---|
| Overview | Dashboard | `/dashboard` |
| | Analytics | `/analytics` |
| Payments | Transactions (+ detail) | `/transaction`, `/transaction/:claimId` |
| | Refund Requests | `/refund-requests` |
| | Refunds (+ detail) | `/refund`, `/refund/:refundRequestId` |
| | Settlements | `/settlements` |
| Catalog | Main Category | `/main-category` |
| | Sub Category | `/sub-category` |
| Brands | New Onboarding | `/new-onboarding` |
| | Brand Waiting | `/brand-waiting` |
| | Live Brands | `/brand` |
| | RD Brands (real brand shown as "coming soon") | `/brand/real-dummy` |
| | Expired Brands | `/brand/expired` |
| | D Brands (dummy) | `/brand/dummy` |
| | Brand detail | `/brands/:id` |
| | Add brand (onboarding wizard) | `/brand/onboard`, `/brand/onboard/:brandId` |
| Vouchers | Draft Vouchers | `/voucher-drafts` |
| | Voucher Waiting | `/voucher-waiting` |
| | Banner Approval | `/voucher-banners` |
| | Live Vouchers | `/vendor-listing` |
| | Expired Vouchers | `/voucher-expired` |
| | D Vouchers | `/voucher-dummy` |
| Plans | Vendor Plans | `/vendor-plan` |
| | Subscriptions (+ detail) | `/subscriptions`, `/subscriptions/:subscribedId` |
| | D Subscriptions | `/subscriptions/dummy` |
| Customers | Customers | `/customer` |
| | Account Deletions | `/account-deletions` |
| Marketing | Banners (+ detail) | `/banner`, `/banner/:id` |
| | Promotional Ticker (+ detail) | `/promotional-ticker`, `/promotional-ticker/:id` |
| | Promo Codes | `/promo-code` |
| Reports | Promo Code Report | `/promo-code/reports` |
| System | Notifications | `/notifications` |
| | Settings | `/settings` |
| Account | Profile | `/profile` |

**Built but hidden from the navigation** (routes still exist): Customer Plans (`/user-plan`), Vendor Report, Customer Report, Feature Campaign, FAQ, Accessibility, Coupon.

## 5. Functional requirements

Requirement IDs are for reference in tickets and reviews.

### 5.1 Sign-in and session

| ID | Requirement |
|---|---|
| AUTH-1 | Admin signs in with their WhatsApp number and a 6-digit OTP (`role: ADMIN`). The API also supports email / password and email OTP, but the panel uses WhatsApp |
| AUTH-2 | Every API call sends `Authorization: Bearer <token>` |
| AUTH-3 | A `401` (session expired) logs the admin out and returns to the login page; the panel also logs out exactly when the token expires |
| AUTH-3a | The session lives only while an admin tab is open: a new tab borrows it from an open tab, closing the last tab ends it, and logging out in one tab logs out all |
| AUTH-4 | Profile page: personal info, contact (email / mobile with OTP verification), security |

### 5.2 Dashboard and analytics

| ID | Requirement |
|---|---|
| DASH-1 | Dashboard shows headline numbers, revenue for the week and recent activity, built from live payments, brands and pending items |
| DASH-2 | Analytics page shows platform trends with charts (Recharts) |
| DASH-3 | When mock data is swapped for real data, the existing charts stay; only their data source changes |

### 5.3 Payments

| ID | Requirement |
|---|---|
| PAY-1 | **Transactions:** list of voucher-claim payments with filters and a detail page per claim |
| PAY-2 | **Refund requests:** the vendor decides first (approved / rejected / timed out). The admin can then approve, reject, or **override** a vendor rejection or timeout. An override needs a reason |
| PAY-3 | **Refunds:** list and detail of every refund. Paying is a separate admin step: pay, or for a manual bank refund ask the customer for bank details, pay to the bank, then confirm or mark the bank payout failed |
| PAY-4 | **Settlements:** payouts to brands. Admin can approve, rebuild, hold, cancel, abandon, pay (NEFT), confirm with the UTR, mark failed / retry, and reverse |
| PAY-5 | Refund and settlement rules (windows, timings) are set in Settings (`customer.refund`, `customer.settlement`) |

### 5.4 Catalog

| ID | Requirement |
|---|---|
| CAT-1 | Create, edit, activate / deactivate and delete (soft) main categories and their subcategories |
| CAT-2 | Each category can list **recommended KYC document types** (`kycDocumentHints`), which the vendor sees as chips in the documents step |
| CAT-3 | Category and subcategory limits follow the server's settings (e.g. a brand picks at most `vendor.onboarding.maxSubCategories`, default 3) |

### 5.5 Brands

#### Brand lists

| ID | Requirement |
|---|---|
| BR-1 | Three lifecycle lists from one API (`GET /brands/admin/get-all?onboardingStage=`): **New Onboarding** (`NEW`: not submitted), **Brand Waiting** (`WAITING`: submitted, not approved, includes rejected and revoked), **Live Brands** (`LIVE`: approved) |
| BR-2 | Badge counts for all three tabs come from `stageCounts` in the same call; an empty tab still returns `200` |
| BR-3 | Brand Waiting shows a status chip per row: Under review, Rejected, Revoked, Resubmitted |
| BR-4 | Rows show KYC path (GST / no GST / not registered), profile strength, verified badge, "badge at risk", subcategories, and in New Onboarding where the vendor is stuck (`currentScreen`) |
| BR-5 | Lists are paged and filtered on the server |
| BR-6 | Separate lists for **RD brands** (a real, approved brand shown to customers as "coming soon", with a note), **expired brands** and **D brands** (dummy brands for demos) |

#### Brand detail (`/brands/:id`)

| ID | Requirement |
|---|---|
| BR-10 | Tabs: Overview, Brand info, Account details, Ambience (showcase albums), Listings, Outlets, Vouchers, Settlements, System verification |
| BR-11 | **Verification review:** approve, reject (reason required), revoke (reason required), mark reviewed. Approve and reject are only possible **after the vendor submits**; approve also needs the partnership deed |
| BR-12 | **Verified badge:** grant or remove. Granting needs: approved brand, profile strength ≥ 75, verified bank, and identity proof (verified PAN or an accepted owner ID). The panel shows what blocks it |
| BR-13 | **Documents:** list owner ID and KYC documents, open them (signed links that expire), accept or reject with a reason |
| BR-14 | **Account controls:** deactivate the vendor account, or hide the brand from customers (two separate switches) |
| BR-15 | **Outlets:** list every outlet with its verification state; verify the manager's code, resend the code, fix a wrong number, activate / deactivate |
| BR-16 | Billing address, plan grant and offline partnership deed are editable from the brand |
| BR-17 | Change the vendor's contact number (e.g. a lost SIM) |

#### Admin onboarding wizard (`/brand/onboard`)

The admin can create a brand on the owner's WhatsApp number and fill every onboarding step for them. The vendor later logs in and continues from the same step; nothing the admin filled is asked again.

| ID | Requirement |
|---|---|
| ONB-1 | **Create:** owner's WhatsApp number (+ optional brand name). If a vendor already exists on that number, offer to open their onboarding or brand |
| ONB-2 | The **server decides the current step**; the panel re-reads the status after every save. If the vendor or another admin moved the brand meanwhile (`409 ONBOARDING_SCREEN_MISMATCH`), the panel refreshes to the latest step |
| ONB-3 | Six phases, in order: Basic details → Business verification → Payout → Agreement & plan → Brand & outlets → Submit. The verification steps depend on the KYC path (GST: GST → PAN → business type → documents; no GST: PAN → business type → documents; not registered: owner ID → documents) |
| ONB-4 | Layout: a compact header card (brand, KYC path, progress) with a horizontal phase stepper and the steps of the open phase; the screen below takes the full width. **No left sidebar** |
| ONB-5 | Every step the vendor has passed can be reopened and edited by the admin (vendor locks don't apply to the admin) |
| ONB-6 | PAN, GST and bank checks are **paid** provider calls: they run only on an explicit "Verify" press, and a verified result is then saved |
| ONB-7 | Documents and bank can be skipped; showcase & features can be skipped |
| ONB-8 | Partnership deed: the admin can only record an **offline** deed (signed copy + note); the vendor confirms it on next login |
| ONB-9 | Plan step: billing address first, then grant a plan |
| ONB-10 | **Outlets step:** list all the brand's outlets (including ones added earlier). Each outlet has three steps: WhatsApp number verified (6-digit code) → address with map location → opening hours. Address and hours unlock after the number is verified. Fix a wrong number or remove a never-verified outlet |
| ONB-11 | **Review & submit:** brand summary, profile strength, system checks, every step with an Edit link. After submit the brand moves to Brand Waiting |
| ONB-12 | A `422 ONBOARDING_STEP_INCOMPLETE` lists what is missing; on the outlets step it is shown on the affected outlet card |

### 5.6 Vouchers

| ID | Requirement |
|---|---|
| VO-1 | Lists by lifecycle: Draft, Waiting (submitted for review), Live, Expired, Dummy |
| VO-2 | **Review:** approve or reject a submitted voucher version; reject needs a reason |
| VO-3 | **Banner approval:** review voucher banners separately from the voucher |
| VO-4 | Voucher detail: images, info (category / subcategory), outlets it applies to, claims and revenue, approval history |
| VO-5 | Selling gate (enforced by the server): a brand can submit / publish vouchers only when it is approved, has a verified bank and a live plan |

### 5.7 Plans and subscriptions

| ID | Requirement |
|---|---|
| PL-1 | **Vendor plans:** create and edit plans, their price, duration, image and entitlements (outlet / franchise slots, showcase albums, voucher limits…) |
| PL-2 | **Feature master:** a reusable list of plan features, reorderable; plan comparison view |
| PL-3 | Apply changed plan terms to existing subscribers, with a preview first |
| PL-4 | **Subscriptions:** list and detail; grant a plan without payment (needs the brand's billing address), cancel, resync |
| PL-5 | Separate list for dummy subscriptions |

### 5.8 Customers

| ID | Requirement |
|---|---|
| CU-1 | Customer directory with filters and stats; a customer's full record |
| CU-2 | **Account deletions:** see and act on customer account-deletion requests |

### 5.9 Marketing

| ID | Requirement |
|---|---|
| MK-1 | **Banners:** home banners in the customer app (create, edit, start / end date, delete, detail) |
| MK-2 | **Promotional ticker:** the scrolling strip in the app, with a live preview |
| MK-3 | **Promo codes:** create and manage campaigns; usage report |

### 5.10 Notifications

| ID | Requirement |
|---|---|
| NO-1 | Compose a broadcast: pick the audience by role, the channels (push, in-app; email goes automatically to people with an email when email delivery is on), preview, send now or schedule |
| NO-2 | Templates, scheduled sends, history and delivery stats |
| NO-3 | The admin's own push setup (Firebase). Admin-side notification rules live in Settings → Admin → Notifications |

### 5.11 Settings

| ID | Requirement |
|---|---|
| SET-1 | One settings page with sections: Appearance; Vendor (voucher, showcase, subscription, notification); Customer (convenience fee, tax, promo code, claim, notifications, invoice, settlement, refund, chargeback, search); Security (OTP, account deletion); Admin (notifications); App (version & update, support & features); Storage (provider & limits, allowed file types, upload & delivery); Legal (terms & conditions, privacy policy) |
| SET-2 | Appearance: light / dark mode and a theme colour; the whole panel follows the chosen colour |
| SET-3 | Notable switches: `customer.brandVisibility.requireShowcase` (brand hidden from customers without a showcase album), `customer.claim.requireVendorVerifiedBank`, `vendor.kyc.reuseDays`, `vendor.onboarding.maxKycDocuments`, `vendor.brandFeatures.maxActive` |

## 6. Key flows

### 6.1 Brand: sign-up to live

1. Vendor signs up in the vendor panel, **or** an admin creates the brand on the owner's WhatsApp number.
2. Onboarding (by the vendor, the admin, or both): basic details → business verification → payout → deed & plan → brand page & outlets.
3. Submit → system checks run (advice only) → brand appears in **Brand Waiting** as Under review.
4. Admin reviews documents and history, then **approves** or **rejects** (reason). A rejected vendor can fix and resubmit (chip: Resubmitted).
5. Approved → **Live Brands**. The admin may grant the **verified badge** when the brand qualifies.
6. Later, an approval can be **revoked** (reason); the badge is removed automatically and the brand is hidden from customers.

### 6.2 Voucher: draft to live

Vendor drafts a voucher → submits a version → **Voucher Waiting** → admin approves or rejects (reason) → published → **Live** → **Expired** at the end date. Banners go through **Banner Approval** separately.

### 6.3 Refund

Customer asks for a refund → vendor approves / rejects / times out → admin approves, rejects or overrides (reason) → admin pays it (for a manual bank refund: get the customer's bank details, pay, then confirm the payout).

### 6.4 Settlement

Settlement is built for a brand → admin approves → pays (NEFT) → confirms with the UTR. Failed payouts can be retried; a settlement can be held, cancelled, abandoned, rebuilt or reversed.

## 7. Business rules (apply across modules)

| Rule | Detail |
|---|---|
| `brandId` | The admin has no brand of their own, so every brand-scoped call carries `brandId` (query param for onboarding APIs, body for older APIs) |
| Error handling | The panel branches on `details.code` from the server, never on the message text |
| System verdict | The system score (GST / PAN / bank checks, name matches) is **advice only**. Only an admin rejects or revokes |
| Soft delete | Nothing is hard-deleted |
| Audit trail | Brand reviews, plan grants / cancels and voucher reviews write history rows; brand history shows on the brand's timeline |
| Customer visibility | A brand is shown to customers only with an outlet that has a location (and, when the setting is on, a showcase album) |
| Outlet verification | An outlet's address, hours and vouchers need its WhatsApp number verified first (`409 OUTLET_NOT_VERIFIED`) |
| Paid checks | KYC verification is a paid call; the same number within `vendor.kyc.reuseDays` reuses the earlier result for free |

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| Stack | React 19, Vite 8, Tailwind CSS 4, TanStack Query 5, Zustand, React Router 7, Recharts, axios, Firebase (push) |
| Data | Reads are cached with TanStack Query; a write refreshes the related lists automatically (shared interceptor) |
| Errors | Every API error becomes an `ApiError` with `status`, `code` and `details` (`src/lib/apiError.js`) |
| Security | Bearer JWT; `401` ends the session; KYC files are served through short-lived signed links |
| UI | Compact, professional look; frosted cards; light and dark mode; colours follow the selected theme (use theme classes, not fixed hex colours) |
| Text | The app capitalises every word by default; pages with sentences turn this off (`normal-case`) |
| Responsive | Works down to phone width with no sideways page scroll |
| Accessibility | Labelled inputs, visible keyboard focus, buttons for every action |
| Performance | Lists page on the server; detail data loads per tab |

## 9. Integrations

| System | Used for |
|---|---|
| Trydood 2.0 API | Everything (REST, JSON) |
| Razorpay | Customer payments for claims, vendor plan checkout, webhooks, disputes |
| CGPey | PAN, GST and bank (₹1 penny drop) verification |
| WhatsApp OTP | Vendor and outlet manager login codes |
| Firebase Cloud Messaging | Push notifications to admins and app users |
| AWS S3 | Uploads (banners, logos, showcase); a private bucket for KYC documents |

## 10. Release status (as of 2026-11-23)

| Item | Status |
|---|---|
| Brand onboarding v2 backend | Live on **stage** since 2026-11-19; **not on production** yet |
| Admin onboarding v2 work (`feature/new-onboarding`) | Lists by onboarding stage with paging and counts; review gating on Brand Waiting; "Verified" means the badge only; old `/brand/add` flow removed; wizard aligned to the stage contract and redesigned (compact header, horizontal phases, outlet step with full outlet list) |
| Customer visibility rule (outlet + album) | On develop / stage per the API doc |

## 11. Known issues and gaps

| # | Issue | Effect |
|---|---|---|
| K1 | `GET /subBrands/get-all` ignores the admin's `brandId` filter and returns every brand's outlets | The panel fetches all pages and filters on the client; slower as outlets grow |
| K2 | Logout doesn't invalidate the token on the server | A copied token works until it expires |
| K3 | No screens yet for webhook events / replay, disputes (chargebacks), forfeited-plan compensation, and signup attempts, although the API has them | Ops must use the API (Postman) for these |
| K4 | No Google Maps / place search in the admin panel | Admins paste map coordinates for outlet and billing addresses |
| K5 | The API doc lists S3 CORS for the staging admin domain as an infra item | Some uploads can fail on stage until it is fixed |
| K6 | Single admin role, no permissions | Every admin can do every action, including money actions |

## 12. Success metrics

Proposed measures; targets to be agreed by the product owner.

| Metric | Why |
|---|---|
| Time from brand submit to decision (approve / reject) | Speed of the verification team |
| Brand Waiting and Voucher Waiting backlog size | Queue health |
| Share of admin-started onboardings that reach submit | Value of onboarding on the vendor's behalf |
| Refund decision time and settlement payout success rate | Money operations quality |
| Brands live with the verified badge | Trust signal on the customer app |

## 13. Open questions

1. Do we need admin sub-roles (e.g. finance-only, marketing-only) and an audit view per admin?
2. Should the missing ops screens (K3) be built, and in what order?
3. When does onboarding v2 go to production, and what is the migration plan for brands mid-onboarding?
4. Should the admin panel get place search / geocoding for addresses (K4)?
5. Do the hidden pages (customer plans, reports, feature campaign, FAQ, accessibility, coupon) come back, or should they be removed?
