import { type ComponentProps, type ElementType, type FC, type ReactNode } from "react";
import { AutoBox } from "./AutoBox";
import { FullBox } from "./FullBox";
import { LargeBox } from "./LargeBox";
import { MediumBox } from "./MediumBox";
import { SmallBox } from "./SmallBox";

export type BoxSize = "small" | "medium" | "large" | "auto" | "full";

type BaseBoxProps = {
  children?: ReactNode;
  component?: ElementType;
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  fontSize?: string;
  width?: number | string;
  mx?: string;
  className?: string;
  style?: React.CSSProperties;
  "data-testid"?: string;
} & Omit<ComponentProps<"div">, "ref">;

export const BaseBox: FC<BaseBoxProps> = ({
  children,
  component: Component = "div",
  display,
  flexDirection,
  alignItems,
  justifyContent,
  fontSize,
  width,
  mx,
  className,
  style,
  ...rest
}) => {
  const inlineStyle: React.CSSProperties = {
    ...(display ? { display } : {}),
    ...(flexDirection
      ? { flexDirection: flexDirection as React.CSSProperties["flexDirection"] }
      : {}),
    ...(alignItems ? { alignItems } : {}),
    ...(justifyContent ? { justifyContent } : {}),
    ...(fontSize ? { fontSize } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(mx ? { marginInline: mx } : {}),
    ...style,
  };

  return (
    <Component
      className={className}
      style={Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined}
      {...rest}
    >
      {children}
    </Component>
  );
};

export const box = (size: BoxSize) => {
  switch (size) {
    case "small":
      return SmallBox;
    case "medium":
      return MediumBox;
    case "large":
      return LargeBox;
    case "auto":
      return AutoBox;
    case "full":
      return FullBox;
  }
};
