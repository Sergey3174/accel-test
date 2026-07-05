import { createElement } from "react";
import successfulAnimation from "./Success.json";
import "@lottiefiles/lottie-player";

export default function Success() {
  const player = createElement("lottie-player" as never, {
    src: successfulAnimation,
    background: "transparent",
    speed: "1",
    style: { width: "100%", height: "100%" },
    loop: false,
    autoplay: true,
  });

  return (
    <div
      style={{
        width: "100%",
        height: "clamp(120px, 28vh, 600px)",
      }}
    >
      {player}
    </div>
  );
}
