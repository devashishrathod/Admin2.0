import axios from 'axios';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{TryDood2.0BaseUrl}}
// Set VITE_API_BASE_URL in your .env file, e.g.
// VITE_API_BASE_URL=https://api.trydood.com/api/v1
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach token automatically if present (useful after OTP verify).
// Token lives in the Zustand auth store (persisted under 'trydood-auth'),
// so we read it lazily here to avoid a circular import at module-load time.
api.interceptors.request.use(async (config) => {
    const { useAuthStore } = await import('../store/authStore');
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Normalize error responses so callers get a consistent shape
function handleError(error) {
    const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Something went wrong. Please try again.';
    throw new Error(message);
}

// ── Login with Email ────────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/auth/login-with-email
// body: { email, role }
// response: { success, message, data: { Status, Details } }
// `data.Details` is the sessionId required later by verify-otp-email.
export async function loginWithEmail({ email, role = 'ADMIN' }) {
    try {
        const { data } = await api.post('/auth/login-with-email', {
            email,
            role,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Login with Mobile ───────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/auth/login-with-mobile
// body: { mobile, role }
// response: { success, message, data: { Status, Details } }
// `data.Details` is the sessionId required later by verify-otp-mobile.
export async function loginWithMobile({ mobile, role = 'ADMIN' }) {
    try {
        const { data } = await api.post('/auth/login-with-mobile', {
            mobile,
            role,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Send OTP (auto-detects email vs mobile) ─────────────────
// Convenience wrapper so LoginPage doesn't need to branch itself.
// Returns the raw API response — caller (the store) pulls
// `data.Details` out as the sessionId.
export async function sendOtp({ value, type, role = 'ADMIN' }) {
    if (type === 'email') {
        return loginWithEmail({ email: value, role });
    }
    if (type === 'phone') {
        return loginWithMobile({ mobile: value, role });
    }
    throw new Error('Invalid email or mobile number.');
}

// ── Verify OTP ───────────────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/auth/verify-otp-email  (when type === 'email')
// POST {{TryDood2.0BaseUrl}}/auth/verify-otp-mobile (when type === 'phone')
// body: { email? | mobile?, sessionId, otp, role }
//
// IMPORTANT: `sessionId` comes from the `data.Details` field returned by
// loginWithEmail / loginWithMobile. It MUST be included here, otherwise
// the API responds with { success: false, message: "Session ID is required" }.
export async function verifyOtp({ value, type, sessionId, otp, role = 'ADMIN' }) {
    try {
        if (!sessionId) {
            throw new Error('Session expired. Please resend the OTP and try again.');
        }
        const endpoint = type === 'email' ? '/auth/verify-otp-email' : '/auth/verify-otp-mobile';
        const payload = {
            otp,
            sessionId,
            role,
            ...(type === 'email' ? { email: value } : { mobile: value }),
        };
        const { data } = await api.post(endpoint, payload);
        // Token/user persistence is handled by useAuthStore's verifyOtp action.
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Resend OTP ───────────────────────────────────────────────
// Reuses the same login endpoints, since resending is just
// triggering a fresh OTP send for the same identifier.
// This also returns a NEW sessionId — the store must overwrite the old one.
export async function resendOtp({ value, type, role = 'ADMIN' }) {
    return sendOtp({ value, type, role });
}

// ── Login or Sign Up with WhatsApp ──────────────────────────
// POST {{TryDood2.0BaseUrl}}/auth/loginOrSignUp-with-whatsapp
// body: { whatsappNumber, role }
// Confirmed role enum for this endpoint: CUSTOMER | VENDOR | SUB_VENDOR —
// ADMIN is NOT a documented value. Used here for the admin login flow at
// the user's explicit request; if the backend rejects role: "ADMIN",
// revert to loginWithEmail/loginWithMobile above (still intact, unused).
export async function loginOrSignUpWithWhatsapp({ whatsappNumber, role = 'ADMIN' }) {
    try {
        const { data } = await api.post('/auth/loginOrSignUp-with-whatsapp', {
            whatsappNumber,
            role,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Verify WhatsApp OTP ──────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/auth/verify-otp-whatsapp
// body: { otp, whatsappNumber, role, currentScreen? }
// No sessionId required (unlike verify-otp-email/verify-otp-mobile).
// response: { success, message, data: { user, token } }
export async function verifyOtpWhatsapp({ otp, whatsappNumber, role = 'ADMIN', currentScreen }) {
    try {
        const payload = { otp, whatsappNumber, role };
        if (currentScreen) payload.currentScreen = currentScreen;
        const { data } = await api.post('/auth/verify-otp-whatsapp', payload);
        return data;
    } catch (error) {
        handleError(error);
    }
}

export default {
    loginWithEmail,
    loginWithMobile,
    sendOtp,
    verifyOtp,
    resendOtp,
    loginOrSignUpWithWhatsapp,
    verifyOtpWhatsapp,
};