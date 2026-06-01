"use client";

import { Button } from "@/components/ui/button";

export function ErrorButton() {
  const fail = () => {
    throw new Error("This is a test client side error.");
  };
  return <Button onClick={() => fail()}>Throw an error.</Button>;
}
