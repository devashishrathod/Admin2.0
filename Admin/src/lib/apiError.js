/* -------------------------------------------------------------------------
 * One error shape for every API call.
 *
 * The backend puts the machine-readable reason in `details.code`
 * (SUBMIT_REQUIRED, DEED_NOT_ACCEPTED, BILLING_ADDRESS_REQUIRED …) and
 * useful extras next to it (`details.suggestedAddress`, `badgeBlockers`,
 * `missing` …). Screens branch on `err.code` — never on the message text
 * (onboarding v2 admin guide §2.5, §15).
 * ---------------------------------------------------------------------- */

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

export class ApiError extends Error {
    /**
     * @param {string} message  readable text from the server (or a fallback)
     * @param {{ status?: number|null, code?: string|null, details?: object|null }} info
     * @param {unknown} [cause] the original axios error
     */
    constructor(message, { status = null, code = null, details = null } = {}, cause) {
        super(message, { cause });
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

/** Turns an axios (or any) error into an ApiError. ApiErrors pass through unchanged. */
export function toApiError(error, fallback = FALLBACK_MESSAGE) {
    if (error instanceof ApiError) return error;
    const res = error?.response;
    const data = res?.data && typeof res.data === 'object' ? res.data : {};
    const message = data.message || data.error || error?.message || fallback;
    return new ApiError(
        message,
        { status: res?.status ?? null, code: data.details?.code || data.code || null, details: data.details ?? null },
        error
    );
}

/** For service catch blocks: `catch (error) { throwApiError(error); }` */
export function throwApiError(error, fallback) {
    throw toApiError(error, fallback);
}

/** `isApiErrorCode(err, 'SUBMIT_REQUIRED', 'DEED_NOT_ACCEPTED')` */
export const isApiErrorCode = (error, ...codes) => Boolean(error?.code) && codes.includes(error.code);
