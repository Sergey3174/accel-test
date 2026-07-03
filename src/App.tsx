import { useEffect, useState } from "react";

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
          beta: clamp(VERTICAL_BETA + relativeY * 10, 55, 90),
          gamma: clamp(relativeX * 46, -46, 46),
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
  const verticalOffset = Math.abs(Math.abs(motion.beta) - VERTICAL_BETA);
  const verticalReady = verticalOffset < 18;
  const gammaDelta = Math.abs(motion.gamma - step.targetGamma);
  const distance = gammaDelta + verticalOffset * 1.35;
  const alignment = verticalReady ? clamp(1 - distance / 42, 0, 1) : 0;
  const isAligned = verticalReady && gammaDelta < 9;

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

  const tiltY = clamp(motion.gamma / 55, -1, 1);
  const tiltX = clamp((Math.abs(motion.beta) - VERTICAL_BETA) / 28, -1, 1);
  const phoneTransform = `perspective(1200px) rotateX(${tiltX * -8}deg) rotateY(${tiltY * 15}deg) rotateZ(${tiltY * 18}deg)`;
  const cardTransform = `translateX(${tiltY * 7}px) translateY(${tiltX * 4}px) rotate(${tiltY * 22}deg)`;
  const seconds = Math.ceil(holdMs / 1000)
    .toString()
    .padStart(2, "0");
  const progressAngle = `${(1 - holdMs / HOLD_DURATION_MS) * 360}deg`;
  const progressSegment = stepIndex + 3;
  const bars = Array.from({ length: 11 }, (_, index) => alignment >= index / 10);
  const statusText = verticalReady
    ? `ALIGN ${Math.round(alignment * 100)}% | GAMMA ${motion.gamma.toFixed(1)} DEG`
    : "TELEFONU ONCE DIK KONUMA GETIRIN";

  return (
    <main className="app-shell">
      <section className="screen-wrap">
        <div className="device-shadow" />

        <article className="app-screen">
          <header className="screen-header">
            <div className="step-title">{step.title}</div>
            <div className="step-subtitle">{step.subtitle}</div>
            <div className="progress-strip">
              {["#3b82f6", "#ef4444", "#f59e0b", "#84cc16", "#9ca3af"].map((color, index) => (
                <span
                  key={color}
                  className="progress-segment"
                  style={{ background: color, opacity: index <= progressSegment ? 1 : 0.4 }}
                />
              ))}
            </div>
          </header>

          <div className={`calibration-arrow ${step.direction === "left" ? "left" : "right"}`}>
            <span className="calibration-arrow-shaft" />
            <span className="calibration-arrow-head" />
          </div>

          <div className="meter-layout">
            <div className="meter-column">
              {bars.map((active, index) => (
                <span
                  key={`left-${index}`}
                  className={`meter-bar ${active ? "active" : ""}`}
                />
              ))}
            </div>

            <div className="phone-stage">
              <div className="phone-fan fan-left" />
              <div className="phone-fan fan-right" />
              <div className="handset-shadow" />

              <div className="mini-phone" style={{ transform: `${phoneTransform} ${cardTransform}` }}>
                <div className="mini-notch" />
                <div className="mini-brand">SAMSUNG</div>
                <div className="google-logo" aria-hidden="true">
                  <span className="g-blue">G</span>
                  <span className="g-red">o</span>
                  <span className="g-yellow">o</span>
                  <span className="g-blue">g</span>
                  <span className="g-green">l</span>
                  <span className="g-red">e</span>
                </div>
              </div>
            </div>

            <div className="meter-column">
              {[...bars].reverse().map((active, index) => (
                <span
                  key={`right-${index}`}
                  className={`meter-bar ${active ? "active" : ""}`}
                />
              ))}
            </div>
          </div>

          <p className="instruction-copy">{step.body}</p>

          <div className="timer-row">
            <div className="seconds-readout">
              {seconds}
              <span>s</span>
            </div>
            <div className="spinner-ring" style={{ ["--fill" as string]: progressAngle }} />
          </div>

          <footer className="screen-footer">
            <div>
              <div className="footer-brand">Google</div>
              <div className="footer-copy">Certified Calibration</div>
            </div>
            <div className="footer-right">
              <div className="footer-brand">Vector +</div>
              <div className="footer-copy">Based</div>
            </div>
          </footer>

          <div className="controls">
            <button type="button" onClick={requestPermission} className="sensor-button">
              Enable sensors
            </button>

            <p className="sensor-copy">
              {motion.permission === "granted"
                ? "Motion sensors are active."
                : motion.usingPointer
                  ? "Desktop preview is active. Move the mouse left and right."
                  : "Allow motion access on the phone to use the accelerometer."}
            </p>

            <div className={`status-pill ${verticalReady ? "ready" : ""}`}>{statusText}</div>
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;
