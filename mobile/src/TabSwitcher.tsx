import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Image, Modal, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BrowserTab } from './policy';
import { displayHost } from './policy';
import { privatePalette } from './themes';

export type SwitcherColors = { base: string; panel: string; raised: string; accent: string; accentText: string; text: string; muted: string; border: string; dark: boolean };
const PRIVATE = privatePalette;

type Props = {
  visible: boolean; tabs: BrowserTab[]; activeId: string; colors: SwitcherColors;
  onSelect: (id: string) => void; onClose: (id: string) => void; onCloseAll: (privateTabs: boolean) => void; onNew: (privateTab: boolean) => void; onDismiss: () => void;
};
type Look = { accent: string; text: string; muted: string; panel: string; base: string; border: string; onAccent: string };

/** Full-screen grid of page cards with a Tabs | Private segmented control. */
export function TabSwitcher({ visible, tabs, activeId, colors, onSelect, onClose, onCloseAll, onNew, onDismiss }: Props) {
  const [mode, setMode] = useState<'tabs' | 'private'>('tabs');
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 16 * 3) / 2);
  const isPrivate = mode === 'private';
  const shown = tabs.filter(tab => !!tab.privateTab === isPrivate);
  const look: Look = isPrivate
    ? { accent: PRIVATE.accent, text: PRIVATE.text, muted: PRIVATE.muted, panel: PRIVATE.panel, base: PRIVATE.base, border: PRIVATE.border, onAccent: PRIVATE.base }
    : { accent: colors.accent, text: colors.text, muted: colors.muted, panel: colors.panel, base: colors.base, border: colors.border, onAccent: colors.accentText };
  // Open on the section that holds the active tab, the way Chrome does.
  useEffect(() => { if (visible) setMode(tabs.find(tab => tab.id === activeId)?.privateTab ? 'private' : 'tabs'); }, [visible]);
  console.info('[TabSwitcher] Rendering', { visible, mode, count: shown.length });
  return <Modal visible={visible} animationType="fade" onRequestClose={onDismiss}>
    <SafeAreaView style={[styles.screen, { backgroundColor: look.base }]}>
      <View style={styles.header}>
        <View style={[styles.segment, { backgroundColor: look.panel, borderColor: look.border }]}>
          {(['tabs', 'private'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[styles.segmentItem, mode === value && { backgroundColor: look.accent }]}>
            <MaterialIcons name={value === 'tabs' ? 'tab' : 'visibility-off'} size={16} color={mode === value ? look.onAccent : look.muted} />
            <Text style={{ color: mode === value ? look.onAccent : look.muted, fontWeight: '700', fontSize: 13 }}>{value === 'tabs' ? 'Tabs' : 'Private'}</Text>
          </Pressable>)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {shown.length > 1 && <Pressable accessibilityRole="button" onPress={() => onCloseAll(isPrivate)} style={styles.textButton}><Text style={{ color: look.muted, fontWeight: '700', fontSize: 13 }}>Close all</Text></Pressable>}
          <Pressable accessibilityRole="button" accessibilityLabel="Close tab switcher" onPress={onDismiss} style={styles.iconButton}><MaterialIcons name="close" size={26} color={look.text} /></Pressable>
        </View>
      </View>
      {shown.length === 0 && <View style={styles.empty}>
        <MaterialIcons name={isPrivate ? 'visibility-off' : 'tab'} size={44} color={look.accent} />
        <Text style={[styles.emptyTitle, { color: look.text }]}>{isPrivate ? 'Private tabs stay out of history' : 'No open tabs'}</Text>
        <Text style={[styles.emptyBody, { color: look.muted }]}>{isPrivate ? 'Pages you open here are not saved to history or restored next time. Android WebView shares cookies and site data with your other tabs, so sign-ins carry over.' : 'Open a new tab to get started.'}</Text>
        <Pressable accessibilityRole="button" onPress={() => onNew(isPrivate)} style={[styles.primary, { backgroundColor: look.accent }]}><Text style={{ color: look.onAccent, fontWeight: '700' }}>{isPrivate ? 'New private tab' : 'New tab'}</Text></Pressable>
      </View>}
      <FlatList data={shown} numColumns={2} keyExtractor={tab => tab.id} contentContainerStyle={styles.grid} columnWrapperStyle={{ gap: 16 }}
        renderItem={({ item: tab }) => <TabCard tab={tab} active={tab.id === activeId} width={cardWidth} look={look} onSelect={() => onSelect(tab.id)} onClose={() => onClose(tab.id)} />} />
      <Text style={[styles.hint, { color: look.muted }]}>Swipe a card sideways to close it</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={isPrivate ? 'New private tab' : 'New tab'} onPress={() => onNew(isPrivate)} style={[styles.fab, { backgroundColor: look.accent }]}><MaterialIcons name="add" size={30} color={look.onAccent} /></Pressable>
    </SafeAreaView>
  </Modal>;
}

