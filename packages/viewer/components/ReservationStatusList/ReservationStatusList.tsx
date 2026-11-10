import { ReservationStatus } from "../../constants/enums";
import {
  ReservationStatusMap,
  getReservationDivisionLabel,
  type SupportedMunicipality,
} from "../../utils/municipality";
import { sortByReservationDivision } from "../../utils/reservation";

import styles from "./ReservationStatusList.module.css";

type Props = {
  municipality: SupportedMunicipality;
  reservation: Record<string, string>;
  divisionLabels?: Partial<Record<string, string>> | undefined;
  newlyVacantDivisions?: ReadonlySet<string> | undefined;
};

export const ReservationStatusList = ({
  municipality,
  reservation,
  divisionLabels,
  newlyVacantDivisions,
}: Props) => (
  <ul className={styles["list"]}>
    {sortByReservationDivision(reservation).map(([division, status]) => (
      <li
        className={`${styles["item"]}${status === ReservationStatus.VACANT ? ` ${styles["vacant"]}` : ""}`}
        key={division}
      >
        <span className={styles["division"]}>
          {getReservationDivisionLabel(municipality, division, divisionLabels)}
        </span>
        <span>{ReservationStatusMap[municipality]?.[status]}</span>
        {newlyVacantDivisions?.has(division) && <span className={styles["new"]}>NEW</span>}
      </li>
    ))}
  </ul>
);
