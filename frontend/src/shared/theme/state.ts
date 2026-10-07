import { Appearance, Platform, StyleSheet } from 'react-native';
import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';
export type ThemePreference = 'claro' | 'escuro' | 'sistema';
let preference: ThemePreference = 'claro';
let systemDark = Appearance.getColorScheme() === 'dark';
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());
export function themeSnapshot() { return `${preference}:${systemDark ? 'dark' : 'light'}`; }
export function isDarkTheme() { return preference === 'escuro' || (preference === 'sistema' && systemDark); }
export function useThemeMode() {
 useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, themeSnapshot, () => 'claro:light');
 return { preference, dark: isDarkTheme(), setPreference: setThemePreference };
}
export async function setThemePreference(value: ThemePreference) {
 preference = value;emit();
 try { if (Platform.OS === 'web') globalThis.localStorage?.setItem('clyvo.theme',value);else await SecureStore.setItemAsync('clyvo.theme',value); } catch { /* Apply for current session even if storage is unavailable. */ }
}
export async function initializeTheme() {
 if (loaded) return; loaded = true;
 try {
   const saved = Platform.OS === 'web' ? globalThis.localStorage?.getItem('clyvo.theme') : await SecureStore.getItemAsync('clyvo.theme');
   if (saved === 'claro' || saved === 'escuro' || saved === 'sistema') preference = saved;
 } catch { /* Keep the light default when storage is unavailable. */ }
 systemDark = Appearance.getColorScheme() === 'dark';
 Appearance.addChangeListener(({ colorScheme }) => { systemDark = colorScheme === 'dark';emit(); });
 emit();
}
/** Lazily resolve static stylesheet declarations using the active theme. */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: () => T): T {
 const cache = new Map<boolean,T>();
 return new Proxy({} as T, { get(_target,key) {
   const dark = isDarkTheme();if (!cache.has(dark)) cache.set(dark,StyleSheet.create(factory()));
   return cache.get(dark)![key as keyof T];
 } });
}
export function createThemedValue<T extends object>(factory: () => T): T { return new Proxy({} as T, { get(_target,key) { return factory()[key as keyof T]; } }); }
