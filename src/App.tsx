import { useEffect, useMemo, useState } from "react";

type MotionState = {
  beta: number;
  gamma: number;
  alpha: number;
  supported: boolean;
  permission: "unknown" | "granted" | "denied";
  usingPointer: boolean;
};

type CalibrationStep = {
  title: string;
 targetBeta: number;
  targetGamma: number;
  arrowRotation: number;
};

const HOLD_DURATION_MS = 3000;

const steps: CalibrationStep[] = [
  {
    title: "1. ADIM: DUZ ZEMINDE YAN CEVIRIN",
    targetBeta: 0,
    targetGamma: -32,
    arrowRotation: 28,
  },
  {
    title: "2. ADIM: DUZ ZEMINDE DIGER YAN",
    targetBeta: 0,
    targetGamma: 32,
    arrowRotation: -28,
  },
  {
    title: "3. ADIM: EKRANI YUKARI KALDIRIN",
    targetBeta: -24,
    targetGamma: 0,
    arrowRotation: 0,
  },
  {
    title: "4. ADIM: EKRANI ASAGI INDIRIN",
    targetBeta: 24,
    targetGamma: 0,
    arrowRotation: 180,
  },
  {
    title: "5. ADIM: SOL UST ACIA GECIN",
    targetBeta: -18,
    targetGamma: -18,
    arrowRotation: 42,
  },
  {
    title: "6. ADIM: SAG UST ACIA GECIN",
    targetBeta: -18,
    targetGamma: 18,
    arrowRotation: -42,
  },
  {
    title: "7. ADIM: SOL ALT ACIA GECIN",
    targetBeta: 18,
    targetGamma: -18,
    arrowRotation: 138,
  },
  {
    title: "8. ADIM: SAG ALT ACIA GECIN",
    targetBeta: 18,
    targetGamma: 18,
    arrowRotation: -138,
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function App() {
  const [motion, setMotion] = useState<MotionState>({
    beta: 0,
    gamma: 0,
    alpha: 0,
    supported: false,
    permission: "unknown",
    usingPointer: false,
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [holdMs, setHoldMs] = useState(HOLD_DURATION_MS);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const supported = "DeviceOrientationEvent" in window;
    setMotion((current) => ({
      ...current,
      supported,
      permission: supported ? "unknown" : "denied",
    }));

    if (!supported) {
      return;
    }

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) {
        return;
      }

      const beta = event.beta;
      const gamma = event.gamma;

      setMotion((current) => ({
        ...current,
        beta: clamp(beta, -90, 90),
        gamma: clamp(gamma, -90, 90),
        alpha: event.alpha ?? 0,
        permission: "granted",
        usingPointer: false,
      }));
    };

    window.addEventListener("deviceorientation", onOrientation, true);
    return () => window.removeEventListener("deviceorientation", onOrientation, true);
  }, []);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const relativeX = (event.clientX - centerX) / centerX;
      const relativeY = (event.clientY - centerY) / centerY;

      setMotion((current) => {
        if (current.permission === "granted") {
          return current;
        }

        return {
          ...current,
          beta: clamp(relativeY * 42, -42, 42),
          gamma: clamp(relativeX * 42, -42, 42),
          alpha: 0,
          usingPointer: true,
        };
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  const requestPermission = async () => {
    type IOSPermission = {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    const Orientation = window.DeviceOrientationEvent as typeof DeviceOrientationEvent &
      IOSPermission;

    if (typeof Orientation?.requestPermission !== "function") {
      setMotion((current) => ({
        ...current,
        permission: current.supported ? "granted" : "denied",
      }));
      return;
    }

    try {
      const result = await Orientation.requestPermission();
      setMotion((current) => ({
        ...current,
        permission: result === "granted" ? "granted" : "denied",
      }));
    } catch {
      setMotion((current) => ({ ...current, permission: "denied" }));
    }
  };

  const step = steps[stepIndex];
  const betaDelta = motion.beta - step.targetBeta;
  const gammaDelta = motion.gamma - step.targetGamma;
  const distance = Math.hypot(betaDelta, gammaDelta);
  const alignment = clamp(1 - distance / 52, 0, 1);
  const isAligned = distance < 12;

  useEffect(() => {
    if (!isAligned) {
      setHoldMs(HOLD_DURATION_MS);
      return;
    }

    const interval = window.setInterval(() => {
      setHoldMs((current) => {
        if (current <= 100) {
          setStepIndex((prev) => (prev + 1) % steps.length);
          return HOLD_DURATION_MS;
        }

        return current - 100;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [isAligned]);

  const tiltX = clamp(motion.beta / 60, -1, 1);
  const tiltY = clamp(motion.gamma / 60, -1, 1);
  const phoneTransform = `perspective(1100px) rotateX(${tiltX * -16}deg) rotateY(${tiltY * 16}deg) rotateZ(${tiltY * 3}deg)`;
  const cardTransform = `translate(${tiltY * 8}px, ${tiltX * 10}px) rotate(${tiltY * 3}deg)`;
  const arrowTransform = `rotate(${step.arrowRotation + tiltY * 8}deg) translateX(${tiltY * 4}px)`;
  const seconds = Math.ceil(holdMs / 1000)
    .toString()
    .padStart(2, "0");
  const progressAngle = `${(1 - holdMs / HOLD_DURATION_MS) * 360}deg`;
  const progressSegment = Math.round((stepIndex / (steps.length - 1)) * 4);

  const barValues = useMemo(
    () =>
      Array.from({ length: 11 }, (_, index) => {
        const threshold = index / 10;
        return alignment >= threshold;
      }),
    [alignment],
  );

  return (
    <main className="min-h-screen bg-[#d8d4ce] px-4 py-6 text-[#1c1c1c]">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[25rem] flex-col items-center justify-center">
        <h1 className="mb-7 text-center text-[1.95rem] font-extrabold uppercase tracking-[-0.05em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.28)] sm:text-[2.1rem]">
          {steps[0].title}
        </h1>

        <div className="relative">
          <div className="absolute inset-x-9 bottom-[-1.4rem] h-8 rounded-full bg-black/20 blur-2xl" />

          <div className="phone-frame" style={{ transform: phoneTransform }}>
            <div className="phone-reflection absolute inset-[1.2%] rounded-[2.6rem]" />
            <div className="absolute left-1/2 top-[0.78rem] z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-[#121212] shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]" />

            <div className="relative z-10 flex h-full flex-col overflow-hidden rounded-[2.7rem] bg-[linear-gradient(180deg,#565860_0%,#4a4c53_26%,#42444a_58%,#6b6c70_100%)] px-3.5 pb-4 pt-5 text-white">
              <div className="text-center text-[0.72rem] font-extrabold uppercase leading-tight tracking-[-0.02em]">
                {step.title}
              </div>
              <div className="mt-1 text-center text-[0.86rem] font-black uppercase tracking-[-0.03em] text-[#d5d6d8]">
                ADIM {stepIndex + 1} / {steps.length}
              </div>

              <div className="mx-auto mt-3 flex w-[86%] gap-[3px]">
                {["#3b82f6", "#ef4444", "#f59e0b", "#84cc16", "#9ca3af"].map((color, index) => (
                  <span
                    key={color}
                    className="h-[0.38rem] flex-1 rounded-full"
                    style={{ opacity: index <= progressSegment ? 1 : 0.55, background: color }}
                  />
                ))}
              </div>

              <div className="mt-4 flex justify-center">
                <div className="calibration-arrow" style={{ transform: arrowTransform }}>
                  <span className="calibration-arrow-shaft" />
                  <span className="calibration-arrow-head" />
                </div>
              </div>

              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                <div className="flex h-33 flex-col-reverse items-center justify-between">
                  {barValues.map((active, index) => (
                    <span
                      key={`left-${index}`}
                      className="block h-[0.42rem] w-3.5 rounded-[2px]"
                      style={{ background: active ? "#22c55e" : "rgba(255,255,255,0.28)" }}
                    />
                  ))}
                </div>

                <div className="relative flex h-48 w-36 items-center justify-center">
                  <div className="absolute inset-1 rounded-[2rem] bg-black/12 blur-md" />
                  <div className="phone-fan left-[0.2rem]" />
                  <div className="phone-fan right-[0.2rem] scale-x-[-1]" />

                  <div
                    className="relative z-10 flex h-40 w-24 items-center justify-center rounded-[1.65rem] border-[3px] border-[#252525] bg-[linear-gradient(180deg,#fbfbfd_0%,#dcdfea_100%)] shadow-[0_12px_18px_rgba(0,0,0,0.28)]"
                    style={{ transform: cardTransform }}
                  >
                    <div className="absolute top-2 h-3.5 w-12 rounded-full bg-[#171717]" />
                    <div className="text-center">
                      <div className="google-mark">
                        <span className="text-[#4285F4]">G</span>
                      </div>
                      <div className="mt-5 text-[0.52rem] font-black tracking-[0.16em] text-[#4663a4]">
                        SAMSUNG
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex h-33 flex-col-reverse items-center justify-between">
                  {[...barValues].reverse().map((active, index) => (
                    <span
                      key={`right-${index}`}
                      className="block h-[0.42rem] w-3.5 rounded-[2px]"
                      style={{ background: active ? "#22c55e" : "rgba(255,255,255,0.28)" }}
                    />
                  ))}
                </div>
              </div>

              <p className="mx-auto mt-4 max-w-[88%] text-center text-[0.65rem] font-bold uppercase leading-[1.22] tracking-[-0.01em] text-white/94">
                KALIBRASYON YELINE VEVERKIYIN GOLIBASON BYNENLA NELV KAYIYEN
                BUNLASENERLIS YAN CEVIRILIK. KASNIK NAYIN OGAL DEGILDIR.
              </p>

              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="text-[2.55rem] font-black leading-none tracking-[-0.08em] text-white">
                  {seconds}
                  <span className="text-[1.55rem]">s</span>
                </div>
                <div className="spinner-ring" style={{ ["--fill" as string]: progressAngle }} />
              </div>

              <div className="mt-auto flex items-end justify-between pt-4 text-white/92">
                <div>
                  <div className="text-[1.05rem] font-bold leading-none">Google</div>
                  <div className="text-[0.54rem] font-medium text-white/72">
                    Certified Calibration
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[1rem] font-bold leading-none">
                    Vector <span className="text-[0.92rem]">✦</span>
                  </div>
                  <div className="text-[0.54rem] font-medium text-white/72">Based</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col items-center gap-2 text-center">
          <button
            type="button"
            onClick={requestPermission}
            className="rounded-full bg-[#151515] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#090909]"
          >
            Enable sensors
          </button>
          <p className="max-w-xs text-sm text-black/60">
            {motion.permission === "granted"
              ? "Motion sensors are active."
              : motion.usingPointer
                ? "Desktop fallback is active: move the mouse to tilt the scene."
                : "Allow motion access on the phone, or use the mouse for preview."}
          </p>
          <div className="rounded-full bg-white/55 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-black/55">
            ALIGN {Math.round(alignment * 100)}% • BETA {motion.beta.toFixed(1)}° • GAMMA {motion.gamma.toFixed(1)}°
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
