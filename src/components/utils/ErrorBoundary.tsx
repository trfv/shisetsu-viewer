import { Component, type ReactNode } from "react";
import { Snackbar } from "../SnackBar";

type Props = { children?: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: !!error };
  }

  private onUnhandledRejection = (event: PromiseRejectionEvent) => {
    event.promise.catch((error) => {
      this.setState(ErrorBoundary.getDerivedStateFromError(error));
    });
  };

  override componentDidMount() {
    window.addEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  override componentWillUnmount() {
    window.removeEventListener("unhandledrejection", this.onUnhandledRejection);
  }

  override componentDidCatch(error: unknown, errorInfo: unknown) {
    if (import.meta.env.DEV) {
      console.log(error);
      console.log(errorInfo);
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Snackbar
          message="予期せぬエラーが発生しました。再読み込みしてください。何度も発生する場合は管理者にお問い合わせください。"
          open={true}
        />
      );
    }
    return this.props.children;
  }
}
