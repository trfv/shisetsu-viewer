import CircularProgress, { CircularProgressProps } from "@mui/material/CircularProgress";

export const Spinner = (props: CircularProgressProps) => (
  <CircularProgress aria-label="読み込み中" {...props} />
);
