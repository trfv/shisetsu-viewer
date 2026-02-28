import { Link } from "wouter";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { useIsMobile } from "../../hooks/useIsMobile";
import { ColorModeButton } from "../ColorModeButton";
import { HeaderMenuButton } from "../HeaderMenuButton";
import { LoginButton } from "../LoginButton";
import styles from "./Header.module.css";

export const Header = () => {
  const isMobile = useIsMobile();
  const {
    userInfo: { anonymous, trial },
  } = useAuth0();

  return (
    <header className={styles["appBar"]}>
      <div className={styles["toolbar"]}>
        {isMobile && (
          <div className={styles["menuButton"]}>
            <HeaderMenuButton />
          </div>
        )}
        <div className={styles["logoAndMenu"]}>
          <h1 className={styles["logoWrapper"]}>
            <Link to={ROUTES.top}>
              <img
                alt="Shisetsu Viewer"
                className={styles["logo"]}
                height="100"
                src="/logo.svg"
                width="256"
              />
            </Link>
          </h1>
          {!isMobile && (
            <div className={styles["menu"]}>
              {anonymous ? (
                <span>予約検索</span>
              ) : (
                <Link to={ROUTES.reservation}>{`予約検索${trial ? "（トライアル）" : ""}`}</Link>
              )}
              <Link to={ROUTES.institution}>施設検索</Link>
            </div>
          )}
        </div>
        <div className={styles["actions"]}>
          <ColorModeButton />
          <LoginButton />
        </div>
      </div>
    </header>
  );
};
