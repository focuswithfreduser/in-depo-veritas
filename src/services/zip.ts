import JSZip from "jszip";

export default async function zipFiles(
  files: { name: string; content: string }[],
) {
  const zip = new JSZip();
  files.forEach((file) => zip.file(file.name, file.content, { base64: true }));
  const attachmentContent = await zip.generateAsync({ type: "base64" });
  return attachmentContent;
}
