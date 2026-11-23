import { Link } from "wouter";

import styles from "./Breadcrumbs.module.css";

type Item = {
  label: string;
  href?: string | undefined;
};

export const Breadcrumbs = ({ items }: { items: Item[] }) => (
  <nav aria-label="パンくずリスト">
    <ol className={styles["list"]}>
      {items.map(({ label, href }) => (
        <li className={styles["item"]} key={label}>
          {href ? (
            <Link className={styles["link"]} href={href}>
              {label}
            </Link>
          ) : (
            label
          )}
        </li>
      ))}
    </ol>
  </nav>
);
