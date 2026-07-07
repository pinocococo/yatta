import { Animated } from "react-native";

export type CompletionAnimationType =
  | "quickFade"
  | "flyUp"
  | "pulseOut"
  | "burstOut"
  | "slingShot"
  | "slingShotLeft"
  | "swipeFlyLeft"
  | "swipeFlyRight"
  | "swipeSpinOut"
  | "swipeFlyUpRight"
  | "swipeFlyUpLeft"
  | "flyOut"
  | "spin"
  | "rocket"
  | "blackHole";

export type CompletionAnimatedValues = {
  translateX: Animated.Value;
  translateY: Animated.Value;
  rotate: Animated.Value;
  scaleX: Animated.Value;
  scaleY: Animated.Value;
  opacity: Animated.Value;
};

export const createCompletionValues = (): CompletionAnimatedValues => ({
  translateX: new Animated.Value(0),
  translateY: new Animated.Value(0),
  rotate: new Animated.Value(0),
  scaleX: new Animated.Value(1),
  scaleY: new Animated.Value(1),
  opacity: new Animated.Value(1),
});

type PlayArgs = {
  values: CompletionAnimatedValues;
  onFinished: () => void;
};

const playFlyUp = ({ values, onFinished }: PlayArgs) => {
  Animated.parallel([
    Animated.timing(values.translateX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }),
    Animated.timing(values.translateY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }),
    Animated.timing(values.rotate, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }),
    Animated.timing(values.scaleX, {
      toValue: 0.04,
      duration: 220,
      useNativeDriver: true,
    }),
    Animated.timing(values.scaleY, {
      toValue: 0.04,
      duration: 220,
      useNativeDriver: true,
    }),
    Animated.timing(values.opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }),
  ]).start(({ finished }) => {
    if (finished) {
      onFinished();
    }
  });
};

const playQuickFade = ({ values, onFinished }: PlayArgs) => {
  Animated.parallel([
    Animated.timing(values.scaleX, {
      toValue: 0.96,
      duration: 90,
      useNativeDriver: true,
    }),
    Animated.timing(values.scaleY, {
      toValue: 0.96,
      duration: 90,
      useNativeDriver: true,
    }),
    Animated.timing(values.opacity, {
      toValue: 0,
      duration: 90,
      useNativeDriver: true,
    }),
  ]).start(({ finished }) => {
    if (finished) {
      onFinished();
    }
  });
};

