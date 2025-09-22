import React, { type ReactNode } from "react";

interface AuthErrorBoundryProps {
  onError: Function;
  children: ReactNode;
}

interface AuthErrorBoundryState {
  error: any | undefined;
}

export class AuthErrorBoundry extends React.Component<AuthErrorBoundryProps, AuthErrorBoundryState> {
  constructor(props: AuthErrorBoundryProps) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: any) {
    if (error.status === 401) return { error };
    throw error;
  }

  componentDidCatch(error: any, _errorInfo: React.ErrorInfo): void {
    if (error.status && error.status === 401) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.error?.status === 401) {
      return <div>Sesión expirada, por favor vuelve al login</div>;
    }
    return this.props.children;
  }
}
