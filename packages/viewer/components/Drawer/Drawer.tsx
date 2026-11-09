import { useEffect, ViewTransition, type FC, type ReactNode } from "react";

import styles from "./Drawer.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export const Drawer: FC<Props> = ({ open, onClose, children }) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <ViewTransition enter="drawer-overlay-in" exit="drawer-overlay-out" update="none">
        <div className={styles["overlay"]} data-testid="drawer-overlay" onClick={onClose} />
      </ViewTransition>
      <ViewTransition enter="drawer-panel-in" exit="drawer-panel-out" update="none">
        <div className={styles["panel"]}>{children}</div>
      </ViewTransition>
    </>
  );
};
