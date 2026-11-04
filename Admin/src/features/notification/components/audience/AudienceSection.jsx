import { Loader2 } from "lucide-react";
import { AUDIENCE_MODES } from "../../notificationConfig";
import { Notice, Pill, SectionCard, Segmented } from "../NotificationUi";
import { formatCount } from "../../utils/notificationUtils";
import RoleAudience from "./RoleAudience";
import FilterAudience from "./FilterAudience";
import PickListAudience from "./PickListAudience";
import PasteAudience from "./PasteAudience";

/* Step 2 — who receives it. Four ways to build the audience; the header
 * badge shows the live recipient count (dry run, else the local estimate). */
export default function AudienceSection({ draftApi, directory, resolved, reach, roleStats }) {
  const { audience } = draftApi.draft;
  const mode = AUDIENCE_MODES.find((m) => m.key === audience.mode) || AUDIENCE_MODES[0];

  return (
    <SectionCard
      step={2}
      title="Audience"
      subtitle="Who receives it."
      right={
        <Pill tint={reach.count ? "emerald" : "neutral"} className="shrink-0 text-[11.5px]">
          {reach.loading && <Loader2 size={11} className="animate-spin" />}
          {formatCount(reach.count, reach.exact)} recipients
        </Pill>
      }
    >
      <Segmented
        stretch
        value={audience.mode}
        onChange={(m) => draftApi.patchAudience({ mode: m })}
        options={AUDIENCE_MODES.map((m) => ({ key: m.key, label: m.label, icon: m.icon }))}
      />
      <p className="mb-3 mt-2.5 text-[11.5px] normal-case text-neutral-500">{mode.hint}</p>

      {audience.mode === "role" && <RoleAudience audience={audience} onChange={draftApi.patchAudience} roleStats={roleStats} />}
      {audience.mode === "filter" && <FilterAudience filter={audience.filter} onChange={draftApi.patchFilter} directory={directory} />}
      {audience.mode === "list" && <PickListAudience picked={audience.picked} onPick={draftApi.setPicked} directory={directory} />}
      {audience.mode === "paste" && (
        <PasteAudience value={audience.paste} onChange={(paste) => draftApi.patchAudience({ paste })} resolved={resolved} />
      )}

      {resolved.notes.length > 0 && audience.mode !== "paste" && (
        <Notice tone="info" className="mt-3">
          {resolved.notes.join(" ")}
        </Notice>
      )}
    </SectionCard>
  );
}
