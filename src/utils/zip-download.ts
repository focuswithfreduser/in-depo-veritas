/**
 * Opens a zip download in a new tab instead of using blob download
 * This avoids memory issues when downloading large zip files
 */
export function openZipInNewTab(signedUrl: string, filename?: string) {
  // Create a temporary anchor element to trigger download in new tab
  const link = document.createElement("a");
  link.href = signedUrl;
  link.target = "_blank";

  // Set download attribute if filename is provided
  if (filename) {
    link.download = filename;
  }

  // Add to DOM, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
