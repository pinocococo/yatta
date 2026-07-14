import { useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  CompletionAnimationType,
  createCompletionValues,
  playCompleteAnimation,
} from "@/features/completion/animations";
import { Period, Task, Theme } from "@/types/yatta";

const blowAwaySound = require("../../assets/audio/blow-away-b4c4.mp3");
const flySwishSound = require("../../assets/audio/fly-swish.mp3");
const spinSwishSound = require("../../assets/audio/spin-swish-long.mp3");
const tapSuckWhistleSound = require("../../assets/audio/tap-suck-whistle.mp3");
const tapPulseFantasizeSound = require("../../assets/audio/tap-pulse-fantasize.mp3");
const tapBurstSparkleSound = require("../../assets/audio/tap-burst-sparkle.mp3");
const slingReleaseSound = require("../../assets/audio/sling-release.mp3");
const sliceSlashSound = require("../../assets/audio/slice-slash.mp3");
const shatterHitSound = require("../../assets/audio/shatter-hit.mp3");

const SWIPE_ACTIVATION_DISTANCE = 12;
const SWIPE_COMPLETE_DISTANCE = 92;
const SWIPE_COMPLETE_VELOCITY = 0.8;
const SWIPE_PREVIEW_DISTANCE = 140;
const SWIPE_FLY_PREVIEW_DISTANCE = 520;
const SLING_SHOT_SCALE_X = 0.1;
const SWIPE_LEFT_ANIMATION_TYPES: CompletionAnimationType[] = [
  "slingShot",
  "swipeFlyLeft",
  "swipeSpinOut",
  "swipeFlyUpLeft",
  "sliceDropLeft",
];
const SWIPE_RIGHT_ANIMATION_TYPES: CompletionAnimationType[] = [
  "slingShotLeft",
  "swipeFlyRight",
  "swipeSpinOut",
  "swipeFlyUpRight",
  "sliceDropRight",
];
const TAP_ANIMATION_TYPES: CompletionAnimationType[] = [
  "flyUp",
  "pulseOut",
  "burstOut",
  "shatterBurst",
];
const SPIN_SWISH_RATE = 1.5;
const SPIN_SWISH_FADE_START_MS = 120;
const SPIN_SWISH_FADE_DURATION_MS = 300;
const SPIN_SWISH_STOP_MS = 430;
const SPIN_SWISH_FADE_STEPS = 6;
const FLY_SWISH_SOURCE_DURATION_MS = 365.714;
const FLY_SWIPE_ANIMATION_DURATION_MS = 170;
const FLY_SWISH_RATE =
  FLY_SWISH_SOURCE_DURATION_MS / FLY_SWIPE_ANIMATION_DURATION_MS;
const BLOW_AWAY_RATE = 1.2;
const TAP_SUCK_WHISTLE_SOURCE_DURATION_MS = 287.347;
const TAP_SUCK_ANIMATION_DURATION_MS = 220;
const TAP_SUCK_WHISTLE_RATE =
  TAP_SUCK_WHISTLE_SOURCE_DURATION_MS / TAP_SUCK_ANIMATION_DURATION_MS;
const TAP_PULSE_FANTASIZE_RATE = 1;
const TAP_PULSE_FANTASIZE_FADE_START_MS = 260;
const TAP_PULSE_FANTASIZE_FADE_DURATION_MS = 235;
const TAP_PULSE_FANTASIZE_STOP_MS = 510;
const TAP_PULSE_FANTASIZE_FADE_STEPS = 6;
const TAP_BURST_SPARKLE_RATE = 1.3;
const SLING_RELEASE_RATE = 1.5;
const SLING_RELEASE_DELAY_MS = 70;
const SLICE_SLASH_RATE = 1;
const SHATTER_HIT_RATE = 1;
type SwipeDirection = "left" | "right";
type ScaleAnchor = "left" | "center" | "right";

let preparedBlowAwaySound: Audio.Sound | null = null;
let blowAwayLoadPromise: Promise<Audio.Sound | null> | null = null;
let preparedFlySwishSound: Audio.Sound | null = null;
let flySwishLoadPromise: Promise<Audio.Sound | null> | null = null;
let preparedSpinSwishSound: Audio.Sound | null = null;
let spinSwishLoadPromise: Promise<Audio.Sound | null> | null = null;
let preparedTapSuckWhistleSound: Audio.Sound | null = null;
let tapSuckWhistleLoadPromise: Promise<Audio.Sound | null> | null = null;
let preparedTapPulseFantasizeSound: Audio.Sound | null = null;
let tapPulseFantasizeLoadPromise: Promise<Audio.Sound | null> | null = null;
let preparedTapBurstSparkleSound: Audio.Sound | null = null;
let tapBurstSparkleLoadPromise: Promise<Audio.Sound | null> | null = null;
let preparedSlingReleaseSound: Audio.Sound | null = null;
let slingReleaseLoadPromise: Promise<Audio.Sound | null> | null = null;
let preparedSliceSlashSound: Audio.Sound | null = null;
let sliceSlashLoadPromise: Promise<Audio.Sound | null> | null = null;
let preparedShatterHitSound: Audio.Sound | null = null;
let shatterHitLoadPromise: Promise<Audio.Sound | null> | null = null;

const loadBlowAwaySound = () => {
  if (preparedBlowAwaySound) {
    return Promise.resolve(preparedBlowAwaySound);
  }
  if (blowAwayLoadPromise) {
    return blowAwayLoadPromise;
  }

  const sound = new Audio.Sound();
  blowAwayLoadPromise = sound
    .loadAsync(blowAwaySound, {
      rate: BLOW_AWAY_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    })
    .then(() => {
      preparedBlowAwaySound = sound;
      return sound;
    })
    .catch(() => {
      blowAwayLoadPromise = null;
      return null;
    });

  return blowAwayLoadPromise;
};

const loadFlySwishSound = () => {
  if (preparedFlySwishSound) {
    return Promise.resolve(preparedFlySwishSound);
  }
  if (flySwishLoadPromise) {
    return flySwishLoadPromise;
  }

  const sound = new Audio.Sound();
  flySwishLoadPromise = sound
    .loadAsync(flySwishSound, {
      rate: FLY_SWISH_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    })
    .then(() => {
      preparedFlySwishSound = sound;
      return sound;
    })
    .catch(() => {
      flySwishLoadPromise = null;
      return null;
    });

  return flySwishLoadPromise;
};

