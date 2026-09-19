/**
 * Minimal Server-Sent-Events reader for React Native. RN's `fetch` doesn't reliably expose a
 * readable stream body the way browser fetch does, so this uses `XMLHttpRequest` and its
 * `readyState 3` (LOADING) progress callbacks — the standard RN pattern for consuming an SSE
 * response incrementally. Lines can arrive split mid-frame across progress events, so partial
 * trailing lines are buffered rather than assumed complete.
 */
export function streamSSE(
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
  onDataLine: (data: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let processedLength = 0;
    let buffer = '';

    const consumeNewText = () => {
      const newText = xhr.responseText.slice(processedLength);
      processedLength = xhr.responseText.length;
      if (!newText) return;
      buffer += newText;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) onDataLine(trimmed.slice(5).trim());
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3) consumeNewText();
      if (xhr.readyState === 4) {
        consumeNewText();
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText.slice(0, 500)}`));
        }
      }
    };
    xhr.onerror = () => reject(new Error('Network error during streaming request'));

    xhr.open(init.method, url, true);
    for (const [key, value] of Object.entries(init.headers)) xhr.setRequestHeader(key, value);
    xhr.send(init.body);
  });
}
