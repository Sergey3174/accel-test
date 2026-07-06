import { createElement, type CSSProperties } from "react";
import circleAnimation from "./CicleLoader.json";
import "@lottiefiles/lottie-player";

type CicleLoaderProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
};

export default function CicleLoader({
  width = "100%",
  height = "clamp(100px, 28vh, 600px)",
}: CicleLoaderProps) {
  const player = createElement("lottie-player" as never, {
    src: circleAnimation,
    background: "transparent",
    speed: "1",
    style: { width: "100%", height: "100%" },
    loop: true,
    autoplay: true,
  });

  return (
    <div
      style={{
        width,
        height,
      }}
    >
      {player}
    </div>
  );
}
