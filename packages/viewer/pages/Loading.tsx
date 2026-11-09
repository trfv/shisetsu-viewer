import type { FC } from "react";

import styles from "./Loading.module.css";

export const Loading: FC = () => (
  <main>
    <div aria-label="読み込み中" className={styles["bar"]} role="progressbar" />
  </main>
);
