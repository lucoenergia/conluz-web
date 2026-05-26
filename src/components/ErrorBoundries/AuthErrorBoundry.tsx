import React, { type ReactNode } from "react";

type BoundaryError = Error & { status?: number };

interface AuthErrorBoundryProps {
  onError: (error: BoundaryError) => void;
  children: ReactNode;
}

interface AuthErrorBoundryState {
  error: BoundaryError | undefined;
}

export class AuthErrorBoundry extends React.Component<AuthErrorBoundryProps, AuthErrorBoundryState> {
  constructor(props: AuthErrorBoundryProps) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: BoundaryError) {
    if (error.status === 401) return { error };
    throw error;
  }

  componentDidCatch(error: BoundaryError): void {
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
