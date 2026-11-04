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
 *   uniqueId, referralCode, passwordSetAt, isEmailVerified, isActive,
 *   createdAt, … }   (super_admin_panel_api_doc #13)
 * ---------------------------------------------------------------------- */
export const getMyProfile = () => call(() => api.get('/users/get'));

/* -------------------------------------------------------------------------
 * Update own profile.
 * PUT {{base_url}}/users/update   (no userId → the signed-in admin)
 * body (all optional): { fullName, email, dob, image (file) }
 * With an image it goes as multipart/form-data, field name `image`.
 * mobile / whatsappNumber can NOT be changed here — see the verify flows.
 * (doc #14)
 * ---------------------------------------------------------------------- */
export function updateMyProfile({ fullName, email, dob, image } = {}) {
    const fields = {};
    if (fullName !== undefined) fields.fullName = fullName;
    if (email !== undefined) fields.email = email;
    if (dob !== undefined) fields.dob = dob;

    if (!image) return call(() => api.put('/users/update', fields));

    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    form.append('image', image);
    return call(() => api.put('/users/update', form, { headers: { 'Content-Type': 'multipart/form-data' } }));
}

/* -------------------------------------------------------------------------
 * Set / change password.
 * POST {{base_url}}/auth/set-password
 * body: { currentPassword?, newPassword }
 * currentPassword is only needed when the account already has one
 * (`passwordSetAt` on the profile). newPassword: 8–72 chars, upper + lower
 * + number. (doc #9)
 * ---------------------------------------------------------------------- */
export const setPassword = ({ currentPassword, newPassword }) =>
    call(() => api.post('/auth/set-password', currentPassword ? { currentPassword, newPassword } : { newPassword }));

/* -------------------------------------------------------------------------
 * Contact verification — one send + one verify per channel. Omit the
 * value to confirm what's already on the account; pass one to switch to it
 * (the account only changes once the code is verified). (doc #12a–12f)
 *
 *   Email:     POST /auth/email/send-verification   { email? }
 *              POST /auth/email/verify              { otp }
 *   Mobile:    POST /auth/mobile/send-verification  { mobile? }  → data.sessionId
 *              POST /auth/mobile/verify             { otp, sessionId, mobile? }
 *   WhatsApp:  POST /auth/whatsapp/send-verification { whatsappNumber? }
 *              POST /auth/whatsapp/verify            { otp, whatsappNumber? }
 *     Changing a verified WhatsApp number is a step-up: the first code goes
 *     to the CURRENT number (step CONFIRM_CURRENT), the second to the new one
 *     (CONFIRM_NEW → DONE). DONE with sessionsEnded: true signs out everywhere.
 * ---------------------------------------------------------------------- */
export const sendEmailCode = ({ email } = {}) =>
    call(() => api.post('/auth/email/send-verification', email ? { email } : {}));
export const verifyEmailCode = ({ otp }) => call(() => api.post('/auth/email/verify', { otp }));

export const sendMobileCode = ({ mobile } = {}) =>
    call(() => api.post('/auth/mobile/send-verification', mobile ? { mobile } : {}));
export const verifyMobileCode = ({ otp, sessionId, mobile }) =>
    call(() => api.post('/auth/mobile/verify', mobile ? { otp, sessionId, mobile } : { otp, sessionId }));

export const sendWhatsappCode = ({ whatsappNumber } = {}) =>
    call(() => api.post('/auth/whatsapp/send-verification', whatsappNumber ? { whatsappNumber } : {}));
export const verifyWhatsappCode = ({ otp, whatsappNumber }) =>
    call(() => api.post('/auth/whatsapp/verify', whatsappNumber ? { otp, whatsappNumber } : { otp }));

/* -------------------------------------------------------------------------
 * Sign out of every device.
 * POST {{base_url}}/auth/logout   body: { allDevices: true }
 * Kills every JWT issued before now — this one included. (doc #12)
 * ---------------------------------------------------------------------- */
export const logoutAllDevices = () => call(() => api.post('/auth/logout', { allDevices: true }));

export default {
    getMyProfile,
    updateMyProfile,
    setPassword,
    sendEmailCode,
    verifyEmailCode,
    sendMobileCode,
    verifyMobileCode,
    sendWhatsappCode,
    verifyWhatsappCode,
    logoutAllDevices,
};
