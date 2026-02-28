import { useEffect, useState } from "react";
import { BREAKPOINTS } from "../constants/styles";

const query = `(max-width: ${BREAKPOINTS.sm - 1}px)`;

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
};
