import { Component, type ReactNode, type ErrorInfo } from "react";
import { Snackbar } from "../SnackBar";

type Props = { children?: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    /* istanbul ignore next -- DEV is always true in test environment */
    if (import.meta.env.DEV) {
      console.log(error, errorInfo);
    }
  }

  override componentDidMount() {
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  override componentWillUnmount() {
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    /* istanbul ignore next -- DEV is always true in test environment */
    if (import.meta.env.DEV) {
      console.log(event.reason);
    }
    this.setState({ hasError: true });
  };

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
