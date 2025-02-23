import { useEffect } from "react";

export const useMount = (effect: () => Promise<void>, cancel?: () => void) => {
  useEffect(() => {
    let ignore = false;
    const fn = async () => await effect();
    if (!ignore) fn();
    return () => {
      cancel?.();
      ignore = true;
    };
  }, []);
};
