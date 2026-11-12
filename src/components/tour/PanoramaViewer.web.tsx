import { createElement, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { buildViewerHtml, parseViewerMessage, type ViewerConfig, type ViewerInbound, type ViewerOutbound } from '@/features/tour/viewerHtml';

export interface PanoramaViewerRef {
  send: (command: ViewerInbound) => void;
}

interface PanoramaViewerProps {
  config: ViewerConfig;
  onMessage: (message: ViewerOutbound) => void;
}

/** 360° просмотрщик в браузере: та же страница, но в iframe (WebView в вебе нет). */
export const PanoramaViewer = forwardRef<PanoramaViewerRef, PanoramaViewerProps>(function PanoramaViewer({ config, onMessage }, ref) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildViewerHtml(config), []);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useImperativeHandle(ref, () => ({
    send: (command) => frame.current?.contentWindow?.postMessage(JSON.stringify(command), '*'),
  }));

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const message = parseViewerMessage(event.data);
      if (message) handler.current(message);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  return createElement('iframe', {
    ref: frame,
    srcDoc: html,
    title: '360',
    sandbox: 'allow-scripts',
    style: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, background: config.background },
  });
});
