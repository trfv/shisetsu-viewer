import type { FC } from "react";
import { Spinner } from "../components/Spinner";
import styles from "./Loading.module.css";

export const Loading: FC = () => {
  return (
    <main className={styles["main"]}>
      <Spinner size={60} />
    </main>
  );
};
