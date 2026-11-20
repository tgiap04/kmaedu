/** Hand `blob` to the browser as a download named `filename`. */
export function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
}

/**
 * Fetch a file and hand it to the browser as a download named `filename`. Throws when the fetch fails, and
 * before fetching when `url` is not an absolute http(s) URL (an empty presigned url would fetch the page itself).
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  if (!/^https?:\/\//i.test(url.trim())) throw new Error("No download URL");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Download failed");
  saveBlob(await response.blob(), filename);
}
