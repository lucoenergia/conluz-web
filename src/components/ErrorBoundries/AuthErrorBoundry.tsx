import React, { type ReactNode } from "react";

interface AuthErrorBoundryProps {
  onError: Function,
  children: ReactNode
}

interface AuthErrorBoundryState {
  error: Error | undefined
}

export class AuthErrorBoundry extends React.Component<AuthErrorBoundryProps, AuthErrorBoundryState> {
  constructor(props: AuthErrorBoundryProps) {
    super(props);
    this.state = {error: undefined};
  }

  static getDerivedStateFromError(error: Error) {
    return {error};
  }
  
  componentDidCatch(error: Error, _errorInfo: React.ErrorInfo): void {
      this.props.onError(error);
  }

  render() {
    if (this.state.error) {
      return <div>Sesión expirada, por favor vuelve al login</div>
    }
    return this.props.children;
  }
}
