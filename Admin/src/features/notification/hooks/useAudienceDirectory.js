import { useMemo } from "react";
import { useCustomers } from "../../customer/queries/customerQueries";
import { useBrands } from "../../brand/BrandContext";
import { useAllOutlets } from "../queries/notificationQueries";
import { isNotFoundMessage } from "../../../utils/helpers";
import { phoneKey } from "../utils/notificationUtils";

/* -------------------------------------------------------------------------
 * The people an admin can pick from, one row shape for all three groups:
 *   { id, name, sub, contact, email, phone, uniqueId, active, joinedAt, logo }
 * `id` is exactly what the matching broadcast `target` field takes
 * (customerIds / brandIds / subBrandIds).
 *
 *   customers — GET /customers/admin/get-all (same first-100 page and cache
 *               entry as the Customers screen)
 *   vendors   — BrandContext (the approved brands already loaded app-wide)
 *   outlets   — GET /subBrands/get-all, platform-wide
 * ---------------------------------------------------------------------- */

const CUSTOMER_PARAMS = { page: 1, limit: 100 };

const listOf = (res) => res?.data?.data ?? res?.data ?? [];
const totalOf = (res, rows) => res?.data?.total ?? rows.length;
// "No … found" from a list endpoint is an empty platform, not an error.
const errorOf = (error) => (error && !isNotFoundMessage(error.message) ? error.message : "");

function customerRow(raw) {
  const account = raw.account || {};
  const phone = phoneKey(raw.whatsappNumber || account.whatsappNumber);
  const email = raw.email || account.email || "";
  return {
    id: raw._id,
    name: raw.fullName || account.name || "Unnamed",
    sub: raw.uniqueId || "",
    contact: phone || email || "—",
    email,
    phone,
    uniqueId: raw.uniqueId || "",
    active: !(raw.isAccountActive === false || account.isActive === false),
    joinedAt: raw.createdAt || null,
    logo: null,
  };
}

function vendorRow(b) {
  return {
    id: b.id,
    name: b.brandName,
    sub: [b.category !== "—" ? b.category : null, b.brandId].filter(Boolean).join(" · "),
    contact: b.location !== "—" ? b.location : "—",
    email: "",
    phone: "",
    uniqueId: b.brandId || "",
    active: Boolean(b.active),
    joinedAt: b.joinedDate,
    logo: b.logo,
  };
}

function outletRow(raw, brandNames) {
  const phone = phoneKey(raw.whatsappNumber || raw.mobile);
  const brand = brandNames.get(String(raw.brandId?._id || raw.brandId)) || raw.brandId?.brandName;
  return {
    id: raw._id,
    name: [brand, raw.storeId].filter(Boolean).join(" · ") || raw.uniqueId || "Outlet",
    sub: [raw.outletType === "FRANCHISE" ? "Franchise" : "Outlet", raw.uniqueId].filter(Boolean).join(" · "),
    contact: phone || raw.email || "—",
    email: raw.email || "",
    phone,
    uniqueId: raw.uniqueId || "",
    active: raw.isActive !== false && raw.manager?.isActive !== false,
    joinedAt: raw.joinedDate || raw.createdAt || null,
    logo: null,
  };
}

export function useAudienceDirectory() {
  const { data: customersRes, isPending: customersLoading, error: customersError } = useCustomers(CUSTOMER_PARAMS);
  const { data: outletsRes, isPending: outletsLoading, error: outletsError } = useAllOutlets();
  const { brands, loading: brandsLoading, error: brandsError } = useBrands();

  return useMemo(() => {
    const customerRaw = listOf(customersRes);
    const outletRaw = listOf(outletsRes);
    const brandNames = new Map(brands.map((b) => [String(b.id), b.brandName]));
    const customers = Array.isArray(customerRaw) ? customerRaw.map(customerRow) : [];
    const outlets = Array.isArray(outletRaw) ? outletRaw.map((o) => outletRow(o, brandNames)) : [];
    const vendors = brands.map(vendorRow);
    return {
      customers: {
        rows: customers,
        total: totalOf(customersRes, customers),
        loading: customersLoading,
        error: errorOf(customersError),
      },
      vendors: { rows: vendors, total: vendors.length, loading: brandsLoading, error: brandsError ? String(brandsError) : "" },
      outlets: {
        rows: outlets,
        total: totalOf(outletsRes, outlets),
        loading: outletsLoading,
        error: errorOf(outletsError),
      },
    };
  }, [customersRes, customersLoading, customersError, outletsRes, outletsLoading, outletsError, brands, brandsLoading, brandsError]);
}
