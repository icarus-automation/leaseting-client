/** Opens a document blob in a new tab, or saves it, without a public media URL. */
export function presentDocumentBlob(blob: Blob, fileName: string, download: boolean): void {
  const url = URL.createObjectURL(blob);
  if (download) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } else {
    window.open(url, '_blank', 'noopener');
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
