import { ReservationStatus } from "../../constants/enums";
import {
  getReservationDivisionLabel,
  getReservationStatusLabel,
  type LabelSource,
} from "../../utils/municipality";
import { sortByReservationDivision } from "../../utils/reservation";

import styles from "./ReservationStatusList.module.css";

type Props = {
  institution: LabelSource;
  reservation: Record<string, string>;
  newlyVacantDivisions?: ReadonlySet<string> | undefined;
};

export const ReservationStatusList = ({
  institution,
  reservation,
  newlyVacantDivisions,
}: Props) => (
  <ul className={styles["list"]}>
    {sortByReservationDivision(reservation).map(([division, status]) => (
      <li
        className={`${styles["item"]}${status === ReservationStatus.VACANT ? ` ${styles["vacant"]}` : ""}`}
        key={division}
      >
        <span className={styles["division"]}>
          {getReservationDivisionLabel(institution, division)}
        </span>
        <span>{getReservationStatusLabel(institution, status)}</span>
        {newlyVacantDivisions?.has(division) && <span className={styles["new"]}>NEW</span>}
      </li>
    ))}
  </ul>
);
