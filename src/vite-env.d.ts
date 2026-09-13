/// <reference types="vite/client" />

import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "vturb-smartplayer": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        id?: string;
        style?: CSSProperties;
      };
    }
  }
}
