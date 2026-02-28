import { useEffect, type FC } from "react";
import styles from "./SnackBar.module.css";

type Props = {
  open: boolean;
  message: string;
  onClose?: () => void;
  autoHideDuration?: number;
};

export const Snackbar: FC<Props> = ({ open, message, onClose, autoHideDuration }) => {
  useEffect(() => {
    if (!open || !onClose || !autoHideDuration) return;
    const timer = setTimeout(onClose, autoHideDuration);
    return () => clearTimeout(timer);
  }, [open, onClose, autoHideDuration]);

  if (!open) return null;

  return (
    <div className={styles["snackbar"]} role="alert">
      {message}
    </div>
  );
};
