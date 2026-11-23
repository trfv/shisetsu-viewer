import { Fragment, type MouseEvent, type ReactNode } from "react";
import { Link } from "wouter";

import { ROUTES } from "../../constants/routes";
import { SupportedMunicipalityMap } from "../../utils/municipality";

import styles from "./InstitutionName.module.css";

type Props = {
  municipality: string;
  building: string | null;
  buildingId?: string | null | undefined;
  institution?: string | null | undefined;
};

// 行のクリックで部屋の詳細へ移る表の中に置くので、建物へのクリックを行に伝えない。
const stopPropagation = (event: MouseEvent) => event.stopPropagation();

export const InstitutionName = ({ municipality, building, buildingId, institution }: Props) => {
  const buildingNode: ReactNode =
    building && buildingId ? (
      <Link
        className={styles["link"]}
        href={ROUTES.building.replace(":id", buildingId)}
        onClick={stopPropagation}
      >
        {building}
      </Link>
    ) : (
      building
    );
  const parts = [SupportedMunicipalityMap[municipality], buildingNode, institution].filter(Boolean);
  return (
    <>
      {parts.map((part, i) => (
        // oxlint-disable-next-line react/no-array-index-key
        <Fragment key={i}>
          {i > 0 && " "}
          {part}
        </Fragment>
      ))}
    </>
  );
};
