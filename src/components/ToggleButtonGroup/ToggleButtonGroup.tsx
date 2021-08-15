import MuiToggleButtonGroup from "@material-ui/core/ToggleButtonGroup";
import { ComponentProps } from "react";

type Props = ComponentProps<typeof MuiToggleButtonGroup>;

export const ToggleButtonGroup = (props: Props) => <MuiToggleButtonGroup {...props} />;
