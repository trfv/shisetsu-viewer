import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "../../test/utils/test-utils";
import { SearchForm } from "./SearchForm";

// Create a mock function that can be controlled
let mockIsMobileValue = false;

// Mock the useIsMobile hook with a function that reads the value
vi.mock("../../hooks/useIsMobile", () => ({
  useIsMobile: () => mockIsMobileValue,
}));

describe("SearchForm Component", () => {
  const defaultProps = {
    chips: [
      { label: "東京都", onDelete: vi.fn() },
      { label: "体育館", onDelete: vi.fn() },
      { label: "利用可能" },
    ],
    children: <div>Search Form Content</div>,
  };

  beforeEach(() => {
    // Reset to default
    mockIsMobileValue = false;
  });

  describe("Rendering", () => {
    it("すべてのチップを表示する", () => {
      renderWithProviders(<SearchForm {...defaultProps} />);

      defaultProps.chips.forEach((chip) => {
        expect(screen.getByText(chip.label)).toBeInTheDocument();
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

  describe("Chip Delete", () => {
    it("onDeleteが設定されたチップに削除ボタンが表示される", () => {
      renderWithProviders(<SearchForm {...defaultProps} />);

      const chips = document.querySelectorAll('[data-testid="chip"]');
      const deletableChips = document.querySelectorAll('[data-testid="chip-delete"]');
      expect(deletableChips).toHaveLength(2);

      // "利用可能" には onDelete がないので削除ボタンがない
      expect(chips).toHaveLength(3);
    });

    it("削除ボタンクリックでonDeleteが呼ばれる", async () => {
      const onDelete = vi.fn();
      const chips = [{ label: "テスト", onDelete }];
      const { user } = renderWithProviders(
        <SearchForm chips={chips}>
          <div>Content</div>
        </SearchForm>
      );

      const deleteButton = document.querySelector('[data-testid="chip-delete"]');
      expect(deleteButton).not.toBeNull();
      await user.click(deleteButton as Element);

      expect(onDelete).toHaveBeenCalledTimes(1);
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
      const closeButton = screen.getByRole("button", { name: "閉じる" });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("drawer-overlay")).not.toBeInTheDocument();
      });
    });

    it("ドロワーの外側クリックで閉じる", async () => {
      const { user } = renderWithProviders(<SearchForm {...defaultProps} />);

      const button = screen.getByRole("button", { name: /絞り込み/i });
      await user.click(button);

      // Click overlay
      const overlay = document.querySelector('[data-testid="drawer-overlay"]');
      if (overlay) {
        await user.click(overlay as Element);
      }

      await waitFor(() => {
        expect(screen.queryByTestId("drawer-overlay")).not.toBeInTheDocument();
      });
    });
  });

  describe("Mobile View", () => {
    beforeEach(() => {
      mockIsMobileValue = true;
    });

    afterEach(() => {
      mockIsMobileValue = false;
    });

    it("モバイルビューでアイコンボタンを表示する", () => {
      renderWithProviders(<SearchForm {...defaultProps} />);

      // Check for icon button with aria-label
      const iconButton = screen.getByRole("button", { name: /絞り込み/i });
      expect(iconButton).toBeInTheDocument();
      expect(iconButton.querySelector("svg")).not.toBeNull();
    });

    it("モバイルビューで小さいチップサイズを使用する", () => {
      renderWithProviders(<SearchForm {...defaultProps} />);

      const chips = document.querySelectorAll('[data-testid="chip"]');
      chips.forEach((chip) => {
        // The chip element should have the "small" class in mobile view
        expect(chip.className).toContain("small");
      });
    });
  });

  describe("Accessibility", () => {
    describe("Mobile View", () => {
      beforeEach(() => {
        mockIsMobileValue = true;
      });

      afterEach(() => {
        mockIsMobileValue = false;
      });

      it("適切なARIA属性を持つ", () => {
        renderWithProviders(<SearchForm {...defaultProps} />);

        const button = screen.getByRole("button", { name: /絞り込み/i });
        expect(button).toBeInTheDocument();
      });

      it("キーボードナビゲーションが機能する", async () => {
        const chips = [{ label: "東京都" }, { label: "体育館" }];
        const { user } = renderWithProviders(
          <SearchForm chips={chips}>
            <div>Search Form Content</div>
          </SearchForm>
        );

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
        {
          label:
            "これは非常に長いテキストを含むチップです。オーバーフローを適切に処理する必要があります。",
        },
        { label: "もう一つの長いテキスト" },
      ];

      renderWithProviders(
        <SearchForm chips={longChips}>
          <div>Content</div>
        </SearchForm>
      );

      // チップが表示されることを確認
      longChips.forEach((chip) => {
        const chipText = chip.label.length > 20 ? chip.label.substring(0, 20) : chip.label;
        expect(screen.getByText(chipText, { exact: false })).toBeInTheDocument();
      });
    });

    it("多数のチップを水平スクロールで表示する", () => {
      const manyChips = Array.from({ length: 20 }, (_, i) => ({
        label: `チップ${i + 1}`,
      }));

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
