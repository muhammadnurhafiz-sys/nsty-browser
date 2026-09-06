import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type State = { error: Error | null };

/** Renders JavaScript errors instead of letting the release app close silently. */
export class CrashScreen extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('[CrashScreen] Render error', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return <Report title="Nsty Browser hit a problem" error={this.state.error} />;
  }
}

export function Report({ title, error }: { title: string; error: Error }) {
  return <View style={styles.screen}><ScrollView contentContainerStyle={styles.body}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.hint}>Please screenshot this screen and send it to the developer.</Text>
    <Text selectable style={styles.mono}>{String(error?.message ?? error)}</Text>
    <Text selectable style={styles.stack}>{String(error?.stack ?? '').slice(0, 4000)}</Text>
  </ScrollView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#17191C' }, body: { padding: 24, paddingTop: 64 },
  title: { color: '#F0F1EC', fontSize: 22, fontWeight: '700', marginBottom: 8 }, hint: { color: '#B0B4BA', fontSize: 14, marginBottom: 20 },
  mono: { color: '#F4A49A', fontFamily: 'monospace', fontSize: 14, marginBottom: 16 }, stack: { color: '#B0B4BA', fontFamily: 'monospace', fontSize: 11, lineHeight: 16 },
});
