type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export type QuizSoundKind = "select" | "advance" | "complete";

let audioContext: AudioContext | null = null;
let soundEnabled = true;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;

  const AudioContextClass =
    window.AudioContext || (window as AudioWindow).webkitAudioContext;

  if (!AudioContextClass) return null;

  audioContext ??= new AudioContextClass();
  return audioContext;
};

export const setQuizSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
};

export const isQuizSoundEnabled = () => soundEnabled;

export const playQuizSound = (kind: QuizSoundKind = "select") => {
  if (!soundEnabled) return;

  try {
    const context = getAudioContext();
    if (!context) return;

    if (context.state === "suspended") {
      void context.resume();
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequencies: Record<QuizSoundKind, [number, number, number]> = {
      select: [420, 610, 0.085],
      advance: [520, 760, 0.12],
      complete: [440, 880, 0.2],
    };
    const [startFrequency, endFrequency, duration] = frequencies[kind];

    oscillator.type = kind === "complete" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      now + duration,
    );

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      kind === "complete" ? 0.055 : 0.032,
      now + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);

    if (kind === "select" && "vibrate" in navigator) {
      navigator.vibrate?.(12);
    }
  } catch {
    // Audio feedback is optional and must never block the quiz.
  }
};

export const playQuizClickSound = () => playQuizSound("select");
