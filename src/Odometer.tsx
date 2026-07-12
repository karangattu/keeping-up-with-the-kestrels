const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function Odometer({ value, className }: { value: string; className?: string }) {
  return (
    <span className={`odometer ${className ?? ""}`.trim()} aria-label={value}>
      {value.split("").map((ch, i) => {
        if (ch >= "0" && ch <= "9") {
          const digit = Number(ch);
          return (
            <span className="odometer-digit" key={i} aria-hidden="true">
              <span
                className="odometer-strip"
                style={{ transform: `translateY(-${digit}em)` }}
              >
                {DIGITS.map((d) => (
                  <span className="odometer-cell" key={d}>{d}</span>
                ))}
              </span>
            </span>
          );
        }
        return (
          <span className="odometer-static" key={i} aria-hidden="true">{ch}</span>
        );
      })}
    </span>
  );
}
