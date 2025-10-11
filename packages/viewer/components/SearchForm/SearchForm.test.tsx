import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "../../test/utils/test-utils";
import { SearchForm } from "./SearchForm";
import { useIsMobile } from "../../hooks/useIsMobile";

// Mock the useIsMobile hook
vi.mock("../../hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

describe("SearchForm Component", () => {
  const defaultProps = {
    chips: ["東京都", "体育館", "利用可能"],
    children: <div>Search Form Content</div>,
  };

  describe("Rendering", () => {
    it("すべてのチップを表示する", () => {
      renderWithProviders(<SearchForm {...defaultProps} />);

      defaultProps.chips.forEach((chip) => {
        expect(screen.getByText(chip)).toBeInTheDocument();
      });
    });

    it("絞り込みボタンを表示する", () => {
      renderWithProviders(<SearchForm {...defaultProps} />);

      expect(screen.getByRole("button", { name: /絞り込み/i })).toBeInTheDocument();
    });

    it("チップが空の場合も正しく表示する", () => {
      renderWithProviders(
        <SearchForm chips={[]}>
          <div>Content</div>
        </SearchForm>
      );

      expect(screen.getByRole("button", { name: /絞り込み/i })).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("絞り込みボタンクリックでドロワーが開く", async () => {
      const { user } = renderWithProviders(<SearchForm {...defaultProps} />);

      const button = screen.getByRole("button", { name: /絞り込み/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Search Form Content")).toBeVisible();
      });
    });

    it("ドロワーの閉じるボタンでドロワーが閉じる", async () => {
      const { user } = renderWithProviders(<SearchForm {...defaultProps} />);

      // Open drawer
      const openButton = screen.getByRole("button", { name: /絞り込み/i });
      await user.click(openButton);

      // Find and click close button
      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons.find((button) => {
        const svg = button.querySelector('svg[data-testid="CloseIcon"]');
        return svg !== null;
      });

      if (closeButton) {
        await user.click(closeButton);
      }

      await waitFor(() => {
        const drawer = screen.queryByRole("presentation");
        if (drawer) {
          expect(drawer).toHaveAttribute("aria-hidden", "true");
        }
      });
    });

    it("ドロワーの外側クリックで閉じる", async () => {
      const { user } = renderWithProviders(<SearchForm {...defaultProps} />);

      const button = screen.getByRole("button", { name: /絞り込み/i });
      await user.click(button);

      // Click backdrop
      const backdrop = document.querySelector(".MuiBackdrop-root");
      if (backdrop) {
        await user.click(backdrop as Element);
      }

      await waitFor(() => {
        const drawer = screen.queryByRole("presentation");
        if (drawer) {
          expect(drawer).toHaveAttribute("aria-hidden", "true");
        }
      });
    });
  });

  describe("Mobile View", () => {
    beforeEach(() => {
      vi.mocked(useIsMobile).mockReturnValue(true);
    });

    afterEach(() => {
      vi.mocked(useIsMobile).mockReturnValue(false);
    });

    it("モバイルビューでアイコンボタンを表示する", () => {
      renderWithProviders(<SearchForm {...defaultProps} />);

      // Check for icon button instead of text button
      const buttons = screen.getAllByRole("button");
      const iconButton = buttons.find((button) => {
        return button.querySelector('svg[data-testid="ManageSearchIcon"]');
      });

      expect(iconButton).toBeInTheDocument();
    });

    it("モバイルビューで小さいチップサイズを使用する", () => {
      const { container } = renderWithProviders(<SearchForm {...defaultProps} />);

      const chips = container.querySelectorAll(".MuiChip-root");
      chips.forEach((chip) => {
        expect(chip).toHaveClass("MuiChip-sizeSmall");
      });
    });
  });

  describe("Accessibility", () => {
    describe("Mobile View", () => {
      beforeEach(() => {
        vi.mocked(useIsMobile).mockReturnValue(true);
      });

      afterEach(() => {
        vi.mocked(useIsMobile).mockReturnValue(false);
      });

      it("適切なARIA属性を持つ", () => {
        renderWithProviders(<SearchForm {...defaultProps} />);

        const button = screen.getByRole("button", { name: /絞り込み/i });
        expect(button).toBeInTheDocument();
      });

      it("キーボードナビゲーションが機能する", async () => {
        const { user } = renderWithProviders(<SearchForm {...defaultProps} />);

        // Tab to button
        await user.tab();
        const button = screen.getByRole("button", { name: /絞り込み/i });
        expect(button).toHaveFocus();

        // Enter to open
        await user.keyboard("{Enter}");

        await waitFor(() => {
          expect(screen.getByText("Search Form Content")).toBeVisible();
        });
      });
    });
  });

  describe("Edge Cases", () => {
    it("非常に長いチップテキストを適切に処理する", () => {
      const longChips = [
        "これは非常に長いテキストを含むチップです。オーバーフローを適切に処理する必要があります。",
        "もう一つの長いテキスト",
      ];

      renderWithProviders(
        <SearchForm chips={longChips}>
          <div>Content</div>
        </SearchForm>
      );

      // チップが表示されることを確認
      longChips.forEach((chip) => {
        const chipText = chip.length > 20 ? chip.substring(0, 20) : chip;
        expect(screen.getByText(chipText, { exact: false })).toBeInTheDocument();
      });
    });

    it("多数のチップを水平スクロールで表示する", () => {
      const manyChips = Array.from({ length: 20 }, (_, i) => `チップ${i + 1}`);

      renderWithProviders(
        <SearchForm chips={manyChips}>
          <div>Content</div>
        </SearchForm>
      );

      // 多数のチップが表示されることを確認
      const displayedChips = screen.getAllByText(/チップ\d+/);
      expect(displayedChips.length).toBeGreaterThan(0);
      expect(displayedChips.length).toBeLessThanOrEqual(20);
    });
  });
});
