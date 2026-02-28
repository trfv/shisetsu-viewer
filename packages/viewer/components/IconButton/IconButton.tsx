import type { AnchorHTMLAttributes, ButtonHTMLAttributes, FC, ReactNode } from "react";
import styles from "./IconButton.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: "small" | "medium";
  href?: undefined;
};

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  size?: "small" | "medium";
  href: string;
};

type Props = ButtonProps | AnchorProps;

export const IconButton: FC<Props> = ({ children, size = "medium", className, ...rest }) => {
  const classNames = [styles["iconButton"], size === "small" && styles["small"], className]
    .filter(Boolean)
    .join(" ");

  if ("href" in rest && rest.href) {
    return (
      <a className={classNames} {...(rest as AnchorProps)}>
        {children}
      </a>
    );
  }

  return (
    <button className={classNames} type="button" {...(rest as ButtonProps)}>
      {children}
    </button>
  );
};
