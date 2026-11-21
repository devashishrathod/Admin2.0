import axios from 'axios';
import { attachSessionHandling } from '../../auth/session';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{base_url}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 401 (session expired) → log out and go to the login screen.
attachSessionHandling(api);

// Attach auth token automatically (same pattern as NotificationApi.js)
api.interceptors.request.use(async (config) => {
    const { useAuthStore } = await import('../../auth/store/authStore');
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Normalize error responses so callers get a consistent shape. A 429
// (OTP cooldown) carries `details.retryAfterSeconds` — kept on the error.
function handleError(error) {
    const data = error?.response?.data;
    const message =
        data?.message ||
        data?.error ||
        error?.message ||
        'Something went wrong. Please try again.';
    const err = new Error(message);
    err.status = error?.response?.status;
    err.retryAfterSeconds = data?.details?.retryAfterSeconds ?? data?.data?.retryAfterSeconds;
    throw err;
}

const call = async (fn) => {
    try {
        const { data } = await fn();
        return data;
    } catch (error) {
        handleError(error);
    }
};

/* -------------------------------------------------------------------------
 * Own profile.
 * GET {{base_url}}/users/get   (no userId → the signed-in admin)
 * response.data: { _id, name, role, email, username, whatsappNumber, mobile,
 *   uniqueId, passwordSetAt, isEmailVerified, isActive,
 *   createdAt, … }   (super_admin_panel_api_doc #13)
 * ---------------------------------------------------------------------- */
export const getMyProfile = () => call(() => api.get('/users/get'));

/* -------------------------------------------------------------------------
 * Avatar upload — presigned road (doc #111 / #112, purpose USER_AVATAR).
 *   1. POST /uploads/presign  { purpose, contentType, sizeBytes, fileName }
 *        → data: { uploadId, url, fields }
 *   2. POST <url> straight to S3 — `fields` first, `file` LAST → 204
 *   3. POST /uploads/confirm  { uploadId }
 * The returned uploadId goes to PUT /users/update as `uploadId`.
 * ---------------------------------------------------------------------- */
const AVATAR_PURPOSE = 'USER_AVATAR';

export async function uploadAvatar(file) {
    const presign = await call(() =>
        api.post('/uploads/presign', {
            purpose: AVATAR_PURPOSE,
            contentType: file.type,
            sizeBytes: file.size,
            fileName: file.name,
        })
    );
    const { uploadId, url, fields } = presign?.data ?? {};
    if (!uploadId || !url || !fields) throw new Error('The server did not return an upload link for the photo.');

    // Straight to S3 — no baseURL / Authorization header belongs on this.
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    form.append('file', file); // must be last
    // `no-cors`: if the bucket's CORS list lacks this panel's origin, S3 still
    // stores the file but the browser hides the reply and a normal fetch
    // throws (doc #111) — which used to stop us before /users/update. A
    // multipart POST is CORS-safelisted, so no-cors sends it fine; the reply
    // is opaque, and /uploads/confirm below is what proves the file landed.
    try {
        await fetch(url, { method: 'POST', body: form, mode: 'no-cors' });
    } catch {
        throw new Error("Couldn't reach storage to upload the photo. Check your connection and try again.");
    }

    try {
        await call(() => api.post('/uploads/confirm', { uploadId }));
    } catch (err) {
        err.message = `Photo didn't reach storage — ${err.message}`;
        throw err;
    }
    return uploadId;
}

// The file itself is the problem (too big / wrong type) or the session is
// gone — trying the other upload road won't help, so show it as-is.
const isFileOrAuthError = (err) => [401, 413, 422].includes(err?.status);

/* -------------------------------------------------------------------------
 * Update own profile.
 * PUT {{base_url}}/users/update   (no userId → the signed-in admin)
 * body (all optional): { fullName, email, dob } + photo
 * Photo: presigned road first (presign → S3 → confirm → `uploadId`, JSON).
 * Presign is OFF by default on the platform (503) and refused on Cloudinary
 * (409) — doc #111 — so when that road fails the photo goes the classic way:
 * multipart/form-data with the file in field `image` (doc #14).
 * mobile / whatsappNumber can NOT be changed here. (doc #14)
 * ---------------------------------------------------------------------- */
export async function updateMyProfile({ fullName, email, dob, image } = {}) {
    const fields = {};
    if (fullName !== undefined) fields.fullName = fullName;
    if (email !== undefined) fields.email = email;
    if (dob !== undefined) fields.dob = dob;

    if (!image) return call(() => api.put('/users/update', fields));

    let uploadId = null;
    try {
        uploadId = await uploadAvatar(image);
    } catch (err) {
        if (isFileOrAuthError(err)) throw err;
        // Presign off / not S3 / storage unreachable → multipart below.
    }

    if (uploadId) return call(() => api.put('/users/update', { ...fields, uploadId }));

    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    form.append('image', image);
    // Explicit multipart header: this instance defaults to application/json,
    // which makes axios turn a FormData body into JSON (and drop the file).
    // In the browser axios then strips it so the boundary is added.
    return call(() => api.put('/users/update', form, { headers: { 'Content-Type': 'multipart/form-data' } }));
}

/* -------------------------------------------------------------------------
 * Contact verification — one send + one verify per channel. Omit the
 * value to confirm what's already on the account; pass one to switch to it
 * (the account only changes once the code is verified). (doc #12a–12f)
 *
 *   Email:     POST /auth/email/send-verification   { email? }
 *              POST /auth/email/verify              { otp, email? }
 *     When switching, verify MUST carry the same `email` that was sent —
 *     with only { otp } the server looks for the code under the OLD address
 *     and answers 401 "Please resend OTP! OTP is expired or missing".
 *   Mobile:    POST /auth/mobile/send-verification  { mobile? }  → data.sessionId
 *              POST /auth/mobile/verify             { otp, sessionId, mobile? }
 * WhatsApp is the admin's sign-in number — it's shown read-only and never
 * changed from the profile, so there's no WhatsApp send/verify here.
 * ---------------------------------------------------------------------- */
export const sendEmailCode = ({ email } = {}) =>
    call(() => api.post('/auth/email/send-verification', email ? { email } : {}));
export const verifyEmailCode = ({ otp, email }) =>
    call(() => api.post('/auth/email/verify', email ? { otp, email } : { otp }));

export const sendMobileCode = ({ mobile } = {}) =>
    call(() => api.post('/auth/mobile/send-verification', mobile ? { mobile } : {}));
export const verifyMobileCode = ({ otp, sessionId, mobile }) =>
    call(() => api.post('/auth/mobile/verify', mobile ? { otp, sessionId, mobile } : { otp, sessionId }));

/* -------------------------------------------------------------------------
 * Sign out of every device.
 * POST {{base_url}}/auth/logout   body: { allDevices: true }
 * Kills every JWT issued before now — this one included. (doc #12)
 * ---------------------------------------------------------------------- */
export const logoutAllDevices = () => call(() => api.post('/auth/logout', { allDevices: true }));

export default {
    getMyProfile,
    uploadAvatar,
    updateMyProfile,
    sendEmailCode,
    verifyEmailCode,
    sendMobileCode,
    verifyMobileCode,
    logoutAllDevices,
};
