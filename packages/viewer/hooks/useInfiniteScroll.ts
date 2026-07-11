import { useCallback, useRef } from "react";

/** 末尾から何番目の行に sentinel を置くか（可視化で fetchMore を先読みするための余白）。 */
const SENTINEL_OFFSET = 50;

/**
 * 無限スクロール用フック。リストの末尾付近に置いた sentinel 要素が可視領域に入ったら
 * fetchMore を呼ぶ。sentinel は末尾から SENTINEL_OFFSET 番目の行に置くが、行数が
 * SENTINEL_OFFSET 未満のときは Math.max で先頭行（index 0）にクランプする。これをしないと
 * `itemCount - SENTINEL_OFFSET` が負値になり sentinel がどの行にも付かず、少数件のときに
 * fetchMore が永久に発火しない。
 *
 * sentinelRef はコールバック ref。sentinel 行が移動すると React が旧要素に null、新要素に
 * 要素を渡して呼ぶため、observer の付け替え（disconnect → observe）が自然に起きる。
 */
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

  const sentinelIndex = Math.max(0, itemCount - SENTINEL_OFFSET);

  return { sentinelRef, sentinelIndex };
};