const loadSpinSwishSound = () => {
  if (preparedSpinSwishSound) {
    return Promise.resolve(preparedSpinSwishSound);
  }
  if (spinSwishLoadPromise) {
    return spinSwishLoadPromise;
  }

  const sound = new Audio.Sound();
  spinSwishLoadPromise = sound
    .loadAsync(spinSwishSound, {
      rate: SPIN_SWISH_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    })
    .then(() => {
      preparedSpinSwishSound = sound;
      return sound;
    })
    .catch(() => {
      spinSwishLoadPromise = null;
      return null;
    });

  return spinSwishLoadPromise;
};

const loadTapSuckWhistleSound = () => {
  if (preparedTapSuckWhistleSound) {
    return Promise.resolve(preparedTapSuckWhistleSound);
  }
  if (tapSuckWhistleLoadPromise) {
    return tapSuckWhistleLoadPromise;
  }

  const sound = new Audio.Sound();
  tapSuckWhistleLoadPromise = sound
    .loadAsync(tapSuckWhistleSound, {
      rate: TAP_SUCK_WHISTLE_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    })
    .then(() => {
      preparedTapSuckWhistleSound = sound;
      return sound;
    })
    .catch(() => {
      tapSuckWhistleLoadPromise = null;
      return null;
    });

  return tapSuckWhistleLoadPromise;
};

const loadTapPulseFantasizeSound = () => {
  if (preparedTapPulseFantasizeSound) {
    return Promise.resolve(preparedTapPulseFantasizeSound);
  }
  if (tapPulseFantasizeLoadPromise) {
    return tapPulseFantasizeLoadPromise;
  }

  const sound = new Audio.Sound();
  tapPulseFantasizeLoadPromise = sound
    .loadAsync(tapPulseFantasizeSound, {
      rate: TAP_PULSE_FANTASIZE_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    })
    .then(() => {
      preparedTapPulseFantasizeSound = sound;
      return sound;
    })
    .catch(() => {
      tapPulseFantasizeLoadPromise = null;
      return null;
    });

  return tapPulseFantasizeLoadPromise;
};

const loadTapBurstSparkleSound = () => {
  if (preparedTapBurstSparkleSound) {
    return Promise.resolve(preparedTapBurstSparkleSound);
  }
  if (tapBurstSparkleLoadPromise) {
    return tapBurstSparkleLoadPromise;
  }

  const sound = new Audio.Sound();
  tapBurstSparkleLoadPromise = sound
    .loadAsync(tapBurstSparkleSound, {
      rate: TAP_BURST_SPARKLE_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    })
    .then(() => {
      preparedTapBurstSparkleSound = sound;
      return sound;
    })
    .catch(() => {
      tapBurstSparkleLoadPromise = null;
      return null;
    });

  return tapBurstSparkleLoadPromise;
};

const loadSlingReleaseSound = () => {
  if (preparedSlingReleaseSound) {
    return Promise.resolve(preparedSlingReleaseSound);
  }
  if (slingReleaseLoadPromise) {
    return slingReleaseLoadPromise;
  }

  const sound = new Audio.Sound();
  slingReleaseLoadPromise = sound
    .loadAsync(slingReleaseSound, {
      rate: SLING_RELEASE_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    })
    .then(() => {
      preparedSlingReleaseSound = sound;
      return sound;
    })
    .catch(() => {
      slingReleaseLoadPromise = null;
      return null;
    });

  return slingReleaseLoadPromise;
};

const loadSliceSlashSound = () => {
  if (preparedSliceSlashSound) {
    return Promise.resolve(preparedSliceSlashSound);
  }
  if (sliceSlashLoadPromise) {
    return sliceSlashLoadPromise;
  }

  const sound = new Audio.Sound();
  sliceSlashLoadPromise = sound
    .loadAsync(sliceSlashSound, {
      rate: SLICE_SLASH_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    })
    .then(() => {
      preparedSliceSlashSound = sound;
      return sound;
    })
    .catch(() => {
      sliceSlashLoadPromise = null;
      return null;
    });

  return sliceSlashLoadPromise;
};

const loadShatterHitSound = () => {
  if (preparedShatterHitSound) {
    return Promise.resolve(preparedShatterHitSound);
  }
  if (shatterHitLoadPromise) {
    return shatterHitLoadPromise;
  }

  const sound = new Audio.Sound();
  shatterHitLoadPromise = sound
    .loadAsync(shatterHitSound, {
      rate: SHATTER_HIT_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    })
    .then(() => {
      preparedShatterHitSound = sound;
      return sound;
    })
    .catch(() => {
      shatterHitLoadPromise = null;
      return null;
    });

  return shatterHitLoadPromise;
};

const playBlowAwaySound = async () => {
  try {
    const preparedSound = await loadBlowAwaySound();
    if (preparedSound) {
      await preparedSound.stopAsync().catch(() => undefined);
      await preparedSound.setPositionAsync(0);
      await preparedSound.setRateAsync(BLOW_AWAY_RATE, false);
      await preparedSound.setVolumeAsync(1);
      await preparedSound.playAsync();
      return;
    }

    const { sound } = await Audio.Sound.createAsync(blowAwaySound, {
      shouldPlay: true,
      rate: BLOW_AWAY_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync().catch(() => undefined);
      }
    });
  } catch {
    // Completion should still work if the sound cannot be played.
  }
};

const playFlySwishSound = async () => {
  try {
    const preparedSound = await loadFlySwishSound();
    if (preparedSound) {
      await preparedSound.stopAsync().catch(() => undefined);
      await preparedSound.setPositionAsync(0);
      await preparedSound.setRateAsync(FLY_SWISH_RATE, false);
      await preparedSound.setVolumeAsync(1);
      await preparedSound.playAsync();
      return;
    }

    const { sound } = await Audio.Sound.createAsync(flySwishSound, {
      shouldPlay: true,
      rate: FLY_SWISH_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync().catch(() => undefined);
      }
    });
  } catch {
    // Completion should still work if the sound cannot be played.
  }
};

