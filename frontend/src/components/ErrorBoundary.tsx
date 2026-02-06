import React from 'react';

type Props = { children: React.ReactNode };
type State = { error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(err: any) { console.error(err); }
  render() {
    if (this.state.error) {
      return (
        <div className="container">
          <h1>Произошла ошибка</h1>
          <div className="error mono">{String(this.state.error.message || this.state.error)}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
