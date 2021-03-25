import React, { Component, ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = {
  error: Error | null;
  errorInfo: ErrorInfo | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  handleClick() {
    this.setState({ error: null, errorInfo: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ maxWidth: "800px", margin: "auto", padding: "20px" }}>
          <h2>エラーが発生しました。以下のボタンを押して再実行してください。</h2>
          <button onClick={this.handleClick}>再実行する</button>
          <details style={{ marginTop: "40px" }}>{this.state.error?.message}</details>
        </div>
      );
    }

    return this.props.children;
  }
}
