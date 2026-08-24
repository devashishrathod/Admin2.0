import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginWithEmail, loginWithMobile, verifyOtp as verifyOtpApi, resendOtp as resendOtpApi } from '../services/authApi';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

function detectInputType(val) {
    const v = val.trim().replace(/\s/g, '');
    if (EMAIL_RE.test(v)) return 'email';
    if (PHONE_RE.test(v)) return 'phone';
    return null;
}

function maskValue(val, type) {
    if (type === 'email') {
        return val.replace(/(.{2})(.*)(@)/, (m, a, b, c) => a + '*'.repeat(Math.max(2, b.length)) + c);
    }
    return val.slice(0, 3) + '****' + val.slice(-3);
}

// Mirrors the access token into its own plain localStorage entry, outside
// the zustand-persisted JSON blob — makes it directly visible/inspectable
// in DevTools → Application → Local Storage, instead of buried inside the
// 'trydood-auth' state object.
const TOKEN_STORAGE_KEY = 'trydood-token';
function syncTokenToStorage(token) {
    if (typeof window === 'undefined') return;
    if (token) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
}

export const useAuthStore = create(
    persist(
        (set, get) => ({
            // ── Identity input state ──────────────────────────
            value: '',
            inputType: null,     // 'email' | 'phone' | null
            maskedValue: '',
            sessionId: null,     // required by verify-otp-email / verify-otp-mobile

            // ── Flow state ─────────────────────────────────────
            modalOpen: false,
            sendingOtp: false,
            verifyingOtp: false,
            resendingOtp: false,
            error: '',

            // ── Session state ──────────────────────────────────
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,

            // ── Actions ─────────────────────────────────────────
            setValue: (val) => set({
                value: val,
                inputType: detectInputType(val),
                error: '',
            }),

            sendOtp: async (role = 'ADMIN') => {
                const { value, inputType } = get();
                if (!inputType) return { success: false };

                set({ sendingOtp: true, error: '' });
                try {
                    const res =
                        inputType === 'email'
                            ? await loginWithEmail({ email: value.trim(), role })
                            : await loginWithMobile({ mobile: value.trim(), role });

                    const sessionId = res?.data?.Details ?? null;

                    set({
                        maskedValue: maskValue(value.trim(), inputType),
                        sessionId,
                        modalOpen: true,
                        sendingOtp: false,
                    });
                    return { success: true };
                } catch (err) {
                    set({ error: err.message, sendingOtp: false });
                    return { success: false, error: err.message };
                }
            },

            verifyOtp: async (otp, role = 'ADMIN') => {
                const { value, inputType, sessionId } = get();
                set({ verifyingOtp: true, error: '' });
                try {
                    const res = await verifyOtpApi({
                        value: value.trim(),
                        type: inputType,
                        sessionId,
                        otp,
                        role,
                    });
                    // API response shape: { success, message, data: { user, token } }
                    const payload = res?.data ?? {};
                    set({
                        user: payload.user ?? null,
                        accessToken: payload.token ?? null,
                        refreshToken: payload.refreshToken ?? null,
                        isAuthenticated: true,
                        verifyingOtp: false,
                    });
                    syncTokenToStorage(payload.token ?? null);
                    return { success: true, data: res };
                } catch (err) {
                    set({ error: err.message, verifyingOtp: false });
                    return { success: false, error: err.message };
                }
            },

            resendOtp: async (role = 'ADMIN') => {
                const { value, inputType } = get();
                set({ resendingOtp: true, error: '' });
                try {
                    const res = await resendOtpApi({ value: value.trim(), type: inputType, role });
                    const sessionId = res?.data?.Details ?? null;
                    set({ sessionId, resendingOtp: false });
                    return { success: true };
                } catch (err) {
                    set({ error: err.message, resendingOtp: false });
                    return { success: false, error: err.message };
                }
            },

            closeModal: () => set({ modalOpen: false }),
            clearError: () => set({ error: '' }),

            reset: () => set({
                value: '',
                inputType: null,
                maskedValue: '',
                sessionId: null,
                modalOpen: false,
                sendingOtp: false,
                verifyingOtp: false,
                resendingOtp: false,
                error: '',
            }),

            logout: () => {
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    value: '',
                    inputType: null,
                    maskedValue: '',
                    sessionId: null,
                    modalOpen: false,
                });
                syncTokenToStorage(null);
            },
        }),
        {
            name: 'trydood-auth', // localStorage key
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
            // Existing sessions (persisted before this key existed) get the
            // standalone token entry synced on the very next load too.
            onRehydrateStorage: () => (state) => {
                if (state?.accessToken) syncTokenToStorage(state.accessToken);
            },
        }
    )
);