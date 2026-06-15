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

const blowAwaySound = require("../../assets/audio/blow-away-short.mp3");

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
const SOUND_ANIMATION_TYPES: CompletionAnimationType[] = [
  "swipeFlyLeft",
  "swipeFlyRight",
];
type SwipeDirection = "left" | "right";
type ScaleAnchor = "left" | "center" | "right";

const playBlowAwaySound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(blowAwaySound, {
      shouldPlay: true,
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    // Sound is a nice-to-have flourish; task completion should never fail because of it.
  }
};

type Props = {
  task: Task;
  period: Period;
  theme: Theme;
  onComplete: (taskId: string, period: Period) => void;
  onSwipeActiveChange?: (isActive: boolean) => void;
  animationType?: CompletionAnimationType;
};

export function TaskCard({
  task,
  period,
  theme,
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

  const completeTask = (completeAnimationType: CompletionAnimationType) => {
    if (isCompletingRef.current) {
      return;
    }
    isCompletingRef.current = true;
    setCompleting(true);
    if (SOUND_ANIMATION_TYPES.includes(completeAnimationType)) {
      void playBlowAwaySound();
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
            shadowStyle,
            {
              borderColor: theme.primary,
            },
          ]}
        >
          <View style={styles.cardInner}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
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
  cardInner: {
    minHeight: 68,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
});
