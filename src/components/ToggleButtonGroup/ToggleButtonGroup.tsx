import MuiToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { ComponentProps } from "react";

type Props = ComponentProps<typeof MuiToggleButtonGroup>;

export const ToggleButtonGroup = (props: Props) => <MuiToggleButtonGroup {...props} />;
