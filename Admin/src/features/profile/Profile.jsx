import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { useAuthStore } from "../auth/store/authStore";
import Loader from "../../components/common/Loader";
import CommonEmptyState from "../../components/common/EmptyState";
import { Button, PageTabs } from "../notification/components/NotificationUi";
import { useMyProfile } from "./queries/profileQueries";
import ProfileHero from "./components/ProfileHero";
import PersonalInfoCard from "./components/PersonalInfoCard";
import ContactCard from "./components/ContactCard";
import SecurityCard from "./components/SecurityCard";
import AccountDetailsCard from "./components/AccountDetailsCard";

/* -------------------------------------------------------------------------
 * My profile — the signed-in admin's own account.
 *   Personal info          PUT  /users/update        (doc #14)
 *   Contact & verification POST /auth/{email,mobile,whatsapp}/… (doc #12a–f)
 *   Security               POST /auth/set-password, /auth/logout (doc #9, #12)
 * Read from GET /users/get (doc #13); every save refreshes it and the
 * header's name/email follow through the auth store.
 * ---------------------------------------------------------------------- */
const TABS = [
  { key: "personal", label: "Personal info", icon: UserRound },
  { key: "contact", label: "Contact & verification", icon: ShieldCheck },
  { key: "security", label: "Security", icon: KeyRound },
];

export default function Profile() {
  const [tab, setTab] = useState("personal");
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { data: profile, isPending, error, refetch, isFetching } = useMyProfile();

  // A WhatsApp number change or "sign out everywhere" ends this session too.
  const handleSignedOut = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-5 sm:px-6 sm:pt-6 lg:px-8">
      <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6 sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-[30px] dark:text-neutral-50">
            My <span className="text-emerald-600 dark:text-emerald-400">profile</span>
          </h1>
          <p className="mt-1 text-[12.5px] text-neutral-500 sm:text-[13px]">Your details, how we reach you, and how you sign in.</p>
        </div>
        <Button icon={RefreshCw} loading={isFetching && !isPending} onClick={() => refetch()} className="shrink-0" aria-label="Refresh">
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {isPending ? (
        <Loader variant="inline" center className="py-24" />
      ) : error || !profile ? (
        <CommonEmptyState
          icon="default"
          tone="error"
          title="Couldn't load your profile"
          description={error?.message || "The server didn't return a profile."}
          action={{ label: "Try again", onClick: () => refetch() }}
        />
      ) : (
        <div className="space-y-4">
          <ProfileHero profile={profile} />
          <PageTabs tabs={TABS} value={tab} onChange={setTab} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              {tab === "personal" && <PersonalInfoCard profile={profile} />}
              {tab === "contact" && <ContactCard profile={profile} onSignedOut={handleSignedOut} />}
              {tab === "security" && <SecurityCard profile={profile} onSignedOut={handleSignedOut} />}
            </div>
            <div className="lg:col-span-4">
              <AccountDetailsCard profile={profile} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
