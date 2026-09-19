import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertTriangle,
  X,
  Power,
  Filter,
  Layers,
  Star,
  Image as ImageIcon,
  FileText,
  Link2,
  ExternalLink,
  Eye,
  ThumbsUp,
  ThumbsDown,
  CalendarClock,
} from "lucide-react";
import ToggleSwitch from "../../components/common/ToggleSwitch";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import SelectDropdown from "../../components/common/SelectDropdown";
import { getFaqs, createFaq, updateFaq, deleteFaq } from "./services/FaqApi";

/* -------------------------------------------------------------------------
 * FAQ types — the categories the user asked for (voucher, offer,
 * transaction, onboarding, settlement, "etc"), plus a catch-all. Admin-
 * curated grouping, not a confirmed backend enum — edit this list if the
 * real API turns out to restrict it further.
 * ---------------------------------------------------------------------- */
const FAQ_TYPES = ["VOUCHER", "OFFER", "TRANSACTION", "ONBOARDING", "SETTLEMENT", "GENERAL"];
const MEDIA_TYPES = ["image", "video", "pdf"];

function humanizeType(type) {
  if (!type) return "General";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function toDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// "https://youtube.com/watch?v=ID", "https://youtu.be/ID",
// ".../embed/ID" or ".../shorts/ID" -> an embeddable player URL, or null
// for anything else (a direct .mp4 file plays fine in a native <video>
// tag; a YouTube page URL never will, since the actual video stream
// isn't at that URL).
function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function normalizeMediaItem(raw) {
  return {
    type: MEDIA_TYPES.includes(raw?.type) ? raw.type : "image",
    url: raw?.url || "",
    thumbnail: raw?.thumbnail || "",
    title: raw?.title || "",
    caption: raw?.caption || "",
  };
}

function normalizeRedirect(raw) {
  return {
    enabled: Boolean(raw?.enabled),
    type: raw?.type === "external" ? "external" : "internal",
    url: raw?.url || "",
    label: raw?.label || "",
    openInNewTab: Boolean(raw?.openInNewTab),
  };
}

function normalizeFaq(raw) {
  const publishAt = raw.publishAt || null;
  const expiresAt = raw.expiresAt || null;
  // Computed here (a plain mapper, not a component render) rather than
  // calling Date.now() inside FaqAccordionItem's render body — same
  // pattern already used for Banner/PromotionalTicker's "expiring soon"
  // calculation elsewhere in this app, to keep render pure.
  const now = Date.now();
  return {
    id: raw._id || raw.id,
    question: raw.question || "Untitled question",
    answer: raw.answer || "",
    type: raw.type && FAQ_TYPES.includes(raw.type) ? raw.type : "GENERAL",
    isActive: raw.isActive !== false,
    order: Number(raw.order) || 0,
    isFeatured: Boolean(raw.isFeatured),
    media: Array.isArray(raw.media) ? raw.media.map(normalizeMediaItem) : [],
    redirect: normalizeRedirect(raw.redirect),
    relatedFAQs: Array.isArray(raw.relatedFAQs) ? raw.relatedFAQs : [],
    // Server-maintained counters — the customer app increments these,
    // never the admin form. Shown read-only, never sent back on save.
    views: Number(raw.views) || 0,
    helpful: Number(raw.helpful) || 0,
    notHelpful: Number(raw.notHelpful) || 0,
    publishAt,
    expiresAt,
    isScheduled: Boolean(publishAt && new Date(publishAt).getTime() > now),
    isExpired: Boolean(expiresAt && new Date(expiresAt).getTime() < now),
    createdBy: raw.createdBy || null,
    updatedBy: raw.updatedBy || null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// Temporary placeholder content — the real /faqs endpoints aren't
// confirmed/live yet, so this keeps the page usable to preview in the
// meantime. Swapped out automatically the moment GET /faqs/getAll
// actually responds; delete this block once the backend is ready. A
// couple of entries carry the newer fields (media/redirect/featured) so
// the richer UI has something real to show while previewing.
const MOCK_FAQS = [
  {
    _id: "mock-voucher-1",
    type: "VOUCHER",
    question: "How does a customer redeem a voucher?",
    answer:
      "The customer opens the voucher inside the app, shows the claim code (or QR) at the outlet, and the vendor marks it redeemed from their counter screen — the claim moves to REDEEMED the moment that happens.",
    isActive: true,
    isFeatured: true,
    order: 0,
    media: [
      {
        type: "image",
        url: "https://picsum.photos/seed/trydood-voucher/640/360",
        thumbnail: "",
        title: "Redeem screen",
        caption: "The QR code the vendor scans at checkout.",
      },
      {
        type: "video",
        url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        thumbnail: "",
        title: "60-second walkthrough",
        caption: "How redemption looks end to end.",
      },
    ],
    redirect: { enabled: true, type: "internal", url: "/vendor-listing", label: "View Vouchers", openInNewTab: false },
    relatedFAQs: [],
    views: 482,
    helpful: 61,
    notHelpful: 3,
    createdBy: "6a6dcbf2482435db75806427",
    updatedBy: "6a6dcbf2482435db75806427",
    createdAt: "2026-06-01T09:00:00.000Z",
  },
  {
    _id: "mock-voucher-2",
    type: "VOUCHER",
    question: "Why can't a vendor publish a voucher with only 2 images?",
    answer:
      "Vendor Setting → Voucher enforces a minimum image count before a voucher can go live — it defaults to 3. Add more images or lower the minimum in Settings.",
    isActive: true,
    order: 1,
    views: 96,
    helpful: 12,
    notHelpful: 1,
    createdAt: "2026-06-02T09:00:00.000Z",
  },
  {
    _id: "mock-offer-1",
    type: "OFFER",
    question: "Can a promo code be combined with a voucher offer?",
    answer:
      "Yes — a promo code discounts on top of whatever the voucher already offers, as long as the promo's audience (Customer/Vendor) and cost-bearing rules allow it for that brand.",
    isActive: true,
    order: 0,
    views: 210,
    helpful: 28,
    notHelpful: 2,
    createdAt: "2026-06-03T09:00:00.000Z",
  },
  {
    _id: "mock-transaction-1",
    type: "TRANSACTION",
    question: "A payment shows Pending — when does it resolve?",
    answer:
      "Most gateway payments confirm within a couple of minutes. If a transaction sits Pending for longer, check the Razorpay payment ID on the Transaction Details page before assuming it failed.",
    isActive: true,
    order: 0,
    redirect: { enabled: true, type: "external", url: "https://razorpay.com/support/", label: "Razorpay Support", openInNewTab: true },
    views: 155,
    helpful: 19,
    notHelpful: 4,
    createdAt: "2026-06-04T09:00:00.000Z",
  },
  {
    _id: "mock-onboarding-1",
    type: "ONBOARDING",
    question: "What documents does a new vendor need to submit?",
    answer:
      "PAN, GSTIN (if registered), a bank account for payouts, and outlet address proof. Verification status is tracked per-document on the vendor's onboarding page until an admin approves it.",
    isActive: true,
    order: 0,
    relatedFAQs: ["mock-settlement-1"],
    views: 340,
    helpful: 40,
    notHelpful: 0,
    createdAt: "2026-06-05T09:00:00.000Z",
  },
  {
    _id: "mock-settlement-1",
    type: "SETTLEMENT",
    question: "Why hasn't a vendor's settlement been paid yet?",
    answer:
      "Settlements follow a T+2 cycle from the payment date and need admin approval before payout starts. Check the settlement's status badge — Pending Approval means it's still waiting on that step.",
    isActive: true,
    isFeatured: true,
    order: 0,
    redirect: { enabled: true, type: "internal", url: "/settlements", label: "View Settlements", openInNewTab: false },
    views: 301,
    helpful: 35,
    notHelpful: 5,
    createdAt: "2026-06-06T09:00:00.000Z",
  },
  {
    _id: "mock-settlement-2",
    type: "SETTLEMENT",
    question: "What does an On Hold settlement mean?",
    answer:
      "An admin paused it before approval, usually pending a bank-details re-check. It can only move forward once released from hold — it will not auto-resume.",
    isActive: false,
    order: 1,
    views: 58,
    helpful: 6,
    notHelpful: 1,
    createdAt: "2026-06-07T09:00:00.000Z",
  },
  {
    _id: "mock-general-1",
    type: "GENERAL",
    question: "Who can activate or deactivate a customer account?",
    answer:
      "Only an admin with Super Admin Mode turned on, from the Customers page. It's off by default so status changes aren't a single accidental click away.",
    isActive: true,
    order: 0,
    views: 72,
    helpful: 9,
    notHelpful: 0,
    createdAt: "2026-06-08T09:00:00.000Z",
  },
];

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:border-emerald-500/50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600";
const smallInputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12.5px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:border-emerald-500/50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600";

function FormSection({ step, title, children }) {
  return (
    <div className="rounded-2xl border border-neutral-100 p-4 dark:border-neutral-800">
      <p className="mb-3 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          {step}
        </span>
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Closed-by-default multi-select for "related FAQs" — same dropdown +
 * checkbox pattern used elsewhere in this app (PromoCode's picker),
 * rebuilt locally since this list is question text, not a shared id type.
 * ---------------------------------------------------------------------- */
function RelatedFaqPicker({ options, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (id) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-left text-[13px] text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
      >
        <span>{selectedIds.length ? `${selectedIds.length} related FAQ${selectedIds.length === 1 ? "" : "s"} selected` : "None selected"}</span>
        <ChevronDown size={14} className={`shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-neutral-500">No other FAQs yet.</p>
          ) : (
            options.map((opt) => (
              <label
                key={opt.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <input type="checkbox" checked={selectedIds.includes(opt.id)} onChange={() => toggle(opt.id)} className="accent-emerald-500" />
                <span className="truncate">{opt.question}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// A broken/unreachable image URL used to just disappear (display:none on
// error) — no visible feedback that anything was even attempted. This
// shows a visible placeholder instead, so a bad URL reads as "this link
// doesn't work" rather than an unexplained empty gap.
function MediaPreviewImage({ src, alt, className }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-neutral-100 text-neutral-400 dark:bg-neutral-950 dark:text-neutral-600 ${className}`}>
        <ImageIcon size={18} />
        <span className="text-[10px]">Image unavailable</span>
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setErrored(true)} />;
}

/* -------------------------------------------------------------------------
 * Repeatable media rows — URL-based (type/url/thumbnail/title/caption),
 * not a real uploader: there's no confirmed FAQ media-upload endpoint
 * yet, so an admin pastes an already-hosted URL for now.
 * ---------------------------------------------------------------------- */
function MediaEditor({ items, onChange }) {
  const addItem = () => onChange([...items, { type: "image", url: "", thumbnail: "", title: "", caption: "" }]);
  const updateItem = (i, field, value) => onChange(items.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2.5">
      {items.map((m, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex gap-1.5">
              {MEDIA_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => updateItem(i, "type", t)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                    m.type === t
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => removeItem(i)}
              aria-label="Remove media"
              className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 hover:bg-red-500/10 hover:text-red-500"
            >
              <X size={13} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={m.url}
              onChange={(e) => updateItem(i, "url", e.target.value)}
              placeholder={m.type === "video" ? "Video URL, or a YouTube link" : "Media URL"}
              className={smallInputClass}
            />
            <input
              value={m.thumbnail}
              onChange={(e) => updateItem(i, "thumbnail", e.target.value)}
              placeholder="Thumbnail URL (optional)"
              className={smallInputClass}
            />
            <input value={m.title} onChange={(e) => updateItem(i, "title", e.target.value)} placeholder="Title (optional)" className={smallInputClass} />
            <input value={m.caption} onChange={(e) => updateItem(i, "caption", e.target.value)} placeholder="Caption (optional)" className={smallInputClass} />
          </div>

          {/* Live preview so the admin can see what they just pasted */}
          {m.url && m.type === "image" && (
            <MediaPreviewImage
              src={m.url}
              alt=""
              className="mt-2.5 h-28 w-full rounded-lg border border-neutral-200 object-cover dark:border-neutral-800"
            />
          )}
          {m.url && m.type === "video" && (
            getYouTubeEmbedUrl(m.url) ? (
              <div className="mt-2.5 aspect-video w-full max-w-[280px] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                <iframe src={getYouTubeEmbedUrl(m.url)} title="Preview" className="h-full w-full" allowFullScreen />
              </div>
            ) : (
              <video src={m.url} controls className="mt-2.5 h-28 w-full max-w-[280px] rounded-lg border border-neutral-200 bg-black object-contain dark:border-neutral-800" />
            )
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400"
      >
        <Plus size={13} /> Add Media
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Add / Edit modal
 * ---------------------------------------------------------------------- */
function FaqFormModal({ open, initialData, allFaqs, onClose, onSave }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [type, setType] = useState(FAQ_TYPES[0]);
  const [order, setOrder] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);
  const [media, setMedia] = useState([]);
  const [redirect, setRedirect] = useState(normalizeRedirect());
  const [relatedFAQs, setRelatedFAQs] = useState([]);
  const [publishAt, setPublishAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuestion(initialData?.question || "");
    setAnswer(initialData?.answer || "");
    setType(initialData?.type || FAQ_TYPES[0]);
    setOrder(initialData?.order ?? 0);
    setIsFeatured(Boolean(initialData?.isFeatured));
    setMedia(initialData?.media?.length ? initialData.media.map(normalizeMediaItem) : []);
    setRedirect(normalizeRedirect(initialData?.redirect));
    setRelatedFAQs(initialData?.relatedFAQs || []);
    setPublishAt(toDatetimeLocal(initialData?.publishAt));
    setExpiresAt(toDatetimeLocal(initialData?.expiresAt));
    setError("");
  }, [open, initialData]);

  if (!open) return null;
  const isEdit = Boolean(initialData?.id);
  const relatedOptions = (allFaqs || []).filter((f) => f.id !== initialData?.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSave({
        question: question.trim(),
        answer: answer.trim(),
        type,
        order: Number(order) || 0,
        isFeatured,
        media: media.filter((m) => m.url.trim()),
        redirect,
        relatedFAQs,
        publishAt: fromDatetimeLocal(publishAt),
        expiresAt: fromDatetimeLocal(expiresAt),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 py-8 px-4" onClick={submitting ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{isEdit ? "Edit FAQ" : "Add FAQ"}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">
          <FormSection step={1} title="Question & Answer">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                Question<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
              </label>
              <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How do I redeem a voucher?" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Type</label>
              <div className="flex flex-wrap gap-2">
                {FAQ_TYPES.map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setType(opt)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      type === opt
                        ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                  >
                    {humanizeType(opt)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                Answer<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
              </label>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} placeholder="Full answer shown to the user." required className={inputClass} />
            </div>
          </FormSection>

          <FormSection step={2} title="Display">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Order within type</label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Featured</label>
                <button
                  type="button"
                  onClick={() => setIsFeatured((v) => !v)}
                  className={`flex h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-medium transition-colors ${
                    isFeatured
                      ? "border-amber-400/60 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400"
                  }`}
                >
                  <Star size={14} className={isFeatured ? "fill-amber-400 text-amber-400" : ""} />
                  {isFeatured ? "Featured" : "Not Featured"}
                </button>
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Publish At (optional)</label>
                <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Expires At (optional)</label>
                <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputClass} />
              </div>
            </div>
          </FormSection>

          <FormSection step={3} title="Media (optional)">
            <MediaEditor items={media} onChange={setMedia} />
          </FormSection>

          <FormSection step={4} title="Redirect / CTA Link (optional)">
            <ToggleSwitch checked={redirect.enabled} onChange={() => setRedirect((r) => ({ ...r, enabled: !r.enabled }))} title="Enable redirect" />
            {redirect.enabled && (
              <div className="space-y-3 pt-1">
                <div className="flex gap-2">
                  {["internal", "external"].map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setRedirect((r) => ({ ...r, type: t }))}
                      className={`flex-1 rounded-xl border px-3.5 py-2 text-[12.5px] font-medium capitalize transition-colors ${
                        redirect.type === t
                          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                          : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  value={redirect.url}
                  onChange={(e) => setRedirect((r) => ({ ...r, url: e.target.value }))}
                  placeholder={redirect.type === "external" ? "https://..." : "/settlements"}
                  className={inputClass}
                />
                <input
                  value={redirect.label}
                  onChange={(e) => setRedirect((r) => ({ ...r, label: e.target.value }))}
                  placeholder="Button label, e.g. View Settlements"
                  className={inputClass}
                />
                {redirect.type === "external" && (
                  <ToggleSwitch
                    checked={redirect.openInNewTab}
                    onChange={() => setRedirect((r) => ({ ...r, openInNewTab: !r.openInNewTab }))}
                    title="Open in a new tab"
                  />
                )}
              </div>
            )}
          </FormSection>

          <FormSection step={5} title="Related FAQs (optional)">
            <RelatedFaqPicker options={relatedOptions} selectedIds={relatedFAQs} onChange={setRelatedFAQs} />
          </FormSection>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!question.trim() || !answer.trim() || submitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {isEdit ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * One accordion row. Header: question + status/featured/schedule badges,
 * a quiet views/feedback line, and the admin controls (reorder/toggle/
 * edit/delete) in their own click-stopping span. Expanded body: answer,
 * media, the CTA (only really clickable when it's an external link — an
 * "internal" redirect is a path meant for the CUSTOMER app, not this
 * Admin's own router, so it's shown as inert preview text instead of a
 * live link that would try to navigate the admin panel somewhere that
 * doesn't exist here), related FAQs, and who last touched it.
 * ---------------------------------------------------------------------- */
function FaqAccordionItem({ faq, isOpen, onToggleOpen, onEdit, onDelete, onRequestToggleActive, onMoveUp, onMoveDown, canMoveUp, canMoveDown, relatedTitles }) {
  const { isScheduled, isExpired } = faq;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-1.5 px-2 pt-2">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label="Move up"
          className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <ArrowUp size={12} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label="Move down"
          className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <ArrowDown size={12} />
        </button>
      </div>

      <button onClick={onToggleOpen} className="flex w-full items-start justify-between gap-3 px-4 pb-3.5 pt-1.5 text-left">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <ChevronDown size={15} className={`shrink-0 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            {faq.isFeatured && <Star size={13} className="shrink-0 fill-amber-400 text-amber-400" />}
            <span className="truncate text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{faq.question}</span>
            {!faq.isActive && (
              <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                Inactive
              </span>
            )}
            {isScheduled && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                <CalendarClock size={10} /> Scheduled
              </span>
            )}
            {isExpired && (
              <span className="shrink-0 rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">Expired</span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-6 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1">
              <Eye size={11} /> {faq.views}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp size={11} /> {faq.helpful}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsDown size={11} /> {faq.notHelpful}
            </span>
            {faq.media.length > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon size={11} /> {faq.media.length}
              </span>
            )}
            {faq.redirect.enabled && (
              <span className="flex items-center gap-1">
                <Link2 size={11} /> CTA
              </span>
            )}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <ToggleSwitch checked={faq.isActive} onChange={onRequestToggleActive} title={faq.isActive ? "Deactivate" : "Activate"} />
          <button
            onClick={onEdit}
            aria-label={`Edit ${faq.question}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            aria-label={`Delete ${faq.question}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </span>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-neutral-100 px-4 py-3.5 dark:border-neutral-800">
          <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            {faq.answer || <span className="text-neutral-400 dark:text-neutral-600">No answer yet.</span>}
          </p>

          {faq.media.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {faq.media.map((m, i) => {
                const youtubeEmbed = m.type === "video" ? getYouTubeEmbedUrl(m.url) : null;
                return (
                  <div key={i} className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                    {m.type === "image" && m.url ? (
                      <a href={m.url} target="_blank" rel="noreferrer">
                        <MediaPreviewImage
                          src={m.url}
                          alt={m.title || "FAQ media"}
                          className="h-40 w-full object-cover"
                        />
                      </a>
                    ) : youtubeEmbed ? (
                      <div className="aspect-video w-full">
                        <iframe
                          src={youtubeEmbed}
                          title={m.title || "FAQ video"}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : m.type === "video" && m.url ? (
                      <video src={m.url} controls className="h-44 w-full bg-black object-contain" />
                    ) : (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-4 text-[12px] text-neutral-600 transition-colors hover:text-emerald-600 dark:text-neutral-300"
                      >
                        <FileText size={14} className="shrink-0 text-neutral-400" />
                        {m.title || `${m.type} attachment`}
                      </a>
                    )}
                    {(m.title || m.caption) && (
                      <div className="px-3 py-2">
                        {m.title && <p className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">{m.title}</p>}
                        {m.caption && <p className="text-[11px] text-neutral-500">{m.caption}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {faq.redirect.enabled &&
            (faq.redirect.type === "external" ? (
              <a
                href={faq.redirect.url}
                target={faq.redirect.openInNewTab ? "_blank" : undefined}
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400/10 px-3.5 py-2 text-[12.5px] font-medium text-emerald-600 transition-colors hover:bg-emerald-400/20 dark:text-emerald-400"
              >
                <ExternalLink size={13} />
                {faq.redirect.label || "Learn more"}
              </a>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3.5 py-2 text-[12.5px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                title="Internal redirects point into the customer app, not this admin panel — shown as a preview only."
              >
                <Link2 size={13} />
                {faq.redirect.label || "Redirects"} → <span className="font-mono text-[11px]">{faq.redirect.url}</span>
              </span>
            ))}

          {relatedTitles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-neutral-500">
              <span className="font-medium">See also:</span>
              {relatedTitles.map((t, i) => (
                <span key={i} className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">
                  {t}
                </span>
              ))}
            </div>
          )}

          {faq.updatedBy && (
            <p className="text-[10.5px] text-neutral-400 dark:text-neutral-600">
              Last updated by <span className="font-mono">{faq.updatedBy}</span> · {formatDateTime(faq.updatedAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page — a Featured section up top (cross-cutting, ignores type),
 * then one accordion group per type, sorted by each row's own `order`.
 * ---------------------------------------------------------------------- */
export default function Faq() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [openIds, setOpenIds] = useState(() => new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleSubmitting, setToggleSubmitting] = useState(false);
  const [toggleError, setToggleError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFaqs({ page: 1, limit: 200 });
      const rows = (res?.data?.data ?? res?.data ?? []).map(normalizeFaq);
      setFaqs(rows);
      setUsingMock(false);
    } catch (err) {
      // The real endpoint isn't confirmed/live yet — fall back to sample
      // content so the page is still usable to preview, instead of a
      // dead error screen. Logged, not shown, so it doesn't read as a
      // real failure to the admin.
      console.error("Failed to load FAQs from the API, showing sample data:", err.message);
      setFaqs(MOCK_FAQS.map(normalizeFaq));
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const faqsById = useMemo(() => new Map(faqs.map((f) => [f.id, f])), [faqs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return faqs.filter((f) => {
      const matchesType = typeFilter === "All" || f.type === typeFilter;
      const matchesSearch = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [faqs, search, typeFilter]);

  const featured = useMemo(
    () => filtered.filter((f) => f.isFeatured && f.isActive).sort((a, b) => a.order - b.order),
    [filtered]
  );

  const grouped = useMemo(() => {
    const map = new Map();
    FAQ_TYPES.forEach((t) => map.set(t, []));
    filtered.forEach((f) => {
      if (!map.has(f.type)) map.set(f.type, []);
      map.get(f.type).push(f);
    });
    map.forEach((rows) => rows.sort((a, b) => a.order - b.order));
    return Array.from(map.entries()).filter(([, rows]) => rows.length > 0);
  }, [filtered]);

  const toggleOpen = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSave = async (payload) => {
    if (editingFaq) {
      await updateFaq(editingFaq.id, payload);
    } else {
      await createFaq(payload);
    }
    setFormOpen(false);
    setEditingFaq(null);
    fetchFaqs();
  };

  const handleConfirmToggle = async () => {
    setToggleSubmitting(true);
    setToggleError("");
    try {
      await updateFaq(toggleTarget.id, { isActive: !toggleTarget.isActive });
      setToggleTarget(null);
      fetchFaqs();
    } catch (err) {
      setToggleError(err.message);
    } finally {
      setToggleSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteSubmitting(true);
    setDeleteError("");
    try {
      await deleteFaq(deleteTarget.id);
      setDeleteTarget(null);
      fetchFaqs();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Swaps `order` with the adjacent row in the same list (a type group,
  // or the Featured strip) and saves both — a lightweight alternative to
  // full drag-and-drop for now.
  const handleReorder = async (rowsInList, faq, direction) => {
    const idx = rowsInList.findIndex((r) => r.id === faq.id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= rowsInList.length) return;
    const other = rowsInList[swapWith];
    try {
      await Promise.all([updateFaq(faq.id, { order: other.order }), updateFaq(other.id, { order: faq.order })]);
      fetchFaqs();
    } catch (err) {
      console.error("Failed to reorder FAQ:", err.message);
    }
  };

  const renderRow = (faq, rowsInList) => (
    <FaqAccordionItem
      key={faq.id}
      faq={faq}
      isOpen={openIds.has(faq.id)}
      onToggleOpen={() => toggleOpen(faq.id)}
      onEdit={() => {
        setEditingFaq(faq);
        setFormOpen(true);
      }}
      onDelete={() => setDeleteTarget(faq)}
      onRequestToggleActive={() => setToggleTarget(faq)}
      onMoveUp={() => handleReorder(rowsInList, faq, "up")}
      onMoveDown={() => handleReorder(rowsInList, faq, "down")}
      canMoveUp={rowsInList.findIndex((r) => r.id === faq.id) > 0}
      canMoveDown={rowsInList.findIndex((r) => r.id === faq.id) < rowsInList.length - 1}
      relatedTitles={faq.relatedFAQs.map((id) => faqsById.get(id)?.question).filter(Boolean)}
    />
  );

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">FAQs</h1>
            <p className="mt-1 text-[13px] text-neutral-500">Frequently asked questions, grouped by type.</p>
          </div>
          <button
            onClick={() => {
              setEditingFaq(null);
              setFormOpen(true);
            }}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={15} />
            Add FAQ
          </button>
        </div>

        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <Search size={15} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search question or answer..."
              className="w-56 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
            />
          </div>
          <SelectDropdown value={typeFilter} options={["All", ...FAQ_TYPES]} icon={Filter} onChange={setTypeFilter} />
        </div>

        {usingMock && !loading && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-400/10 px-4 py-2.5 text-[12px] font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle size={13} className="shrink-0" />
            Showing sample FAQs — the live list couldn't be reached yet, so nothing below is saved to the server.
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading FAQs…
          </div>
        ) : featured.length === 0 && grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 px-5 py-14 text-center text-[13px] text-neutral-500 dark:border-neutral-800">
            No FAQs match your filters.
          </div>
        ) : (
          <div className="space-y-6">
            {featured.length > 0 && (
              <div>
                <p className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  <Star size={12} className="fill-amber-400" />
                  Featured
                </p>
                <div className="space-y-2">{featured.map((faq) => renderRow(faq, featured))}</div>
              </div>
            )}

            {grouped.map(([type, rows]) => (
              <div key={type}>
                <p className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  <Layers size={12} />
                  {humanizeType(type)}
                  <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    {rows.length}
                  </span>
                </p>
                <div className="space-y-2">{rows.map((faq) => renderRow(faq, rows))}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FaqFormModal
        open={formOpen}
        initialData={editingFaq}
        allFaqs={faqs}
        onClose={() => {
          setFormOpen(false);
          setEditingFaq(null);
        }}
        onSave={handleSave}
      />

      <ConfirmActionModal
        open={Boolean(toggleTarget)}
        tone={toggleTarget?.isActive ? "danger" : "neutral"}
        icon={Power}
        title={toggleTarget?.isActive ? "Deactivate this FAQ?" : "Activate this FAQ?"}
        description={
          toggleTarget?.isActive
            ? "Users will no longer see this question once deactivated."
            : "This question will become visible to users again."
        }
        confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Activate"}
        submitting={toggleSubmitting}
        error={toggleError}
        onClose={() => {
          setToggleTarget(null);
          setToggleError("");
        }}
        onConfirm={handleConfirmToggle}
      />

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        tone="danger"
        icon={Trash2}
        title="Delete this FAQ?"
        description="This permanently removes the question and answer. This cannot be undone."
        confirmLabel="Delete"
        submitting={deleteSubmitting}
        error={deleteError}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError("");
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
