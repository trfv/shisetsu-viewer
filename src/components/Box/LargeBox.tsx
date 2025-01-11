import type { ComponentProps } from "react";
import { WIDTHS } from "../../constants/styles";
import { BaseBox } from "./BaseBox";

type Props = ComponentProps<typeof BaseBox>;

export const LargeBox: typeof BaseBox = (props: Props) => (
  <BaseBox {...props} width={WIDTHS.large} />
);
