'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export function NativeBootstrap() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({ color: '#2563eb' }).catch(() => {});
    }
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

    document.documentElement.dataset.native = 'true';
    document.documentElement.dataset.nativePlatform = Capacitor.getPlatform();
  }, []);

  return null;
}
