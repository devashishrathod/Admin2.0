import React from "react";
import { MapPin, Plus, Minus, LocateFixed } from "lucide-react";

/**
 * OutletLocationMap
 * A lightweight, dependency-free map visual (diamond-pattern placeholder)
 * with a center pin and zoom controls — mirrors the outlet-location screenshot.
 *
 * To wire up a real map, swap the pattern <div> below for your map SDK
 * (Google Maps / Mapbox / Leaflet) and keep the pin + controls overlay.
 */
const OutletLocationMap = ({ latitude, longitude, onZoomIn, onZoomOut, onLocate }) => {
  return (
    <div className="relative h-56 w-full overflow-hidden rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:h-64">
      {/* Diamond pattern background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#eaf6f2",
          backgroundImage:
            "repeating-linear-gradient(45deg, #b9e3d6 0, #b9e3d6 2px, transparent 2px, transparent 42px), repeating-linear-gradient(-45deg, #b9e3d6 0, #b9e3d6 2px, transparent 2px, transparent 42px)",
        }}
      />

      {/* Center pin */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <MapPin size={30} className="fill-rose-600 text-rose-600 drop-shadow-md" />
      </div>

      {/* Controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onLocate}
          aria-label="Center on my location"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600"
        >
          <LocateFixed size={15} />
        </button>
        <div className="overflow-hidden rounded-md bg-white shadow-sm">
          <button
            type="button"
            onClick={onZoomIn}
            aria-label="Zoom in"
            className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-50"
          >
            <Plus size={14} />
          </button>
          <div className="h-px w-full bg-gray-100" />
          <button
            type="button"
            onClick={onZoomOut}
            aria-label="Zoom out"
            className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-50"
          >
            <Minus size={14} />
          </button>
        </div>
      </div>

      {/* Coordinates badge (optional, subtle) */}
      {latitude && longitude && (
        <div className="absolute bottom-2 left-2 rounded bg-white/80 px-2 py-0.5 text-[10px] text-gray-500 backdrop-blur-sm">
          {latitude}, {longitude}
        </div>
      )}
    </div>
  );
};

export default OutletLocationMap;
