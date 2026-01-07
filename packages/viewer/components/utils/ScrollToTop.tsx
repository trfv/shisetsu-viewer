import { useLayoutEffect, type FC } from "react";

export const ScrollToTop: FC = () => {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return null;
};
