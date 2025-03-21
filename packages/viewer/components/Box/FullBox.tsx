import type { ComponentProps } from "react";
import { BaseBox } from "./BaseBox";

type Props = ComponentProps<typeof BaseBox>;

export const FullBox: typeof BaseBox = (props: Props) => <BaseBox {...props} width="100%" />;
