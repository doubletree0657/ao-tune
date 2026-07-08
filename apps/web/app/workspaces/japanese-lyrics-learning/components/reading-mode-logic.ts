import type { SongSheetLayoutMode } from "../../../../lib/api";

export type WorkspaceMode = "reader" | "overview" | "sing_along" | "editor";
export type ReadingWorkspaceMode = Exclude<WorkspaceMode, "editor">;

export function layoutModeForReadingMode(
  mode: ReadingWorkspaceMode,
): SongSheetLayoutMode {
  if (mode === "overview") {
    return "compact";
  }
  if (mode === "sing_along") {
    return "sing_along";
  }
  return "continuous";
}

export function persistedLayoutModeForWorkspaceMode(
  mode: WorkspaceMode,
): SongSheetLayoutMode | null {
  if (mode === "editor") {
    return null;
  }
  return layoutModeForReadingMode(mode);
}

export function readingModeForLayoutMode(
  layoutMode: SongSheetLayoutMode,
): ReadingWorkspaceMode {
  if (layoutMode === "compact") {
    return "overview";
  }
  if (layoutMode === "sing_along") {
    return "sing_along";
  }
  return "reader";
}

export function modeAfterEditor(
  previousReadingMode: ReadingWorkspaceMode,
): ReadingWorkspaceMode {
  return previousReadingMode;
}
