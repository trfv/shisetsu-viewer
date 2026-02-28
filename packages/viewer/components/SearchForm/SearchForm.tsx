import { useCallback, useState, type ReactNode } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { FullBox } from "../Box";
import { Chip } from "../Chip";
import { Drawer } from "../Drawer";
import { IconButton } from "../IconButton";
import { CloseIcon, ManageSearchIcon } from "../icons";
import styles from "./SearchForm.module.css";

type ChipItem = {
  label: string;
  onDelete?: () => void;
};

type Props = {
  chips: ChipItem[];
  children: ReactNode;
};

export const SearchForm = ({ chips, children }: Props) => {
  const isMobile = useIsMobile();

  const [isOpen, setIsOpen] = useState(false);

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <>
      <FullBox alignItems="center" display="flex" justifyContent="space-between">
        <div className={styles["chips"]}>
          {chips.map((chip) => (
            <Chip
              key={chip.label}
              label={chip.label}
              size={isMobile ? "small" : "medium"}
              {...(chip.onDelete ? { onDelete: chip.onDelete } : {})}
            />
          ))}
        </div>
        <IconButton aria-label="絞り込み" onClick={toggleDrawer} title="絞り込み">
          <ManageSearchIcon />
        </IconButton>
      </FullBox>
      <Drawer onClose={toggleDrawer} open={isOpen}>
        <div className={styles["menu"]}>
          <IconButton aria-label="閉じる" onClick={toggleDrawer} title="絞り込みを閉じる">
            <CloseIcon />
          </IconButton>
          {children}
        </div>
      </Drawer>
    </>
  );
};
