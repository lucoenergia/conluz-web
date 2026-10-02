import React, { type ReactNode } from "react";
import { SESSION_EXPIRED_MESSAGE } from "../../utils/session";

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
      return <div>{SESSION_EXPIRED_MESSAGE}</div>;
    }
    return this.props.children;
  }
}
