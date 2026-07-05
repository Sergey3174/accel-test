import { createElement } from "react";
import circleAnimation from "./CicleLoader.json";
import "@lottiefiles/lottie-player";

export default function CicleLoader() {
  const player = createElement("lottie-player" as never, {
    src: circleAnimation,
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
