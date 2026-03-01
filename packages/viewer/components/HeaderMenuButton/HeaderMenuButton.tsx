import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { MenuIcon } from "../icons";
import styles from "./HeaderMenuButton.module.css";

export const HeaderMenuButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    userInfo: { anonymous, trial },
  } = useAuth0();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, close]);

  return (
    <div className={styles["container"]} ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="メニュー"
        className={styles["trigger"]}
        onClick={toggle}
        ref={triggerRef}
        title="メニュー"
        type="button"
      >
        <MenuIcon htmlColor="white" size={20} />
      </button>

      {isOpen && (
        <div aria-label="ナビゲーション" className={styles["menu"]} role="menu">
          <div className={styles["section"]}>
            {anonymous ? (
              <span className={styles["menuItemDisabled"]} role="menuitem">
                予約検索
              </span>
            ) : (
              <Link
                className={styles["menuItemLink"]}
                onClick={close}
                role="menuitem"
                to={ROUTES.reservation}
              >
                {`予約検索${trial ? "（トライアル）" : ""}`}
              </Link>
            )}
            <Link
              className={styles["menuItemLink"]}
              onClick={close}
              role="menuitem"
              to={ROUTES.institution}
            >
              施設検索
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
