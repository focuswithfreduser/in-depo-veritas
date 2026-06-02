import { getDevOtp } from "@/lib/dev-otp-store";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = new URL(request.url).searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const otp = getDevOtp(email);
  if (!otp) {
    return NextResponse.json({ otp: null });
  }

  return NextResponse.json({ otp });
}
