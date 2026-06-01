function stringToByteSize(str: string): number {
  const encoder = new TextEncoder();
  const byteArray = encoder.encode(str);
  return byteArray.length;
}

export function isTextTooBig(str: string, maxSizeInMB: number = 4): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024; // Convert MB to bytes
  const byteSize = stringToByteSize(str);
  return byteSize > maxSizeInBytes;
}
