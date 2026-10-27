import { BREAKPOINTS } from "../constants/styles";
import { useMediaQuery } from "./useMediaQuery";

const query = `(max-width: ${BREAKPOINTS.sm - 1}px)`;

export const useIsMobile = () => useMediaQuery(query);
