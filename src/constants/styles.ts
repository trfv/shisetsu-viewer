/** XS: 0px ~ 679px, and so on. */
export const BREAKPOINTS = {
  xs: 0,
  sm: 680,
  md: 960,
  lg: 1280,
  xl: 1920,
};

export const CONTAINER_WIDTH = BREAKPOINTS.lg;

export const WIDTHS = {
  small: 120,
  medium: 240,
  large: 480,
};

export const FONT_SIZE = {
  small: "0.75rem",
  medium: "1rem",
  large: "1.25rem",
};

export const HEADER_HEIGHT = 72;
export const SEARCH_TABLE_HEIGHT = `calc(100vh - ${HEADER_HEIGHT + 240}px)`;
export const SEARCH_TABLE_HEIGHT_MOBILE = `calc(100vh - ${HEADER_HEIGHT + 160}px)`;
