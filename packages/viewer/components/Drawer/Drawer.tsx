import { useEffect, type FC, type ReactNode } from "react";
import styles from "./Drawer.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  anchor?: "right" | "top";
  children: ReactNode;
};

export const Drawer: FC<Props> = ({ open, onClose, anchor = "right", children }) => {
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

  const anchorClass = anchor === "top" ? styles["top"] : styles["right"];
  const openClass = anchor === "top" ? styles["topOpen"] : styles["rightOpen"];

  if (!open) return null;

  return (
    <>
      <div
        className={`${styles["overlay"]} ${styles["overlayOpen"]}`}
        data-testid="drawer-overlay"
        onClick={onClose}
      />
      <div className={`${styles["panel"]} ${anchorClass} ${openClass}`}>{children}</div>
    </>
  );
};
