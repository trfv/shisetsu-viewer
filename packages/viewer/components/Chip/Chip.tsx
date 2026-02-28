import type { FC } from "react";
import styles from "./Chip.module.css";

type Props = {
  label: string;
  size?: "small" | "medium";
  onDelete?: () => void;
};

export const Chip: FC<Props> = ({ label, size = "medium", onDelete }) => (
  <span
    className={`${styles["chip"]}${size === "small" ? ` ${styles["small"]}` : ""}`}
    data-testid="chip"
  >
    {label}
    {onDelete && (
      <button
        aria-label={`${label}を削除`}
        className={styles["deleteButton"]}
        data-testid="chip-delete"
        onClick={onDelete}
        type="button"
      >
        <svg className={styles["deleteIcon"]} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
        </svg>
      </button>
    )}
  </span>
);
