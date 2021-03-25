// https://levelup.gitconnected.com/debouncing-with-react-hooks-dcef0ba764c6
import { useEffect, useState } from "react";

export const useDebounce = <T>(value: T, wait = 100) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, wait);

    return () => {
      clearTimeout(handler);
    };
  }, [value, wait]);

  return debouncedValue;
};
