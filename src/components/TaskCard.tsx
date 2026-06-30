import { useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import {
  Animated,
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
];
const SWIPE_RIGHT_ANIMATION_TYPES: CompletionAnimationType[] = [
  "slingShotLeft",
  "swipeFlyRight",
  "swipeSpinOut",
  "swipeFlyUpRight",
];
const TAP_ANIMATION_TYPES: CompletionAnimationType[] = [
  "flyUp",
  "pulseOut",
  "burstOut",
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
type SwipeDirection = "left" | "right";
type ScaleAnchor = "left" | "center" | "right";

let preparedBlowAwaySound: Audio.Sound | null = null;
let blowAwayLoadPromise: Promise<Audio.Sound | null> | null = null;
let preparedFlySwishSound: Audio.Sound | null = null;
let flySwishLoadPromise: Promise<Audio.Sound | null> | null = null;
let preparedSpinSwishSound: Audio.Sound | null = null;
let spinSwishLoadPromise: Promise<Audio.Sound | null> | null = null;

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
  const isCompletingRef = useRef(false);
  const swipeAnimationTypeRef = useRef<CompletionAnimationType | null>(null);
  const swipeDirectionRef = useRef<SwipeDirection | null>(null);
  const [swipeAnimationType, setSwipeAnimationType] = useState<
    CompletionAnimationType | null
  >(null);
  const [scaleAnchor, setScaleAnchor] = useState<ScaleAnchor>("left");
  const [isCompleting, setCompleting] = useState(false);
  const [isGone, setGone] = useState(false);

  useEffect(() => {
    setGone(false);
  }, [period, task.id]);

  useEffect(() => {
    if (!completionEffectsEnabled) {
      return;
    }
    void loadBlowAwaySound();
    void loadFlySwishSound();
    void loadSpinSwishSound();
  }, [completionEffectsEnabled]);

  const completeTask = (completeAnimationType: CompletionAnimationType) => {
    if (isCompletingRef.current) {
      return;
    }
    isCompletingRef.current = true;
    setCompleting(true);
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
    }
    playCompleteAnimation(completeAnimationType, {
      values,
      onFinished: () => {
        onComplete(task.id, period);
        setGone(true);
        isCompletingRef.current = false;
        setCompleting(false);
      },
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
        nextAnimationType === "burstOut"
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
  const shadowStyle = {
    shadowColor: theme.primary,
    boxShadow: `0px 4px 0px ${theme.primary}`,
  } as object;

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${task.title}を完了`}
          disabled={isCompleting}
          onPress={tapComplete}
          style={[
            styles.card,
            isTablet && styles.tabletCard,
            theme.variant === "blackYellow" && styles.blackYellowCard,
            shadowStyle,
            {
              borderColor: theme.primary,
              backgroundColor: theme.cardBackground,
            },
          ]}
        >
          <View style={[styles.cardInner, isTablet && styles.tabletCardInner]}>
            <Text
              style={[
                styles.title,
                isTablet && styles.tabletTitle,
                { color: theme.cardText },
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
          </View>
        </Pressable>
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
