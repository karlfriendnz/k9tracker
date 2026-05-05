'use client';

import { Capacitor } from '@capacitor/core';

export const isNative = (): boolean => Capacitor.isNativePlatform();

export const nativePlatform = (): 'ios' | 'android' | 'web' => {
  const p = Capacitor.getPlatform();
  return p === 'ios' || p === 'android' ? p : 'web';
};
