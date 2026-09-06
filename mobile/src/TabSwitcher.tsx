import React, { useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BrowserTab } from './policy';
import { displayHost } from './policy';

export type SwitcherColors = { base: string; panel: string; raised: string; accent: string; accentText: string; text: string; muted: string; border: string; dark: boolean };
const PRIVATE = { base: '#2A2438', accent: '#C9B8FF', text: '#EEE9FF', muted: '#B7ADD6', panel: '#352D47' };

type Props = {
  visible: boolean; tabs: BrowserTab[]; activeId: string; colors: SwitcherColors;
  onSelect: (id: string) => void; onClose: (id: string) => void; onNew: (privateTab: boolean) => void; onDismiss: () => void;
};

/** Full-screen grid of page cards with a Tabs | Private segmented control. */
export function TabSwitcher({ visible, tabs, activeId, colors, onSelect, onClose, onNew, onDismiss }: Props) {
  const [mode, setMode] = useState<'tabs' | 'private'>('tabs');
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 16 * 3) / 2);
  const isPrivate = mode === 'private';
  const shown = tabs.filter(tab => !!tab.privateTab === isPrivate);
  const bg = isPrivate ? PRIVATE.base : colors.base;
  const accent = isPrivate ? PRIVATE.accent : colors.accent;
  const text = isPrivate ? PRIVATE.text : colors.text;
  const muted = isPrivate ? PRIVATE.muted : colors.muted;
  const panel = isPrivate ? PRIVATE.panel : colors.panel;
  console.info('[TabSwitcher] Rendering', { visible, mode, count: shown.length });
  return <Modal visible={visible} animationType="fade" onRequestClose={onDismiss}>
    <SafeAreaView style={[styles.screen, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <View style={[styles.segment, { backgroundColor: panel, borderColor: colors.border }]}>
          {(['tabs', 'private'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[styles.segmentItem, mode === value && { backgroundColor: accent }]}>
            <MaterialIcons name={value === 'tabs' ? 'tab' : 'visibility-off'} size={16} color={mode === value ? (isPrivate ? PRIVATE.base : colors.accentText) : muted} />
            <Text style={{ color: mode === value ? (isPrivate ? PRIVATE.base : colors.accentText) : muted, fontWeight: '700', fontSize: 13 }}>{value === 'tabs' ? 'Tabs' : 'Private'}</Text>
          </Pressable>)}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close tab switcher" onPress={onDismiss} style={styles.iconButton}><MaterialIcons name="close" size={26} color={text} /></Pressable>
      </View>
      {shown.length === 0 && <View style={styles.empty}>
        <MaterialIcons name={isPrivate ? 'visibility-off' : 'tab'} size={44} color={accent} />
        <Text style={[styles.emptyTitle, { color: text }]}>{isPrivate ? 'Private tabs stay out of history' : 'No open tabs'}</Text>
        <Text style={[styles.emptyBody, { color: muted }]}>{isPrivate ? 'Pages you open here are not saved to history or restored next time. Cookies are kept separate from your other tabs.' : 'Open a new tab to get started.'}</Text>
        <Pressable accessibilityRole="button" onPress={() => onNew(isPrivate)} style={[styles.primary, { backgroundColor: accent }]}><Text style={{ color: isPrivate ? PRIVATE.base : colors.accentText, fontWeight: '700' }}>{isPrivate ? 'New private tab' : 'New tab'}</Text></Pressable>
      </View>}
      <FlatList data={shown} numColumns={2} keyExtractor={tab => tab.id} contentContainerStyle={styles.grid} columnWrapperStyle={{ gap: 16 }}
        renderItem={({ item: tab }) => <View style={[styles.card, { width: cardWidth, backgroundColor: panel, borderColor: tab.id === activeId ? accent : colors.border }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${tab.title || 'New tab'}`} accessibilityState={{ selected: tab.id === activeId }} onPress={() => onSelect(tab.id)} style={{ flex: 1 }}>
            {tab.thumbnail ? <Image source={{ uri: tab.thumbnail }} style={[styles.thumb, { width: cardWidth - 2 }]} resizeMode="cover" /> : <View style={[styles.thumb, styles.thumbEmpty, { width: cardWidth - 2, backgroundColor: isPrivate ? PRIVATE.base : colors.base }]}><MaterialIcons name={tab.url ? 'public' : 'add'} size={30} color={muted} /></View>}
          </Pressable>
          <View style={styles.cardFooter}>
            <View style={[styles.favicon, { backgroundColor: accent }]}><Text style={{ color: isPrivate ? PRIVATE.base : colors.accentText, fontSize: 11, fontWeight: '800' }}>{(displayHost(tab.url) || 'N')[0]!.toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: text, fontSize: 13, fontWeight: '600' }}>{tab.title || 'New tab'}</Text><Text numberOfLines={1} style={{ color: muted, fontSize: 11 }}>{displayHost(tab.url) || 'A fresh start'}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Close ${tab.title || 'New tab'}`} onPress={() => onClose(tab.id)} hitSlop={8}><MaterialIcons name="close" size={18} color={muted} /></Pressable>
          </View>
        </View>} />
      <Pressable accessibilityRole="button" accessibilityLabel={isPrivate ? 'New private tab' : 'New tab'} onPress={() => onNew(isPrivate)} style={[styles.fab, { backgroundColor: accent }]}><MaterialIcons name="add" size={30} color={isPrivate ? PRIVATE.base : colors.accentText} /></Pressable>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  segment: { flexDirection: 'row', borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, padding: 3 }, segmentItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { padding: 16, gap: 16, paddingBottom: 110 }, card: { borderRadius: 18, borderWidth: 1.5, overflow: 'hidden' },
  thumb: { aspectRatio: 3 / 4 }, thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }, favicon: { width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 80, gap: 12 }, emptyTitle: { fontSize: 22, fontWeight: '600', textAlign: 'center' }, emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  primary: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999, marginTop: 8 },
  fab: { position: 'absolute', right: 20, bottom: 28, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
});
