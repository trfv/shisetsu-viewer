import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import Drawer from "@mui/material/Drawer";
import { ReactNode, useCallback, useState } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { styled } from "../../utils/theme";
import { FullBox } from "../Box";
import { IconButton } from "../IconButton";

type Props = {
  children?: ReactNode;
};

export const SearchForm = ({ children }: Props) => {
  const isMobile = useIsMobile();

  const [isOpen, setIsOpen] = useState(false);

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return isMobile ? (
    <>
      <FullBox display="flex" alignItems="center" justifyContent="flex-end">
        <IconButton onClick={toggleDrawer}>
          <ManageSearchIcon />
        </IconButton>
      </FullBox>
      <Drawer
        anchor="right"
        onClose={toggleDrawer}
        open={isOpen}
        PaperProps={{ sx: { width: "90%" } }}
      >
        <StyledMenu>
          <IconButton onClick={toggleDrawer}>
            <ManageSearchIcon />
          </IconButton>
          {children}
        </StyledMenu>
      </Drawer>
    </>
  ) : (
    <>{children}</>
  );
};

const StyledMenu = styled("div")(({ theme }) => ({
  width: "80%",
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: theme.spacing(3),
}));
