import { useEffect, useState } from "react";
import STAR from "./assets/star.png";
import PHONE from "./assets/phone.png";
import GOOGLE_LOGO from "./assets/google.png";
import SAMSUNG from "./assets/samsung.png";
import ARROW from "./assets/arrow.png";

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
  subtitle: string;
  direction: "left" | "right";
  targetGamma: number;
  body: string;
};

const HOLD_DURATION_MS = 2400;
const VERTICAL_BETA = 78;
const UPSIDE_DOWN_BETA = -78;
const UPSIDE_DOWN_TOLERANCE = 22;
const BAR_WIDTH = 16;
const BAR_HEIGHT = 7;
const BAR_COUNT = 20;
const COLUMN_HEIGHT = 200;
const COLUMN_FILL_WIDTH = BAR_WIDTH + 4;
const BAR_GAP = (COLUMN_HEIGHT - BAR_COUNT * BAR_HEIGHT) / (BAR_COUNT - 1);
const SUCCESS_PROGRESS = 0.96;

const steps: CalibrationStep[] = [
  {
    title: "1. ADIM: TELEFONU DIK TUTUP SAGA EG",
    subtitle: "ADIM 1 / 2",
    direction: "right",
    targetGamma: 28,
    body: "TELEFONU DIK TUTUN VE YALNIZCA SAGA DOGRU EGEREK KALIBRASYONU BASLATIN.",
  },
  {
    title: "2. ADIM: TELEFONU DIK TUTUP SOLA EG",
    subtitle: "ADIM 2 / 2",
    direction: "left",
    targetGamma: -28,
    body: "CIHAZI DIK POZISYONDA TUTUN VE YALNIZCA SOLA DOGRU EGEREK ISLEMI TAMAMLAYIN.",
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const loaderSticks = Array.from({ length: 12 }, (_, index) => index + 1);

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

      setMotion((current) => ({
        ...current,
        beta: clamp(event.beta ?? 0, -90, 90),
        gamma: clamp(event.gamma ?? 0, -90, 90),
        alpha: event.alpha ?? 0,
        permission: "granted",
        usingPointer: false,
      }));
    };

    window.addEventListener("deviceorientation", onOrientation, true);
    return () =>
      window.removeEventListener("deviceorientation", onOrientation, true);
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
          beta: clamp(relativeY * -90, -90, 90),
          gamma: clamp(relativeX * 46, -46, 46),
          alpha: 0,
          usingPointer: true,
        };
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  const step = steps[stepIndex];
  const flipProgress = clamp(
    (VERTICAL_BETA - motion.beta) / (VERTICAL_BETA - UPSIDE_DOWN_BETA),
    0,
    1,
  );
  const upsideDownOffset = Math.abs(motion.beta - UPSIDE_DOWN_BETA);
  const upsideDownReady = upsideDownOffset < UPSIDE_DOWN_TOLERANCE;
  const alignment = flipProgress;
  const isAligned = upsideDownReady || flipProgress >= SUCCESS_PROGRESS;

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

  const seconds = Math.ceil(holdMs / 1000)
    .toString()
    .padStart(2, "0");
  const progressSegment = stepIndex + 3;
  const bars = Array.from({ length: BAR_COUNT }, (_, index) => {
    const threshold = (index + 1) / BAR_COUNT;
    return alignment >= threshold;
  });
  const activeBars = bars.filter(Boolean).length;
  const fillHeight =
    activeBars === 0 ? 0 : activeBars * BAR_HEIGHT + (activeBars - 1) * BAR_GAP;
  const isSuccess = activeBars === BAR_COUNT;

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[linear-gradient(180deg,#8d949c_0%,#656d76_38%,#4b525b_68%,#5b636c_100%)] text-white">
      <section className="relative z-10 flex min-h-screen w-full flex-col px-[10px] pb-[max(18px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] sm:px-4">
        <header className="text-center">
          <div className="text-[14px]  font-medium uppercase leading-[1.25] tracking-[-0.02em]">
            {step.title}
          </div>
          <div className="mt-2 text-[14px]  uppercase tracking-[-0.03em] ">
            {step.subtitle}
          </div>
          <div className="mx-auto mt-4 flex w-[96%] gap-[3px]">
            {["#3b82f6", "#ef4444", "#f59e0b", "#84cc16", "#9ca3af"].map(
              (color, index) => (
                <span
                  key={color}
                  className={`h-[8px] flex-1 ${
                    index === 0
                      ? "rounded-l-full"
                      : index === 4
                        ? "rounded-r-full"
                        : ""
                  }`}
                  style={{
                    background: color,
                    opacity: index <= progressSegment ? 1 : 0.4,
                  }}
                />
              ),
            )}
          </div>
        </header>

        {/* <div className="relative mx-auto mt-[18px] h-[62px] w-[118px]">
          <span className="absolute left-[8px] top-[24px] h-[14px] w-[84px] rounded-full bg-[#2f93ff]" />
          <span
            className={`absolute top-[10px] h-0 w-0 border-y-[21px] border-y-transparent ${
              step.direction === "left"
                ? "left-[5px] rotate-180 border-l-[31px] border-l-[#2f93ff]"
                : "right-[5px] border-l-[31px] border-l-[#2f93ff]"
            }`}
          />
        </div> */}

        <div className="mt-2 flex-2 grid grid-cols-[1fr_auto_1fr] items-center gap-[10px]">
          <div className="relative flex h-[200px] w-full flex-col-reverse  justify-between">
            <span
              className="absolute bottom-0 -left-[2px]  bg-white"
              style={{
                width: `${COLUMN_FILL_WIDTH}px`,
                height: "7px",
                bottom: `${fillHeight}px`,
              }}
            />
            {bars.map((active, index) => (
              <span
                key={`left-${index}`}
                className={`relative z-10 block h-[7px] w-[16px] ${active ? "bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.35)]" : "bg-white/24"}`}
              />
            ))}
          </div>

          <div className="relative flex h-[214px] w-[150px] items-center justify-center">
            {isSuccess ? (
              <div className="text-center text-[34px] font-bold uppercase tracking-[-0.06em] text-white">
                Success
              </div>
            ) : (
              <>
                <div className="absolute -right-[120px] -top-[80px] rounded-[24px] z-99 phone-arrow-turn">
                  <div
                    className="relative z-10 flex h-[125px] w-[250px] transition-transform duration-200"
                    style={{
                      background: `center / 100% 100% no-repeat url(${ARROW})`,
                    }}
                  ></div>
                </div>

                <div className="absolute -left-[30px] -top-0 rounded-[24px] phone-stack-left">
                  <div
                    className="relative z-10 flex h-[220px] w-[120px] flex-col items-center rounded-2xl opacity-50  transition-transform duration-200"
                    style={{
                      background: `center / 100% 100% no-repeat url(${PHONE})`,
                    }}
                  ></div>
                </div>

                <div className="absolute -right-[30px] -top-0 rounded-[24px] phone-stack-right">
                  <div
                    className="relative z-10 flex h-[220px] w-[120px] flex-col items-center rounded-2xl opacity-50  transition-transform duration-200"
                    style={{
                      background: `center / 100% 100% no-repeat url(${PHONE})`,
                    }}
                  ></div>
                </div>

                <div
                  className="relative z-10 flex h-[260px] w-[135px] flex-col items-center rounded-2xl transition-transform duration-200 phone-main-turn"
                  style={{
                    background: `center / 100% 100% no-repeat url(${PHONE})`,
                  }}
                >
                  <div className="flex-1 flex h-15 w-15 justify-center items-center">
                    <img src={GOOGLE_LOGO} alt="Google Logo" />
                  </div>
                  <div className="flex h-15 w-15 justify-center items-center">
                    <img src={SAMSUNG} alt="Samsung Logo" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative flex h-[200px] w-full flex-col-reverse items-end justify-between">
            <span
              className="absolute bottom-0 -right-[2px]  bg-white"
              style={{
                width: `${COLUMN_FILL_WIDTH}px`,
                height: "7px",
                bottom: `${fillHeight}px`,
              }}
            />
            {[...bars].map((active, index) => (
              <span
                key={`right-${index}`}
                className={`relative z-10 block h-[7px] w-[16px] ${active ? "bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.35)]" : "bg-white/24"}`}
              />
            ))}
          </div>
        </div>
        <div className="mt-[18px] flex flex-col items-center flex-1">
          <p className="mx-auto mt-2 max-w-[70%] text-center flex items-center text-md  uppercase leading-[1.28] tracking-[-0.01em] text-white/95">
            {step.body}
          </p>

          <div className="mt-[18px] flex items-center justify-center gap-3">
            <div className="loader relative">
              {loaderSticks.map((stick) => (
                <div
                  key={stick}
                  className="loader__stick"
                  style={{ ["--i" as string]: stick }}
                />
              ))}
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 text-[48px] leading-none font-bold tracking-[-0.08em]">
                {seconds}
                <span className="text-[28px]">s</span>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-white/24" />

        <footer className="mt-auto  flex items-center justify-between pt-[18px] text-white/92">
          <div>
            <div className="brand-google-font text-[17px] leading-none font-medium">
              Google
            </div>
            <div className=" text-[12px] text-white/72">
              Certified Calibration
            </div>
          </div>
          <div className="text-right flex items-center">
            <div>
              <div className="brand-google-font text-[17px] leading-none font-medium">
                Vector
              </div>
              <div className=" text-[12px] text-white/72">Based</div>
            </div>
            <div>
              <img src={STAR} className="h-[50px] w-[50px]" />
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}

export default App;
