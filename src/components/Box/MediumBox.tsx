import { ComponentProps } from "react";
import { BaseBox } from "./BaseBox";

type Props = ComponentProps<typeof BaseBox>;

export const MediumBox = (props: Props) => <BaseBox {...props} width="240px" />;
