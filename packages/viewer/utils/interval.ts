export const requestInterval = (fn: () => void, delay: number) => {
  let start = new Date().getTime();
  let id = 0;

  function loop() {
    const current = new Date().getTime();
    const delta = current - start;

    if (delta >= delay) {
      fn();
      start = new Date().getTime();
    }

    id = requestAnimationFrame(loop);
  }

  id = requestAnimationFrame(loop);

  return () => cancelAnimationFrame(id);
};
