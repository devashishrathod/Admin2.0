import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query";
import {
  getOnboardingStatus,
  getOnboardingBrand,
  getKycDocuments,
  getBillingAddress,
  getProfileStrength,
  getBrandFeatures,
  getOutlets,
} from "../services/onboardingApi";

/* Admin onboarding (v2) reads, cached. Returns the raw API response;
 * `options` goes to useQuery. Almost every onboarding endpoint lives under
 * /brands, so any save / continue / skip there refreshes these on its own
 * (shared interceptor). Features and outlets sit under /brandFeatures and
 * /subBrands. Named views (not detail/list) because other screens read the
 * same URLs through other services and params. */

/** Server-side progress: currentScreen, steps, kycPath, editMode, deed … */
export function useOnboardingStatus(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("onboarding-status", { brandId }),
    queryFn: () => getOnboardingStatus(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}

/** The full brand the onboarding screens prefill from. */
export function useOnboardingBrand(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("onboarding-brand", { brandId }),
    queryFn: () => getOnboardingBrand(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}

export function useKycDocuments(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("onboarding-documents", { brandId }),
    queryFn: () => getKycDocuments(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}

export function useBillingAddress(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("billing-address", { brandId }),
    queryFn: () => getBillingAddress(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}

export function useProfileStrength(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("profile-strength", { brandId }),
    queryFn: () => getProfileStrength(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}

export function useOnboardingFeatures(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brandFeatures.view("onboarding-features", { brandId }),
    queryFn: () => getBrandFeatures(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}

/** The brand's outlets (first 50). */
export function useOnboardingOutlets(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.subBrands.view("onboarding-outlets", { brandId }),
    queryFn: () => getOutlets(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}
