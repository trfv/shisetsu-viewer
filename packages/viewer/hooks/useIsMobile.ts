import { useMediaQuery, useTheme } from "../utils/theme";

export const useIsMobile = () => {
  const { breakpoints } = useTheme();
  return useMediaQuery(breakpoints.down("sm"));
};