const scheduleSpinSwishFade = (
  sound: Audio.Sound,
  shouldUnloadOnFinish: boolean,
) => {
  for (let step = 1; step <= SPIN_SWISH_FADE_STEPS; step += 1) {
    const fadeStepMs =
      SPIN_SWISH_FADE_START_MS +
      (SPIN_SWISH_FADE_DURATION_MS / SPIN_SWISH_FADE_STEPS) * step;
    setTimeout(() => {
      void sound
        .setVolumeAsync(1 - step / SPIN_SWISH_FADE_STEPS)
        .catch(() => undefined);
    }, fadeStepMs);
  }

  setTimeout(() => {
    void sound
      .stopAsync()
      .catch(() => undefined)
      .finally(() => {
        if (shouldUnloadOnFinish) {
          void sound.unloadAsync().catch(() => undefined);
        }
      });
  }, SPIN_SWISH_STOP_MS);
};

const scheduleFadeOut = (
  sound: Audio.Sound,
  fadeStartMs: number,
  fadeDurationMs: number,
  stopMs: number,
  steps: number,
  shouldUnloadOnFinish: boolean,
) => {
  for (let step = 1; step <= steps; step += 1) {
    const fadeStepMs = fadeStartMs + (fadeDurationMs / steps) * step;
    setTimeout(() => {
      void sound.setVolumeAsync(1 - step / steps).catch(() => undefined);
    }, fadeStepMs);
  }

  setTimeout(() => {
    void sound
      .stopAsync()
      .catch(() => undefined)
      .finally(() => {
        if (shouldUnloadOnFinish) {
          void sound.unloadAsync().catch(() => undefined);
        }
      });
  }, stopMs);
};

const playSpinSwishSound = async () => {
  try {
    const preparedSound = await loadSpinSwishSound();
    if (preparedSound) {
      await preparedSound.stopAsync().catch(() => undefined);
      await preparedSound.setPositionAsync(0);
      await preparedSound.setRateAsync(SPIN_SWISH_RATE, false);
      await preparedSound.setVolumeAsync(1);
      await preparedSound.playAsync();
      scheduleSpinSwishFade(preparedSound, false);
      return;
    }

    const { sound } = await Audio.Sound.createAsync(spinSwishSound, {
      shouldPlay: true,
      rate: SPIN_SWISH_RATE,
      shouldCorrectPitch: false,
      volume: 1,
    });
    scheduleSpinSwishFade(sound, true);
  } catch {
    // Completion should still work if the sound cannot be played.
  }
};

const playPreparedSound = async (
  loadSound: () => Promise<Audio.Sound | null>,
  source: number,
  rate: number,
  onPlay?: (sound: Audio.Sound, isPreparedSound: boolean) => void,
) => {
  try {
    const preparedSound = await loadSound();
    if (preparedSound) {
      await preparedSound.stopAsync().catch(() => undefined);
      await preparedSound.setPositionAsync(0);
      await preparedSound.setRateAsync(rate, false);
      await preparedSound.setVolumeAsync(1);
      await preparedSound.playAsync();
      onPlay?.(preparedSound, true);
      return;
    }

    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      rate,
      shouldCorrectPitch: false,
      volume: 1,
    });
    onPlay?.(sound, false);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync().catch(() => undefined);
      }
    });
  } catch {
    // Completion should still work if the sound cannot be played.
  }
};

const playTapSuckWhistleSound = () => {
  void playPreparedSound(
    loadTapSuckWhistleSound,
    tapSuckWhistleSound,
    TAP_SUCK_WHISTLE_RATE,
  );
};

const playTapPulseFantasizeSound = () => {
  void playPreparedSound(
    loadTapPulseFantasizeSound,
    tapPulseFantasizeSound,
    TAP_PULSE_FANTASIZE_RATE,
    (sound, isPreparedSound) => {
      scheduleFadeOut(
        sound,
        TAP_PULSE_FANTASIZE_FADE_START_MS,
        TAP_PULSE_FANTASIZE_FADE_DURATION_MS,
        TAP_PULSE_FANTASIZE_STOP_MS,
        TAP_PULSE_FANTASIZE_FADE_STEPS,
        !isPreparedSound,
      );
    },
  );
};

const playTapBurstSparkleSound = () => {
  void playPreparedSound(
    loadTapBurstSparkleSound,
    tapBurstSparkleSound,
    TAP_BURST_SPARKLE_RATE,
  );
};

const playSlingReleaseSound = () => {
  void playPreparedSound(
    loadSlingReleaseSound,
    slingReleaseSound,
    SLING_RELEASE_RATE,
  );
};

const playSliceSlashSound = () => {
  void playPreparedSound(
    loadSliceSlashSound,
    sliceSlashSound,
    SLICE_SLASH_RATE,
  );
};

const playShatterHitSound = () => {
  void playPreparedSound(
    loadShatterHitSound,
    shatterHitSound,
    SHATTER_HIT_RATE,
  );
};

type Props = {
  task: Task;
  period: Period;
  theme: Theme;
  isTablet?: boolean;
  completionEffectsEnabled?: boolean;
  onComplete: (taskId: string, period: Period) => void;
  onSwipeActiveChange?: (isActive: boolean) => void;
  animationType?: CompletionAnimationType;
};

