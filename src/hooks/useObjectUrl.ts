import { useEffect, useState } from 'react';

/** Tworzy URL dla Blob-a i zwalnia go przy odmontowaniu. `key` (np. id ubrania) chroni przed migotaniem. */
export function useObjectUrl(blob: Blob | undefined, key: string): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return url;
}
