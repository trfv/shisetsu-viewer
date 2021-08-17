import Chip from "@material-ui/core/Chip";
import IconButton from "@material-ui/core/IconButton";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { usePagination } from "@material-ui/lab";
import { FC, useCallback } from "react";
import { AutoBox } from "../Box";

type ButtonProps = { value: string; label: string };

type Props = {
  page: number;
  yearMonthChips: Record<number, ButtonProps>;
  handleChange: (nextPage: number) => void;
};

export const YearMonthSelection: FC<Props> = ({
  page,
  yearMonthChips: buttonsProps,
  handleChange,
}) => {
  const { items } = usePagination({
    boundaryCount: 0,
    count: Object.keys(buttonsProps).length,
    page,
    showFirstButton: false,
    showLastButton: false,
    siblingCount: 1,
  });

  const previous = items.find((item) => item.type === "previous");
  const current = items.find((item) => item.type === "page" && item.selected);
  const next = items.find((item) => item.type === "next");

  const handlePageChange = useCallback(
    (onClick: React.ReactEventHandler, nextPage: number) => (event: React.SyntheticEvent) => {
      onClick(event);
      handleChange(nextPage);
    },
    [handleChange]
  );

  return (
    <AutoBox display="flex" flexDirection="row" alignItems="center">
      {previous && (
        <IconButton
          area-label="previous"
          onClick={handlePageChange(previous.onClick, page - 1)}
          disabled={previous.disabled}
        >
          <ChevronLeftIcon />
        </IconButton>
      )}
      {current && <Chip label={buttonsProps[current.page].label} variant="outlined" />}
      {next && (
        <IconButton
          area-label="next"
          onClick={handlePageChange(next.onClick, page + 1)}
          disabled={next.disabled}
        >
          <ChevronRightIcon />
        </IconButton>
      )}
    </AutoBox>
  );
};
