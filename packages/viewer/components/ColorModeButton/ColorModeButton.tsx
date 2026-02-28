import { useColorMode } from "../../contexts/ColorMode";
import { IconButton } from "../IconButton";
import { BrightnessAutoIcon, DarkModeIcon, LightModeIcon } from "../icons";

const modeConfig = {
  system: { icon: BrightnessAutoIcon, label: "テーマ: システム設定" },
  light: { icon: LightModeIcon, label: "テーマ: ライト" },
  dark: { icon: DarkModeIcon, label: "テーマ: ダーク" },
} as const;

export const ColorModeButton = () => {
  const { mode, toggleMode } = useColorMode();
  const { icon: ModeIcon, label } = modeConfig[mode];

  return (
    <IconButton aria-label={label} onClick={toggleMode} size="small" title={label}>
      <ModeIcon htmlColor="white" size={20} />
    </IconButton>
  );
};
