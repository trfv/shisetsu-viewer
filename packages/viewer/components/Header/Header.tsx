import { Suspense } from "react";
import { Link } from "wouter";

import { ROUTES } from "../../constants/routes";
import { useAuth } from "../../contexts/Auth";
import { useIsMobile } from "../../hooks/useIsMobile";
import { HeaderMenuButton } from "../HeaderMenuButton";
import { SettingsMenu } from "../SettingsMenu";

import styles from "./Header.module.css";

const ReservationLink = () => {
  const {
    userInfo: { anonymous, trial },
  } = useAuth();
  if (anonymous) return <span>予約検索</span>;
  return <Link to={ROUTES.reservation}>{`予約検索${trial ? "（トライアル）" : ""}`}</Link>;
};

export const Header = () => {
  const isMobile = useIsMobile();

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
              <Suspense fallback={<span>予約検索</span>}>
                <ReservationLink />
              </Suspense>
              <Link to={ROUTES.institution}>施設検索</Link>
            </div>
          )}
        </div>
        <div className={styles["actions"]}>
          <SettingsMenu />
        </div>
      </div>
    </header>
  );
};
