import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { traceEvent } from '../utils/debugTrace';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    try {
      console.error('[AppErrorBoundary]', error, errorInfo);
      traceEvent(
        'react_error_boundary',
        {
          message: error?.message || 'unknown',
          stack: error?.stack ? String(error.stack).slice(0, 800) : undefined,
          componentStack: errorInfo?.componentStack ? String(errorInfo.componentStack).slice(0, 800) : undefined,
        },
        'error',
      );
    } catch {}
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Bir hata olustu</Text>
        <Text style={styles.subtitle}>
          Uygulama kapanmadan devam etmek icin yeniden dene.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b14',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#07110b',
    fontWeight: '800',
    fontSize: 14,
  },
});

export default AppErrorBoundary;
