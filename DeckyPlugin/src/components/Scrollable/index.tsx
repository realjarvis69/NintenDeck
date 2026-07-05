import { forwardRef, HTMLAttributes, CSSProperties } from "react";

export interface ScrollableElement extends HTMLDivElement {}

export const Scrollable = forwardRef<ScrollableElement, HTMLAttributes<HTMLDivElement>>(
  ({ style, ...props }, ref) => {
    const mergedStyle: CSSProperties = {
      height: "95vh",
      overflowY: "scroll" as const,
      ...style,
    };
    return <div ref={ref} {...props} style={mergedStyle} />;
  }
);
