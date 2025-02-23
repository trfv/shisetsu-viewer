import type { ComponentProps } from "react";
import { BaseBox } from "./BaseBox";

type Props = ComponentProps<typeof BaseBox>;

export const AutoBox: typeof BaseBox = (props: Props) => <BaseBox {...props} width="auto" />;
