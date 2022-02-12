import Close from "@mui/icons-material/Close";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import { ReactNode, useCallback, useState } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { styled } from "../../utils/theme";
import { FullBox } from "../Box";
import { SmallButton } from "../Button";
import { IconButton } from "../IconButton";

type Props = {
  chips: string[];
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
      <FullBox display="flex" alignItems="center" justifyContent="space-between">
        <StyledChips>
          {chips.map((chip) => (
            <Chip key={chip} label={chip} size={isMobile ? "small" : "medium"} />
          ))}
        </StyledChips>
        {isMobile ? (
          <IconButton onClick={toggleDrawer}>
            <ManageSearchIcon />
          </IconButton>
        ) : (
          <SmallButton onClick={toggleDrawer}>絞り込み</SmallButton>
        )}
      </FullBox>
      <Drawer
        anchor="right"
        onClose={toggleDrawer}
        open={isOpen}
        PaperProps={{ sx: { maxWidth: "88%" } }}
      >
        <StyledMenu>
          <IconButton onClick={toggleDrawer} edge="start">
            <Close />
          </IconButton>
          {children}
        </StyledMenu>
      </Drawer>
    </>
  );
};

const StyledChips = styled("div")(({ theme }) => ({
  marginRight: "16px",
  display: "flex",
  gap: "8px",
  flexWrap: "nowrap",
  overflow: "auto",
  height: "32px",
  [theme.breakpoints.down("sm")]: {
    marginRight: "0",
    gap: "4px",
    height: "24px",
  },
}));

const StyledMenu = styled("div")(({ theme }) => ({
  width: "80%",
  padding: theme.spacing(2, 3),
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: theme.spacing(3),
}));
