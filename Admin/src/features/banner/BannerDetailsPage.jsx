import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Image as ImageIcon,
  Link as LinkIcon,
  Pencil,
  Ruler,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "../../components/common/Table";
import EmptyState from "../../components/common/EmptyState";
import { deleteBanner, BANNER_TYPES, REDIRECT_TYPES } from "./services/BannerApi";
import { useBanner } from "./queries/bannerQueries";
import { useCategories } from "../category/queries/categoryQueries";
import {
  apiToRow,
  bannerSizeError,
  BANNER_SPEC_LABEL,
  DeleteConfirmModal,
  formatDateTime,
  redirectSummary,
  scheduleChip,
  TYPE_BADGE,
} from "./Banner";
import Loader from "../../components/common/Loader";

/* -------------------------------------------------------------------------
 * /banner/:id — full banner details as a page (was a modal). Loads the
 * banner itself (GET /banners/get/:id), so the link works on refresh or
 * when shared. The banner is shown at the app's exact 1600 × 1332 shape.
 * ---------------------------------------------------------------------- */

function formatBytes(bytes) {
  if (!bytes) return "File size unknown";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
        <div className="mt-0.5 text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">{children}</div>
      </div>
    </div>
  );
}

const cardClass =
  "rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20";

export default function BannerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [measured, setMeasured] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // A failed delete shows on the same error screen as a failed load.
  const [deleteError, setDeleteError] = useState("");

  // The service returns the banner object, or null when it doesn't exist.
  const bannerQuery = useBanner(id);
  const banner = useMemo(() => (bannerQuery.data ? apiToRow(bannerQuery.data) : null), [bannerQuery.data]);
  // Also show the loader while "Try again" refetches after an error.
  const loading = bannerQuery.isPending || (bannerQuery.isError && bannerQuery.isFetching);
  const error = deleteError || bannerQuery.error?.message || "";
  const load = () => {
    setDeleteError("");
    bannerQuery.refetch();
  };

  // Category names for the "On tap" summary.
  const categoriesQuery = useCategories({ page: 1, limit: 100 });
  const categories = useMemo(
    () => (categoriesQuery.data?.data?.data ?? []).map((c) => ({ id: c._id, name: c.name })),
    [categoriesQuery.data]
  );

  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate("/banner");
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBanner(banner.id);
      navigate("/banner", { replace: true });
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <Loader variant="page" label="Loading banner…" />
    );
  }

  if (error || !banner) {
    return (
      <EmptyState
        variant="page"
        tone={error ? "error" : "default"}
        icon={error ? "error" : "banner"}
        title={error ? "Couldn't load this banner" : "Banner not found"}
        description={
          error
            ? `${error} — check your connection and try again.`
            : "We couldn't find a banner with this link. It may have been deleted, or the link is no longer valid."
        }
        action={{ label: "Back to Banners", icon: ArrowLeft, onClick: () => navigate("/banner") }}
        secondaryAction={error ? { label: "Try again", onClick: load } : undefined}
      />
    );
  }

  const size =
    banner.mediaWidth && banner.mediaHeight ? { width: banner.mediaWidth, height: banner.mediaHeight } : measured;
  const sizeOk = size ? !bannerSizeError(size) : null;
  const typeBadge = TYPE_BADGE[banner.type] || TYPE_BADGE[BANNER_TYPES.IMAGE];
  const TypeIcon = typeBadge.icon;
  const chip = scheduleChip(banner);
  const liveTone = {
    Live: "bg-emerald-500 text-white",
    Scheduled: "bg-sky-500 text-white",
    Expired: "bg-red-500 text-white",
    Inactive: "bg-neutral-600 text-white",
  }[banner.liveState];
  const externalUrl = banner.redirect?.type === REDIRECT_TYPES.EXTERNAL_URL ? banner.redirect?.url : "";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft size={13} /> Back to Banners
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/banner", { state: { editId: banner.id } })}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-600 transition-colors hover:border-emerald-400/40 hover:text-emerald-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:text-emerald-400"
          >
            <Pencil size={13} /> Edit Banner
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-600 transition-colors hover:border-red-500/40 hover:text-red-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:text-red-400"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Banner at its exact app size/shape */}
        <div className={`${cardClass} h-fit`}>
          <div className="mx-auto w-full max-w-[560px]">
            <div className="relative aspect-[1600/1332] w-full overflow-hidden rounded-2xl bg-neutral-950">
              {banner.mediaUrl ? (
                banner.type === BANNER_TYPES.VIDEO ? (
                  <video
                    src={banner.mediaUrl}
                    poster={banner.posterUrl || undefined}
                    className="h-full w-full object-contain"
                    muted
                    controls
                    onLoadedMetadata={(e) => setMeasured({ width: e.target.videoWidth, height: e.target.videoHeight })}
                  />
                ) : (
                  <img
                    src={banner.mediaUrl}
                    alt={banner.title}
                    className="h-full w-full object-contain"
                    onLoad={(e) => setMeasured({ width: e.target.naturalWidth, height: e.target.naturalHeight })}
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-500">
                  <ImageIcon size={32} />
                </div>
              )}
              <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  <TypeIcon size={12} /> {typeBadge.label}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${liveTone}`}>{banner.liveState}</span>
              </div>
            </div>
          </div>

          {/* Size check */}
          {size && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[12.5px] font-medium ${
                sizeOk
                  ? "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-400/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              {sizeOk ? <Ruler size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
              {sizeOk
                ? `${size.width} × ${size.height} px — matches the app's banner size.`
                : `${size.width} × ${size.height} px — doesn't match the required ${BANNER_SPEC_LABEL}. Replace it via Edit.`}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Banner</p>
                <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">
                  {banner.title}
                </h1>
              </div>
              <StatusBadge status={banner.isActive ? "Active" : "Inactive"} />
            </div>
            {banner.description && (
              <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">{banner.description}</p>
            )}

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/5 px-3.5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-sky-600 dark:text-sky-400">
                <LinkIcon size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">On tap</p>
                {externalUrl ? (
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[13.5px] font-semibold text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
                  >
                    {externalUrl}
                  </a>
                ) : (
                  <p className="truncate text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-200">
                    {redirectSummary(banner.redirect, categories)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <p className="mb-1 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">Schedule</p>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              <InfoRow icon={CalendarDays} label="Starts">
                {banner.startDate ? formatDateTime(banner.startDate) : "Always on (no start date)"}
              </InfoRow>
              <InfoRow icon={CalendarDays} label="Ends">
                {banner.endDate ? formatDateTime(banner.endDate) : "No end date"}
              </InfoRow>
              <InfoRow icon={Clock3} label="Status">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${chip.tone}`}>{chip.label}</span>
              </InfoRow>
            </div>
          </div>

          <div className={cardClass}>
            <p className="mb-1 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">Media</p>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              <InfoRow icon={TypeIcon} label="Type">
                {typeBadge.label}
                {banner.mediaDuration ? ` · ${Math.round(banner.mediaDuration)}s` : ""}
                {banner.mediaMime && <span className="ml-1.5 font-normal text-neutral-500">{banner.mediaMime}</span>}
              </InfoRow>
              <InfoRow icon={Ruler} label="Size">
                {size ? `${size.width} × ${size.height} px` : "Dimensions unknown"}
                <span className="ml-1.5 font-normal text-neutral-500">{formatBytes(banner.mediaSizeBytes)}</span>
              </InfoRow>
              <InfoRow icon={ImageIcon} label="Required">
                {BANNER_SPEC_LABEL}
              </InfoRow>
            </div>
            {(banner.createdAt || banner.updatedAt) && (
              <p className="mt-3 text-[11.5px] text-neutral-400 dark:text-neutral-500">
                {banner.createdAt && `Created ${formatDateTime(banner.createdAt)}`}
                {banner.updatedAt && banner.updatedAt !== banner.createdAt && ` · Updated ${formatDateTime(banner.updatedAt)}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <DeleteConfirmModal
          banner={banner}
          deleting={deleting}
          onCancel={() => !deleting && setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
