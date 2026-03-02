import { cn } from "@/lib/utils";

const ASCII_ARTS = {
  dungeonbreak: [
    "  ____                        _                ____             _    ",
    " |  _ \\ _   _ _ __   ___ ___ | |__   ___  _ __| __ )  ___   ___ | |_  ",
    " | | | | | | | '_ \\ / __/ _ \\| '_ \\ / _ \\| '__|  _ \\ / _ \\ / _ \\| __| ",
    " | |_| | |_| | | | | (_| (_) | |_) | (_) | |  | |_) | (_) | (_) | |_  ",
    " |____/ \\__,_|_| |_|\\___\\___/|_.__/ \\___/|_|  |____/ \\___/ \\___/ \\__| ",
    "                                                                        ",
    "   Futuristic dungeons mapped inside a Hilbert cube with ASCII reverence  ",
  ],
  kaplay: [
    "  _  __          _     ",
    " | |/ /___ _   _| | __ ",
    " | ' // _ \\ | | | |/ / ",
    " | . \\  __/ |_| |   <  ",
    " |_|\\_\\___|\\__,_|_|\\_\\ ",
    "                        ",
    "   ASCII-first adventures",
  ],
} as const;

type Variant = keyof typeof ASCII_ARTS;

type Props = {
  variant?: Variant;
  className?: string;
};

export function AsciiLogo({ variant = "dungeonbreak", className }: Props) {
  const art = ASCII_ARTS[variant];

  return (
    <pre
      className={cn(
        "whitespace-pre text-[10px] leading-4 tracking-widest text-fd-muted-foreground text-left",
        "font-mono bg-black/30 rounded border border-border/70 px-2 py-1",
        className,
      )}
    >
      {art.map((line, index) => (
        <span key={`${variant}-${index}`} className="block text-[9px] text-muted-foreground">
          {line}
        </span>
      ))}
    </pre>
  );
}