const playSlingShot = ({ values, onFinished }: PlayArgs) => {
  Animated.parallel([
    Animated.sequence([
      Animated.timing(values.translateX, {
        toValue: -26,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(values.translateX, {
        toValue: 48,
        duration: 65,
        useNativeDriver: true,
      }),
      Animated.timing(values.translateX, {
        toValue: 660,
        duration: 220,
        useNativeDriver: true,
      }),
    ]),
    Animated.timing(values.translateY, {
      toValue: 0,
      duration: 355,
      useNativeDriver: true,
    }),
    Animated.timing(values.rotate, {
      toValue: 0,
      duration: 355,
      useNativeDriver: true,
    }),
    Animated.sequence([
      Animated.timing(values.scaleX, {
        toValue: 0.7,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 1.1,
        duration: 65,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 1.02,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 0.96,
        duration: 110,
        useNativeDriver: true,
      }),
    ]),
    Animated.sequence([
      Animated.timing(values.scaleY, {
        toValue: 1.04,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 1.08,
        duration: 65,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 1.02,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 0.96,
        duration: 110,
        useNativeDriver: true,
      }),
    ]),
    Animated.sequence([
      Animated.timing(values.opacity, {
        toValue: 1,
        duration: 355,
        useNativeDriver: true,
      }),
      Animated.timing(values.opacity, {
        toValue: 0,
        duration: 110,
        useNativeDriver: true,
      }),
    ]),
  ]).start(({ finished }) => {
    if (finished) {
      onFinished();
    }
  });
};

const playSlingShotLeft = ({ values, onFinished }: PlayArgs) => {
  Animated.parallel([
    Animated.sequence([
      Animated.timing(values.translateX, {
        toValue: 26,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(values.translateX, {
        toValue: -48,
        duration: 65,
        useNativeDriver: true,
      }),
      Animated.timing(values.translateX, {
        toValue: -660,
        duration: 220,
        useNativeDriver: true,
      }),
    ]),
    Animated.timing(values.translateY, {
      toValue: 0,
      duration: 355,
      useNativeDriver: true,
    }),
    Animated.timing(values.rotate, {
      toValue: 0,
      duration: 355,
      useNativeDriver: true,
    }),
    Animated.sequence([
      Animated.timing(values.scaleX, {
        toValue: 0.7,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 1.1,
        duration: 65,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 1.02,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 0.96,
        duration: 110,
        useNativeDriver: true,
      }),
    ]),
    Animated.sequence([
      Animated.timing(values.scaleY, {
        toValue: 1.04,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 1.08,
        duration: 65,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 1.02,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 0.96,
        duration: 110,
        useNativeDriver: true,
      }),
    ]),
    Animated.sequence([
      Animated.timing(values.opacity, {
        toValue: 1,
        duration: 355,
        useNativeDriver: true,
      }),
      Animated.timing(values.opacity, {
        toValue: 0,
        duration: 110,
        useNativeDriver: true,
      }),
    ]),
  ]).start(({ finished }) => {
    if (finished) {
      onFinished();
    }
  });
};

const playSwipeFlyLeft = ({ values, onFinished }: PlayArgs) => {
  Animated.parallel([
    Animated.timing(values.translateX, {
      toValue: -640,
      duration: 170,
      useNativeDriver: true,
    }),
    Animated.timing(values.translateY, {
      toValue: 0,
      duration: 170,
      useNativeDriver: true,
    }),
    Animated.timing(values.rotate, {
      toValue: 0,
      duration: 170,
      useNativeDriver: true,
    }),
    Animated.timing(values.scaleX, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }),
    Animated.timing(values.scaleY, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }),
    Animated.timing(values.opacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }),
  ]).start(({ finished }) => {
    if (finished) {
      onFinished();
    }
  });
};

const playSwipeFlyRight = ({ values, onFinished }: PlayArgs) => {
  Animated.parallel([
    Animated.timing(values.translateX, {
      toValue: 640,
      duration: 170,
      useNativeDriver: true,
    }),
    Animated.timing(values.translateY, {
      toValue: 0,
      duration: 170,
      useNativeDriver: true,
    }),
    Animated.timing(values.rotate, {
      toValue: 0,
      duration: 170,
      useNativeDriver: true,
    }),
    Animated.timing(values.scaleX, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }),
    Animated.timing(values.scaleY, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }),
    Animated.timing(values.opacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }),
  ]).start(({ finished }) => {
    if (finished) {
      onFinished();
    }
  });
};

const playSwipeSpinOut = ({ values, onFinished }: PlayArgs) => {
  values.scaleX.stopAnimation((currentScaleX) => {
    const spinTargets =
      currentScaleX <= 0 ? [1, -1, 1, -1, 0.04] : [-1, 1, -1, 1, 0.04];

    Animated.parallel([
      Animated.sequence(
        spinTargets.map((target, index) =>
          Animated.timing(values.scaleX, {
            toValue: target,
            duration: index === spinTargets.length - 1 ? 80 : 85,
            useNativeDriver: true,
          }),
        ),
      ),
      Animated.timing(values.opacity, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onFinished();
      }
    });
  });
};

