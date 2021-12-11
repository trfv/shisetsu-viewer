import { ReactNode, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QueryParamProvider as Provider } from "use-query-params";
export {
  ArrayParam,
  BooleanParam,
  DateParam,
  NumberParam,
  StringParam,
  useQueryParams,
} from "use-query-params";

export const QueryParamProvider = ({ children }: { children?: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const history = useMemo(
    () => ({
      replace: (l: Location) => navigate(l, { replace: true, state: location.state }),
      push: (l: Location) => navigate(l, { replace: false, state: location.state }),
    }),
    [navigate, location]
  );

  return <Provider history={history}>{children}</Provider>;
};
