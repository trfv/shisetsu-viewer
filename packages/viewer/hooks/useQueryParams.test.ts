import { act } from "react";
import { describe, expect, test, vi } from "vitest";
import { renderHook } from "vitest-browser-react";

import { ArrayParam, DateParam, NumberParam, StringParam, useQueryParams } from "./useQueryParams";

describe("NumberParam", () => {
  test("encode: 正の数値を文字列に変換する", () => {
    expect(NumberParam.encode(42)).toBe("42");
  });

  test("encode: 0を文字列に変換する", () => {
    expect(NumberParam.encode(0)).toBe("0");
  });

  test("encode: NaNの場合nullを返す", () => {
    expect(NumberParam.encode(NaN)).toBeNull();
  });

  test("decode: 数値文字列を数値に変換する", () => {
    expect(NumberParam.decode(["42"])).toBe(42);
  });

  test("decode: 空文字列の場合nullを返す", () => {
    expect(NumberParam.decode([""])).toBeNull();
  });

  test("decode: 数値でない文字列の場合nullを返す", () => {
    expect(NumberParam.decode(["abc"])).toBeNull();
  });

  test("decode: nullの場合nullを返す", () => {
    expect(NumberParam.decode(null)).toBeNull();
  });
});

describe("StringParam", () => {
  test("encode: 文字列をそのまま返す", () => {
    expect(StringParam.encode("hello")).toBe("hello");
  });

  test("encode: undefinedの場合nullを返す", () => {
    expect(StringParam.encode(undefined as unknown as string)).toBeNull();
  });

  test("decode: 文字列配列の最初の要素を返す", () => {
    expect(StringParam.decode(["hello"])).toBe("hello");
  });

  test("decode: nullの場合nullを返す", () => {
    expect(StringParam.decode(null)).toBeNull();
  });
});

describe("ArrayParam", () => {
  test("encode: 配列をそのまま返す", () => {
    expect(ArrayParam.encode(["a", "b"])).toEqual(["a", "b"]);
  });

  test("encode: undefinedの場合nullを返す", () => {
    expect(ArrayParam.encode(undefined as unknown as string[])).toBeNull();
  });

  test("decode: 配列をそのまま返す", () => {
    expect(ArrayParam.decode(["a", "b"])).toEqual(["a", "b"]);
  });

  test("decode: nullの場合nullを返す", () => {
    expect(ArrayParam.decode(null)).toBeNull();
  });
});

describe("DateParam", () => {
  test("encode: DateをISO日付文字列に変換する", () => {
    expect(DateParam.encode(new Date("2022-02-26"))).toBe("2022-02-26");
  });

  test("decode: 有効な日付文字列をDateに変換する", () => {
    const result = DateParam.decode(["2022-02-26"]);
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe(new Date("2022-02-26").toISOString());
  });

  test("decode: 無効な日付文字列の場合nullを返す", () => {
    expect(DateParam.decode(["invalid-date"])).toBeNull();
  });

  test("decode: 空文字列の場合nullを返す", () => {
    expect(DateParam.decode([""])).toBeNull();
  });

  test("decode: nullの場合nullを返す", () => {
    expect(DateParam.decode(null)).toBeNull();
  });
});

