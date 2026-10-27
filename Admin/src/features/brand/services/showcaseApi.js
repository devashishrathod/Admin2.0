import axios from 'axios';
import { attachSessionHandling } from '../../auth/session';
import { presignUploadAndConfirm } from '../../banner/services/BannerApi';

// ── Base URL ────────────────────────────────────────────────
// Matches the Postman env variable {{TryDood2.0BaseUrl}}
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Axios instance ──────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
});

// 401 (session expired) → log out and go to the login screen.
attachSessionHandling(api);

// Attach auth token automatically (same pattern as subscriptionApi.js / sectionApi.js)
api.interceptors.request.use(async (config) => {
    const { useAuthStore } = await import('../../../features/auth/store/authStore');
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

// ── Section Types ─────────────────────────────────────────────
// "CUSTOM" is the only value confirmed from the Postman example — add any
// other sectionType values your backend supports here.
export const SHOWCASE_SECTION_TYPES = {
    CUSTOM: 'CUSTOM',
};

// ══════════════════════════════════════════════════════════════
// SECTIONS  (a "Section" = one Showcase album, e.g. "Gallery",
// "Menu Photo", "Ambience Photo", "Event Photo")
// ══════════════════════════════════════════════════════════════

// ── Create Section ─────────────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/showcase/add-section
// body: { brandId, title, description, sortOrder, sectionType }
// `brandId` is required when this runs as an admin acting on behalf of a
// brand (rather than the brand's own logged-in session) — confirmed by the
// backend's "brandId is required when acting as an admin" validation error.
export async function createShowcaseSection({
    brandId,
    title,
    description = '',
    sortOrder = 1,
    sectionType = SHOWCASE_SECTION_TYPES.CUSTOM,
} = {}) {
    try {
        const { data } = await api.post('/showcase/section/add', {
            brandId,
            title,
            description,
            sortOrder,
            sectionType,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get All Sections (for a brand) ──────────────────────────────
// GET {{TryDood2.0BaseUrl}}/showcase/sections?page=&limit=&search=
// Used to hydrate the ShowcaseAlbumsEditor with previously-saved albums
// when a merchant re-opens this page.
// NOTE: adjust path/params if the real "list" endpoint differs — this
// wasn't in the Postman screenshots, only add-section / add-media were.
export async function getShowcaseSections({ page = 1, limit = 20, search = '' } = {}) {
    try {
        const params = { page, limit };
        if (search) params.search = search;
        const { data } = await api.get('/showcase/section/get-all', { params });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Get Single Section (for View) ───────────────────────────────
// GET {{TryDood2.0BaseUrl}}/showcase/section/:id
// NOTE: adjust path if your real "get one" endpoint differs.
export async function getShowcaseSectionById(sectionId) {
    try {
        const { data } = await api.get(`/showcase/section/get/${sectionId}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update Section (title, description, sortOrder, sectionType, visibility) ──
// PUT {{TryDood2.0BaseUrl}}/showcase/section/update/:id
// body: any subset of { brandId, title, description, sortOrder, sectionType, isVisible, showVideosInClips, isActive }
export async function updateShowcaseSection(sectionId, patch = {}, brandId) {
    try {
        const { data } = await api.put(`/showcase/section/update/${sectionId}`, {
            ...(brandId ? { brandId } : {}),
            ...patch,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Reorder Sections ─────────────────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/showcase/section/:brandId/reorder
// body: { sections: [{ id, sortOrder }, ...] }  — EVERY section, in its
// new order, 1-based sortOrder. Note the path id here is the BRAND's id,
// not a section id.
export async function reorderShowcaseSections(brandId, sections) {
    try {
        const { data } = await api.put(`/showcase/section/${brandId}/reorder`, {
            sections,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Delete Section ───────────────────────────────────────────────
// DELETE {{TryDood2.0BaseUrl}}/showcase/section/:id/delete?brandId=...
// NOTE: adjust path if the real endpoint differs. Confirm with backend
// whether this cascades and deletes the section's media too.
export async function deleteShowcaseSection(sectionId, brandId) {
    try {
        const { data } = await api.delete(`/showcase/section/delete/${sectionId}`, {
            params: brandId ? { brandId } : undefined,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ══════════════════════════════════════════════════════════════
// MEDIA  (photos / videos that live inside a Section)
// ══════════════════════════════════════════════════════════════

// ── Presigned uploads (super admin doc #111/#112, A-3) ───────────────
// Each file goes presign → S3 → confirm (shared helper in BannerApi), and
// the showcase endpoint then gets only the upload ids. A video's poster
// has its own purpose — sending a gallery id as a poster is a 422.
export const SHOWCASE_UPLOAD_PURPOSE = Object.freeze({
    MEDIA: 'SHOWCASE_MEDIA',
    THUMBNAIL: 'SHOWCASE_THUMBNAIL',
});

export const isVideoFile = (file) => Boolean(file?.type?.startsWith('video/'));

// Presign off (503) or storage not on S3 (409): multipart still works,
// so fall back to it instead of failing the upload (doc A-1).
const isPresignUnavailable = (error) => error?.status === 503 || error?.status === 409;

// The backend matches posters to videos by position: videos first, photos
// after, posters in the same order as the videos (doc A-3).
function orderVideosFirst(files, posters = []) {
    const videos = [];
    const photos = [];
    files.forEach((file, i) => {
        if (isVideoFile(file)) videos.push({ file, poster: posters[i] ?? null });
        else photos.push({ file });
    });
    if (videos.some((v) => !v.poster)) {
        throw new Error('Every video needs its own poster image.');
    }
    return {
        ordered: [...videos.map((v) => v.file), ...photos.map((p) => p.file)],
        videoPosters: videos.map((v) => v.poster),
    };
}

// ── Add Media to a Section ──────────────────────────────────────
// POST {{TryDood2.0BaseUrl}}/showcase/section/:sectionId/add-media
// Presigned: JSON { uploadIds[], thumbnailUploadIds[], isShowInVideoClips }.
// Fallback (presign off / not S3): multipart `files[]` + `thumbnails[]`.
// `brandId` is never sent — add-media drops it, the section decides the
// brand (doc A-3).
//
// @param {string} sectionId
// @param {File[]} files
// @param {object} [options]
// @param {boolean} [options.isShowInVideoClips=false]
// @param {(File|null)[]} [options.posters] - poster per file index; required
//        for every video, ignored for photos
// @param {(percent:number)=>void} [onUploadProgress]
export async function addShowcaseMedia(
    sectionId,
    files,
    { isShowInVideoClips = false, posters = [] } = {},
    onUploadProgress
) {
    if (!sectionId) throw new Error('sectionId is required');
    if (!files?.length) throw new Error('At least one file is required');
    const { ordered, videoPosters } = orderVideosFirst(files, posters);

    let uploadIds;
    let thumbnailUploadIds;
    try {
        const total = ordered.length + videoPosters.length;
        let done = 0;
        const upload = async (file, purpose) => {
            const id = await presignUploadAndConfirm({ file, purpose });
            done += 1;
            onUploadProgress?.(Math.round((done * 100) / total));
            return id;
        };
        uploadIds = [];
        for (const file of ordered) uploadIds.push(await upload(file, SHOWCASE_UPLOAD_PURPOSE.MEDIA));
        thumbnailUploadIds = [];
        for (const poster of videoPosters) thumbnailUploadIds.push(await upload(poster, SHOWCASE_UPLOAD_PURPOSE.THUMBNAIL));
    } catch (error) {
        if (!isPresignUnavailable(error)) throw error;
        return addShowcaseMediaMultipart(sectionId, ordered, videoPosters, isShowInVideoClips, onUploadProgress);
    }

    try {
        const { data } = await api.post(`/showcase/section/${sectionId}/add-media`, {
            uploadIds,
            ...(thumbnailUploadIds.length ? { thumbnailUploadIds } : {}),
            isShowInVideoClips,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

async function addShowcaseMediaMultipart(sectionId, ordered, videoPosters, isShowInVideoClips, onUploadProgress) {
    try {
        const formData = new FormData();
        formData.append('isShowInVideoClips', String(isShowInVideoClips));
        ordered.forEach((file) => formData.append('files', file));
        videoPosters.forEach((poster) => formData.append('thumbnails', poster));

        // No explicit Content-Type header — the browser must set it itself
        // for a FormData body so it can attach the multipart boundary.
        const { data } = await api.post(`/showcase/section/${sectionId}/add-media`, formData, {
            onUploadProgress: onUploadProgress
                ? (evt) => onUploadProgress(Math.round((evt.loaded * 100) / (evt.total || 1)))
                : undefined,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Replace a Media Item's File ──────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/showcase/section/:sectionId/media/replace/:mediaId
// Presigned: JSON { uploadId, thumbnailUploadId }. Fallback: multipart
// `file` + `thumbnail`. A video replacement needs a poster (doc A-4).
export async function replaceShowcaseMedia(sectionId, mediaId, { file, poster = null } = {}) {
    if (!file) throw new Error('file is required');
    if (isVideoFile(file) && !poster) throw new Error('A video needs a poster image.');

    let body;
    try {
        const uploadId = await presignUploadAndConfirm({ file, purpose: SHOWCASE_UPLOAD_PURPOSE.MEDIA });
        const thumbnailUploadId = poster
            ? await presignUploadAndConfirm({ file: poster, purpose: SHOWCASE_UPLOAD_PURPOSE.THUMBNAIL })
            : undefined;
        body = { uploadId, ...(thumbnailUploadId ? { thumbnailUploadId } : {}) };
    } catch (error) {
        if (!isPresignUnavailable(error)) throw error;
        body = new FormData();
        body.append('file', file);
        if (poster) body.append('thumbnail', poster);
    }

    try {
        const { data } = await api.put(`/showcase/section/${sectionId}/media/replace/${mediaId}`, body);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Reorder Media within a Section ────────────────────────────────
// PUT {{TryDood2.0BaseUrl}}/showcase/section/:sectionId/media/reorder
// body: { medias: [{ id, sortOrder }, ...] } — the FULL combined photo+
// video sequence (photos and videos share one sortOrder sequence, never
// two separate ones).
export async function reorderShowcaseMedia(sectionId, medias) {
    try {
        const { data } = await api.put(`/showcase/section/${sectionId}/media/reorder`, {
            medias,
        });
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Update a Media Item's Metadata — CONFIRMED ──────────────────
// PATCH {{TryDood2.0BaseUrl}}/showcase/section/:sectionId/media/update/:mediaId
// body: partial, e.g. { title, altText, isActive, sortOrder,
// isShowInVideoClips } — matches the confirmed response's own fields.
// `thumbnail` (a video's poster — photos 422 on it, doc A-9) is also
// editable here: a File goes up presigned as `thumbnailUploadId`, or as
// multipart `thumbnail` when presign is unavailable. Does NOT replace the
// underlying media file itself — replaceShowcaseMedia does that.
export async function updateShowcaseMedia(sectionId, mediaId, patch = {}) {
    const { thumbnail, ...rest } = patch;
    let body = rest;
    if (thumbnail instanceof File) {
        try {
            const thumbnailUploadId = await presignUploadAndConfirm({
                file: thumbnail,
                purpose: SHOWCASE_UPLOAD_PURPOSE.THUMBNAIL,
            });
            body = { ...rest, thumbnailUploadId };
        } catch (error) {
            if (!isPresignUnavailable(error)) throw error;
            const formData = new FormData();
            Object.entries(rest).forEach(([key, value]) => {
                if (value === undefined) return;
                formData.append(key, typeof value === 'boolean' ? String(value) : value);
            });
            formData.append('thumbnail', thumbnail);
            body = formData;
        }
    }
    try {
        const { data } = await api.patch(
            `/showcase/section/${sectionId}/media/update/${mediaId}`,
            body
        );
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ── Delete a Media Item ──────────────────────────────────────────
// DELETE {{TryDood2.0BaseUrl}}/showcase/section/:sectionId/media/:mediaId/delete?brandId=...
// NOTE: adjust path if the real endpoint differs.
export async function deleteShowcaseMedia(sectionId, mediaId, brandId) {
    try {
        const { data } = await api.delete(
            `/showcase/section/${sectionId}/media/delete/${mediaId}`,
            { params: brandId ? { brandId } : undefined }
        );
        return data;
    } catch (error) {
        handleError(error);
    }
}

// ══════════════════════════════════════════════════════════════
// COMBINED HELPER
// ══════════════════════════════════════════════════════════════

// Convenience wrapper for the common "create an album and upload its first
// batch of media in one go" flow used by ShowcaseAlbumsEditor: creates the
// section, then immediately uploads the given files to it.
//
// If the section is created but the media upload fails, the section is NOT
// auto-deleted (so a flaky upload doesn't wipe out an otherwise-valid
// album) — both the created section and the error are returned so the
// caller can offer "album created, but upload failed — retry?".
//
// @param {object} sectionPayload - see createShowcaseSection
// @param {File[]} [files] - optional; omit to create an empty section
// @param {object} [mediaOptions] - see addShowcaseMedia's `options` param
// @param {(percent:number)=>void} [onUploadProgress]
// @returns {Promise<{ section: object, mediaError?: Error }>}
export async function createShowcaseSectionWithMedia(
    sectionPayload,
    files = [],
    mediaOptions = {},
    onUploadProgress
) {
    const sectionRes = await createShowcaseSection(sectionPayload);
    const section =
        sectionRes?.data?.section ??
        sectionRes?.section ??
        sectionRes?.data ??
        sectionRes;
    const sectionId = section?._id ?? section?.id;

    if (!files.length) {
        return { section };
    }
    if (!sectionId) {
        return {
            section,
            mediaError: new Error('The section was created, but the response did not include its ID, so files could not be uploaded.'),
        };
    }

    try {
        const mediaRes = await addShowcaseMedia(sectionId, files, mediaOptions, onUploadProgress);
        const updatedSection = mediaRes?.data ?? mediaRes;
        return { section: updatedSection };
    } catch (mediaError) {
        return { section, mediaError };
    }
}

// ── Get Full Brand Showcase (sections + their media, ONE call) ───
// GET {{TryDood2.0ServerUrl}}/showcase/get-brand-showcase/:brandId
// ⚠️ CUSTOMER gallery — drops sections below the min media count, hidden
// sections and inactive media, and 404s on an unverified brand (super admin
// doc A-5). The admin editor uses getAdminBrandShowcase() below instead.
export async function getBrandShowcase(brandId) {
    try {
        const { data } = await api.get(`/showcase/get-brand-showcase/${brandId}`);
        return data;
    } catch (error) {
        handleError(error);
    }
}

// GET /showcase/section/get-all?brandId=&limit=100&isVisible= (super admin
// doc #36). `isVisible` defaults to true server-side, so hidden sections
// need their own call. A 404 "No any showcasesection found" is the
// empty-state, not an error.
async function getBrandSectionsByVisibility(brandId, isVisible) {
    try {
        const { data } = await api.get('/showcase/section/get-all', {
            params: { brandId, limit: 100, isVisible },
        });
        const list = data?.data?.data ?? data?.data ?? [];
        return Array.isArray(list) ? list : [];
    } catch (error) {
        if (error?.response?.status === 404) return [];
        handleError(error);
    }
}

// Section detail's media list — the exact key isn't in the super admin doc
// (it points to vendor doc #44), so take every array of media-like items
// (`medias`, `media`, or separate `photos` / `videos`), in sortOrder.
const looksLikeMedia = (item) =>
    Boolean(item) &&
    typeof item === 'object' &&
    Boolean(item.media?.url || item.url || ['PHOTO', 'IMAGE', 'VIDEO'].includes(String(item.type).toUpperCase()));

// Collects media arrays up to a few levels deep, so a paginated
// `medias: { data: [...] }` or a `section.medias` is found too. It never
// descends into a media item itself (its own `media` is an object).
function collectMediaArrays(node, depth, out) {
    if (!node || typeof node !== 'object' || depth < 0) return;
    Object.values(node).forEach((value) => {
        if (Array.isArray(value)) {
            if (value.some(looksLikeMedia)) out.push(value);
        } else if (value && typeof value === 'object') {
            collectMediaArrays(value, depth - 1, out);
        }
    });
}

function sectionMediaList(detail) {
    const arrays = [];
    collectMediaArrays(detail, 3, arrays);
    if (arrays.length) {
        return arrays
            .flat()
            .filter(looksLikeMedia)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    if (import.meta.env.DEV) {
        console.warn('[showcase] no media array found in section detail:', detail);
    }
    return [];
}

// ── Admin editor: EVERY section of a brand, with its media ───────────
// Sections from get-all (visible + hidden, any media count, untitled too),
// media per section from GET /showcase/section/get/:sectionId. A section
// whose detail call fails still shows, with its media left empty.
export async function getAdminBrandShowcase(brandId) {
    const [visible, hidden] = await Promise.all([
        getBrandSectionsByVisibility(brandId, true),
        getBrandSectionsByVisibility(brandId, false),
    ]);
    const byId = new Map();
    [...visible, ...hidden].forEach((s) => {
        if (s?._id && !byId.has(s._id)) byId.set(s._id, s);
    });
    const sections = [...byId.values()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const details = await Promise.allSettled(sections.map((s) => getShowcaseSectionById(s._id)));
    return sections.map((s, i) => {
        const detail = details[i].status === 'fulfilled' ? details[i].value?.data : null;
        return {
            ...s,
            ...(detail?.section ?? detail ?? {}),
            medias: detail ? sectionMediaList(detail) : s.medias ?? [],
            mediaLoadFailed: details[i].status === 'rejected',
        };
    });
}
