/** XS: 0px ~ 599px, and so on. */
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
};

export const CONTAINER_WIDTH = BREAKPOINTS.lg;
export const INNER_WIDTH = BREAKPOINTS.lg - 32;

export const WIDTHS = {
  small: 120,
  medium: 240,
  large: 480,
};

export const HEADER_HEIGHT = 72;
export const MAIN_HEIGHT = `calc(100vh - ${HEADER_HEIGHT}px)`;
export const SEARCH_TABLE_HEIGHT = `calc(max(100vh - ${HEADER_HEIGHT + 280}px, 500px))`;
export const DETAIL_PANEL_HEIGHT = `calc(max(100vh - ${HEADER_HEIGHT + 320}px, 500px))`;
