import MuiSnackbar, { SnackbarProps } from "@mui/material/Snackbar";
import type { FC } from "react";

type Props = SnackbarProps;

export const Snackbar: FC<Props> = (props) => <MuiSnackbar {...props} />;