describe("useQueryParams", () => {
  test("all pattern", async () => {
    const setLocationMock = vi.fn();
    const { result, rerender } = await renderHook(
      (props?: { search: string }) =>
        useQueryParams(
          {
            a: NumberParam,
            b: StringParam,
            c: ArrayParam,
            d: DateParam,
          },
          setLocationMock,
          props?.search ?? "",
          ""
        ),
      { initialProps: { search: "a=12345&b=ABCDE&c=XXX&c=YYY&c=ZZZ&d=2022-02-26" } }
    );
    expect(result.current[0].a).toBe(12345);
    expect(result.current[0].b).toBe("ABCDE");
    expect(result.current[0].c?.sort().toString()).toBe(["XXX", "YYY", "ZZZ"].sort().toString());
    expect(result.current[0].d?.toISOString()).toBe(new Date("2022-02-26").toISOString());

    await act(() => {
      result.current[1]({
        a: 54321,
        b: "EDCBA",
        c: ["PPP", "QQQ", "RRR"],
        d: new Date("2022-02-27"),
      });
    });

    // setQueryParams は内部 state を持たず、setLocation で URL 更新を要求する。
    expect(setLocationMock).toHaveBeenCalledTimes(1);
    const [to, options] = setLocationMock.mock.calls[0] ?? [];
    expect(options).toEqual({ replace: true });

    // 要求された URL で再レンダされた（= wouter が URL を更新した）体で復号値を検証する。
    await rerender({ search: (to as string).split("?")[1] ?? "" });
    expect(result.current[0].a).toBe(54321);
    expect(result.current[0].b).toBe("EDCBA");
    expect(result.current[0].c?.sort().toString()).toBe(["PPP", "QQQ", "RRR"].sort().toString());
    expect(result.current[0].d?.toISOString()).toBe(new Date("2022-02-27").toISOString());
  });
  test("search prop の変更で復号値が再同期する", async () => {
    // ブラウザの戻る/進むで wouter の useSearch() が新しい値を返す状況の再現。
    // 内部 state に固定していると search 変更を無視してしまう（このテストが再同期を強制する）。
    const { result, rerender } = await renderHook(
      (props?: { search: string }) =>
        useQueryParams({ a: NumberParam, b: StringParam }, () => {}, props?.search ?? "", ""),
      { initialProps: { search: "a=1&b=first" } }
    );
    expect(result.current[0].a).toBe(1);
    expect(result.current[0].b).toBe("first");

    await rerender({ search: "a=2&b=second" });

    expect(result.current[0].a).toBe(2);
    expect(result.current[0].b).toBe("second");
  });
  test("empty parameters", async () => {
    const { result } = await renderHook(() =>
      useQueryParams(
        {
          a: NumberParam,
          b: StringParam,
          c: ArrayParam,
          d: DateParam,
        },
        () => {},
        "",
        ""
      )
    );
    expect(result.current[0].a).toBeUndefined();
    expect(result.current[0].b).toBeUndefined();
    expect(result.current[0].c).toBeUndefined();
    expect(result.current[0].d).toBeUndefined();
  });
  test("other parameters", async () => {
    const { result } = await renderHook(() =>
      useQueryParams(
        {
          a: NumberParam,
          b: NumberParam,
          c: NumberParam,
          d: DateParam,
          e: DateParam,
          f: DateParam,
        },
        () => {},
        "a=XXXXX&b=&c=0&d=YYYYY&e=&f=2022-13-29",
        ""
      )
    );
    expect(result.current[0].a).toBeNull();
    expect(result.current[0].b).toBeNull();
    expect(result.current[0].c).toBe(0);
    expect(result.current[0].d).toBeNull();
    expect(result.current[0].e).toBeNull();
    expect(result.current[0].f).toBeNull();
  });

  test("setQueryParams with array values exercises toQueryParams array branch", async () => {
    const setLocationMock = vi.fn();
    const { result } = await renderHook(() =>
      useQueryParams(
        {
          tags: ArrayParam,
          count: NumberParam,
        },
        setLocationMock,
        "",
        "/test"
      )
    );

    await act(() => {
      result.current[1]({
        tags: ["a", "b", "c"],
        count: 5,
      });
    });

    expect(setLocationMock).toHaveBeenCalledTimes(1);
    const [to, options] = setLocationMock.mock.calls[0] ?? [];
    expect(options).toEqual({ replace: true });
    const params = new URLSearchParams((to as string).split("?")[1]);
    expect(params.getAll("tags")).toEqual(["a", "b", "c"]);
    expect(params.get("count")).toBe("5");
  });

  test("setQueryParams with null encode result deletes parameter from URL", async () => {
    const setLocationMock = vi.fn();
    const { result } = await renderHook(() =>
      useQueryParams(
        {
          name: StringParam,
          value: StringParam,
        },
        setLocationMock,
        "name=hello&value=world",
        "/test"
      )
    );

    expect(result.current[0].name).toBe("hello");
    expect(result.current[0].value).toBe("world");

    // name を null にすると URL から削除され、value は残る。
    await act(() => {
      result.current[1]({
        name: null as unknown as string,
      });
    });

    expect(setLocationMock).toHaveBeenCalledWith("/test?value=world", { replace: true });
  });

  test("toDecodedValues with existing query params maps all keys", async () => {
    const { result } = await renderHook(() =>
      useQueryParams(
        {
          name: StringParam,
          ids: ArrayParam,
        },
        () => {},
        "name=test&ids=1&ids=2",
        ""
      )
    );

    expect(result.current[0].name).toBe("test");
    expect(result.current[0].ids).toEqual(["1", "2"]);
  });
});
