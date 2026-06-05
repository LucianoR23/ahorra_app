"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./lemy-logo.module.css";

const PORTFOLIO_URL = "https://portfolio.lemydev.com/";

type LemyLogoProps = {
	/** Tamaño del wordmark en px. Default 20 (ideal para footer). */
	size?: number;
	/** Mostrar el icono L a la izquierda. Default false. */
	showIcon?: boolean;
	/** Color del acento violeta. Default "#7c5cff". */
	accentColor?: string;
	/** Si hacer link al home. Default false. */
	asLink?: boolean;
	/**
	 * Textos a rotar en el typewriter. Cada uno debe tener exactamente UN punto
	 * (el separador entre brand y suffix). Default: luciano.rodriguez → lemy.dev
	 */
	texts?: string[];
	/** Velocidad de tipeo en ms por carácter. Default 90. */
	typingSpeed?: number;
	/** Velocidad de borrado en ms por carácter. Default 50. */
	deletingSpeed?: number;
	/** Pausa con texto completo en ms. Default 2500. */
	pauseFull?: number;
	/** Pausa cuando vacío en ms. Default 350. */
	pauseEmpty?: number;
	className?: string;
};

const DEFAULT_TEXTS = ["luciano.rodriguez", "lemy.dev"];

function usePrefersReducedMotion() {
	const subscribe = (cb: () => void) => {
		if (typeof window === "undefined") return () => {};
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		mq.addEventListener("change", cb);
		return () => mq.removeEventListener("change", cb);
	};
	const getSnapshot = () =>
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const getServerSnapshot = () => false;
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function usePageVisible() {
	const subscribe = (cb: () => void) => {
		if (typeof document === "undefined") return () => {};
		document.addEventListener("visibilitychange", cb);
		return () => document.removeEventListener("visibilitychange", cb);
	};
	const getSnapshot = () =>
		typeof document === "undefined" || document.visibilityState === "visible";
	const getServerSnapshot = () => true;
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function LemyLogo({
	size = 20,
	showIcon = false,
	accentColor = "#7c5cff",
	asLink = false,
	texts = DEFAULT_TEXTS,
	typingSpeed = 90,
	deletingSpeed = 50,
	pauseFull = 2500,
	pauseEmpty = 350,
	className = "",
}: LemyLogoProps) {
	const reducedMotion = usePrefersReducedMotion();
	const pageVisible = usePageVisible();
	const [hovered, setHovered] = useState(false);

	const [shown, setShown] = useState(texts[0] ?? "");
	const [dotKey, setDotKey] = useState(0);

	const textIndexRef = useRef(0);
	const charIndexRef = useRef((texts[0] ?? "").length);
	const phaseRef = useRef<"typing" | "pause-full" | "deleting" | "pause-empty">(
		"pause-full",
	);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (reducedMotion) {
			setShown(texts[0] ?? "");
			return;
		}

		if (!pageVisible || hovered) {
			if (timerRef.current) clearTimeout(timerRef.current);
			return;
		}

		const tick = () => {
			const current = texts[textIndexRef.current] ?? "";

			if (phaseRef.current === "typing") {
				charIndexRef.current++;
				const next = current.slice(0, charIndexRef.current);
				setShown(next);
				if (next[next.length - 1] === ".") {
					setDotKey((k) => k + 1);
				}
				if (charIndexRef.current >= current.length) {
					phaseRef.current = "pause-full";
					timerRef.current = setTimeout(tick, pauseFull);
				} else {
					const jitter = Math.random() * 40 - 20;
					timerRef.current = setTimeout(tick, typingSpeed + jitter);
				}
			} else if (phaseRef.current === "pause-full") {
				phaseRef.current = "deleting";
				timerRef.current = setTimeout(tick, 0);
			} else if (phaseRef.current === "deleting") {
				charIndexRef.current--;
				setShown(current.slice(0, charIndexRef.current));
				if (charIndexRef.current <= 0) {
					phaseRef.current = "pause-empty";
					timerRef.current = setTimeout(tick, pauseEmpty);
				} else {
					timerRef.current = setTimeout(tick, deletingSpeed);
				}
			} else if (phaseRef.current === "pause-empty") {
				textIndexRef.current = (textIndexRef.current + 1) % texts.length;
				phaseRef.current = "typing";
				timerRef.current = setTimeout(tick, 0);
			}
		};

		timerRef.current = setTimeout(tick, pauseFull);

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [
		reducedMotion,
		pageVisible,
		hovered,
		texts,
		typingSpeed,
		deletingSpeed,
		pauseFull,
		pauseEmpty,
	]);

	useEffect(() => {
		if (hovered && !reducedMotion) {
			const current = texts[textIndexRef.current] ?? "";
			setShown(current);
			charIndexRef.current = current.length;
			phaseRef.current = "pause-full";
		}
	}, [hovered, reducedMotion, texts]);

	const dotIdx = shown.indexOf(".");
	const strong = dotIdx >= 0 ? shown.slice(0, dotIdx) : shown;
	const hasDot = dotIdx >= 0;
	const muted = dotIdx >= 0 ? shown.slice(dotIdx + 1) : "";

	const content = (
		<span
			className={`${styles.logo} ${className}`}
			style={{ fontSize: size, "--accent": accentColor } as React.CSSProperties}
			aria-label="lemy.dev"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			onFocus={() => setHovered(true)}
			onBlur={() => setHovered(false)}
		>
			{showIcon && (
				<svg
					className={styles.icon}
					viewBox="0 0 40 42"
					aria-hidden="true"
					style={{ height: size * 1.05 }}
				>
					<path
						d="M 0 0 L 12 0 L 12 32 L 32 32 L 32 42 L 0 42 Z"
						fill="currentColor"
					/>
					<circle cx="36" cy="38" r="4" fill={accentColor} />
				</svg>
			)}
			<span className={styles.wordmark}>
				<span className={styles.text}>
					<span className={styles.strong}>{strong}</span>
					{hasDot && (
						<span key={dotKey} className={styles.dot}>
							.
						</span>
					)}
					<span className={styles.muted}>{muted}</span>
				</span>
				<span className={styles.cursor} aria-hidden="true">
					|
				</span>
			</span>
		</span>
	);

	return asLink ? (
		<a
			href={PORTFOLIO_URL}
			target="_blank"
			rel="noopener noreferrer"
			className={styles.link}
		>
			{content}
		</a>
	) : (
		content
	);
}
