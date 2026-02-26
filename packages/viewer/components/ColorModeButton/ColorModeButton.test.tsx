import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { ColorModeProvider } from "../../contexts/ColorMode";
import { ColorModeButton } from "./ColorModeButton";

const renderColorModeButton = () => {
  return renderWithProviders(
    <ColorModeProvider>
      <ColorModeButton />
    </ColorModeProvider>
  );
};

describe("ColorModeButton Component", () => {
  it("ボタンをレンダリングする", () => {
    renderColorModeButton();

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("適切なaria-labelを持つ", () => {
    renderColorModeButton();

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "テーマ: システム設定");
  });
});
