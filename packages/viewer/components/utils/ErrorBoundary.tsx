import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Snackbar } from "../SnackBar";

type Props = { children?: ReactNode };

export const ErrorBoundary = ({ children }: Props) => {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback((error: unknown) => {
    if (import.meta.env.DEV) {
      console.log(error);
    }
    setHasError(true);
  }, []);

  const handleUnhandledRejection = useCallback(
    (event: PromiseRejectionEvent) => {
      event.promise.catch(handleError);
    },
    [handleError]
  );

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      handleError(event.error);
    };

    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [handleError, handleUnhandledRejection]);

  if (hasError) {
    return (
      <Snackbar
        message="予期せぬエラーが発生しました。再読み込みしてください。何度も発生する場合は管理者にお問い合わせください。"
        open={true}
      />
    );
  }

  return children;
};
