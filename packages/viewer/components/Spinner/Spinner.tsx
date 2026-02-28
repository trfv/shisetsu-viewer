import type { FC } from "react";
import styles from "./Spinner.module.css";

type Props = {
  size?: number;
};

export const Spinner: FC<Props> = ({ size = 40 }) => (
  <span
    aria-label="読み込み中"
    className={styles["spinner"]}
    role="progressbar"
    style={{ width: size, height: size }}
  />
);
