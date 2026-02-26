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
  small: 128,
  medium: 256,
  large: 512,
};

export const FONT_SIZE = {
  small: "0.75rem",
  medium: "0.9375rem",
  large: "1.125rem",
};

export const HEADER_HEIGHT = 72;
export const SEARCH_TABLE_HEIGHT = `calc(100dvh - ${HEADER_HEIGHT + 240}px)`;
