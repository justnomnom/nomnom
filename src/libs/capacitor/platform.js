import { Capacitor } from '@capacitor/core';

// ----------------------------------------------------------------------

/** Use from client components only (`'use client'`). Safe on SSR: behaves like web. */
export function isCapacitorNative() {
  return Capacitor.isNativePlatform();
}

/** @returns {'ios' | 'android' | 'web'} */
export function getCapacitorPlatform() {
  return Capacitor.getPlatform();
}

/** Prefer before calling a native plugin so web builds stay predictable. */
export function isCapacitorPluginAvailable(name) {
  return Capacitor.isPluginAvailable(name);
}
