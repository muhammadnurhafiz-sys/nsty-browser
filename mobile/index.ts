import { registerRootComponent } from 'expo';
import React from 'react';
import { AppRegistry } from 'react-native';
import App from './App';
import { CrashScreen, Report } from './src/CrashScreen';

// A fatal JS error in a release build would otherwise close the app with no
// message. Show it on screen so the user can report it.
type ErrorUtilsLike = { getGlobalHandler?: () => (e: Error, fatal?: boolean) => void; setGlobalHandler?: (h: (e: Error, fatal?: boolean) => void) => void };
const errorUtils = (globalThis as unknown as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
const previous = errorUtils?.getGlobalHandler?.();
errorUtils?.setGlobalHandler?.((error, fatal) => {
  console.error('[Nsty] Uncaught error', { fatal, message: error?.message });
  if (fatal) {
    try { AppRegistry.registerComponent('main', () => () => React.createElement(Report, { title: 'Nsty Browser could not start', error })); } catch { /* fall through */ }
  }
  previous?.(error, fatal);
});

function Root() { return React.createElement(CrashScreen, null, React.createElement(App)); }
registerRootComponent(Root);
