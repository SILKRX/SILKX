import { type ComponentType, forwardRef, type Ref, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';

import { buildViewerHtml, parseViewerMessage, type ViewerConfig, type ViewerInbound, type ViewerOutbound } from '@/features/tour/viewerHtml';

interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}

/**
 * Пропсы, которые мы реально используем. Типы react-native-webview 14 при пересечении
 * iOS/Android/Windows-пропсов на RN 0.88 схлопываются в `never`, поэтому описываем их сами.
 */
interface WebViewProps {
  ref?: Ref<WebViewHandle>;
  source: { html: string; baseUrl?: string };
  originWhitelist?: string[];
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  scrollEnabled?: boolean;
  bounces?: boolean;
  overScrollMode?: 'always' | 'content' | 'never';
  allowsInlineMediaPlayback?: boolean;
  setSupportMultipleWindows?: boolean;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  onError?: () => void;
}

const WebView = RNWebView as unknown as ComponentType<WebViewProps>;

export interface PanoramaViewerRef {
  send: (command: ViewerInbound) => void;
}

interface PanoramaViewerProps {
  config: ViewerConfig;
  onMessage: (message: ViewerOutbound) => void;
}

/** 360° просмотрщик на iOS / Android: three.js внутри WebView. */
export const PanoramaViewer = forwardRef<PanoramaViewerRef, PanoramaViewerProps>(function PanoramaViewer({ config, onMessage }, ref) {
  const webView = useRef<WebViewHandle>(null);
  // HTML строим один раз: смена комнаты идёт командой, без перезагрузки страницы
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildViewerHtml(config), []);

  useImperativeHandle(ref, () => ({
    send: (command) => {
      const json = JSON.stringify(JSON.stringify(command));
      webView.current?.injectJavaScript(`window.silkxCommand && window.silkxCommand(${json}); true;`);
    },
  }));

  return (
    <WebView
      ref={webView}
      source={{ html, baseUrl: 'https://silkx.uz' }}
      originWhitelist={['*']}
      style={[StyleSheet.absoluteFill, { backgroundColor: config.background }]}
      containerStyle={{ backgroundColor: config.background }}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      allowsInlineMediaPlayback
      setSupportMultipleWindows={false}
      onMessage={(event) => {
        const message = parseViewerMessage(event.nativeEvent.data);
        if (message) onMessage(message);
      }}
      onError={() => onMessage({ type: 'error', index: config.start })}
    />
  );
});
