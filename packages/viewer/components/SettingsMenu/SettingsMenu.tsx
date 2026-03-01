import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ROUTES } from "../../constants/routes";
import { useAuth0 } from "../../contexts/Auth0";
import { useColorMode } from "../../contexts/ColorMode";
import {
  BrightnessAutoIcon,
  DarkModeIcon,
  LightModeIcon,
  LoginIcon,
  LogoutIcon,
  SettingsIcon,
} from "../icons";
import styles from "./SettingsMenu.module.css";

const COLOR_MODE_ITEMS = [
  { mode: "system", icon: BrightnessAutoIcon, label: "システム設定" },
  { mode: "light", icon: LightModeIcon, label: "ライト" },
  { mode: "dark", icon: DarkModeIcon, label: "ダーク" },
] as const;

export const SettingsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isLoading, token, login, logout } = useAuth0();
  const { mode, setMode } = useColorMode();
  const [, setLocation] = useLocation();
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

  const handleAuthAction = useCallback(() => {
    close();
    if (token) {
      logout({ logoutParams: { returnTo: `${location.origin}${ROUTES.top}` } });
    } else {
      login({});
    }
  }, [token, login, logout, close]);

  return (
    <div className={styles["container"]} ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="設定"
        className={styles["trigger"]}
        onClick={toggle}
        ref={triggerRef}
        title="設定"
        type="button"
      >
        <SettingsIcon htmlColor="white" size={20} />
      </button>

      {isOpen && (
        <div aria-label="設定メニュー" className={styles["menu"]} role="menu">
          <div aria-label="テーマ" className={styles["section"]} role="group">
            <div className={styles["sectionLabel"]}>テーマ</div>
            {COLOR_MODE_ITEMS.map(({ mode: m, icon: ModeIcon, label }) => (
              <button
                aria-checked={mode === m}
                className={`${styles["menuItem"]} ${mode === m ? styles["menuItemActive"] : ""}`}
                key={m}
                onClick={() => setMode(m)}
                role="menuitemradio"
                type="button"
              >
                <ModeIcon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {token && (
            <>
              <div className={styles["divider"]} role="separator" />
              <div className={styles["section"]}>
                <button
                  className={styles["menuItem"]}
                  onClick={() => {
                    close();
                    setLocation(ROUTES.settings);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <SettingsIcon size={16} />
                  <span>設定</span>
                </button>
              </div>
            </>
          )}

          <div className={styles["divider"]} role="separator" />

          <div className={styles["section"]}>
            <button
              aria-disabled={isLoading}
              className={styles["menuItem"]}
              disabled={isLoading}
              onClick={handleAuthAction}
              role="menuitem"
              type="button"
            >
              {isLoading ? (
                <span aria-hidden="true" className={styles["loadingDot"]} />
              ) : token ? (
                <LogoutIcon size={16} />
              ) : (
                <LoginIcon size={16} />
              )}
              <span>{isLoading ? "読み込み中..." : token ? "ログアウト" : "ログイン"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
