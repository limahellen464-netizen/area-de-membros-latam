export type QuizVslProgressState = {
  lastPositionSeconds: number | null;
  watchedSeconds: number;
};

export const MAX_VALID_PROGRESS_STEP_SECONDS = 15;

export const createQuizVslProgressState = (
  watchedSeconds = 0,
): QuizVslProgressState => ({
  lastPositionSeconds: null,
  watchedSeconds: Math.max(0, watchedSeconds),
});

export const applyQuizVslPosition = (
  state: QuizVslProgressState,
  positionSeconds: number,
  maxValidStepSeconds = MAX_VALID_PROGRESS_STEP_SECONDS,
): QuizVslProgressState => {
  if (!Number.isFinite(positionSeconds) || positionSeconds < 0) {
    return state;
  }

  if (state.lastPositionSeconds === null) {
    return {
      ...state,
      lastPositionSeconds: positionSeconds,
    };
  }

  const delta = positionSeconds - state.lastPositionSeconds;
  const isValidPlaybackStep = delta > 0 && delta <= maxValidStepSeconds;

  return {
    lastPositionSeconds: positionSeconds,
    watchedSeconds: isValidPlaybackStep
      ? state.watchedSeconds + delta
      : state.watchedSeconds,
  };
};

export const hasReachedQuizVslPitch = (
  state: QuizVslProgressState,
  pitchSeconds: number,
) => pitchSeconds > 0 && state.watchedSeconds >= pitchSeconds;
