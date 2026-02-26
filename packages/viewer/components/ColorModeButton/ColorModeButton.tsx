import Brightness4Icon from "@mui/icons-material/Brightness4";
import BrightnessAutoIcon from "@mui/icons-material/BrightnessAuto";
import LightModeIcon from "@mui/icons-material/LightMode";
import Tooltip from "@mui/material/Tooltip";
import { useColorMode } from "../../contexts/ColorMode";
import { IconButton } from "../IconButton";

const modeConfig = {
  system: { icon: BrightnessAutoIcon, label: "テーマ: システム設定" },
  light: { icon: LightModeIcon, label: "テーマ: ライト" },
  dark: { icon: Brightness4Icon, label: "テーマ: ダーク" },
} as const;

export const ColorModeButton = () => {
  const { mode, toggleMode } = useColorMode();
  const { icon: Icon, label } = modeConfig[mode];

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={toggleMode} size="small">
        <Icon htmlColor="white" fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};
