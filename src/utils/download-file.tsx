export async function downloadFileFromUrl(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);

  link.href = objectUrl;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();

  URL.revokeObjectURL(objectUrl);
  document.body.removeChild(link);
}
