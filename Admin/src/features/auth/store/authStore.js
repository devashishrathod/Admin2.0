import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginOrSignUpWithWhatsapp, verifyOtpWhatsapp } from '../services/authApi';

// 10-digit Indian mobile number, same shape WhatsApp numbers take here.
const WHATSAPP_RE = /^[6-9]\d{9}$/;

function detectInputType(val) {
    const v = val.trim().replace(/\s/g, '');
    return WHATSAPP_RE.test(v) ? 'whatsapp' : null;
}

function maskValue(val) {
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

// ── Push device registration on login / logout ─────────────────
// Best-effort — a browser that denies notification permission, or a
// missing VAPID key, must never block login/logout itself. Lazily
// imported (like the axios interceptors elsewhere in this codebase) to
// avoid a static import cycle with the notification/config modules.
async function registerDeviceForPush() {
    try {
        const { getPushToken, getBrowserDeviceId, FCM_TOKEN_STORAGE_KEY } = await import('../../../config/firebaseMessaging');

        // Already registered this browser (real or placeholder token) —
        // don't re-request permission / call register again on every
        // single login. logout() clears this key, so a fresh browser or
        // an explicit logout are the only times this runs again.
        if (window.localStorage.getItem(FCM_TOKEN_STORAGE_KEY)) {
            console.log('[Auth] Push device already registered for this browser — skipping.');
            return;
        }

        const { registerDeviceToken } = await import('../../notification/services/DeviceTokenApi');
        // Falls back to a placeholder token (same shape the Vendor Panel
        // uses) when a real FCM token can't be obtained yet — e.g. no
        // VAPID key set — so the device still registers instead of the
        // whole thing silently doing nothing.
        const { token: fcmToken, isReal } = await getPushToken();
        console.log(`[Auth] Push token (${isReal ? 'real FCM' : 'placeholder'}):`, fcmToken);
        const result = await registerDeviceToken({
            token: fcmToken,
            platform: 'WEB',
            deviceId: getBrowserDeviceId(),
            deviceName: navigator.userAgent.slice(0, 80),
            appVersion: '1.0.0',
        });
        console.log('[Auth] deviceTokens/register response:', result);
        window.localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);
    } catch (err) {
        console.warn('[Auth] Could not register this browser for push:', err.message);
    }
}

async function unregisterDeviceForPush() {
    try {
        const { FCM_TOKEN_STORAGE_KEY } = await import('../../../config/firebaseMessaging');
        const token = window.localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
        if (!token) return;
        const { unregisterDeviceToken } = await import('../../notification/services/DeviceTokenApi');
        const result = await unregisterDeviceToken({ token, allDevices: false });
        console.log('[Auth] deviceTokens/unregister response:', result);
        window.localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    } catch (err) {
        console.warn('[Auth] Could not unregister this browser from push:', err.message);
    }
}

export const useAuthStore = create(
    persist(
        (set, get) => ({
            // ── Identity input state ──────────────────────────
            value: '',
            inputType: null,     // 'whatsapp' | null
            maskedValue: '',

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
                    const res = await loginOrSignUpWithWhatsapp({ whatsappNumber: value.trim(), role });
                    set({
                        maskedValue: maskValue(value.trim()),
                        modalOpen: true,
                        sendingOtp: false,
                    });
                    return { success: true, data: res };
                } catch (err) {
                    set({ error: err.message, sendingOtp: false });
                    return { success: false, error: err.message };
                }
            },

            verifyOtp: async (otp, role = 'ADMIN') => {
                const { value } = get();
                set({ verifyingOtp: true, error: '' });
                try {
                    const res = await verifyOtpWhatsapp({ whatsappNumber: value.trim(), otp, role });
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
                    registerDeviceForPush(); // fire-and-forget — never blocks login
                    return { success: true, data: res };
                } catch (err) {
                    set({ error: err.message, verifyingOtp: false });
                    return { success: false, error: err.message };
                }
            },

            resendOtp: async (role = 'ADMIN') => {
                const { value } = get();
                set({ resendingOtp: true, error: '' });
                try {
                    await loginOrSignUpWithWhatsapp({ whatsappNumber: value.trim(), role });
                    set({ resendingOtp: false });
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
                    modalOpen: false,
                });
                syncTokenToStorage(null);
                unregisterDeviceForPush(); // fire-and-forget — never blocks logout
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
