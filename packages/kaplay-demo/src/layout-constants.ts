import { PAD } from "./shared";

/** Shared 3-column layout constants for grid and first-person. */
export const W = 800;
export const H = 600;
export const LEFT_PANEL_W = 160;
export const RIGHT_PANEL_W = 200;
export const CENTER_W = W - LEFT_PANEL_W - RIGHT_PANEL_W - PAD * 4; // 408
export const NAV_ROW_Y = 42;
export const NAV_PANEL_H = 400;
export const PANEL_INSET = 8;
export const PANEL_INNER_MARGIN = PANEL_INSET * 2;
