"use client";

import { useEffect, useRef, useState } from "react";

/** Longest voice note (plan §8.3). */
export const MAX_VOICE_SECONDS = 30;

// Chrome and Edge record WebM, Safari MP4 (AAC), Firefox Ogg; the API takes
// all of them. First supported wins.
const AUDIO_TYPES = [
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/webm",
];

// About 120 KB for 30 s: plenty for speech, far under the API's 1 MB.
const BITS_PER_SECOND = 32_000;

export function pickAudioType(isSupported: (type: string) => boolean): string {
  return AUDIO_TYPES.find((t) => isSupported(t)) ?? "";
}

/** False on browsers without MediaRecorder or a microphone API: no mic button. */
export function voiceSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export type VoiceState = "idle" | "starting" | "recording";
export type VoiceError = "denied" | "failed";

/** "0:24" */
export function formatSecondsLeft(s: number): string {
  return `0:${String(Math.max(0, s)).padStart(2, "0")}`;
}

/**
 * Tap to start, tap to stop (decided with the user); it stops by itself at
 * 30 s. `onDone` gets the recording; nothing is kept here after that.
 */
export function useVoiceNote(
  onDone: (audio: Blob) => void,
  onError: (reason: VoiceError) => void,
) {
  const [state, setState] = useState<VoiceState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(MAX_VOICE_SECONDS);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const cancelled = useRef(false);
  // The handlers of the render that started the recording would be stale
  // by the time it stops.
  const handlers = useRef({ onDone, onError });
  useEffect(() => {
    handlers.current = { onDone, onError };
  });

  function release() {
    clearInterval(timer.current);
    timer.current = undefined;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    recorder.current = null;
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function start() {
    if (state !== "idle") return;
    cancelled.current = false;
    setState("starting");
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setState("idle");
      const denied =
        e instanceof DOMException &&
        (e.name === "NotAllowedError" || e.name === "SecurityError");
      handlers.current.onError(denied ? "denied" : "failed");
      return;
    }
    if (cancelled.current) {
      media.getTracks().forEach((t) => t.stop());
      return;
    }
    let rec: MediaRecorder;
    try {
      const mimeType = pickAudioType((t) => MediaRecorder.isTypeSupported(t));
      rec = new MediaRecorder(media, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: BITS_PER_SECOND,
      });
    } catch {
      media.getTracks().forEach((t) => t.stop());
      setState("idle");
      handlers.current.onError("failed");
      return;
    }
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || chunks[0]?.type || "audio/webm";
      release();
      setState("idle");
      setSecondsLeft(MAX_VOICE_SECONDS);
      if (cancelled.current || chunks.length === 0) return;
      handlers.current.onDone(new Blob(chunks, { type }));
    };
    stream.current = media;
    recorder.current = rec;
    rec.start();
    setState("recording");
    const startedAt = Date.now();
    timer.current = setInterval(() => {
      const left =
        MAX_VOICE_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      setSecondsLeft(left);
      if (left <= 0) stop();
    }, 250);
  }

  // Leaving the screen mid-recording drops it and frees the microphone.
  useEffect(
    () => () => {
      cancelled.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
    },
    [],
  );

  return { state, secondsLeft, start, stop };
}
