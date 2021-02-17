import { ComponentProps } from "react";
import { BaseBox } from "./BaseBox";

type Props = ComponentProps<typeof BaseBox>;

export const SmallBox = (props: Props) => <BaseBox {...props} width="120px" />;
