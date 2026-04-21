import styles from "./lemy-logo.module.css";

const PORTFOLIO_URL = "https://portfolio.lemydev.com/";

type LemyLogoProps = {
  size?: number;
  showIcon?: boolean;
  accentColor?: string;
  asLink?: boolean;
  href?: string;
  className?: string;
};

export function LemyLogo({
  size = 20,
  showIcon = false,
  accentColor = "#7c5cff",
  asLink = false,
  href = PORTFOLIO_URL,
  className = "",
}: LemyLogoProps) {
  const content = (
    <span
      className={`font-mono ${styles.logo} ${className}`}
      style={{ fontSize: size, "--accent": accentColor } as React.CSSProperties}
      aria-label="lemy.dev"
    >
      {showIcon && (
        <svg
          className={styles.icon}
          viewBox="0 0 40 42"
          aria-hidden="true"
          style={{ height: size * 1.05 }}
        >
          <path d="M 0 0 L 12 0 L 12 32 L 32 32 L 32 42 L 0 42 Z" fill="currentColor" />
          <circle cx="36" cy="38" r="4" fill={accentColor} />
        </svg>
      )}
      <span className={styles.wordmark}>
        <span className={styles.strong}>lemy</span>
        <span className={styles.dot}>.</span>
        <span className={styles.muted}>dev</span>
        <span className={styles.cursor} aria-hidden="true">|</span>
      </span>
    </span>
  );

  return asLink ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>
      {content}
    </a>
  ) : (
    content
  );
}
