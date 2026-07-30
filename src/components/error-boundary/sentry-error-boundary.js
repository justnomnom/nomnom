'use client';

import React from 'react';
import PropTypes from 'prop-types';
import * as Sentry from '@sentry/nextjs';

import { INTEGRATION_FLAGS } from 'src/config-global';
import { captureException as capturePostHogException } from 'src/libs/posthog/posthog-service';

import Error500View from 'src/sections/error/500-view';

const captureError = (error, extraPayload) => {
  if (INTEGRATION_FLAGS.sentry) {
    Sentry.captureException(error, extraPayload ? { extra: extraPayload } : undefined);
  }
  if (INTEGRATION_FLAGS.posthog) {
    capturePostHogException(error, extraPayload || {});
  }
};

// ----------------------------------------------------------------------

export default class SentryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidMount() {
    // Report global errors to Sentry only — don't take over the UI for them.
    // Background failures (third-party scripts, non-critical fetches, browser
    // extensions) reach these listeners while the app is still fully working;
    // only React render errors (getDerivedStateFromError) show the fallback.
    this._handleError = (errorEvent) => {
      captureError(errorEvent.error, { source: 'window.error' });
    };
    this._handleUnhandledRejection = (event) => {
      captureError(event.reason, { source: 'unhandledrejection' });
    };
    window.addEventListener('error', this._handleError);
    window.addEventListener('unhandledrejection', this._handleUnhandledRejection);
  }

  componentDidCatch(error, errorInfo) {
    captureError(error, errorInfo);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this._handleError);
    window.removeEventListener('unhandledrejection', this._handleUnhandledRejection);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      return fallback || <Error500View reset={this.handleReset} />;
    }

    return children;
  }
}

SentryErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};
