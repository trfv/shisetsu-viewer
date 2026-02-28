import type { ButtonHTMLAttributes, FC } from "react";
import styles from "./Button.module.css";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

export const BaseButton: FC<ButtonProps> = ({ className, ...props }) => (
  <button
    className={`${styles["button"]}${className ? ` ${className}` : ""}`}
    type="button"
    {...props}
  />
);
