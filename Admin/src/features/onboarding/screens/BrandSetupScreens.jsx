import { useState } from "react";
import { ImagePlus, Plus } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, SecondaryButton, Field, Note, Section, StatusBadge, tileCls, inputCls } from "../ui";
import { useStepAction } from "../useStepAction";
import { useOnboardingFeatures } from "../queries/onboardingQueries";
import { updateBrandBasics, continueOnboarding, skipOnboardingScreen, addBrandFeature } from "../services/onboardingApi";
import { WHATSAPP_RE, errorText } from "../onboardingFlow";
import ShowcaseAlbums from "../../brand/ShowcaseAlbums";

const payload = (res) => res?.data ?? res ?? {};
const listOf = (res) => {
  const d = res?.data ?? res;
  const l = d?.data ?? d?.items ?? d;
  return Array.isArray(l) ? l : [];
};

/* ---- 12 · BRAND_BASIC_DETAILS ------------------------------------- */
// PUT /brands/update (logo required, cover / description / email / mobile)
// doesn't move the screen — then continue (422 missing [LOGO] without one).
function ImagePick({ label, current, file, onPick, required, wide }) {
  const preview = file ? URL.createObjectURL(file) : current;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {!required && <span className="text-[11.5px] font-normal text-neutral-400">Optional</span>}
      </span>
      <label
        className={`group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50 transition hover:border-emerald-600 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-emerald-600/20 dark:border-neutral-700 dark:bg-neutral-950 ${
          wide ? "aspect-[16/6] w-full" : "h-24 w-24"
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[12px] font-medium text-white opacity-0 transition group-hover:opacity-100">Change</span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1 text-[12px] font-medium text-neutral-500">
            <ImagePlus size={17} /> Upload
          </span>
        )}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => onPick(e.target.files?.[0] || null)} />
      </label>
    </div>
  );
}

// continue needs LOGO, EMAIL and MOBILE (D83; 422 missing[]). Email / mobile
// are the vendor ACCOUNT's keys: the admin enters them (Q4), they stay
// unverified until the vendor verifies them, so they're sent only when they
// changed. "Use the owner's WhatsApp" sends useWhatsappAsMobile instead of a
// mobile — refused (422 OWNER_NUMBER_NOT_VERIFIED) while the owner has never
// signed in, which is every admin-created vendor until their first login.
// The admin's GET /brands/get carries user.isWhatsappVerified, so the option
// is disabled up front when it's false; the 422 stays as the fallback.
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function BrandBasicsScreen({ brandId, brand, eyebrow, onAdvance, onBack, isCurrent = true }) {
  const savedEmail = brand?.email || "";
  const savedMobile = brand?.mobile || "";
  const savedDescription = brand?.description || "";
  const [logo, setLogo] = useState(null);
  const [cover, setCover] = useState(null);
  const [description, setDescription] = useState(savedDescription);
  const [email, setEmail] = useState(savedEmail);
  const [mobile, setMobile] = useState(savedMobile);
  const [useWa, setUseWa] = useState(false);
  // false = owner never verified their WhatsApp (or the server said so).
  const [waBlocked, setWaBlocked] = useState(() => brand?.user?.isWhatsappVerified === false);
  const { run, busy, error } = useStepAction(onAdvance);

  const hasLogo = Boolean(logo || brand?.logo);
  const emailOk = EMAIL_RE.test(email.trim());
  const mobileOk = useWa || WHATSAPP_RE.test(mobile);
  const descChanged = description.trim() !== savedDescription;
  const emailChanged = email.trim() !== savedEmail;
  const mobileChanged = !useWa && mobile !== savedMobile;
  const changed = Boolean(logo || cover) || descChanged || emailChanged || mobileChanged || useWa;

  const save = () =>
    run("save", async () => {
      let res = null;
      if (changed) {
        try {
          res = await updateBrandBasics(brandId, {
            logo,
            coverImage: cover,
            ...(descChanged ? { description: description.trim() } : {}),
            ...(emailChanged ? { email: email.trim() } : {}),
            ...(useWa ? { useWhatsappAsMobile: true } : mobileChanged ? { mobile } : {}),
          });
        } catch (err) {
          if (err?.code === "OWNER_NUMBER_NOT_VERIFIED") {
            setUseWa(false);
            setWaBlocked(true);
          }
          throw err;
        }
      }
      // continue only moves the vendor's screen from BRAND_BASIC_DETAILS.
      return isCurrent ? continueOnboarding(brandId) : res;
    });

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="How customers will see the brand"
      intro="Logo, business email and a contact number are required. The rest makes the brand page look complete and raises the profile strength."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={
            <PrimaryButton busy={busy === "save"} disabled={!hasLogo || !emailOk || !mobileOk || (!isCurrent && !changed)} onClick={save}>
              {isCurrent ? "Save & continue" : "Save changes"}
            </PrimaryButton>
          }
        />
      }
    >
      <Section
        number={1}
        title="Brand page"
        description="What customers see first."
        badge={hasLogo ? <StatusBadge tone="ok">Logo added</StatusBadge> : <StatusBadge tone="warn">Logo required</StatusBadge>}
      >
        <div className="flex flex-wrap gap-4">
          <ImagePick label="Logo" required current={brand?.logo} file={logo} onPick={setLogo} />
          <div className="min-w-[220px] flex-1"><ImagePick label="Cover image" wide current={brand?.coverImage} file={cover} onPick={setCover} /></div>
        </div>
        <Field label="About the brand" optional hint={`50+ characters count towards profile strength · ${description.length} characters`}>
          <textarea className={`${inputCls} h-24 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </Section>

      <Section number={2} title="Contact" description="Both stay unverified until the vendor verifies them from their panel.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business email" error={email && !emailOk ? "Enter a valid email" : ""}>
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Contact number" hint={useWa ? "The owner's verified WhatsApp number is used" : "10 digits"} error={!useWa && mobile && !mobileOk ? "10 digits, starts with 6–9" : ""}>
            <input className={inputCls} type="tel" maxLength={10} value={useWa ? "" : mobile} disabled={useWa} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} />
          </Field>
        </div>
        <label className={`flex items-center gap-2 text-[13.5px] text-neutral-700 dark:text-neutral-300 ${waBlocked ? "opacity-60" : ""}`}>
          <input type="checkbox" checked={useWa} disabled={waBlocked} onChange={(e) => setUseWa(e.target.checked)} className="h-4 w-4 accent-emerald-700" />
          Use the owner's WhatsApp number as the contact number
        </label>
        {waBlocked && <Note tone="warn">The owner hasn't verified their WhatsApp yet (they never signed in). Enter a contact number instead.</Note>}
      </Section>
    </ScreenShell>
  );
}

