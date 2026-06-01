import React, { forwardRef } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type VerificationCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onFulfill?: () => void;
};

export const VerificationCodeInput = forwardRef<
  HTMLInputElement,
  VerificationCodeInputProps
>(({ value, onChange, onFulfill }, ref) => {
  const handleChange = (inputValue: string) => {
    const numericValue = inputValue.replace(/[^0-9]/g, "");
    onChange(numericValue);
  };

  React.useEffect(() => {
    if (value.length === 6) {
      onFulfill?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <InputOTP maxLength={6} onChange={handleChange} value={value} ref={ref}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
});

VerificationCodeInput.displayName = "VerificationCodeInput";