export function TaskCard({
  task,
  period,
  theme,
  isTablet = false,
  completionEffectsEnabled = true,
  onComplete,
  onSwipeActiveChange,
  animationType = "flyUp",
}: Props) {
  const values = useRef(createCompletionValues()).current;
  const sliceValues = useRef({
    lineOpacity: new Animated.Value(0),
    lineScaleX: new Animated.Value(0),
    topTranslateX: new Animated.Value(0),
    topTranslateY: new Animated.Value(0),
    topRotate: new Animated.Value(0),
    bottomTranslateX: new Animated.Value(0),
    bottomTranslateY: new Animated.Value(0),
    bottomRotate: new Animated.Value(0),
    opacity: new Animated.Value(1),
  }).current;
  const shatterValues = useRef({
    impactOpacity: new Animated.Value(0),
    impactScale: new Animated.Value(0),
    topLeftTranslateX: new Animated.Value(0),
    topLeftTranslateY: new Animated.Value(0),
    topLeftRotate: new Animated.Value(0),
    topRightTranslateX: new Animated.Value(0),
    topRightTranslateY: new Animated.Value(0),
    topRightRotate: new Animated.Value(0),
    bottomLeftTranslateX: new Animated.Value(0),
    bottomLeftTranslateY: new Animated.Value(0),
    bottomLeftRotate: new Animated.Value(0),
    bottomRightTranslateX: new Animated.Value(0),
    bottomRightTranslateY: new Animated.Value(0),
    bottomRightRotate: new Animated.Value(0),
    centerTranslateX: new Animated.Value(0),
    centerTranslateY: new Animated.Value(0),
    centerRotate: new Animated.Value(0),
    topLeftOpacity: new Animated.Value(1),
    topRightOpacity: new Animated.Value(1),
    bottomLeftOpacity: new Animated.Value(1),
    bottomRightOpacity: new Animated.Value(1),
    centerOpacity: new Animated.Value(1),
  }).current;
  const isCompletingRef = useRef(false);
  const swipeAnimationTypeRef = useRef<CompletionAnimationType | null>(null);
  const swipeDirectionRef = useRef<SwipeDirection | null>(null);
  const [swipeAnimationType, setSwipeAnimationType] = useState<
    CompletionAnimationType | null
  >(null);
  const [scaleAnchor, setScaleAnchor] = useState<ScaleAnchor>("left");
  const [isCompleting, setCompleting] = useState(false);
  const [isSliceCompleting, setSliceCompleting] = useState(false);
  const [isShatterCompleting, setShatterCompleting] = useState(false);
  const [isGone, setGone] = useState(false);

  useEffect(() => {
    setGone(false);
    setSliceCompleting(false);
    setShatterCompleting(false);
    sliceValues.lineOpacity.setValue(0);
    sliceValues.lineScaleX.setValue(0);
    sliceValues.topTranslateX.setValue(0);
    sliceValues.topTranslateY.setValue(0);
    sliceValues.topRotate.setValue(0);
    sliceValues.bottomTranslateX.setValue(0);
    sliceValues.bottomTranslateY.setValue(0);
    sliceValues.bottomRotate.setValue(0);
    sliceValues.opacity.setValue(1);
    shatterValues.impactOpacity.setValue(0);
    shatterValues.impactScale.setValue(0);
    shatterValues.topLeftTranslateX.setValue(0);
    shatterValues.topLeftTranslateY.setValue(0);
    shatterValues.topLeftRotate.setValue(0);
    shatterValues.topRightTranslateX.setValue(0);
    shatterValues.topRightTranslateY.setValue(0);
    shatterValues.topRightRotate.setValue(0);
    shatterValues.bottomLeftTranslateX.setValue(0);
    shatterValues.bottomLeftTranslateY.setValue(0);
    shatterValues.bottomLeftRotate.setValue(0);
    shatterValues.bottomRightTranslateX.setValue(0);
    shatterValues.bottomRightTranslateY.setValue(0);
    shatterValues.bottomRightRotate.setValue(0);
    shatterValues.centerTranslateX.setValue(0);
    shatterValues.centerTranslateY.setValue(0);
    shatterValues.centerRotate.setValue(0);
    shatterValues.topLeftOpacity.setValue(1);
    shatterValues.topRightOpacity.setValue(1);
    shatterValues.bottomLeftOpacity.setValue(1);
    shatterValues.bottomRightOpacity.setValue(1);
    shatterValues.centerOpacity.setValue(1);
  }, [period, task.id]);

  useEffect(() => {
    if (!completionEffectsEnabled) {
      return;
    }
    void loadBlowAwaySound();
    void loadFlySwishSound();
    void loadSpinSwishSound();
    void loadTapSuckWhistleSound();
    void loadTapPulseFantasizeSound();
    void loadTapBurstSparkleSound();
    void loadSlingReleaseSound();
    void loadSliceSlashSound();
    void loadShatterHitSound();
  }, [completionEffectsEnabled]);

  const finishCompletion = () => {
    onComplete(task.id, period);
    setGone(true);
    isCompletingRef.current = false;
    setCompleting(false);
    setSliceCompleting(false);
    setShatterCompleting(false);
  };

  const resetBaseValues = () => {
    values.translateX.setValue(0);
    values.translateY.setValue(0);
    values.rotate.setValue(0);
    values.scaleX.setValue(1);
    values.scaleY.setValue(1);
    values.opacity.setValue(1);
  };

  const playSliceDropAnimation = (
    completeAnimationType: CompletionAnimationType,
  ) => {
    const direction = completeAnimationType === "sliceDropLeft" ? -1 : 1;
    if (completionEffectsEnabled) {
      playSliceSlashSound();
    }
    setScaleAnchor("center");
    setSliceCompleting(true);
    resetBaseValues();
    sliceValues.lineOpacity.setValue(0);
    sliceValues.lineScaleX.setValue(0);
    sliceValues.topTranslateX.setValue(0);
    sliceValues.topTranslateY.setValue(0);
    sliceValues.topRotate.setValue(0);
    sliceValues.bottomTranslateX.setValue(0);
    sliceValues.bottomTranslateY.setValue(0);
    sliceValues.bottomRotate.setValue(0);
    sliceValues.opacity.setValue(1);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(sliceValues.lineOpacity, {
          toValue: 1,
          duration: 35,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sliceValues.lineScaleX, {
          toValue: 1,
          duration: 90,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(sliceValues.lineOpacity, {
          toValue: 0,
          duration: 80,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sliceValues.topTranslateX, {
          toValue: direction * -96,
          duration: 360,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sliceValues.topTranslateY, {
          toValue: 430,
          duration: 360,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sliceValues.topRotate, {
          toValue: direction * -1.8,
          duration: 360,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sliceValues.bottomTranslateX, {
          toValue: direction * 128,
          duration: 390,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sliceValues.bottomTranslateY, {
          toValue: 520,
          duration: 390,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sliceValues.bottomRotate, {
          toValue: direction * 2.2,
          duration: 390,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(260),
          Animated.timing(sliceValues.opacity, {
            toValue: 0,
            duration: 130,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        finishCompletion();
      }
    });
  };

  const playShatterBurstAnimation = () => {
    const randomBetween = (min: number, max: number) =>
      min + Math.random() * (max - min);
    if (completionEffectsEnabled) {
      playShatterHitSound();
    }
    setScaleAnchor("center");
    setShatterCompleting(true);
    resetBaseValues();
    shatterValues.impactOpacity.setValue(0);
    shatterValues.impactScale.setValue(0);
    shatterValues.topLeftTranslateX.setValue(0);
    shatterValues.topLeftTranslateY.setValue(0);
    shatterValues.topLeftRotate.setValue(0);
    shatterValues.topRightTranslateX.setValue(0);
    shatterValues.topRightTranslateY.setValue(0);
    shatterValues.topRightRotate.setValue(0);
    shatterValues.bottomLeftTranslateX.setValue(0);
    shatterValues.bottomLeftTranslateY.setValue(0);
    shatterValues.bottomLeftRotate.setValue(0);
    shatterValues.bottomRightTranslateX.setValue(0);
    shatterValues.bottomRightTranslateY.setValue(0);
    shatterValues.bottomRightRotate.setValue(0);
    shatterValues.centerTranslateX.setValue(0);
    shatterValues.centerTranslateY.setValue(0);
    shatterValues.centerRotate.setValue(0);
    shatterValues.topLeftOpacity.setValue(1);
    shatterValues.topRightOpacity.setValue(1);
    shatterValues.bottomLeftOpacity.setValue(1);
    shatterValues.bottomRightOpacity.setValue(1);
    shatterValues.centerOpacity.setValue(1);

    const pieceTargets = {
      topLeftX: randomBetween(-210, -120),
      topLeftY: randomBetween(-190, -95),
      topLeftRotate: randomBetween(-2.4, -1.1),
      topLeftDuration: randomBetween(300, 430),
      topLeftFadeDelay: randomBetween(120, 230),
      topRightX: randomBetween(110, 230),
      topRightY: randomBetween(-185, -80),
      topRightRotate: randomBetween(1.1, 2.6),
      topRightDuration: randomBetween(290, 410),
      topRightFadeDelay: randomBetween(90, 210),
      bottomLeftX: randomBetween(-230, -105),
      bottomLeftY: randomBetween(90, 230),
      bottomLeftRotate: randomBetween(1, 2.7),
      bottomLeftDuration: randomBetween(330, 460),
      bottomLeftFadeDelay: randomBetween(150, 270),
      bottomRightX: randomBetween(105, 220),
      bottomRightY: randomBetween(100, 245),
      bottomRightRotate: randomBetween(-2.8, -1),
      bottomRightDuration: randomBetween(320, 450),
      bottomRightFadeDelay: randomBetween(130, 260),
      centerX: randomBetween(-70, 85),
      centerY: randomBetween(-225, 210),
      centerRotate: randomBetween(-3.2, 3.2),
      centerDuration: randomBetween(280, 430),
      centerFadeDelay: randomBetween(70, 190),
    };

    Animated.sequence([
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shatterValues.impactOpacity, {
            toValue: 1,
            duration: 35,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(shatterValues.impactOpacity, {
            toValue: 0,
            duration: 95,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(shatterValues.impactScale, {
          toValue: 1.35,
          duration: 130,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(shatterValues.topLeftTranslateX, {
          toValue: pieceTargets.topLeftX,
          duration: pieceTargets.topLeftDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shatterValues.topLeftTranslateY, {
          toValue: pieceTargets.topLeftY,
          duration: pieceTargets.topLeftDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shatterValues.topLeftRotate, {
          toValue: pieceTargets.topLeftRotate,
          duration: pieceTargets.topLeftDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(pieceTargets.topLeftFadeDelay),
          Animated.timing(shatterValues.topLeftOpacity, {
            toValue: 0,
            duration: randomBetween(110, 210),
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(shatterValues.topRightTranslateX, {
          toValue: pieceTargets.topRightX,
          duration: pieceTargets.topRightDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shatterValues.topRightTranslateY, {
          toValue: pieceTargets.topRightY,
          duration: pieceTargets.topRightDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shatterValues.topRightRotate, {
          toValue: pieceTargets.topRightRotate,
          duration: pieceTargets.topRightDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(pieceTargets.topRightFadeDelay),
          Animated.timing(shatterValues.topRightOpacity, {
            toValue: 0,
            duration: randomBetween(120, 220),
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(shatterValues.bottomLeftTranslateX, {
          toValue: pieceTargets.bottomLeftX,
          duration: pieceTargets.bottomLeftDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shatterValues.bottomLeftTranslateY, {
          toValue: pieceTargets.bottomLeftY,
          duration: pieceTargets.bottomLeftDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shatterValues.bottomLeftRotate, {
          toValue: pieceTargets.bottomLeftRotate,
          duration: pieceTargets.bottomLeftDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(pieceTargets.bottomLeftFadeDelay),
          Animated.timing(shatterValues.bottomLeftOpacity, {
            toValue: 0,
            duration: randomBetween(110, 220),
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(shatterValues.bottomRightTranslateX, {
          toValue: pieceTargets.bottomRightX,
          duration: pieceTargets.bottomRightDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shatterValues.bottomRightTranslateY, {
          toValue: pieceTargets.bottomRightY,
          duration: pieceTargets.bottomRightDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shatterValues.bottomRightRotate, {
          toValue: pieceTargets.bottomRightRotate,
          duration: pieceTargets.bottomRightDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(pieceTargets.bottomRightFadeDelay),
          Animated.timing(shatterValues.bottomRightOpacity, {
            toValue: 0,
            duration: randomBetween(120, 230),
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(shatterValues.centerTranslateX, {
          toValue: pieceTargets.centerX,
          duration: pieceTargets.centerDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shatterValues.centerTranslateY, {
          toValue: pieceTargets.centerY,
          duration: pieceTargets.centerDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shatterValues.centerRotate, {
          toValue: pieceTargets.centerRotate,
          duration: pieceTargets.centerDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(pieceTargets.centerFadeDelay),
          Animated.timing(shatterValues.centerOpacity, {
            toValue: 0,
            duration: randomBetween(90, 190),
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        finishCompletion();
      }
    });
  };

  const completeTask = (completeAnimationType: CompletionAnimationType) => {
    if (isCompletingRef.current) {
      return;
    }
    isCompletingRef.current = true;
    setCompleting(true);
    if (
      completeAnimationType === "sliceDropLeft" ||
      completeAnimationType === "sliceDropRight"
    ) {
      playSliceDropAnimation(completeAnimationType);
      return;
    }
    if (completeAnimationType === "shatterBurst") {
      playShatterBurstAnimation();
      return;
    }
    if (completionEffectsEnabled) {
      if (
        completeAnimationType === "swipeFlyUpLeft" ||
        completeAnimationType === "swipeFlyUpRight"
      ) {
        void playBlowAwaySound();
      }
      if (
        completeAnimationType === "swipeFlyLeft" ||
        completeAnimationType === "swipeFlyRight"
      ) {
        void playFlySwishSound();
      }
      if (completeAnimationType === "swipeSpinOut") {
        void playSpinSwishSound();
      }
      if (completeAnimationType === "flyUp") {
        playTapSuckWhistleSound();
      }
      if (completeAnimationType === "pulseOut") {
        playTapPulseFantasizeSound();
      }
      if (completeAnimationType === "burstOut") {
        playTapBurstSparkleSound();
      }
      if (
        completeAnimationType === "slingShot" ||
        completeAnimationType === "slingShotLeft"
      ) {
        setTimeout(playSlingReleaseSound, SLING_RELEASE_DELAY_MS);
      }
    }
    playCompleteAnimation(completeAnimationType, {
      values,
      onFinished: finishCompletion,
    });
  };

  const tapComplete = () => {
    if (!completionEffectsEnabled) {
      setScaleAnchor("center");
      completeTask("quickFade");
      return;
    }
    const animationTypes: CompletionAnimationType[] =
      animationType === "flyUp" ? TAP_ANIMATION_TYPES : [animationType, "pulseOut"];
    const randomIndex = Math.floor(Math.random() * animationTypes.length);
    const nextAnimationType = animationTypes[randomIndex];
    setScaleAnchor(
      nextAnimationType === "pulseOut" ||
        nextAnimationType === "flyUp" ||
        nextAnimationType === "burstOut" ||
        nextAnimationType === "shatterBurst"
        ? "center"
        : "left",
    );
    completeTask(nextAnimationType);
  };
  const swipeComplete = (direction: SwipeDirection) => {
    completeTask(
      swipeAnimationTypeRef.current ?? chooseSwipeAnimationType(direction),
    );
  };

  const chooseSwipeAnimationType = (direction: SwipeDirection) => {
    if (!completionEffectsEnabled) {
      const nextAnimationType: CompletionAnimationType =
        direction === "left" ? "swipeFlyLeft" : "swipeFlyRight";
      swipeAnimationTypeRef.current = nextAnimationType;
      swipeDirectionRef.current = direction;
      setSwipeAnimationType(nextAnimationType);
      setScaleAnchor("left");
      return nextAnimationType;
    }

    const animationTypes =
      direction === "left" ? SWIPE_LEFT_ANIMATION_TYPES : SWIPE_RIGHT_ANIMATION_TYPES;
    const randomIndex = Math.floor(Math.random() * animationTypes.length);
    const nextAnimationType = animationTypes[randomIndex];
    swipeAnimationTypeRef.current = nextAnimationType;
    swipeDirectionRef.current = direction;
    setSwipeAnimationType(nextAnimationType);
    if (nextAnimationType === "swipeSpinOut") {
      setScaleAnchor("center");
    } else if (
      nextAnimationType === "sliceDropLeft" ||
      nextAnimationType === "sliceDropRight"
    ) {
      setScaleAnchor("center");
    } else if (nextAnimationType === "slingShotLeft") {
      setScaleAnchor("right");
    } else {
      setScaleAnchor("left");
    }
    return nextAnimationType;
  };

  const previewSwipeMotion = (translateX: number) => {
    const direction: SwipeDirection | null =
      translateX < 0 ? "left" : translateX > 0 ? "right" : null;
    const swipeProgress = Math.min(
      Math.max(Math.abs(translateX) / SWIPE_PREVIEW_DISTANCE, 0),
      1,
    );
    const activeSwipeAnimationType = direction
      ? swipeAnimationTypeRef.current && swipeDirectionRef.current === direction
        ? swipeAnimationTypeRef.current
        : chooseSwipeAnimationType(direction)
      : null;

    if (activeSwipeAnimationType === "swipeFlyLeft") {
      values.translateX.setValue(
        translateX < 0
          ? Math.max(translateX, -SWIPE_FLY_PREVIEW_DISTANCE)
          : 0,
      );
      values.rotate.setValue(0);
      values.translateY.setValue(0);
      values.scaleX.setValue(1);
      values.scaleY.setValue(1);
      return;
    }

    if (activeSwipeAnimationType === "swipeFlyRight") {
      values.translateX.setValue(
        translateX > 0 ? Math.min(translateX, SWIPE_FLY_PREVIEW_DISTANCE) : 0,
      );
      values.rotate.setValue(0);
      values.translateY.setValue(0);
      values.scaleX.setValue(1);
      values.scaleY.setValue(1);
      return;
    }

    if (activeSwipeAnimationType === "swipeSpinOut") {
      values.translateX.setValue(0);
      values.translateY.setValue(0);
      values.rotate.setValue(0);
      values.scaleX.setValue(1 - swipeProgress * 2);
      values.scaleY.setValue(1);
      return;
    }

    if (
      activeSwipeAnimationType === "swipeFlyUpRight" ||
      activeSwipeAnimationType === "swipeFlyUpLeft"
    ) {
      values.translateX.setValue(translateX * 0.35);
      values.translateY.setValue(-24 * swipeProgress);
      values.rotate.setValue(
        activeSwipeAnimationType === "swipeFlyUpRight"
          ? swipeProgress * 0.35
          : -swipeProgress * 0.35,
      );
      values.scaleX.setValue(1 - 0.24 * swipeProgress);
      values.scaleY.setValue(1 - 0.24 * swipeProgress);
      return;
    }

    if (
      activeSwipeAnimationType === "sliceDropLeft" ||
      activeSwipeAnimationType === "sliceDropRight"
    ) {
      values.translateX.setValue(translateX * 0.18);
      values.translateY.setValue(0);
      values.rotate.setValue(0);
      values.scaleX.setValue(1);
      values.scaleY.setValue(1);
      return;
    }

    values.translateX.setValue(0);
    values.translateY.setValue(0);
    values.rotate.setValue(0);
    values.scaleX.setValue(1 - (1 - SLING_SHOT_SCALE_X) * swipeProgress);
    values.scaleY.setValue(1);
  };

  const resetSwipeOffset = () => {
    Animated.parallel([
      Animated.spring(values.translateX, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(values.rotate, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(values.scaleX, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(values.scaleY, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        !isCompletingRef.current &&
        Math.abs(gesture.dx) > SWIPE_ACTIVATION_DISTANCE &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        swipeAnimationTypeRef.current = null;
        swipeDirectionRef.current = null;
        setSwipeAnimationType(null);
        setScaleAnchor("left");
        onSwipeActiveChange?.(true);
      },
      onPanResponderMove: (_, gesture) => {
        if (!isCompletingRef.current) {
          const translateX = Math.max(
            -SWIPE_FLY_PREVIEW_DISTANCE,
            Math.min(gesture.dx, SWIPE_FLY_PREVIEW_DISTANCE),
          );
          previewSwipeMotion(translateX);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        onSwipeActiveChange?.(false);
        if (isCompletingRef.current) {
          return;
        }
        if (gesture.dx < -SWIPE_COMPLETE_DISTANCE) {
          swipeComplete("left");
          return;
        }
        if (gesture.dx > SWIPE_COMPLETE_DISTANCE) {
          swipeComplete("right");
          return;
        }
        if (gesture.vx > SWIPE_COMPLETE_VELOCITY) {
          swipeComplete("right");
          return;
        }
        if (gesture.vx < -SWIPE_COMPLETE_VELOCITY) {
          swipeComplete("left");
          return;
        }
        resetSwipeOffset();
      },
      onPanResponderTerminate: () => {
        onSwipeActiveChange?.(false);
        if (!isCompletingRef.current) {
          resetSwipeOffset();
        }
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const rotate = values.rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-16deg", "0deg", "16deg"],
  });
  const sliceTopRotate = sliceValues.topRotate.interpolate({
    inputRange: [-2, 0, 2],
    outputRange: ["-28deg", "0deg", "28deg"],
  });
  const sliceBottomRotate = sliceValues.bottomRotate.interpolate({
    inputRange: [-2.4, 0, 2.4],
    outputRange: ["-36deg", "0deg", "36deg"],
  });
  const shatterTopLeftRotate = shatterValues.topLeftRotate.interpolate({
    inputRange: [-2, 0, 2],
    outputRange: ["-34deg", "0deg", "34deg"],
  });
  const shatterTopRightRotate = shatterValues.topRightRotate.interpolate({
    inputRange: [-2, 0, 2],
    outputRange: ["-34deg", "0deg", "34deg"],
  });
  const shatterBottomLeftRotate = shatterValues.bottomLeftRotate.interpolate({
    inputRange: [-2, 0, 2],
    outputRange: ["-36deg", "0deg", "36deg"],
  });
  const shatterBottomRightRotate = shatterValues.bottomRightRotate.interpolate({
    inputRange: [-2, 0, 2],
    outputRange: ["-38deg", "0deg", "38deg"],
  });
  const shatterCenterRotate = shatterValues.centerRotate.interpolate({
    inputRange: [-3.4, 0, 3.4],
    outputRange: ["-62deg", "0deg", "62deg"],
  });
  const shadowStyle = {
    shadowColor: theme.primary,
    boxShadow: `0px 4px 0px ${theme.primary}`,
  } as object;
  const cardHeight = isTablet ? 88 : 72;
  const halfCardHeight = cardHeight / 2;
  const cardStyle = [
    styles.card,
    isTablet && styles.tabletCard,
    theme.variant === "blackYellow" && styles.blackYellowCard,
    shadowStyle,
    {
      borderColor: theme.primary,
      backgroundColor: theme.cardBackground,
    },
  ];
  const cardInnerStyle = [styles.cardInner, isTablet && styles.tabletCardInner];
  const titleStyle = [
    styles.title,
    isTablet && styles.tabletTitle,
    { color: theme.cardText },
  ];
  const shatterPieceSurfaceStyle = [
    styles.shatterPieceSurface,
    theme.variant === "blackYellow" && styles.blackYellowShatterPieceSurface,
    {
      borderColor: theme.primary,
      backgroundColor: theme.cardBackground,
    },
  ];

  if (isGone) {
    return null;
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.animated,
        {
          opacity: values.opacity,
          transform: [
            { translateX: values.translateX },
            { translateY: values.translateY },
            { rotate },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          scaleAnchor === "center"
            ? styles.centerScaleAnchor
            : scaleAnchor === "right"
              ? styles.rightScaleAnchor
              : styles.leftScaleAnchor,
          { transform: [{ scaleX: values.scaleX }, { scaleY: values.scaleY }] },
        ]}
      >
        {isShatterCompleting ? (
          <View
            pointerEvents="none"
            style={[styles.shatterStage, { height: cardHeight }]}
          >
            <Animated.View
              style={[
                styles.shatterPiece,
                styles.shatterTopLeft,
                {
                  height: cardHeight * 0.68,
                  opacity: shatterValues.topLeftOpacity,
                  transform: [
                    { translateX: shatterValues.topLeftTranslateX },
                    { translateY: shatterValues.topLeftTranslateY },
                    { rotate: shatterTopLeftRotate },
                  ],
                },
              ]}
            >
              <View style={[shatterPieceSurfaceStyle, styles.shatterShardTopLeft]} />
            </Animated.View>
            <Animated.View
              style={[
                styles.shatterPiece,
                styles.shatterTopRight,
                {
                  height: cardHeight * 0.56,
                  opacity: shatterValues.topRightOpacity,
                  transform: [
                    { translateX: shatterValues.topRightTranslateX },
                    { translateY: shatterValues.topRightTranslateY },
                    { rotate: shatterTopRightRotate },
                  ],
                },
              ]}
            >
              <View style={[shatterPieceSurfaceStyle, styles.shatterShardTopRight]} />
            </Animated.View>
            <Animated.View
              style={[
                styles.shatterPiece,
                styles.shatterBottomLeft,
                {
                  height: cardHeight * 0.58,
                  top: cardHeight * 0.37,
                  opacity: shatterValues.bottomLeftOpacity,
                  transform: [
                    { translateX: shatterValues.bottomLeftTranslateX },
                    { translateY: shatterValues.bottomLeftTranslateY },
                    { rotate: shatterBottomLeftRotate },
                  ],
                },
              ]}
            >
              <View style={[shatterPieceSurfaceStyle, styles.shatterShardBottomLeft]} />
            </Animated.View>
            <Animated.View
              style={[
                styles.shatterPiece,
                styles.shatterBottomRight,
                {
                  height: cardHeight * 0.7,
                  top: cardHeight * 0.28,
                  opacity: shatterValues.bottomRightOpacity,
                  transform: [
                    { translateX: shatterValues.bottomRightTranslateX },
                    { translateY: shatterValues.bottomRightTranslateY },
                    { rotate: shatterBottomRightRotate },
                  ],
                },
              ]}
            >
              <View style={[shatterPieceSurfaceStyle, styles.shatterShardBottomRight]} />
            </Animated.View>
            <Animated.View
              style={[
                styles.shatterPiece,
                styles.shatterCenter,
                {
                  opacity: shatterValues.centerOpacity,
                  transform: [
                    { translateX: shatterValues.centerTranslateX },
                    { translateY: shatterValues.centerTranslateY },
                    { rotate: shatterCenterRotate },
                  ],
                },
              ]}
            >
              <View style={[shatterPieceSurfaceStyle, styles.shatterShardCenter]} />
            </Animated.View>
            <Animated.View
              style={[
                styles.shatterImpact,
                {
                  borderColor: theme.primary,
                  opacity: shatterValues.impactOpacity,
                  transform: [{ scale: shatterValues.impactScale }],
                },
              ]}
            />
          </View>
        ) : isSliceCompleting ? (
          <View
            pointerEvents="none"
            style={[styles.sliceStage, { height: cardHeight }]}
          >
            <Animated.View
              style={[
                styles.sliceHalf,
                styles.sliceTopHalf,
                { height: halfCardHeight, opacity: sliceValues.opacity },
                {
                  transform: [
                    { translateX: sliceValues.topTranslateX },
                    { translateY: sliceValues.topTranslateY },
                    { rotate: sliceTopRotate },
                  ],
                },
              ]}
            >
              <View style={[cardStyle, styles.sliceCard, { height: cardHeight }]}>
                <View style={cardInnerStyle}>
                  <Text style={titleStyle} numberOfLines={1}>
                    {task.title}
                  </Text>
                </View>
              </View>
            </Animated.View>
            <Animated.View
              style={[
                styles.sliceHalf,
                styles.sliceBottomHalf,
                {
                  height: halfCardHeight,
                  top: halfCardHeight,
                  opacity: sliceValues.opacity,
                },
                {
                  transform: [
                    { translateX: sliceValues.bottomTranslateX },
                    { translateY: sliceValues.bottomTranslateY },
                    { rotate: sliceBottomRotate },
                  ],
                },
              ]}
            >
              <View
                style={[
                  cardStyle,
                  styles.sliceCard,
                  {
                    height: cardHeight,
                    transform: [{ translateY: -halfCardHeight }],
                  },
                ]}
              >
                <View style={cardInnerStyle}>
                  <Text style={titleStyle} numberOfLines={1}>
                    {task.title}
                  </Text>
                </View>
              </View>
            </Animated.View>
            <Animated.View
              style={[
                styles.sliceLine,
                {
                  backgroundColor:
                    theme.variant === "blackYellow" ? theme.primary : theme.text,
                  opacity: sliceValues.lineOpacity,
                  top: halfCardHeight - 1,
                  transform: [{ scaleX: sliceValues.lineScaleX }],
                },
              ]}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${task.title}を完了`}
            disabled={isCompleting}
            onPress={tapComplete}
            style={cardStyle}
          >
            <View style={cardInnerStyle}>
              <Text style={titleStyle} numberOfLines={1}>
                {task.title}
              </Text>
            </View>
          </Pressable>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animated: {
    width: "100%",
    overflow: "visible",
  },
  leftScaleAnchor: {
    width: "100%",
    transformOrigin: "left center",
  },
  centerScaleAnchor: {
    width: "100%",
    transformOrigin: "center center",
  },
  rightScaleAnchor: {
    width: "100%",
    transformOrigin: "right center",
  },
  shatterStage: {
    position: "relative",
    width: "100%",
    overflow: "visible",
  },
  shatterPiece: {
    position: "absolute",
    overflow: "hidden",
  },
  shatterTopLeft: {
    left: -6,
    top: -10,
    width: "54%",
    transformOrigin: "right bottom",
  },
  shatterTopRight: {
    right: -8,
    top: -3,
    width: "62%",
    transformOrigin: "left bottom",
  },
  shatterBottomLeft: {
    left: -10,
    width: "63%",
    transformOrigin: "right top",
  },
  shatterBottomRight: {
    right: -9,
    width: "58%",
    transformOrigin: "left top",
  },
  shatterCenter: {
    left: "38%",
    top: "12%",
    width: "28%",
    height: "76%",
    transformOrigin: "center center",
    zIndex: 3,
  },
  shatterPieceSurface: {
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderRadius: 10,
  },
  shatterShardTopLeft: {
    marginLeft: -18,
    marginTop: -8,
    width: "128%",
    height: "118%",
    transform: [{ skewX: "-22deg" }, { skewY: "8deg" }, { rotate: "-7deg" }],
  },
  shatterShardTopRight: {
    marginLeft: -12,
    marginTop: -14,
    width: "126%",
    height: "126%",
    transform: [{ skewX: "18deg" }, { skewY: "-11deg" }, { rotate: "9deg" }],
  },
  shatterShardBottomLeft: {
    marginLeft: -16,
    marginTop: -7,
    width: "122%",
    height: "126%",
    transform: [{ skewX: "21deg" }, { skewY: "12deg" }, { rotate: "8deg" }],
  },
  shatterShardBottomRight: {
    marginLeft: -10,
    marginTop: -18,
    width: "132%",
    height: "128%",
    transform: [{ skewX: "-17deg" }, { skewY: "-15deg" }, { rotate: "-10deg" }],
  },
  shatterShardCenter: {
    marginLeft: -8,
    marginTop: -10,
    width: "130%",
    height: "120%",
    borderRadius: 6,
    transform: [{ skewX: "29deg" }, { skewY: "-18deg" }, { rotate: "18deg" }],
  },
  blackYellowShatterPieceSurface: {
    borderWidth: 1,
    borderRadius: 0,
  },
  shatterImpact: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderWidth: 3,
    borderRadius: 999,
    zIndex: 6,
  },
  sliceStage: {
    position: "relative",
    width: "100%",
    overflow: "visible",
  },
  sliceHalf: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  sliceTopHalf: {
    top: 0,
    transformOrigin: "center bottom",
  },
  sliceBottomHalf: {
    transformOrigin: "center top",
  },
  sliceCard: {
    minHeight: 0,
  },
  sliceLine: {
    position: "absolute",
    left: -4,
    right: -4,
    height: 3,
    borderRadius: 999,
    zIndex: 5,
  },
  card: {
    width: "100%",
    minHeight: 72,
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  tabletCard: {
    minHeight: 88,
  },
  blackYellowCard: {
    borderWidth: 1,
    borderRadius: 0,
  },
  cardInner: {
    minHeight: 68,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  tabletCardInner: {
    minHeight: 84,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  tabletTitle: {
    fontSize: 28,
  },
});
