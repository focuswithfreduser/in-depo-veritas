"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerificationCodeInput } from "@/components/ui/verification-code-input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { CheckCircle, EditIcon } from "lucide-react";
import { NoNewUsersBanner } from "@/components/no-new-users-banner";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { useMutation } from "@tanstack/react-query";
import { AuthTestimonials } from "../../components/auth-testimonials";

const SECONDS_TO_RESEND = 59;

async function fetchDevOtpHint(email: string) {
  try {
    const response = await fetch(
      `/api/dev/last-otp?email=${encodeURIComponent(email.toLowerCase().trim())}`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { otp?: string | null };
    return data.otp ?? null;
  } catch {
    return null;
  }
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [isCodeInvalid, setIsCodeInvalid] = useState<boolean | undefined>(
    undefined,
  );
  const [resendTimer, setResendTimer] = useState(SECONDS_TO_RESEND);
  const [canResend, setCanResend] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const verificationCodeInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Timer effect for resend functionality
  useEffect(() => {
    if (!canResend && resendTimer > 0 && showOtpStep) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    }

    if (resendTimer === 0) {
      setCanResend(true);
    }
  }, [resendTimer, canResend, showOtpStep]);

  // Focus OTP input when step changes
  useEffect(() => {
    if (showOtpStep) {
      verificationCodeInputRef.current?.focus();
    }
  }, [showOtpStep]);

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      return authClient.emailOtp.sendVerificationOtp({
        email: email.toLowerCase().trim(),
        type: "sign-in",
      });
    },
    onSuccess: async (result) => {
      if (result.error) {
        // Check if the error is due to user not existing
        const errorMessage =
          (result.error.message?.toLowerCase() ||
            result.error.status?.toString() ||
            "") as string;
        if (
          errorMessage.includes("user") &&
          (errorMessage.includes("not found") ||
            errorMessage.includes("does not exist") ||
            errorMessage.includes("not exist"))
        ) {
          toast.error(
            "We do not recognize this email. Please get in touch with an admin.",
          );
        } else {
          toast.error("Failed to send verification code. Please try again.");
        }
      } else {
        setShowOtpStep(true);
        setResendTimer(SECONDS_TO_RESEND);
        setCanResend(false);
        setVerificationCodeInput("");
        setIsCodeInvalid(undefined);
        const otpHint = await fetchDevOtpHint(email);
        setDevOtpHint(otpHint);
        toast.success(
          otpHint
            ? "Development mode: use the code shown below."
            : "Verification code sent to your email!",
        );
      }
    },
    onError: () => {
      toast.error("Failed to send verification code. Please try again.");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      return authClient.signIn.emailOtp({
        email: email.toLowerCase().trim(),
        otp: verificationCodeInput,
      });
    },
    onSuccess: (result) => {
      if (result.error) {
        setIsCodeInvalid(true);
        toast.error("Invalid verification code. Please try again.");
        console.log(result);
      } else {
        setIsSuccess(true);
        // toast.success("Successfully logged in!");
        // Add a delay before redirecting
        setTimeout(() => {
          router.push("/app");
        }, 500);
      }
    },
    onError: () => {
      setIsCodeInvalid(true);
      toast.error("Failed to verify code. Please try again.");
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      return authClient.emailOtp.sendVerificationOtp({
        email: email.toLowerCase().trim(),
        type: "sign-in",
      });
    },
    onSuccess: async (result) => {
      if (result.error) {
        toast.error("Failed to resend verification code. Please try again.");
      } else {
        setResendTimer(SECONDS_TO_RESEND);
        setCanResend(false);
        setVerificationCodeInput("");
        setIsCodeInvalid(undefined);
        const otpHint = await fetchDevOtpHint(email);
        setDevOtpHint(otpHint);
        toast.success(
          otpHint
            ? "Development mode: use the new code shown below."
            : "Verification code resent!",
        );
      }
    },
    onError: () => {
      toast.error("Failed to resend verification code. Please try again.");
    },
  });

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) {
      sendOtpMutation.mutate();
    }
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (verificationCodeInput.trim().length === 6) {
      verifyOtpMutation.mutate();
    }
  }

  function handleOtpChange(value: string) {
    setVerificationCodeInput(value);
    if (isCodeInvalid) {
      setIsCodeInvalid(false);
    }
  }

  function handleResend() {
    if (!canResend || resendOtpMutation.isPending) return;
    setVerificationCodeInput("");
    setIsCodeInvalid(undefined);
    setCanResend(false);
    setResendTimer(SECONDS_TO_RESEND);
    resendOtpMutation.mutate();
  }

  function handleBackToEmail() {
    setShowOtpStep(false);
    setVerificationCodeInput("");
    setIsCodeInvalid(undefined);
    setCanResend(false);
    setDevOtpHint(null);
  }

  return (
    <div className={cn("flex min-h-screen", className)} {...props}>
      {/* Left side - Login Form */}
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

          {!showOtpStep ? (
            // Email Step
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold text-foreground">
                  Depositions, Summarized.
                </h1>
                <p className="text-muted-foreground">
                  Login to your
                  <Link href="/" className="mx-1 underline">
                    In Depo Veritas
                  </Link>
                  account or sign up by providing your email.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleEmailSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={sendOtpMutation.isPending || !email.trim()}
                >
                  {sendOtpMutation.isPending
                    ? "Sending code..."
                    : "Send verification code"}
                </Button>

                <NoNewUsersBanner />
              </form>
            </>
          ) : (
            // OTP Verification Step
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold text-foreground">
                  Check your email
                </h1>
                <p className="text-muted-foreground">
                  You should receive a 6 digit authentication code to this email
                  momentarily
                </p>
                <div className="flex items-center justify-center text-sm text-muted-foreground">
                  {email}{" "}
                  <EditIcon
                    className="ml-2 h-4 w-4 cursor-pointer text-blue-500 hover:text-blue-600"
                    onClick={handleBackToEmail}
                  />
                </div>
              </div>

              {devOtpHint && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-center text-sm text-amber-950">
                  <p className="font-medium">Development login code</p>
                  <p className="mt-1 font-mono text-lg tracking-widest">
                    {devOtpHint}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    Codes expire quickly. Use this one right after requesting it.
                  </p>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleOtpSubmit}>
                <div className="flex flex-col items-center space-y-4">
                  <div className="grid gap-2">
                    <Label className="sr-only" htmlFor="verification-code">
                      Verification Code
                    </Label>
                    <VerificationCodeInput
                      value={verificationCodeInput}
                      onChange={handleOtpChange}
                      onFulfill={() => {
                        if (verificationCodeInput.trim().length === 6) {
                          verifyOtpMutation.mutate();
                        }
                      }}
                      ref={verificationCodeInputRef}
                    />
                    {isCodeInvalid && (
                      <div className="text-center text-red-500">
                        Incorrect code
                      </div>
                    )}
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    <button
                      className="flex items-center gap-2 text-blue-500 hover:text-blue-600 disabled:text-blue-300"
                      onClick={handleResend}
                      disabled={!canResend || resendOtpMutation.isPending}
                      type="button"
                    >
                      {resendOtpMutation.isPending ? (
                        "Sending..."
                      ) : (
                        <>
                          Didn't receive a code? Resend{" "}
                          {!canResend && `(${resendTimer}s)`}
                        </>
                      )}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      verificationCodeInput.trim().length !== 6 ||
                      verifyOtpMutation.isPending ||
                      isSuccess
                    }
                  >
                    {verifyOtpMutation.isPending ? "Verifying..." : "Continue"}
                  </Button>

                  {isSuccess && (
                    <div className="flex animate-fade-in items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4" />
                      <span>Success! Redirecting...</span>
                    </div>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right side - Testimonials */}
      <AuthTestimonials />
    </div>
  );
}
