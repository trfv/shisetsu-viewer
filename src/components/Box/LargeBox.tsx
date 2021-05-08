import React, { ComponentProps } from "react";
import { WIDTHS } from "../../constants/styles";
import { BaseBox } from "./BaseBox";

type Props = ComponentProps<typeof BaseBox>;

export const LargeBox = (props: Props) => <BaseBox {...props} width={WIDTHS.large} />;
