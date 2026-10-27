import { Component, type ReactNode, type ErrorInfo } from "react";

import { Snackbar } from "../Snackbar";

type Props = {
  children?: ReactNode;
  resetKey?: unknown;
  fallback?: (error: Error) => ReactNode;
};
type State = { error: Error | undefined; resetKey: unknown };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: undefined, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey === state.resetKey) return null;
    return { error: undefined, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    /* istanbul ignore next -- DEV is always true in test environment */
    if (import.meta.env.DEV) {
      console.log(error, errorInfo);
    }
  }

  override render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error);
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
