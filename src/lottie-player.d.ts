declare namespace JSX {
  interface IntrinsicElements {
    "lottie-player": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      src?: string | object;
      background?: string;
      speed?: string | number;
      loop?: boolean;
      autoplay?: boolean;
    };
  }
}
