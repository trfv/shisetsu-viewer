import { FC } from "react";

type Props = { size: number; axis: "vertical" | "horizontal" };

export const Spacer: FC<Props> = ({ size, axis }) => {
  const width = axis === "vertical" ? 1 : size;
  const height = axis === "horizontal" ? 1 : size;
  return (
    <span
      style={{
        display: "block",
        width,
        minWidth: width,
        height,
        minHeight: height,
      }}
    />
  );
};
