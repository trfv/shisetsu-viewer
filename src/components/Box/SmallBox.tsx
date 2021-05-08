import React, { ComponentProps } from "react";
import { WIDTHS } from "../../constants/styles";
import { BaseBox } from "./BaseBox";

type Props = ComponentProps<typeof BaseBox>;

export const SmallBox = (props: Props) => <BaseBox {...props} width={WIDTHS.small} />;
