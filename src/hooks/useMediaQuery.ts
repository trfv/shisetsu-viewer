import { debounce } from "@material-ui/core/utils";
import { useLayoutEffect, useState } from "react";
import { BREAKPOINTS } from "../constants/styles";

const getCurrentMedia = () => {
  const index = Object.values(BREAKPOINTS).findIndex(
    (value) => window.matchMedia(`only screen and (max-width: ${value}px)`).matches
  );
  return Object.keys(BREAKPOINTS)?.[index - 1];
};

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    const judgeIsMobile = debounce(() => {
      const media = getCurrentMedia();
      const tmpIsMobile = "XS" === media;
      isMobile !== tmpIsMobile && setIsMobile(tmpIsMobile);
    }, 500);
    judgeIsMobile();
    window.addEventListener("resize", judgeIsMobile);
    return () => window.removeEventListener("resize", judgeIsMobile);
  }, []);

  return isMobile;
};
