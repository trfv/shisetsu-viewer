import { FC, useLayoutEffect } from "react";

// https://zenn.dev/tak_dcxi/articles/2ac77656aa94c2cd40bf
const setFillHeight = () => {
  console.log("calc");
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
};

let vw = window.innerWidth;

export const SetVh: FC = () => {
  useLayoutEffect(() => {
    setFillHeight();
    const handler = () => {
      if (vw === window.innerWidth) {
        return;
      }
      vw = window.innerWidth;
      setFillHeight();
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return null;
};
