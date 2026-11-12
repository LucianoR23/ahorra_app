import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatSecondsLeft,
  pickAudioType,
  useVoiceNote,
  voiceSupported,
} from "./use-voice-note";

class FakeRecorder {
  static isTypeSupported = (t: string) => t === "audio/webm;codecs=opus";
  static options: unknown;
  state = "inactive";
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(_s: unknown, o?: { mimeType?: string }) {
    this.mimeType = o?.mimeType ?? "";
    FakeRecorder.options = o;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["voz"], { type: this.mimeType }),
    });
    this.onstop?.();
  }
}

const track = { stop: vi.fn() };

function withMic(
  getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [track] }),
) {
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
  return getUserMedia;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "mediaDevices");
  track.stop.mockClear();
});

describe("useVoiceNote (plan 3.2)", () => {
  it("picks the first type the browser records", () => {
    expect(pickAudioType((t) => t === "audio/mp4")).toBe("audio/mp4");
    expect(pickAudioType((t) => t.startsWith("audio/"))).toBe(
      "audio/webm;codecs=opus",
    );
    expect(pickAudioType(() => false)).toBe("");
  });

  it("knows when the browser cannot record", () => {
    expect(voiceSupported()).toBe(false);
    withMic();
    expect(voiceSupported()).toBe(true);
  });

  it("formats the time left", () => {
    expect(formatSecondsLeft(30)).toBe("0:30");
    expect(formatSecondsLeft(4)).toBe("0:04");
    expect(formatSecondsLeft(-1)).toBe("0:00");
  });

  it("records until tapped again, then frees the microphone", async () => {
    withMic();
    const onDone = vi.fn();
    const { result } = renderHook(() => useVoiceNote(onDone, vi.fn()));
    await act(() => result.current.start());
    expect(result.current.state).toBe("recording");
    expect(FakeRecorder.options).toEqual({
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 32_000,
    });
    act(() => result.current.stop());
    expect(result.current.state).toBe("idle");
    expect(onDone).toHaveBeenCalledOnce();
    expect((onDone.mock.calls[0][0] as Blob).type).toBe(
      "audio/webm;codecs=opus",
    );
    expect(track.stop).toHaveBeenCalled();
  });

  it("stops by itself at 30 seconds", async () => {
    vi.useFakeTimers();
    withMic();
    const onDone = vi.fn();
    const { result } = renderHook(() => useVoiceNote(onDone, vi.fn()));
    await act(() => result.current.start());
    act(() => vi.advanceTimersByTime(6_000));
    expect(result.current.secondsLeft).toBe(24);
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(24_000));
    expect(onDone).toHaveBeenCalledOnce();
    expect(result.current.state).toBe("idle");
  });

  it("says when the microphone is not allowed, or fails", async () => {
    withMic(
      vi.fn().mockRejectedValue(new DOMException("no", "NotAllowedError")),
    );
    const onError = vi.fn();
    const { result } = renderHook(() => useVoiceNote(vi.fn(), onError));
    await act(() => result.current.start());
    expect(onError).toHaveBeenLastCalledWith("denied");
    expect(result.current.state).toBe("idle");

    withMic(
      vi.fn().mockRejectedValue(new DOMException("none", "NotFoundError")),
    );
    await act(() => result.current.start());
    expect(onError).toHaveBeenLastCalledWith("failed");
  });

  it("drops the recording when the screen closes", async () => {
    withMic();
    const onDone = vi.fn();
    const { result, unmount } = renderHook(() => useVoiceNote(onDone, vi.fn()));
    await act(() => result.current.start());
    unmount();
    expect(onDone).not.toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
  });
});
