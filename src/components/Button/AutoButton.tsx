import { ComponentProps } from "react";
import { BaseButton } from "./BaseButton";

type Props = ComponentProps<typeof BaseButton>;

export const AutoButton = (props: Props) => <BaseButton {...props} style={{ width: "auto" }} />;
