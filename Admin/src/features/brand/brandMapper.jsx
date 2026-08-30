/* -------------------------------------------------------------------------
 * brandMapper.js
 * Converts raw backend brand objects (list endpoint OR detail endpoint)
 * into the flat shape the existing Brand.jsx / BrandDetails.jsx /
 * BrandShared.jsx components already expect (see data/BrandData.js /
 * the old INITIAL_BRANDS mock). Nothing in the UI layer changes — only
 * this mapping layer.
 *
 * Some fields (listings, settlements, reviews) aren't returned by any
 * endpoint we've been given yet, so they default to []. Wire in the real
 * endpoints there once available.
 * ---------------------------------------------------------------------- */

function formatCurrency(amount) {
  if (amount == null) return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function formatDurationTerm(days) {
  if (!days) return '—';
  if (days >= 360) return `${Math.round(days / 365)} Year${days >= 730 ? 's' : ''}`;
  if (days >= 28) return `${Math.round(days / 30)} Month${days >= 60 ? 's' : ''}`;
  return `${days} Days`;
}

function formatBusinessEntityType(type) {
  const map = {
    PRIVATE_LIMITED: 'Private Limited Company',
    PARTNERSHIP: 'Partnership',
    SOLE_PROPRIETORSHIP: 'Sole Proprietorship',
    LLP: 'Limited Liability Partnership',
  };
  return map[type] || type || '—';
}

function formatBusinessRegistrationStatus(status) {
  if (status === 'REGISTERED') return 'GST Registered';
  if (status === 'PENDING') return 'GST Pending';
  return status || '—';
}

function daysUntil(dateString) {
  if (!dateString) return null;
  const diffMs = new Date(dateString).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function formatDateTime(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const WORK_HOURS_DAYS = [
  ['monday', 'Mon'],
  ['tuesday', 'Tue'],
  ['wednesday', 'Wed'],
  ['thursday', 'Thu'],
  ['friday', 'Fri'],
  ['saturday', 'Sat'],
  ['sunday', 'Sun'],
];

function mapWorkHours(workHours) {
  if (!workHours) return null;
  return WORK_HOURS_DAYS.map(([key, label]) => ({
    day: label,
    isOpen: workHours[key]?.isOpen ?? false,
    hours: workHours[key]?.isOpen ? `${workHours[key].start} – ${workHours[key].end}` : 'Closed',
  }));
}

function mapOutletLocation(location) {
  if (!location) return null;
  return {
    addressLine1: location.addressLine1 || '—',
    addressLine2: location.addressLine2 || '—',
    addressType: location.addressType || '—',
    city: location.city || '—',
    district: location.district || '—',
    state: location.state || '—',
    country: location.country || '—',
    zipcode: location.zipcode || '—',
    formattedAddress: location.formattedAddress || '—',
    isDefault: Boolean(location.isDefault),
    isBrandAddress: Boolean(location.isBrandAddress),
    isSubBrandAddress: Boolean(location.isSubBrandAddress),
  };
}

function mapOutletUser(user) {
  if (!user) return null;
  return {
    uniqueId: user.uniqueId || '—',
    role: user.role || '—',
    loginType: user.loginType || '—',
    whatsappNumber: user.whatsappNumber || '—',
    referralCode: user.referralCode || '—',
    walletBalance: user.walletBalance ?? 0,
    tCoinsBalance: user.tCoinsBalance ?? 0,
    isEmailVerified: Boolean(user.isEmailVerified),
    isMobileVerified: Boolean(user.isMobileVerified),
    isOnBoardingCompleted: Boolean(user.isOnBoardingCompleted),
  };
}

function mapOutlet(raw, outlet) {
  if (!outlet) return null;
  return {
    name: `${raw.brandName} - ${outlet.location?.city || 'Outlet'}`,
    address: outlet.location?.formattedAddress || '—',
    landmark: outlet.location?.addressLine2 && outlet.location.addressLine2 !== outlet.location.addressLine1 ? outlet.location.addressLine2 : '—',
    uniqueId: outlet.uniqueId || '—',
    storeId: outlet.storeId || '—',
    outletType: outlet.outletType || '—',
    whatsappNumber: outlet.whatsappNumber || '—',
    status: outlet.isActive ? 'Active' : 'Inactive',
    isDeleted: Boolean(outlet.isDeleted),
    joinedDate: outlet.joinedDate ? formatDateTime(outlet.joinedDate) : '—',
    geo: outlet.geo?.coordinates ? `${outlet.geo.coordinates[1]}, ${outlet.geo.coordinates[0]}` : '—',
    location: mapOutletLocation(outlet.location),
    user: mapOutletUser(outlet.user),
    workHours: mapWorkHours(outlet.workHours),
  };
}

/* Full raw subscription record — powers the "Subscription Details" card on
   the Subscription tab (separate from the curated planPrice/subscriptionPlan
   fields other tabs already rely on). */
function mapSubscriptionDetail(subscribed) {
  if (!subscribed) return null;
  return {
    id: subscribed._id,
    transactionId: subscribed.transactionId || '—',
    subscriptionId: subscribed.subscriptionId || '—',
    durationInDays: subscribed.durationInDays ?? '—',
    startDateDisplay: formatDateTime(subscribed.startDate),
    endDateDisplay: formatDateTime(subscribed.endDate),
    price: subscribed.price ?? 0,
    discount: subscribed.discount ?? 0,
    paidAmount: subscribed.paidAmount ?? 0,
    dueAmount: subscribed.dueAmount ?? 0,
    status: subscribed.status || '—',
    source: subscribed.source || '—',
    isFreeGrant: Boolean(subscribed.isFreeGrant),
    activatedAtDisplay: formatDateTime(subscribed.activatedAt),
    numberOfUpgrade: subscribed.numberOfUpgrade ?? 0,
    forfeitedDays: subscribed.forfeitedDays ?? 0,
    forfeitedValue: subscribed.forfeitedValue ?? 0,
    remindersSentCount: subscribed.remindersSent?.length ?? 0,
    isExpired: Boolean(subscribed.isExpired),
    isUpgraded: Boolean(subscribed.isUpgraded),
    isActive: Boolean(subscribed.isActive),
    isDeleted: Boolean(subscribed.isDeleted),
    createdAtDisplay: formatDateTime(subscribed.createdAt),
    updatedAtDisplay: formatDateTime(subscribed.updatedAt),
    pricing: subscribed.pricing || null,
  };
}

/* Full raw system-verification record — powers the dedicated "System
   Verification" tab. */
function mapSystemVerify(sv) {
  if (!sv) return null;
  return {
    attemptNumber: sv.attemptNumber ?? '—',
    score: sv.score ?? null,
    status: sv.status || '—',
    flags: sv.flags || {},
    nameMatch: sv.nameMatch || null,
    bankNameMatch: sv.bankNameMatch || null,
    entityMatch: sv.entityMatch || null,
    remarks: sv.remarks || [],
    verifiedBy: sv.verifiedBy || '—',
    verifiedAtDisplay: formatDateTime(sv.verifiedAt),
    isRevoked: Boolean(sv.isRevoked),
    isRejected: Boolean(sv.isRejected),
    isReviewed: Boolean(sv.isReviewed),
    isAdminApproved: Boolean(sv.isAdminApproved),
    isSuperseded: Boolean(sv.isSuperseded),
    createdAtDisplay: formatDateTime(sv.createdAt),
    updatedAtDisplay: formatDateTime(sv.updatedAt),
    adminApprovedAtDisplay: sv.adminApprovedAt ? formatDateTime(sv.adminApprovedAt) : null,
    reviewedAtDisplay: sv.reviewedAt ? formatDateTime(sv.reviewedAt) : null,
    rejectedAtDisplay: sv.rejectedAt ? formatDateTime(sv.rejectedAt) : null,
    rejectionReason: sv.rejectionReason || null,
    revokedAtDisplay: sv.revokedAt ? formatDateTime(sv.revokedAt) : null,
    revokeReason: sv.revokeReason || null,
  };
}

function computeRemainderPercentFromDates(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (end <= start) return 0;
  const pct = ((end - now) / (end - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/* Single source of truth for the brand-level status pill, built from
   whichever fields are present on either the list or detail payload. */
function deriveBrandStatus(raw) {
  if (raw.isRejected || raw.status === 'REJECTED') return 'Rejected';
  if (raw.status === 'PENDING' || raw.isApproved === false) return 'Pending';

  const endsInDays =
    raw.subscription?.endsInDays ??
    (raw.subscribed?.endDate ? daysUntil(raw.subscribed.endDate) : null);
  if (endsInDays != null && endsInDays <= 0) return 'Expired';

  if (raw.isAccountActive === false || raw.isActive === false) return 'Deactive';
  return 'Active';
}

/* -------------------------------------------------------------------------
 * List item mapper — GET /brands/admin/get-all → data.data[i]
 * ---------------------------------------------------------------------- */
export function mapBrandListItem(raw) {
  const outletsUsed = raw?.usage?.franchises?.used ?? raw?.outletCount ?? 0;
  const outletsLimit = raw?.usage?.franchises?.isUnlimited
    ? '∞'
    : raw?.usage?.franchises?.limit ?? outletsUsed;

  const status = deriveBrandStatus(raw);

  return {
    id: raw._id,
    brandId: raw.uniqueId,
    brandName: raw.brandName,
    tagline: raw.description || '',
    emoji: raw.brandName?.charAt(0)?.toUpperCase() || '?',
    logo: raw.logo || null,
    followers: raw.followersCount ?? 0,
    // list payload doesn't include a resolved address yet — fill in once
    // the backend adds it, or fetch brand details for the exact location.
    location: raw?.location?.city
      ? `${raw.location.city}, ${raw.location.state || ''}`.replace(/, $/, '')
      : '—',
    category: raw.category?.name || raw.subCategory?.name || '—',
    liveSince: raw.joinedDate ? new Date(raw.joinedDate).getFullYear().toString() : '—',
    active: status === 'Active',
    status,
    rejectionReason: raw.rejectionReason || '',

    subBrandCount: `${outletsUsed}/${outletsLimit}`,
    outlets: [], // not returned by the list endpoint — see mapBrandDetail

    contactPhone: raw.whatsappNumber
      ? `+91 ${raw.whatsappNumber}`
      : raw.vendor?.whatsappNumber
      ? `+91 ${raw.vendor.whatsappNumber}`
      : '—',
    contactEmail: raw.email || '—',

    planPrice: raw.subscription?.paidAmount != null ? formatCurrency(raw.subscription.paidAmount) : '—',
    planType: raw.subscription?.planType || 'Annual',
    subscriptionPlan: raw.subscription?.planName || '—',
    subscriptionTerm: raw.subscription?.durationInDays
      ? formatDurationTerm(raw.subscription.durationInDays)
      : '—',
    expiredInDays: raw.subscription?.endsInDays ?? 0,
    remainderPercent: raw.subscription?.startDate
      ? computeRemainderPercentFromDates(raw.subscription.startDate, raw.subscription.endDate)
      : 0,

    ownerName: raw.legalBusinessName || raw.brandName,
    // the list endpoint only exposes onboarding flags, not the actual
    // GST/PAN numbers — fetch brand details for those.
    gstNumber: '—',
    gstVerified: raw?.onboarding?.hasGst ?? false,
    panNumber: '—',
    panVerified: raw?.onboarding?.hasPan ?? false,
    bankVerified: raw?.onboarding?.hasBank ?? false,
    bankName: '—',
    accountHolder: raw.legalBusinessName || '—',

    about: raw.description || '',
    website: raw.website || '—',
    tags: raw.tags || [],
    shortName: raw.brandName,
    businessType: formatBusinessEntityType(raw.businessEntityType),
    businessStatus: formatBusinessRegistrationStatus(raw.businessRegistrationStatus),
    merchantToken: raw.merchantId || '—',
    ambiencePhotos: raw.ambiencePhotos || [],
    ambienceVideo: raw.ambienceVideo || null,

    // no endpoint for these yet
    listings: [],
    settlements: [],
    reviews: [],
    invoices: [],

    isTopBrand: raw.isTopBrand ?? false,
    topOrder: raw.topOrder ?? 0,
  };
}

/* -------------------------------------------------------------------------
 * Detail mapper — GET /brands/get?brandId=... → data
 * ---------------------------------------------------------------------- */
export function mapBrandDetail(raw) {
  const outlet = raw.firstSubBrand;
  const subscribed = raw.subscribed;
  const status = deriveBrandStatus(raw);
  const mappedOutlet = mapOutlet(raw, outlet);

  return {
    id: raw._id,
    brandId: raw.uniqueId,
    brandName: raw.brandName,
    tagline: raw.description || '',
    emoji: raw.brandName?.charAt(0)?.toUpperCase() || '?',
    logo: raw.logo || null,
    followers: raw.user?.followerCount ?? 0,
    location: outlet?.location?.city
      ? `${outlet.location.city}, ${outlet.location.state || ''}`.replace(/, $/, '')
      : '—',
    category: raw.category?.name || raw.subCategory?.name || '—',
    liveSince: raw.joinedDate ? new Date(raw.joinedDate).getFullYear().toString() : '—',
    active: raw.isActive ?? status === 'Active',
    status,
    rejectionReason: raw.rejectionReason || '',

    subBrandCount: outlet ? '1/1' : '0/0',
    outlets: mappedOutlet ? [mappedOutlet] : [],

    contactPhone: raw.user?.whatsappNumber ? `+91 ${raw.user.whatsappNumber}` : '—',
    contactEmail: raw.email || '—',

    planPrice: subscribed?.price != null ? formatCurrency(subscribed.price) : '—',
    planType: subscribed?.durationInDays === 365 ? 'Annual' : 'Custom',
    // plan name isn't populated on this endpoint yet (only subscriptionId) —
    // swap this for raw.subscribed?.plan?.name once the backend populates it.
    subscriptionPlan: raw.subscribed?.plan?.name || '—',
    subscriptionTerm: subscribed?.durationInDays ? formatDurationTerm(subscribed.durationInDays) : '—',
    expiredInDays: subscribed?.endDate ? daysUntil(subscribed.endDate) : 0,
    remainderPercent: computeRemainderPercentFromDates(subscribed?.startDate, subscribed?.endDate),

    ownerName: raw.pan?.fullName || raw.legalBusinessName || raw.brandName,
    gstNumber: raw.gst?.gstNumber || '—',
    gstVerified: raw.gst?.isVerified ?? false,
    panNumber: raw.pan?.pan || '—',
    panVerified: raw.pan?.isVerified ?? false,
    bankVerified: raw.bank?.isVerified ?? false,
    bankName: raw.bank?.bankName || '—',
    accountHolder: raw.bank?.accountHolderName || '—',

    // Full PAN record (Account Details tab)
    panType: raw.pan?.panType || '—',
    panFullName: raw.pan?.fullName || '—',
    panCountry: raw.pan?.addressDetails?.country || '—',
    panVerificationMessage: raw.pan?.verificationMessage || '—',
    panVerificationProvider: raw.pan?.verificationProvider || '—',
    panVerifiedAtDisplay: raw.pan?.verifiedAt ? formatDateTime(raw.pan.verifiedAt) : '—',

    // Full GST record (Account Details tab)
    gstLegalName: raw.gst?.legalName || '—',
    gstTradeName: raw.gst?.tradeName || '—',
    gstConstitution: raw.gst?.constitutionOfBusiness || '—',
    gstTaxpayerType: raw.gst?.taxpayerType || '—',
    gstRegistrationDate: raw.gst?.registrationDate || null,
    gstRegistrationStatus: raw.gst?.registrationStatus || '—',
    gstNatureOfBusiness: raw.gst?.natureOfBusiness || [],
    gstStateJurisdiction: raw.gst?.stateJurisdiction || '—',
    gstAddress: raw.gst?.address?.location || '—',
    gstVerificationMessage: raw.gst?.verificationMessage || '—',
    gstVerificationProvider: raw.gst?.verificationProvider || '—',
    gstVerifiedAtDisplay: raw.gst?.verifiedAt ? formatDateTime(raw.gst.verifiedAt) : '—',

    // Full Bank record (Account Details tab)
    bankBranch: raw.bank?.branchName || '—',
    maskedAccountNumber: raw.bank?.maskedAccountNumber || '—',
    ifscCode: raw.bank?.ifscCode || '—',
    accountType: raw.bank?.accountType || '—',
    bankAddress: raw.bank?.bankAddress?.addressLine1
      ? `${raw.bank.bankAddress.addressLine1}, ${raw.bank.bankAddress.city}, ${raw.bank.bankAddress.state} ${raw.bank.bankAddress.pinCode}`
      : '—',
    bankPaymentMode: raw.bank?.paymentMode || '—',
    bankRecommendedAction: raw.bank?.recommendedAction || '—',
    bankVerificationMessage: raw.bank?.verificationMessage || '—',
    bankVerificationProvider: raw.bank?.verificationProvider || '—',
    bankVerifiedAtDisplay: raw.bank?.verifiedAt ? formatDateTime(raw.bank.verifiedAt) : '—',

    // Dedicated "System Verification" tab
    systemVerify: mapSystemVerify(raw.systemVerify),

    // Dedicated "Subscription Details" card on the Subscription tab
    subscriptionDetail: mapSubscriptionDetail(subscribed),

    about: raw.description || '',
    website: raw.website || '—',
    tags: raw.tags || [],
    shortName: raw.brandName,
    businessType: formatBusinessEntityType(raw.businessEntityType),
    businessStatus: formatBusinessRegistrationStatus(raw.businessRegistrationStatus),
    merchantToken: raw.merchantId || '—',
    ambiencePhotos: raw.ambiencePhotos || [],
    ambienceVideo: raw.ambienceVideo || null,

    listings: [],
    settlements: [],
    reviews: [],
    invoices: [],

    isTopBrand: raw.isTopBrand ?? false,
    topOrder: raw.topOrder ?? 0,
  };
}