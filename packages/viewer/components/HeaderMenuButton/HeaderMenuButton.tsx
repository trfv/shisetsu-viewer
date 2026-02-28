import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { Drawer } from "../Drawer";
import { IconButton } from "../IconButton";
import { CloseIcon, MenuIcon } from "../icons";
import styles from "./HeaderMenuButton.module.css";

export const HeaderMenuButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    userInfo: { anonymous, trial },
  } = useAuth0();

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <>
      <IconButton onClick={toggleDrawer} title="メニュー">
        <MenuIcon aria-label="MenuIcon" htmlColor="white" />
      </IconButton>
      <Drawer anchor="top" onClose={toggleDrawer} open={isOpen}>
        <div className={styles["menu"]}>
          <IconButton onClick={toggleDrawer} title="メニューを閉じる">
            <CloseIcon />
          </IconButton>
          {anonymous ? (
            <span>予約検索</span>
          ) : (
            <Link onClick={toggleDrawer} to={ROUTES.reservation}>
              {`予約検索${trial ? "（トライアル）" : ""}`}
            </Link>
          )}
          <Link onClick={toggleDrawer} to={ROUTES.institution}>
            施設検索
          </Link>
        </div>
      </Drawer>
    </>
  );
};