/* ---- 13 · BRAND_PROFESSIONAL_DETAILS (skippable) ------------------ */
export function ProfessionalScreen({ brandId, eyebrow, onAdvance, onBack, isCurrent = true }) {
  // Features added in this session — shown when the list endpoint
  // (optional) fails, so the admin still sees what they added.
  const [added, setAdded] = useState([]);
  const featuresQuery = useOnboardingFeatures(brandId);
  const features = featuresQuery.isSuccess ? listOf(featuresQuery.data) : added;
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState(null);
  const [adding, setAdding] = useState(false);
  const [featureError, setFeatureError] = useState("");
  const { run, busy, error } = useStepAction(onAdvance);

  // The list refreshes itself after the add (shared interceptor).
  const add = async () => {
    setAdding(true);
    setFeatureError("");
    try {
      const res = payload(await addBrandFeature(brandId, { title: title.trim(), description: desc.trim(), icon }));
      setAdded((f) => [...f, res?.feature || res || { title: title.trim(), description: desc.trim() }]);
      setTitle("");
      setDesc("");
      setIcon(null);
    } catch (err) {
      setFeatureError(errorText(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Show off the brand"
      intro="Photos and highlights appear on the brand page and in the home carousel. Add them now or later from the brand's profile."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          // Skip / continue move the vendor's screen — only on the current one.
          onSkip={isCurrent ? () => run("skip", () => skipOnboardingScreen(brandId, "BRAND_PROFESSIONAL_DETAILS")) : undefined}
          skipBusy={busy === "skip"}
          primary={isCurrent ? <PrimaryButton busy={busy === "continue"} onClick={() => run("continue", () => continueOnboarding(brandId))}>Continue</PrimaryButton> : null}
        />
      }
    >
      <Note tone="info">Tip: at least 1 showcase collection and 2 features make the page look complete and add 10 points to the profile strength.</Note>

      <Section number={1} title="Showcase collections" description="Photo and video albums on the brand page.">
        <ShowcaseAlbums brand={{ id: brandId }} />
      </Section>

      <Section
        number={2}
        title="Brand features"
        description="Short highlights such as Free Wi-Fi or Home delivery."
        badge={<StatusBadge tone={features.length >= 2 ? "ok" : "muted"}>{features.length} added</StatusBadge>}
      >
        {features.length > 0 && (
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {features.map((f, i) => (
              <li key={f._id || i} className={`${tileCls} flex items-start gap-3 p-3`}>
                {f.icon ? (
                  <img src={f.icon} alt="" className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[12px] font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300">
                    {(f.title || "?").slice(0, 2)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">{f.title}</span>
                  {f.description && <span className="block text-[12.5px] text-neutral-500 dark:text-neutral-400">{f.description}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/60 p-3.5 sm:grid-cols-[1fr_1fr_auto] dark:border-neutral-700 dark:bg-neutral-950/30">
          <Field label="Feature title"><input className={inputCls} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Free Wi-Fi" /></Field>
          <Field label="Description" optional><input className={inputCls} value={desc} maxLength={500} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Fast Wi-Fi for work and study" /></Field>
          <Field label="Icon" optional>
            <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-[13px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              <ImagePlus size={14} /> <span className="max-w-28 truncate">{icon ? icon.name : "Choose"}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => setIcon(e.target.files?.[0] || null)} />
            </span>
          </Field>
          <div className="sm:col-span-3">
            <SecondaryButton busy={adding} disabled={title.trim().length < 2} onClick={add}>
              <Plus size={14} /> Add feature
            </SecondaryButton>
          </div>
        </div>
        {featureError && <Note tone="error">{featureError}</Note>}
      </Section>
    </ScreenShell>
  );
}

