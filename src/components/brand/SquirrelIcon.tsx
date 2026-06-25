interface SquirrelIconProps {
  size?: number;
  className?: string;
}

export function SquirrelIcon({ size = 36, className }: SquirrelIconProps) {
  return (
    <img
      className={`squirrel-icon ${className ?? ""}`.trim()}
      src="/squirrel-icon.png"
      width={size}
      height={size}
      alt="Squirrel"
      draggable={false}
    />
  );
}
