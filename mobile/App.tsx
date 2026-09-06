import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, FlatList, Keyboard, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { address, blockedRequest, isHost, newTab, restorePages, restoreSession, serializeSession } from './src/policy';
import type { BrowserSession, SavedPage } from './src/policy';
import { palettes } from './src/themes';
import type { ThemeChoice } from './src/themes';
import { cosmeticScript, youtubeScript } from './src/shield';

type Panel = 'menu' | 'tabs' | 'bookmarks' | 'history' | 'settings' | 'shield' | 'site' | null;
const KEY = '@nsty/';
const log = (event: string) => console.info(`[Nsty Mobile] ${event}`);

export default function App() { return <SafeAreaProvider><Browser /></SafeAreaProvider>; }
function Browser() {
  const system = useColorScheme();
  const [theme, setTheme] = useState<ThemeChoice>('system');
  const colors = palettes[theme === 'system' ? (system === 'light' ? 'paper' : 'graphite') : theme];
  const [session, setSession] = useState<BrowserSession>(() => restoreSession(null));
  const [sources, setSources] = useState<Record<string, string>>({});
  const [bookmarks, setBookmarks] = useState<SavedPage[]>([]);
  const [history, setHistory] = useState<SavedPage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shield, setShield] = useState(false);
  const [youtube, setYoutube] = useState(false);
  const [exceptions, setExceptions] = useState<string[]>([]);
  const [desktop, setDesktop] = useState(false);
  const [find, setFind] = useState('');
  const [finding, setFinding] = useState(false);
  const [notice, setNotice] = useState('');
  const webviews = useRef<Record<string, WebView | null>>({});
  const inputRef = useRef<TextInput>(null);
  const active = session.tabs.find(tab => tab.id === session.activeId) || session.tabs[0];
  const host = (() => { try { return new URL(active.url).hostname; } catch { return ''; } })();
  const protectedSite = shield && !exceptions.includes(host);
  const stateRef = useRef({ session, bookmarks, history, theme, shield, youtube, exceptions });
  stateRef.current = { session, bookmarks, history, theme, shield, youtube, exceptions };

  useEffect(() => {
    log('Loading browser preferences');
    AsyncStorage.multiGet(['session', 'bookmarks', 'history', 'settings'].map(key => KEY + key)).then(values => {
      const data = Object.fromEntries(values);
      const restored = restoreSession(data[KEY + 'session']);
      setSession(restored); setSources(Object.fromEntries(restored.tabs.map(tab => [tab.id, tab.url])));
      setBookmarks(restorePages(data[KEY + 'bookmarks'])); setHistory(restorePages(data[KEY + 'history']));
      try {
        const settings = JSON.parse(data[KEY + 'settings'] || '{}');
        if (['system', 'graphite', 'paper'].includes(settings.theme)) setTheme(settings.theme);
        setShield(settings.shield === true); setYoutube(settings.youtube === true);
        if (Array.isArray(settings.exceptions)) setExceptions(settings.exceptions.filter((value: unknown) => typeof value === 'string').slice(0, 300));
      } catch { log('Ignoring invalid preferences'); }
      setLoaded(true);
      if (Platform.OS === 'android') Linking.getInitialURL().then(url => { const target = url && address(url); if (target) { const tab = newTab(); tab.url = target; setSession(old => ({ tabs: [...old.tabs, tab], activeId: tab.id })); setSources(old => ({ ...old, [tab.id]: target })); } });
    }).catch(() => { log('Storage read failed'); setNotice('Saved browser data could not be loaded.'); setLoaded(true); });
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => persist(), 350);
    return () => clearTimeout(timer);
  }, [session, bookmarks, history, theme, shield, youtube, exceptions, loaded]);
  useEffect(() => {
    log('Registering browser lifecycle handlers');
    const app = AppState.addEventListener('change', state => { if (state !== 'active' && loaded) persist(); });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (panel) { setPanel(null); return true; }
      if (finding) { setFinding(false); return true; }
      if (canBack) { webviews.current[active.id]?.goBack(); return true; }
      return false;
    });
    const links = Linking.addEventListener('url', event => { const target = address(event.url); if (target) navigate(target); });
    return () => { app.remove(); back.remove(); links.remove(); };
  }, [panel, finding, canBack, active.id, loaded]);
  useEffect(() => { if (!editing) setInput(active.url); }, [active.url, active.id, editing]);
  useEffect(() => { setError(null); setCanBack(false); setCanForward(false); setFinding(false); }, [active.id]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);

  async function persist() {
    log('Saving browser state');
    const state = stateRef.current;
    try { await AsyncStorage.multiSet([[KEY + 'session', serializeSession(state.session)], [KEY + 'bookmarks', JSON.stringify(state.bookmarks)], [KEY + 'history', JSON.stringify(state.history)], [KEY + 'settings', JSON.stringify({ theme: state.theme, shield: state.shield, youtube: state.youtube, exceptions: state.exceptions })]]); }
    catch { setNotice('Could not save browser data. Check available storage.'); }
  }
  function navigate(value: string) {
    log('Navigating active tab');
    const url = address(value);
    if (!url) { setNotice('Enter an HTTP or HTTPS address, or a search.'); return; }
    setSession(old => ({ ...old, tabs: old.tabs.map(tab => tab.id === old.activeId ? { ...tab, url, title: 'Loading…' } : tab) }));
    setSources(old => ({ ...old, [active.id]: url }));
    setInput(url); setEditing(false); setPanel(null); setError(null); setLoading(true); Keyboard.dismiss();
  }
  function addTab() {
    log('Creating tab');
    if (session.tabs.length >= 30) { setNotice('Close a tab before opening another (30 tab limit).'); return; }
    const tab = newTab(); setSession(old => ({ tabs: [...old.tabs, tab], activeId: tab.id }));
    setSources(old => ({ ...old, [tab.id]: '' })); setPanel(null); setInput('');
  }
  function closeTab(id: string) {
    log('Closing tab');
    setSession(old => { const tabs = old.tabs.filter(tab => tab.id !== id); if (!tabs.length) { const tab = newTab(); return { tabs: [tab], activeId: tab.id }; } return { tabs, activeId: old.activeId === id ? tabs[tabs.length - 1].id : old.activeId }; });
    setSources(old => { const next = { ...old }; delete next[id]; return next; });
  }
  function onNavigation(id: string, state: WebViewNavigation) {
    log('Navigation state updated');
    if (!address(state.url)) return;
    setSession(old => ({ ...old, tabs: old.tabs.map(tab => tab.id === id ? { ...tab, url: state.url, title: state.title || 'Untitled page' } : tab) }));
    if (id === active.id) { setCanBack(state.canGoBack); setCanForward(state.canGoForward); setLoading(state.loading); }
    if (!state.loading) setHistory(old => [{ url: state.url, title: state.title || state.url, date: Date.now() }, ...old.filter(page => page.url !== state.url)].slice(0, 300));
  }
  function toggleBookmark() {
    log('Updating bookmark');
    if (!active.url) return;
    const exists = bookmarks.some(page => page.url === active.url);
    setBookmarks(old => exists ? old.filter(page => page.url !== active.url) : [{ url: active.url, title: active.title, date: Date.now() }, ...old].slice(0, 300));
    setNotice(exists ? 'Bookmark removed' : 'Bookmark saved');
  }
  function request(url: string, id: string): boolean {
    const tab = session.tabs.find(item => item.id === id);
    const enabled = shield && !!tab && !exceptions.some(domain => isHost(tab.url, domain));
    if (blockedRequest(url, enabled)) return false;
    if (url === 'about:blank' || address(url)) return true;
    if (/^(mailto:|tel:|sms:)/i.test(url)) {
      log('Requesting confirmation before opening another app');
      Alert.alert('Open another app?', 'This page wants to open a phone, messaging, or email app.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Open', onPress: () => Linking.openURL(url).catch(() => setNotice('No app is available to open this link.')) }]);
    }
    return false;
  }
  function openPanel(next: Panel) { log('Opening browser panel'); setFilter(''); setPanel(next); Keyboard.dismiss(); }
  function clearHistory() { Alert.alert('Clear history?', 'This removes saved browsing history from Nsty.', [{ text: 'Cancel' }, { text: 'Clear', style: 'destructive', onPress: () => setHistory([]) }]); }
  function explain(title: string, message: string) { Alert.alert(title, message); }
  function reload() { setError(null); webviews.current[active.id]?.reload(); }
  function Button({ label, glyph, onPress, selected = false, disabled = false }: { label: string; glyph?: string; onPress: () => void; selected?: boolean; disabled?: boolean }) {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={[styles.button, { backgroundColor: selected ? colors.accent : 'transparent', opacity: disabled ? 0.35 : 1 }]}><Text style={{ color: selected ? colors.accentText : colors.text, fontSize: glyph ? 23 : 14, fontWeight: '600' }}>{glyph || label}</Text></Pressable>;
  }
  function Row({ title, detail, action, right }: { title: string; detail?: string; action?: () => void; right?: React.ReactNode }) {
    return <Pressable accessibilityRole={action ? 'button' : undefined} onPress={action} style={[styles.row, { backgroundColor: colors.panel, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>{detail && <Text style={[styles.detail, { color: colors.muted }]}>{detail}</Text>}</View>{right || (action && <Text style={{ color: colors.muted, fontSize: 22 }}>›</Text>)}</Pressable>;
  }
  const note = (text: string) => <Text style={[styles.note, { color: colors.muted }]}>{text}</Text>;
  const title = (text: string) => <Text style={[styles.sectionTitle, { color: colors.text }]}>{text}</Text>;
  const canBrowse = !!active.url;

  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.screen, { backgroundColor: colors.base }]}>
    <StatusBar style={colors.dark ? 'light' : 'dark'} />
    <View style={[styles.addressRow, { borderColor: colors.border }]}>
      <Button label="Site information" glyph={active.url.startsWith('https:') ? '◈' : 'ⓘ'} onPress={() => openPanel('site')} />
      <TextInput ref={inputRef} accessibilityLabel="Address or search" placeholder="Search or enter address" placeholderTextColor={colors.muted} value={input} onChangeText={setInput} onFocus={() => setEditing(true)} onBlur={() => setEditing(false)} selectTextOnFocus autoCapitalize="none" autoCorrect={false} keyboardType="web-search" returnKeyType="go" onSubmitEditing={() => navigate(input)} style={[styles.address, { color: colors.text, backgroundColor: colors.panel }]} />
      <Button label={loading ? 'Stop loading' : 'Reload page'} glyph={loading ? '×' : '↻'} disabled={!canBrowse} onPress={() => loading ? webviews.current[active.id]?.stopLoading() : reload()} />
    </View>
    {loading && <View accessibilityLabel="Page loading" style={{ height: 2, backgroundColor: colors.accent }} />}
    {finding && <View style={styles.addressRow}><TextInput accessibilityLabel="Find in page" placeholder="Find in page" placeholderTextColor={colors.muted} value={find} onChangeText={setFind} style={[styles.address, { color: colors.text, backgroundColor: colors.panel }]} /><Button label="Find next" glyph="↓" onPress={() => webviews.current[active.id]?.injectJavaScript(`window.find(${JSON.stringify(find)}, false, false, true); true;`)} /><Button label="Close find" glyph="×" onPress={() => setFinding(false)} /></View>}
    <View style={{ flex: 1 }}>
      {loaded && session.tabs.map(tab => tab.url && <View key={tab.id} style={[StyleSheet.absoluteFill, { display: tab.id === active.id ? 'flex' : 'none' }]}>
        <WebView ref={ref => { webviews.current[tab.id] = ref; }} source={{ uri: sources[tab.id] || tab.url }} style={{ flex: 1, backgroundColor: colors.panel }}
          onNavigationStateChange={state => onNavigation(tab.id, state)} onShouldStartLoadWithRequest={event => request(event.url, tab.id)}
          onOpenWindow={event => { const url = address(event.nativeEvent.targetUrl); if (url) { log('Opening requested link in current tab'); navigate(url); } }}
          onLoadStart={() => { if (tab.id === active.id) { setLoading(true); setError(null); } }} onLoadEnd={() => { if (tab.id === active.id) setLoading(false); }}
          onError={event => { log('Page load failed'); if (tab.id === active.id) { setLoading(false); setError(event.nativeEvent.description || 'This page could not be loaded.'); } }}
          onRenderProcessGone={() => { log('Web content process exited'); setError('This tab stopped responding. Reload to continue.'); }}
          javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled={false} javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows allowsFullscreenVideo allowsBackForwardNavigationGestures allowsInlineMediaPlayback mediaPlaybackRequiresUserAction
          allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false} mixedContentMode="never" geolocationEnabled={false}
          originWhitelist={['*']} webviewDebuggingEnabled={false}
          userAgent={desktop ? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' : undefined}
          injectedJavaScript={shield && !exceptions.some(domain => isHost(tab.url, domain)) ? cosmeticScript + (youtube && isHost(tab.url, 'youtube.com') ? youtubeScript : '') : undefined}
        />
      </View>)}
      {!active.url && <ScrollView contentContainerStyle={styles.landing} keyboardShouldPersistTaps="handled">
        <View style={[styles.brand, { backgroundColor: colors.accent }]}><Text style={{ fontSize: 27, fontWeight: '800', color: colors.accentText }}>n.</Text></View>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>A LITTLE SPACE TO EXPLORE</Text>
        <Text style={[styles.hero, { color: colors.text }]}>Make room{ '\n' }for discovery.</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Your tabs, your pace. A calmer place for the web.</Text>
        <Pressable accessibilityRole="button" onPress={() => inputRef.current?.focus()} style={[styles.searchCard, { backgroundColor: colors.panel, borderColor: colors.border }]}><Text style={{ color: colors.muted, fontSize: 16 }}>⌕   Search anything, go anywhere</Text><Text style={{ color: colors.accent }}>↗</Text></Pressable>
        {title('Your shortcuts')}
        <View style={styles.shortcuts}>{[['YouTube', 'https://youtube.com', '▶'], ['Wikipedia', 'https://wikipedia.org', 'W'], ['GitHub', 'https://github.com', '⌘']].map(([label, url, glyph]) => <Pressable key={label} accessibilityRole="button" onPress={() => navigate(url)} style={[styles.shortcut, { backgroundColor: colors.panel, borderColor: colors.border }]}><Text style={{ fontSize: 24, color: colors.accent }}>{glyph}</Text><Text style={{ fontSize: 12, color: colors.text, marginTop: 12 }}>{label}</Text></Pressable>)}</View>
        <Row title={shield ? 'Shield controls enabled' : 'Browse with intention'} detail={shield ? 'Cosmetic filtering and selected navigation checks' : 'Choose how Nsty looks and protects your browsing.'} action={() => openPanel(shield ? 'shield' : 'settings')} />
        {bookmarks.length > 0 && <><View style={styles.sectionHeading}>{title('Saved for later')}<Button label="View all" onPress={() => openPanel('bookmarks')} /></View>{bookmarks.slice(0, 3).map(page => <Row key={page.url} title={page.title} detail={new URL(page.url).hostname} action={() => navigate(page.url)} />)}</>}
      </ScrollView>}
      {error && <View style={[StyleSheet.absoluteFill, styles.error, { backgroundColor: colors.base }]}><Text style={{ fontSize: 42, color: colors.accent }}>↻</Text><Text style={[styles.hero, { color: colors.text, fontSize: 28 }]}>Let’s try that again.</Text>{note(error)}<Button label="Reload page" selected onPress={reload} /></View>}
    </View>
    {!!notice && <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: colors.raised }]}><Text style={{ color: colors.text }}>{notice}</Text></View>}
    <View style={[styles.toolbar, { backgroundColor: colors.panel, borderColor: colors.border }]}>
      <Button label="Go back" glyph="‹" disabled={!canBack} onPress={() => webviews.current[active.id]?.goBack()} />
      <Button label="Go forward" glyph="›" disabled={!canForward} onPress={() => webviews.current[active.id]?.goForward()} />
      <Button label="New tab" glyph="+" onPress={addTab} />
      <Button label={`${session.tabs.length} tabs`} glyph={`▢ ${session.tabs.length}`} onPress={() => openPanel('tabs')} />
      <Button label="Browser menu" glyph="☰" onPress={() => openPanel('menu')} />
    </View>
    <Modal visible={panel !== null} animationType="slide" transparent onRequestClose={() => setPanel(null)}>
      <View style={styles.modalBackdrop}><Pressable accessibilityLabel="Close panel" style={{ flex: 1 }} onPress={() => setPanel(null)} /><SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.base, borderColor: colors.border }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.sheetHeading}><Text style={[styles.sheetTitle, { color: colors.text }]}>{({ menu: 'Your browser', tabs: 'Open tabs', bookmarks: 'Bookmarks', history: 'History', settings: 'Settings', shield: 'Nsty Shield', site: 'Site information' } as const)[panel || 'menu']}</Text><Button label="Close panel" glyph="×" onPress={() => setPanel(null)} /></View>
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          {panel === 'menu' && <>
            <View style={styles.menuQuick}><Button label="New tab" glyph="+" onPress={addTab} /><Button label="Bookmark page" glyph={bookmarks.some(page => page.url === active.url) ? '★' : '☆'} disabled={!canBrowse} onPress={toggleBookmark} /><Button label="Share page" glyph="↗" disabled={!canBrowse} onPress={() => Share.share({ message: active.url }).catch(() => setNotice('Sharing is unavailable.'))} /><Button label="Copy address" glyph="▣" disabled={!canBrowse} onPress={() => { Clipboard.setStringAsync(active.url); setNotice('Address copied'); }} /></View>
            <Row title="Bookmarks" detail={`${bookmarks.length} saved pages`} action={() => openPanel('bookmarks')} />
            <Row title="History" detail="Pick up where you left off" action={() => openPanel('history')} />
            <Row title="Downloads" detail="Files are saved by Android Download Manager" action={() => explain('Downloads', 'Downloads from supported links are handled by Android Download Manager. Open the Files app → Downloads to view them. Some sign-in protected or blob downloads may not be supported.')} />
            <Row title="Find in page" action={() => { setPanel(null); setFinding(true); }} />
            <Row title="Desktop site" detail="Request a desktop page layout" right={<Switch accessibilityLabel="Desktop site" value={desktop} trackColor={{ true: colors.accent }} onValueChange={value => { setDesktop(value); setPanel(null); setTimeout(reload, 150); }} />} />
            <Row title="Nsty Shield" detail={shield ? 'Controls enabled' : 'Optional controls · off'} action={() => openPanel('shield')} />
            <Row title="Extensions" detail="Unavailable on Android WebView" action={() => explain('Extensions on Android', 'This Android build uses Chromium through Android System WebView. It cannot install Chrome Web Store extensions. Desktop Nsty supports a limited subset of extensions.')} />
            <Row title="Private browsing" detail="Not available in this build" action={() => explain('Private browsing unavailable', 'Android WebView shares browser storage. This build does not yet provide an isolated private session. Browsing tabs here use the regular session.')} />
            <Row title="Settings" detail="Appearance, privacy and browser information" action={() => openPanel('settings')} />
          </>}
          {panel === 'tabs' && <><Row title="New tab" detail="Start with a little space" action={addTab} />{session.tabs.map(tab => <View key={tab.id} style={[styles.tabRow, { backgroundColor: tab.id === active.id ? colors.raised : colors.panel, borderColor: tab.id === active.id ? colors.accent : colors.border }]}><Pressable accessibilityRole="button" accessibilityState={{ selected: tab.id === active.id }} onPress={() => { setSession(old => ({ ...old, activeId: tab.id })); setPanel(null); }} style={{ flex: 1, padding: 16 }}><Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{tab.title}</Text><Text numberOfLines={1} style={[styles.detail, { color: colors.muted }]}>{tab.url || 'A fresh start'}</Text></Pressable><Button label={`Close ${tab.title}`} glyph="×" onPress={() => closeTab(tab.id)} /></View>)}</>}
          {(panel === 'bookmarks' || panel === 'history') && <>
            <TextInput accessibilityLabel={`Search ${panel}`} placeholder={`Search ${panel}`} placeholderTextColor={colors.muted} value={filter} onChangeText={setFilter} style={[styles.filter, { color: colors.text, backgroundColor: colors.panel, borderColor: colors.border }]} />
            {panel === 'bookmarks' && canBrowse && <Row title={bookmarks.some(page => page.url === active.url) ? 'Remove current bookmark' : 'Save current page'} action={toggleBookmark} />}
            {panel === 'history' && history.length > 0 && <Button label="Clear history" onPress={clearHistory} />}
            {(panel === 'bookmarks' ? bookmarks : history).filter(page => `${page.title} ${page.url}`.toLowerCase().includes(filter.toLowerCase())).map(page => <View key={page.url} style={styles.libraryRow}><View style={{ flex: 1 }}><Row title={page.title} detail={`${new URL(page.url).hostname}${panel === 'history' ? ' · ' + new Date(page.date).toLocaleDateString() : ''}`} action={() => navigate(page.url)} /></View><Button label={`Remove ${page.title}`} glyph="×" onPress={() => panel === 'bookmarks' ? setBookmarks(old => old.filter(item => item.url !== page.url)) : setHistory(old => old.filter(item => item.url !== page.url))} /></View>)}
            {!(panel === 'bookmarks' ? bookmarks : history).length && note(panel === 'bookmarks' ? 'Your favorite corners of the web belong here. Save a page from the browser menu.' : 'Pages you visit will appear here.')}
          </>}
          {panel === 'settings' && <>
            {title('Appearance')}{(['system', 'graphite', 'paper'] as ThemeChoice[]).map(choice => <Row key={choice} title={{ system: 'Follow device', graphite: 'Graphite + Sage', paper: 'Warm Paper' }[choice]} detail={{ system: 'Switch with your Android appearance', graphite: 'Neutral graphite, soft sage accents', paper: 'Warm ivory, quiet olive accents' }[choice]} action={() => setTheme(choice)} right={<Text style={{ color: colors.accent, fontSize: 22 }}>{theme === choice ? '●' : '○'}</Text>} />)}
            {title('Privacy & browsing')}<Row title="Clear browsing history" action={clearHistory} /><Row title="Site access" detail="Camera, microphone and location are disabled in this build" action={() => explain('Site access', 'Camera, microphone and location requests are denied. These permissions are not declared by this app. File uploads use the Android document picker and only expose files you choose.')} />
            <Row title="Cookies & site data" detail="Managed by Android WebView" action={() => explain('Clear all browser data', 'To remove cookies and all saved data, use Android Settings → Apps → Nsty Browser → Storage → Clear storage. This also removes tabs, bookmarks and preferences.')} />
            <Row title="Nsty Shield" action={() => openPanel('shield')} />
            {title('About Nsty')}{note('Nsty Browser 0.5.0 · Expo + Android System WebView. Keep Android System WebView updated for browser security updates. Google search is the default. Bookmarks and history stay on this device; no sync service is connected.')}
          </>}
          {panel === 'shield' && <>
            <View style={[styles.shieldHero, { backgroundColor: colors.panel }]}><Text style={{ fontSize: 34, color: colors.accent }}>◇</Text><Text style={[styles.rowTitle, { color: colors.text, marginTop: 12 }]}>Your web. A little quieter.</Text>{note('Optional cosmetic ad hiding and checks for selected ad destinations. These controls do not block all network requests.')}</View>
            <Row title="Enable Shield controls" detail="Applies on the next page load" right={<Switch accessibilityLabel="Enable Shield controls" value={shield} trackColor={{ true: colors.accent }} onValueChange={value => { log('Updating Shield preference'); setShield(value); }} />} />
            <Row title="YouTube assistance" detail="Hide selected ad placements and click visible skip buttons. Requires Shield; reload after changes." right={<Switch accessibilityLabel="YouTube assistance" value={youtube} disabled={!shield} trackColor={{ true: colors.accent }} onValueChange={value => { log('Updating YouTube preference'); setYoutube(value); }} />} />
            {host && <Row title="Enable on this site" detail={host} right={<Switch accessibilityLabel="Enable Shield on this site" disabled={!shield} value={!exceptions.includes(host)} trackColor={{ true: colors.accent }} onValueChange={value => setExceptions(old => value ? old.filter(item => item !== host) : [...old, host])} />} />}
            {note('YouTube ad delivery changes frequently. This is experimental assistance, not guaranteed ad blocking or Brave/uBlock parity. No blocked-ad counters are estimated or invented.')}
            {canBrowse && <Button label="Reload page to apply" selected onPress={() => { setPanel(null); reload(); }} />}
          </>}
          {panel === 'site' && <>
            <Row title={active.url.startsWith('https:') ? 'HTTPS address' : active.url ? 'Unencrypted HTTP address' : 'Nsty new tab'} detail={active.url || 'An internal browser screen'} />
            {note(active.url.startsWith('https:') ? 'Android WebView validates the connection certificate. Invalid certificates are never bypassed.' : active.url ? 'This address uses HTTP. Information sent to this site may be visible to others on the network.' : 'Open a website to see its address and controls.')}
            <Row title="Camera, microphone & location" detail="Blocked in this build" />
            <Row title="File uploads" detail="Only files you choose in the Android picker" />
            <Row title="Third-party cookies" detail="Blocked" />
            <Row title="Shield on this site" detail={protectedSite ? 'Controls enabled' : 'Off'} action={() => openPanel('shield')} />
          </>}
        </ScrollView>
      </SafeAreaView></View>
    </Modal>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, addressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  address: { flex: 1, minHeight: 44, borderRadius: 14, paddingHorizontal: 13, fontSize: 14 }, button: { minWidth: 46, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 12 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 5, borderTopWidth: StyleSheet.hairlineWidth },
  landing: { padding: 24, paddingTop: 38, maxWidth: 620, width: '100%', alignSelf: 'center' }, brand: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 14 }, hero: { fontSize: 42, fontWeight: '600', lineHeight: 48, letterSpacing: -1.4 }, subtitle: { fontSize: 15, lineHeight: 24, marginTop: 16, maxWidth: 290 },
  searchCard: { marginTop: 28, padding: 18, minHeight: 60, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginTop: 22, marginBottom: 14 }, shortcuts: { flexDirection: 'row', gap: 10, marginBottom: 24 }, shortcut: { flex: 1, paddingVertical: 20, alignItems: 'center', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, minHeight: 64, marginBottom: 8, gap: 10 }, rowTitle: { fontSize: 15, fontWeight: '600' }, detail: { fontSize: 12, lineHeight: 18, marginTop: 5 }, note: { fontSize: 13, lineHeight: 21, marginVertical: 12 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notice: { padding: 14, margin: 8, borderRadius: 12 }, modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }, sheet: { maxHeight: '90%', minHeight: '45%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, overflow: 'hidden' }, handle: { width: 38, height: 4, borderRadius: 4, alignSelf: 'center', marginTop: 12 }, sheetHeading: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, alignItems: 'center', justifyContent: 'space-between' }, sheetTitle: { fontSize: 24, fontWeight: '600', letterSpacing: -0.5 }, sheetBody: { padding: 18, paddingTop: 6 }, menuQuick: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 18 }, tabRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, marginBottom: 10, paddingRight: 5 }, libraryRow: { flexDirection: 'row', alignItems: 'center' }, filter: { minHeight: 48, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1, marginBottom: 14 }, shieldHero: { alignItems: 'center', padding: 22, borderRadius: 20, marginBottom: 20 }, error: { justifyContent: 'center', alignItems: 'center', padding: 30 },
});
