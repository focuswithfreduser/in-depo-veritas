const devOtps = new Map<string, { otp: string; createdAt: number }>();

export function setDevOtp(email: string, otp: string) {
  if (process.env.NODE_ENV !== "development") return;
  devOtps.set(email.toLowerCase().trim(), { otp, createdAt: Date.now() });
}

export function getDevOtp(email: string) {
  if (process.env.NODE_ENV !== "development") return null;
  const entry = devOtps.get(email.toLowerCase().trim());
  if (!entry) return null;
  // OTP expires after 5 minutes in the UI hint
  if (Date.now() - entry.createdAt > 5 * 60 * 1000) {
    devOtps.delete(email.toLowerCase().trim());
    return null;
  }
  return entry.otp;
}
