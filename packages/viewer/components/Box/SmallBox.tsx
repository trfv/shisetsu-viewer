import type { ComponentProps, FC } from "react";
import { WIDTHS } from "../../constants/styles";
import { BaseBox } from "./BaseBox";

type Props = ComponentProps<typeof BaseBox>;

export const SmallBox: FC<Props> = (props) => <BaseBox {...props} width={WIDTHS.small} />;
