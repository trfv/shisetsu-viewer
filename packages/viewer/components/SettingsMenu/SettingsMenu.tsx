import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { login, logout, useAuth } from "../../contexts/Auth";
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

const AuthMenuItemLoading = () => (
  <button
    aria-disabled={true}
    className={styles["menuItem"]}
    disabled={true}
    role="menuitem"
    type="button"
  >
    <span aria-hidden="true" className={styles["loadingDot"]} />
    <span>読み込み中...</span>
  </button>
);

const AuthMenuItem = ({ onAction }: { onAction: () => void }) => {
  const { authenticated } = useAuth();

  const handleClick = useCallback(() => {
    onAction();
    if (authenticated) {
      logout();
    } else {
      login();
    }
  }, [authenticated, onAction]);

  return (
    <button className={styles["menuItem"]} onClick={handleClick} role="menuitem" type="button">
      {authenticated ? <LogoutIcon size={16} /> : <LoginIcon size={16} />}
      <span>{authenticated ? "ログアウト" : "ログイン"}</span>
    </button>
  );
};

export const SettingsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { mode, setMode } = useColorMode();
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

          <div className={styles["divider"]} role="separator" />

          <div className={styles["section"]}>
            <Suspense fallback={<AuthMenuItemLoading />}>
              <AuthMenuItem onAction={close} />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};
