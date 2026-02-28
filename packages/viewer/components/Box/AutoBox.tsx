import type { ComponentProps, FC } from "react";
import { BaseBox } from "./BaseBox";

type Props = ComponentProps<typeof BaseBox>;

export const AutoBox: FC<Props> = (props) => <BaseBox {...props} width="auto" />;
