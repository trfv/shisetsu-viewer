import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { requestInterval } from "./interval";

describe("requestInterval", () => {
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let nextId: number;
  let rafSpy: ReturnType<typeof vi.spyOn>;
  let cafSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rafCallbacks = new Map();
    nextId = 1;

    rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      const id = nextId++;
      rafCallbacks.set(id, cb);
      return id;
    });

    cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      rafCallbacks.delete(id);
    });

    vi.spyOn(Date.prototype, "getTime").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("registers a requestAnimationFrame callback on creation", () => {
    requestInterval(() => {}, 1000);
    expect(rafSpy).toHaveBeenCalledOnce();
  });

  test("does not call callback before delay has elapsed", () => {
    const callback = vi.fn();
    requestInterval(callback, 1000);

    vi.spyOn(Date.prototype, "getTime").mockReturnValue(500);

    const firstCb = rafCallbacks.get(1);
    expect(firstCb).toBeDefined();
    firstCb!(500);

    expect(callback).not.toHaveBeenCalled();
  });

  test("calls callback after delay has elapsed", () => {
    const callback = vi.fn();
    requestInterval(callback, 1000);

    vi.spyOn(Date.prototype, "getTime").mockReturnValue(1000);

    const firstCb = rafCallbacks.get(1);
    expect(firstCb).toBeDefined();
    firstCb!(1000);

    expect(callback).toHaveBeenCalledOnce();
  });

  test("calls callback when time exceeds delay", () => {
    const callback = vi.fn();
    requestInterval(callback, 1000);

    vi.spyOn(Date.prototype, "getTime").mockReturnValue(1500);

    const firstCb = rafCallbacks.get(1);
    expect(firstCb).toBeDefined();
    firstCb!(1500);

    expect(callback).toHaveBeenCalledOnce();
  });

  test("schedules next requestAnimationFrame after each loop iteration", () => {
    const callback = vi.fn();
    requestInterval(callback, 1000);

    expect(rafSpy).toHaveBeenCalledTimes(1);

    vi.spyOn(Date.prototype, "getTime").mockReturnValue(500);
    const firstCb = rafCallbacks.get(1);
    firstCb!(500);

    expect(rafSpy).toHaveBeenCalledTimes(2);
  });

  test("returns a cleanup function", () => {
    const cancel = requestInterval(() => {}, 1000);
    expect(typeof cancel).toBe("function");
  });

  test("cleanup function calls cancelAnimationFrame", () => {
    const cancel = requestInterval(() => {}, 1000);
    cancel();
    expect(cafSpy).toHaveBeenCalledOnce();
  });

  test("cleanup function cancels the pending frame", () => {
    const callback = vi.fn();
    const cancel = requestInterval(callback, 1000);

    cancel();

    expect(cafSpy).toHaveBeenCalledWith(1);
  });

  test("cleanup cancels latest frame id after loop iterations", () => {
    const callback = vi.fn();
    const cancel = requestInterval(callback, 1000);

    vi.spyOn(Date.prototype, "getTime").mockReturnValue(500);
    const firstCb = rafCallbacks.get(1);
    firstCb!(500);

    cancel();
    expect(cafSpy).toHaveBeenCalledWith(2);
  });

  test("callback can fire multiple times across multiple intervals", () => {
    const callback = vi.fn();
    requestInterval(callback, 100);

    vi.spyOn(Date.prototype, "getTime").mockReturnValue(100);
    const firstCb = rafCallbacks.get(1);
    firstCb!(100);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.spyOn(Date.prototype, "getTime").mockReturnValue(200);
    const secondCb = rafCallbacks.get(2);
    secondCb!(200);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
