import { ComponentProps } from "react";
import { BaseBox } from "./BaseBox";

type Props = ComponentProps<typeof BaseBox>;

export const MiddleBox = (props: Props) => <BaseBox {...props} width="240px" />;
