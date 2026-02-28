import { formatISO, isValid } from "date-fns";
import { useCallback, useState } from "react";
import type { Location, NavigateFunction } from "react-router-dom";

export const NumberParam = {
  encode: (value: number) => (!!value || value === 0 ? value.toString() : null),
  decode: (value: string[] | null) =>
    value?.[0] !== "" && !isNaN(Number(value?.[0])) ? Number(value?.[0]) : null,
};

export const StringParam = {
  encode: (value: string) => value ?? null,
  decode: (value: string[] | null) => value?.[0] ?? null,
};

export const ArrayParam = {
  encode: (value: string[]) => value ?? null,
  decode: (value: string[] | null) => value ?? null,
};

export const DateParam = {
  encode: (value: Date) => formatISO(value, { representation: "date" }),
  decode: (value: string[] | null) => {
    const date = value?.[0];
    return date && isValid(new Date(date)) ? new Date(date) : null;
  },
};

interface QueryParamConfig<T> {
  encode: (value: T) => string | string[] | null;
  decode: (value: string[] | null) => T | null;
}

interface QueryParamsMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [paramName: string]: QueryParamConfig<any>;
}

type DecodedValues<QPM extends QueryParamsMap> = {
  [p in keyof QPM]?: ReturnType<QPM[p]["decode"]>;
};

const toQueryParams = <QPM extends QueryParamsMap>(
  dv: DecodedValues<QPM>,
  qp: URLSearchParams,
  qpm: QPM
) => {
  const next = new URLSearchParams(qp);
  return Object.entries(dv).reduce<URLSearchParams>((accum, curr) => {
    const [name, value] = curr;
    const ev = qpm[name]?.encode(value);
    if (ev) {
      if (Array.isArray(ev)) {
        accum.delete(name);
        ev.forEach((v) => accum.append(name, v));
      } else {
        accum.set(name, ev);
      }
    } else {
      accum.delete(name);
    }
    return accum;
  }, next);
};

const toDecodedValues = <QPM extends QueryParamsMap>(qp: URLSearchParams, qpm: QPM) => {
  return [...qp.keys()].reduce<DecodedValues<QPM>>((accum, curr) => {
    const [name, value] = [curr as keyof QPM, qp.getAll(curr)];
    accum[name] = qpm[name]?.decode(value);
    return accum;
  }, {});
};

export const useQueryParams = <QPM extends QueryParamsMap>(
  qpm: QPM,
  navigate: NavigateFunction,
  location: Location
): [DecodedValues<QPM>, (args: DecodedValues<QPM>) => void] => {
  const [qp, setQP] = useState(new URLSearchParams(location.search));

  const setQueryParams = useCallback(
    (dv: DecodedValues<QPM>) => {
      setQP((prev) => {
        const next = toQueryParams(dv, prev, qpm);
        navigate(
          {
            pathname: location.pathname,
            search: next.toString(),
          },
          { replace: true }
        );
        return next;
      });
    },
    [qpm, navigate, location]
  );

  return [toDecodedValues(qp, qpm), setQueryParams];
};
