import { useCallback, useRef } from "react";

const SENTINEL_OFFSET = 50;

export const useInfiniteScroll = (fetchMore: (() => void) | undefined, itemCount: number) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (element: Element | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!element || !fetchMore) {
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => entries[0]?.isIntersecting && fetchMore()
      );
      observer.observe(element);
      observerRef.current = observer;
    },
    [fetchMore]
  );

  // 0 でクランプしないと、少数件のとき sentinel がどの行にも付かず fetchMore が発火しない。
  const sentinelIndex = Math.max(0, itemCount - SENTINEL_OFFSET);

  return { sentinelRef, sentinelIndex };
};
