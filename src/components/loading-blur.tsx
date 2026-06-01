import Image from "next/image";

interface LoadingBlurProps {
  loading: boolean;
  /** Whether to use fixed positioning (covers entire screen) or absolute positioning (relative to parent container) */
  fullScreen?: boolean;
  /** Custom className for the blur overlay */
  className?: string;
  /** Whether to show the center loading card */
  showCenter?: boolean;
  /** Custom text to display in the center card */
  centerText?: string;
}

export function LoadingBlur({
  loading,
  fullScreen = false,
  className = "",
  showCenter = true,
  centerText = "Getting everything ready...",
}: LoadingBlurProps) {
  if (!loading) return null;

  const positionClass = fullScreen ? "fixed inset-0" : "absolute inset-0";

  return (
    <div
      className={`${positionClass} z-50 bg-background/50 backdrop-blur-sm ${className}`}
    >
      {showCenter && (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ alignItems: "center", paddingBottom: "30vh" }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="h-10 w-10 animate-pulse"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {centerText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
