import { Component, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error?: unknown };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error(error, errorInfo);
  }

  override render() {
    if (this.state.error !== undefined) {
      return (
        <div style={{ maxWidth: 800, margin: "auto", padding: "24px" }}>
          <h2>エラーが発生しました。</h2>
          <p>
            以下のボタンを押して再実行してください。何度も発生する場合は管理者にお問い合わせください。
          </p>
          <button onClick={() => window.location.assign(window.location.origin)}>再実行する</button>
          <details style={{ marginTop: "40px" }}>{String(this.state.error)}</details>
        </div>
      );
    }

    return this.props.children;
  }
}
