import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys, queryClient } from "../../../lib/query";
import { useAuthStore } from "../../auth/store/authStore";
import { getMyProfile } from "../services/ProfileApi";

/* The signed-in admin's profile (GET /users/get), cached. Every successful
 * read is merged into the auth store's `user`, so the header and anything
 * else showing the name / email stay in step with the server.
 *
 * PUT /users/update refreshes ["users"] via the shared interceptor; the
 * /auth/* verify and password calls don't (their URL resource is "auth"),
 * so callers use refreshMyProfile() after those. */
export function useMyProfile(options = {}) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const query = useQuery({
    queryKey: queryKeys.users.detail("me"),
    queryFn: getMyProfile,
    select: (res) => res?.data ?? null,
    ...options,
  });

  const profile = query.data;
  useEffect(() => {
    if (!profile) return;
    updateUser({
      name: profile.name,
      email: profile.email,
      role: profile.role,
      whatsappNumber: profile.whatsappNumber,
      mobile: profile.mobile,
      uniqueId: profile.uniqueId,
      image: profileImageOf(profile),
    });
  }, [profile, updateUser]);

  return query;
}

export const refreshMyProfile = () => queryClient.invalidateQueries({ queryKey: queryKeys.users.detail("me") });

// The doc doesn't name the photo field — accept the usual spellings. Media
// on this backend is usually an object ({ url, kind, provider, … }), not a
// plain string, so unwrap it — an object in <img src> renders nothing.
const mediaUrl = (m) => {
  if (!m) return null;
  if (typeof m === "string") return m;
  return m.url || m.secure_url || m.secureUrl || m.location || null;
};
export const profileImageOf = (p) =>
  mediaUrl(p?.image) ||
  mediaUrl(p?.imageMedia) ||
  mediaUrl(p?.profileImage) ||
  mediaUrl(p?.profilePic) ||
  mediaUrl(p?.avatar) ||
  mediaUrl(p?.photo) ||
  null;
