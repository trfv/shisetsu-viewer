import { type ComponentProps, type ElementType, type FC, type ReactNode } from "react";
import { WIDTHS } from "../../constants/styles";
import { AutoBox } from "./AutoBox";
import { FullBox } from "./FullBox";
import { LargeBox } from "./LargeBox";
import { MediumBox } from "./MediumBox";
import { SmallBox } from "./SmallBox";

export type BoxSize = "small" | "medium" | "large" | "auto" | "full";

const SIZE_TO_WIDTH: Record<BoxSize, number | string> = {
  small: WIDTHS.small,
  medium: WIDTHS.medium,
  large: WIDTHS.large,
  auto: "auto",
  full: "100%",
};

type BaseBoxProps = {
  children?: ReactNode;
  component?: ElementType;
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  fontSize?: string;
  width?: number | string;
  size?: BoxSize;
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
  size,
  mx,
  className,
  style,
  ...rest
}) => {
  const resolvedWidth = size ? SIZE_TO_WIDTH[size] : width;
  const inlineStyle: React.CSSProperties = {
    ...(display ? { display } : {}),
    ...(flexDirection
      ? { flexDirection: flexDirection as React.CSSProperties["flexDirection"] }
      : {}),
    ...(alignItems ? { alignItems } : {}),
    ...(justifyContent ? { justifyContent } : {}),
    ...(fontSize ? { fontSize } : {}),
    ...(resolvedWidth !== undefined ? { width: resolvedWidth } : {}),
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
