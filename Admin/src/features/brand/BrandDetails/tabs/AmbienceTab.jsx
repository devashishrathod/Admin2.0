import ShowcaseAlbums from "../../ShowcaseAlbums";

/* Ambience tab — photos + video, split out of Brand Info into its own tab
   so the media gallery has room to breathe. The actual staged-upload /
   click-to-preview / drag-and-drop-reorder logic lives in ShowcaseAlbums.jsx
   (ported from the VenderPanel Showcase Details flow). */
export default function AmbienceTab({ brand, readOnly }) {
  return <ShowcaseAlbums brand={brand} readOnly={readOnly} />;
}