const playSwipeFlyUpLeft = ({ values, onFinished }: PlayArgs) => {
  Animated.parallel([
    Animated.timing(values.translateX, {
      toValue: -360,
      duration: 260,
      useNativeDriver: true,
    }),
    Animated.timing(values.translateY, {
      toValue: -110,
      duration: 260,
      useNativeDriver: true,
    }),
    Animated.timing(values.rotate, {
      toValue: -1,
      duration: 260,
      useNativeDriver: true,
    }),
    Animated.timing(values.scaleX, {
      toValue: 0.76,
      duration: 260,
      useNativeDriver: true,
    }),
    Animated.timing(values.scaleY, {
      toValue: 0.76,
      duration: 260,
      useNativeDriver: true,
    }),
    Animated.timing(values.opacity, {
      toValue: 0,
      duration: 210,
      useNativeDriver: true,
    }),
  ]).start(({ finished }) => {
    if (finished) {
      onFinished();
    }
  });
};

const playPulseOut = ({ values, onFinished }: PlayArgs) => {
  Animated.parallel([
    Animated.sequence([
      Animated.timing(values.scaleX, {
        toValue: 0.38,
        duration: 95,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 1.12,
        duration: 95,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 0.28,
        duration: 95,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 1.08,
        duration: 95,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 0.04,
        duration: 115,
        useNativeDriver: true,
      }),
    ]),
    Animated.sequence([
      Animated.timing(values.scaleY, {
        toValue: 1.24,
        duration: 95,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 0.58,
        duration: 95,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 1.28,
        duration: 95,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 0.62,
        duration: 95,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 0.04,
        duration: 115,
        useNativeDriver: true,
      }),
    ]),
    Animated.sequence([
      Animated.delay(260),
      Animated.timing(values.opacity, {
        toValue: 0,
        duration: 235,
        useNativeDriver: true,
      }),
    ]),
  ]).start(({ finished }) => {
    if (finished) {
      onFinished();
    }
  });
};

const playBurstOut = ({ values, onFinished }: PlayArgs) => {
  Animated.parallel([
    Animated.sequence([
      Animated.timing(values.scaleX, {
        toValue: 0.82,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 1.72,
        duration: 165,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleX, {
        toValue: 2.35,
        duration: 140,
        useNativeDriver: true,
      }),
    ]),
    Animated.sequence([
      Animated.timing(values.scaleY, {
        toValue: 0.82,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 1.72,
        duration: 165,
        useNativeDriver: true,
      }),
      Animated.timing(values.scaleY, {
        toValue: 2.35,
        duration: 140,
        useNativeDriver: true,
      }),
    ]),
    Animated.sequence([
      Animated.delay(95),
      Animated.timing(values.opacity, {
        toValue: 0,
        duration: 265,
        useNativeDriver: true,
      }),
    ]),
  ]).start(({ finished }) => {
    if (finished) {
      onFinished();
    }
  });
};

const animationRegistry: Record<
  CompletionAnimationType,
  (args: PlayArgs) => void
> = {
  quickFade: playQuickFade,
  flyUp: playFlyUp,
  pulseOut: playPulseOut,
  burstOut: playBurstOut,
  slingShot: playSlingShot,
  slingShotLeft: playSlingShotLeft,
  swipeFlyLeft: playSwipeFlyLeft,
  swipeFlyRight: playSwipeFlyRight,
  swipeSpinOut: playSwipeSpinOut,
  swipeFlyUpRight: playFlyUp,
  swipeFlyUpLeft: playSwipeFlyUpLeft,
  flyOut: playFlyUp,
  spin: playFlyUp,
  rocket: playFlyUp,
  blackHole: playFlyUp,
};

export const playCompleteAnimation = (
  animationType: CompletionAnimationType,
  args: PlayArgs,
) => animationRegistry[animationType](args);

export const resetCompletionValues = (values: CompletionAnimatedValues) => {
  values.translateX.setValue(0);
  values.translateY.setValue(0);
  values.rotate.setValue(0);
  values.scaleX.setValue(1);
  values.scaleY.setValue(1);
  values.opacity.setValue(1);
};
