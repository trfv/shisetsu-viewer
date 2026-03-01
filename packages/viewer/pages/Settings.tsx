import { ApiTokenManager } from "../components/ApiTokenManager/ApiTokenManager";
import styles from "./Settings.module.css";

export default () => {
  return (
    <main className={styles["pageBox"]}>
      <div className={styles["contentBox"]}>
        <h2>設定</h2>
        <ApiTokenManager />
      </div>
    </main>
  );
};
