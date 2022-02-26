import { act, renderHook } from "@testing-library/react-hooks";
import { describe, expect, test } from "vitest";
import { ArrayParam, DateParam, NumberParam, StringParam, useQueryParams } from "./useQueryParams";

describe("useQueryParams", () => {
  test("all pattern", () => {
    const { result, rerender } = renderHook(() =>
      useQueryParams(
        {
          a: NumberParam,
          b: StringParam,
          c: ArrayParam,
          d: DateParam,
        },
        () => null,
        {
          state: {},
          key: "",
          pathname: "",
          search: "?a=12345&b=ABCDE&c=XXX&c=YYY&c=ZZZ&d=2022-02-26",
          hash: "",
        }
      )
    );
    expect(result.current[0].a).toBe(12345);
    expect(result.current[0].b).toBe("ABCDE");
    expect(result.current[0].c?.sort().toString()).toBe(["XXX", "YYY", "ZZZ"].sort().toString());
    expect(result.current[0].d?.toISOString()).toBe(new Date("2022-02-26").toISOString());

    act(() => {
      result.current[1]({
        a: 54321,
        b: "EDCBA",
        c: ["PPP", "QQQ", "RRR"],
        d: new Date("2022-02-27"),
      });
      rerender(); // TODO なぜこれが必要かを検討する
    });

    expect(result.current[0].a).toBe(54321);
    expect(result.current[0].b).toBe("EDCBA");
    expect(result.current[0].c?.sort().toString()).toBe(["PPP", "QQQ", "RRR"].sort().toString());
    expect(result.current[0].d?.toISOString()).toBe(new Date("2022-02-27").toISOString());
  });
  test("empty parameters", () => {
    const { result } = renderHook(() =>
      useQueryParams(
        {
          a: NumberParam,
          b: StringParam,
          c: ArrayParam,
          d: DateParam,
        },
        () => null,
        {
          state: {},
          key: "",
          pathname: "",
          search: "",
          hash: "",
        }
      )
    );
    expect(result.current[0].a).toBeUndefined();
    expect(result.current[0].b).toBeUndefined();
    expect(result.current[0].c).toBeUndefined();
    expect(result.current[0].d).toBeUndefined();
  });
  test("other parameters", () => {
    const { result } = renderHook(() =>
      useQueryParams(
        {
          a: NumberParam,
          b: NumberParam,
          c: NumberParam,
          d: DateParam,
          e: DateParam,
          f: DateParam,
        },
        () => null,
        {
          state: {},
          key: "",
          pathname: "",
          search: "?a=XXXXX&b=&c=0&d=YYYYY&e=&f=2022-13-29",
          hash: "",
        }
      )
    );
    expect(result.current[0].a).toBeNull();
    expect(result.current[0].b).toBeNull();
    expect(result.current[0].c).toBe(0);
    expect(result.current[0].d).toBeNull();
    expect(result.current[0].e).toBeNull();
    expect(result.current[0].f).toBeNull();
  });
});
