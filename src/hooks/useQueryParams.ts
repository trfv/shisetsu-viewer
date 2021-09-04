import { formatISO, isValid } from "date-fns/esm";
import * as H from "history";
import { useCallback, useState } from "react";

export const NumberParam = {
  encode: (value: number) => (!!value || value === 0 ? value.toString() : null),
  decode: (value: string[] | null) =>
    value?.[0] !== "" && !isNaN(Number(value?.[0])) ? Number(value?.[0]) : null,
};

export const StringParam = {
  encode: (value: string) => value ?? null,
  decode: (value: string[] | null) => value?.[0] ?? null,
};

export const StringsParam = {
  encode: (value: string[]) => value ?? null,
  decode: (value: string[] | null) => value ?? null,
};

export const DateParam = {
  encode: (value: Date) => formatISO(value, { representation: "date" }) ?? null,
  decode: (value: string[] | null) => {
    const date = value?.[0];
    return date && isValid(new Date(date)) ? new Date(date) : null;
  },
};

interface QueryParamConfig<T> {
  encode: (value: T) => string | string[] | null;
  decode: (value: string[] | null) => T;
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
  return Object.entries(dv).reduce<URLSearchParams>((accum, curr) => {
    const [name, value] = curr;
    const ev = qpm[name].encode(value);
    if (ev) {
      if (Array.isArray(ev)) {
        accum.delete(name);
        ev.forEach((v) => accum.append(name, v));
      } else {
        accum.set(name, ev);
      }
    }
    return accum;
  }, qp);
};

const toDecodedValues = <QPM extends QueryParamsMap>(qp: URLSearchParams, qpm: QPM) => {
  return [...qp.keys()].reduce<DecodedValues<QPM>>((accum, curr) => {
    const [name, value] = [curr as keyof QPM, qp.getAll(curr)];
    accum[name] = qpm[name].decode(value);
    return accum;
  }, {});
};

export const useQueryParams = <QPM extends QueryParamsMap>(
  history: H.History<H.LocationState>,
  qpm: QPM
): [DecodedValues<QPM>, (args: DecodedValues<QPM>) => void] => {
  const [qp, setQP] = useState(new URLSearchParams(history.location.search));

  const setQueryParams = useCallback(
    (dv: DecodedValues<QPM>) => {
      setQP((prev) => {
        const next = toQueryParams(dv, prev, qpm);
        history.replace({
          pathname: history.location.pathname,
          search: next.toString(),
        });
        return next;
      });
    },
    [qpm]
  );

  return [toDecodedValues(qp, qpm), setQueryParams];
};
