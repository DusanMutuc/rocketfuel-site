'use client';

import * as React from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import createEmotionCache from '@emotion/cache';
import createEmotionServer from '@emotion/server/create-instance';
import { CacheProvider } from '@emotion/react';

const theme = createTheme();

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [emotionCache] = React.useState(() => {
    const cache = createEmotionCache({ key: 'mui' });
    cache.compat = true;
    return cache;
  });

  useServerInsertedHTML(() => {
    const { extractCriticalToChunks } = createEmotionServer(emotionCache);
    const chunks = extractCriticalToChunks(emotionCache.sheet.tags.join(''));
    
    return (
      <>
        {chunks.styles.map((style) => (
          <style
            key={style.key}
            data-emotion={`${style.key} ${style.ids.join(' ')}`}
            dangerouslySetInnerHTML={{ __html: style.css }}
          />
        ))}
      </>
    );
  });

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}