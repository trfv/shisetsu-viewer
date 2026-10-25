import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FC,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import { BaseBox, type BoxSize } from "../Box";
import { Checkbox } from "../Checkbox";
import { SmallLabel } from "../Label";
import { Spacer } from "../Spacer";

import styles from "./MultiSelect.module.css";

type Props = {
  label: string;
  values: string[];
  allLabel: string;
  emptyLabel: string;
  options: { value: string; label: string }[];
  size?: BoxSize;
  onChange: (values: string[]) => void;
};

export const MultiSelect: FC<Props> = ({
  label,
  values,
  allLabel,
  emptyLabel,
  options,
  size = "auto",
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const valueId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (open && e.key === "Escape") {
      // Drawer も document で Escape を拾うので、ここで止めないと Drawer ごと閉じる。
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false);
  };

  const selected = options.filter((o) => values.includes(o.value));
  const isAll = selected.length === options.length;
  const summary = isAll
    ? allLabel
    : selected.length === 0
      ? emptyLabel
      : selected.map((o) => o.label).join("、");

  const handleAllChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked ? options.map((o) => o.value) : []);
  };

  const handleOptionChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    onChange(
      options
        .filter((o) => (o.value === value ? checked : values.includes(o.value)))
        .map((o) => o.value)
    );
  };

  return (
    <BaseBox size={size}>
      <div className={styles["root"]} onBlur={handleBlur} onKeyDown={handleKeyDown} ref={rootRef}>
        <span id={labelId}>
          <SmallLabel label={label} />
        </span>
        <Spacer axis="vertical" size={4} />
        <button
          aria-controls={panelId}
          aria-expanded={open}
          aria-labelledby={`${labelId} ${valueId}`}
          className={styles["trigger"]}
          onClick={() => setOpen((prev) => !prev)}
          ref={buttonRef}
          type="button"
        >
          <span className={styles["value"]} id={valueId}>
            {summary}
          </span>
        </button>
        {open && (
          <div aria-labelledby={labelId} className={styles["panel"]} id={panelId} role="group">
            <div className={styles["all"]}>
              <Checkbox
                checked={isAll}
                indeterminate={!isAll && selected.length > 0}
                label={allLabel}
                onChange={handleAllChange}
                value=""
              />
            </div>
            {options.map((o) => (
              <Checkbox
                checked={values.includes(o.value)}
                key={o.value}
                label={o.label}
                onChange={handleOptionChange}
                value={o.value}
              />
            ))}
          </div>
        )}
      </div>
    </BaseBox>
  );
};