/** One page card; drag it sideways past a third of its width to close. */
function TabCard({ tab, active, width, look, onSelect, onClose }: { tab: BrowserTab; active: boolean; width: number; look: Look; onSelect: () => void; onClose: () => void }) {
  const drag = useRef(new Animated.Value(0)).current;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderMove: (_, gesture) => drag.setValue(gesture.dx),
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > width / 3 || Math.abs(gesture.vx) > 1.2) {
        console.info('[TabSwitcher] Swipe closed a tab');
        Animated.timing(drag, { toValue: Math.sign(gesture.dx) * width * 1.5, duration: 160, useNativeDriver: true }).start(onClose);
      } else Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  const opacity = drag.interpolate({ inputRange: [-width, 0, width], outputRange: [0.2, 1, 0.2] });
  return <Animated.View {...pan.panHandlers} style={[styles.card, { width, backgroundColor: look.panel, borderColor: active ? look.accent : look.border, transform: [{ translateX: drag }], opacity }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${tab.title || 'New tab'}`} accessibilityState={{ selected: active }} onPress={onSelect} style={{ flex: 1 }}>
      {tab.thumbnail ? <Image source={{ uri: tab.thumbnail }} style={[styles.thumb, { width: width - 2 }]} resizeMode="cover" /> : <View style={[styles.thumb, styles.thumbEmpty, { width: width - 2, backgroundColor: look.base }]}><MaterialIcons name={tab.url ? 'public' : 'add'} size={30} color={look.muted} /></View>}
    </Pressable>
    <View style={styles.cardFooter}>
      <View style={[styles.favicon, { backgroundColor: look.accent }]}><Text style={{ color: look.onAccent, fontSize: 11, fontWeight: '800' }}>{(displayHost(tab.url) || 'N')[0]!.toUpperCase()}</Text></View>
      <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: look.text, fontSize: 13, fontWeight: '600' }}>{tab.title || 'New tab'}</Text><Text numberOfLines={1} style={{ color: look.muted, fontSize: 11 }}>{displayHost(tab.url) || 'A fresh start'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Close ${tab.title || 'New tab'}`} onPress={onClose} hitSlop={8}><MaterialIcons name="close" size={18} color={look.muted} /></Pressable>
    </View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  segment: { flexDirection: 'row', borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, padding: 3 }, segmentItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, textButton: { paddingHorizontal: 12, paddingVertical: 10 },
  grid: { padding: 16, gap: 16, paddingBottom: 130 }, card: { borderRadius: 18, borderWidth: 1.5, overflow: 'hidden' },
  thumb: { aspectRatio: 3 / 4 }, thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }, favicon: { width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 80, gap: 12 }, emptyTitle: { fontSize: 22, fontWeight: '600', textAlign: 'center' }, emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  primary: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999, marginTop: 8 },
  hint: { position: 'absolute', left: 20, bottom: 44, fontSize: 12 },
  fab: { position: 'absolute', right: 20, bottom: 28, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
});
