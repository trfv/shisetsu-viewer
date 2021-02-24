import React, { ComponentProps } from "react";
import { BaseBox } from "./BaseBox";

type Props = ComponentProps<typeof BaseBox>;

export const LargeBox = (props: Props) => <BaseBox {...props} width="480px" />;
