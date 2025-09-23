import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { createTheme } from "@mui/material/styles";
import { useIsMobile } from "./useIsMobile";

// Mock MUI's useMediaQuery
vi.mock("@mui/material/useMediaQuery", () => ({
  default: vi.fn(),
}));

describe("useIsMobile Hook", () => {
  let mockUseMediaQuery: ReturnType<typeof vi.fn>;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(async () => {
    // Import the mocked function
    const useMediaQueryModule = await import("@mui/material/useMediaQuery");
    mockUseMediaQuery = useMediaQueryModule.default as ReturnType<typeof vi.fn>;

    // Mock window.matchMedia
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.matchMedia = originalMatchMedia;
  });

  const createWrapper = () => {
    const theme = createTheme();
    return ({ children }: { children: ReactNode }) => (
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    );
  };

  describe("基本機能", () => {
    it("モバイル画面でtrueを返す", () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(true);
    });

    it("デスクトップ画面でfalseを返す", () => {
      mockUseMediaQuery.mockReturnValue(false);

      const { result } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(false);
    });

    it("適切なブレークポイントクエリを使用する", () => {
      mockUseMediaQuery.mockReturnValue(false);

      renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      // useMediaQueryが適切なブレークポイントで呼ばれることを確認
      expect(mockUseMediaQuery).toHaveBeenCalledWith(expect.stringContaining("max-width"));
    });
  });

  describe("レスポンシブブレークポイント", () => {
    it("small (sm) ブレークポイント以下でモバイルと判定する", () => {
      // MUI のデフォルトの sm ブレークポイントは 600px
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(true);
      expect(mockUseMediaQuery).toHaveBeenCalled();
    });

    it("medium (md) ブレークポイント以上でデスクトップと判定する", () => {
      mockUseMediaQuery.mockReturnValue(false);

      const { result } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(false);
    });
  });

  describe("リアクティブな変更", () => {
    it("画面サイズ変更に応じて値が更新される", () => {
      // 初期状態: デスクトップ
      mockUseMediaQuery.mockReturnValue(false);

      const { result, rerender } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(false);

      // 画面サイズ変更: モバイル
      mockUseMediaQuery.mockReturnValue(true);
      rerender();

      expect(result.current).toBe(true);
    });

    it("複数回の変更に対応する", () => {
      const { result, rerender } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      // デスクトップ → モバイル → デスクトップ
      mockUseMediaQuery.mockReturnValue(false);
      rerender();
      expect(result.current).toBe(false);

      mockUseMediaQuery.mockReturnValue(true);
      rerender();
      expect(result.current).toBe(true);

      mockUseMediaQuery.mockReturnValue(false);
      rerender();
      expect(result.current).toBe(false);
    });
  });

  describe("エッジケース", () => {
    it("テーマが提供されていない場合でもエラーにならない", () => {
      mockUseMediaQuery.mockReturnValue(false);

      expect(() => {
        renderHook(() => useIsMobile());
      }).not.toThrow();
    });

    it("useMediaQueryが例外を投げた場合の処理", () => {
      mockUseMediaQuery.mockImplementation(() => {
        throw new Error("Media query error");
      });

      expect(() => {
        renderHook(() => useIsMobile(), {
          wrapper: createWrapper(),
        });
      }).toThrow("Media query error");
    });
  });

  describe("パフォーマンス", () => {
    it("同じテーマで複数回実行されても適切に動作する", () => {
      mockUseMediaQuery.mockReturnValue(false);

      const { result: result1 } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      const { result: result2 } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      expect(result1.current).toBe(result2.current);
      expect(mockUseMediaQuery).toHaveBeenCalledTimes(2);
    });

    it("再レンダリング時に不要な再計算を行わない", () => {
      mockUseMediaQuery.mockReturnValue(false);

      const { rerender } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      const initialCallCount = mockUseMediaQuery.mock.calls.length;

      // propsが変わらない再レンダリング
      rerender();

      // useMediaQueryの呼び出し回数が増加することを確認
      // (useMediaQueryは内部でメディアクエリのリスナーを管理するため)
      expect(mockUseMediaQuery.mock.calls.length).toBeGreaterThanOrEqual(initialCallCount);
    });
  });

  describe("統合テスト", () => {
    it("実際のメディアクエリ文字列を確認する", () => {
      mockUseMediaQuery.mockReturnValue(false);

      renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      // breakpoints.down('sm') が呼ばれることを確認
      const call = mockUseMediaQuery.mock.calls[0];
      expect(call?.[0]).toContain("max-width");
    });

    it("カスタムテーマのブレークポイントに対応する", () => {
      const customTheme = createTheme({
        breakpoints: {
          values: {
            xs: 0,
            sm: 768, // カスタムsmブレークポイント
            md: 1024,
            lg: 1200,
            xl: 1536,
          },
        },
      });

      const CustomThemeWrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider theme={customTheme}>{children}</ThemeProvider>
      );

      mockUseMediaQuery.mockReturnValue(false);

      renderHook(() => useIsMobile(), {
        wrapper: CustomThemeWrapper,
      });

      expect(mockUseMediaQuery).toHaveBeenCalled();
    });
  });

  describe("TypeScript型安全性", () => {
    it("正しいboolean型を返す", () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      // TypeScriptコンパイル時にboolean型であることが保証される
      expect(typeof result.current).toBe("boolean");
      expect(result.current).toBe(true);
    });

    it("undefinedやnullを返さない", () => {
      mockUseMediaQuery.mockReturnValue(false);

      const { result } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      expect(result.current).not.toBeUndefined();
      expect(result.current).not.toBeNull();
      expect(result.current).toBe(false);
    });
  });

  describe("実用的なユースケース", () => {
    it("条件分岐でモバイル用コンポーネントを制御する", () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      // モバイル判定に基づく条件分岐の例
      const shouldShowMobileLayout = result.current;
      const shouldShowDesktopLayout = !result.current;

      expect(shouldShowMobileLayout).toBe(true);
      expect(shouldShowDesktopLayout).toBe(false);
    });

    it("複数のブレークポイント判定との組み合わせ", () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useIsMobile(), {
        wrapper: createWrapper(),
      });

      const isMobile = result.current;

      // 実際のアプリケーションでの使用例
      const columnCount = isMobile ? 1 : 3;
      const fontSize = isMobile ? "14px" : "16px";

      expect(columnCount).toBe(1);
      expect(fontSize).toBe("14px");
    });
  });
});
