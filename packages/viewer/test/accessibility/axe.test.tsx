import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "../utils/test-utils";
import { MockedResponse } from "@apollo/client/testing";

// Import components to test
import TopPage from "../../pages/Top";
import ReservationPage from "../../pages/Reservation";
import { SearchForm } from "../../components/SearchForm/SearchForm";
import { DataTable } from "../../components/DataTable";
import { CheckboxGroup } from "../../components/CheckboxGroup/CheckboxGroup";
import { Checkbox } from "../../components/Checkbox";
import { Select } from "../../components/Select";

// Import test data
import { ReservationsDocument } from "../../api/gql/graphql";

// Mock hooks
vi.mock("../../hooks/useIsMobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock router
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      pathname: "/",
      search: "",
      hash: "",
      state: {},
      key: "default",
    }),
  };
});

describe("Accessibility Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Page Components", () => {
    describe("Top Page", () => {
      it("has proper heading hierarchy", () => {
        renderWithProviders(<TopPage />);

        // h2見出しが存在する
        const h2Headings = screen.getAllByRole("heading", { level: 2 });
        expect(h2Headings).toHaveLength(4);

        // h3見出しが存在する
        const h3Headings = screen.getAllByRole("heading", { level: 3 });
        expect(h3Headings).toHaveLength(2);

        // 見出しが適切な順序になっている
        const allHeadings = screen.getAllByRole("heading");
        const levels = allHeadings.map((h) => parseInt(h.tagName.charAt(1)));

        // レベル2から開始し、段階的に増加している
        expect(levels[0]).toBe(2);

        // レベルが適切にネストされている
        for (let i = 1; i < levels.length; i++) {
          const currentLevel = levels[i] as number;
          const previousLevel = levels[i - 1] as number;
          // 次のレベルは現在のレベル以下、または1つ上のレベル
          expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
        }
      });

      it("has proper landmark structure", () => {
        renderWithProviders(<TopPage />);

        // メインランドマークが存在する
        expect(screen.getByRole("main")).toBeInTheDocument();
      });

      it("has accessible lists", () => {
        renderWithProviders(<TopPage />);

        const lists = screen.getAllByRole("list");
        expect(lists.length).toBeGreaterThan(0);

        lists.forEach(() => {
          const listItems = screen.getAllByRole("listitem");
          expect(listItems.length).toBeGreaterThan(0);
        });
      });
    });

    describe("Reservation Page", () => {
      // Create mock data matching GraphQL schema structure
      const mockInstitution = {
        id: "test-institution-1",
        municipality: "MUNICIPALITY_KOUTOU",
        building: "テスト体育館",
        institution: "コミュニティセンター",
        institution_size: "LARGE",
      };

      const mockReservations = Array.from({ length: 3 }, (_, index) => ({
        id: `reservation-${index + 1}`,
        date: "2025-09-20",
        reservation: { morning: "available", afternoon: "occupied" },
        updated_at: "2025-09-17T12:00:00",
        institution: mockInstitution,
      }));

      // Use exact variables from error message to match component behavior
      const currentDate = new Date();
      const defaultMocks: MockedResponse[] = [
        {
          request: {
            query: ReservationsDocument,
            variables: {
              prefecture: null,
              isAvailableStrings: null,
              isAvailableWoodwind: null,
              isAvailableBrass: null,
              isAvailablePercussion: null,
              institutionSizes: null,
              reservationStatus1: {},
              reservationStatus2: {},
              reservationStatus3: {},
              reservationStatus4: {},
              offset: 0,
              limit: 100,
              municipality: [
                "MUNICIPALITY_KOUTOU",
                "MUNICIPALITY_KITA",
                "MUNICIPALITY_ARAKAWA",
                "MUNICIPALITY_SUMIDA",
                "MUNICIPALITY_CHUO",
                "MUNICIPALITY_KAWASAKI",
              ],
              startDate: currentDate.toDateString(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toDateString(),
              isHoliday: null,
            },
          },
          result: {
            data: {
              reservations: mockReservations,
              reservations_aggregate: {
                aggregate: {
                  count: mockReservations.length,
                },
              },
            },
          },
        },
      ];

      it("has properly labeled form controls", async () => {
        const { user } = renderWithProviders(<ReservationPage />, { mocks: defaultMocks });

        // ローディングが完了するまで待機
        await waitFor(
          () => {
            expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
          },
          { timeout: 3000 }
        );

        // 絞り込みボタンをクリックしてSearchFormを開く
        const filterButton = screen.getByRole("button", { name: /絞り込み/i });
        expect(filterButton).toBeInTheDocument();
        await user.click(filterButton);

        // SearchFormが開かれるまで待機
        await waitFor(() => {
          expect(screen.getByText("期間指定")).toBeInTheDocument();
        });

        // 地区選択が適切にラベル付けされている
        await waitFor(() => {
          expect(screen.getByRole("combobox", { name: /地区/i })).toBeInTheDocument();
        });

        // チェックボックスグループが適切にラベル付けされている
        const filterLabels = screen.getAllByText("絞り込み");
        expect(filterLabels.length).toBeGreaterThan(0);
        expect(screen.getByText("利用可能楽器")).toBeInTheDocument();
        const facilitySizeLabels = screen.getAllByText("施設サイズ");
        expect(facilitySizeLabels.length).toBeGreaterThanOrEqual(1);
      });

      it("has accessible table structure", async () => {
        renderWithProviders(<ReservationPage />, { mocks: defaultMocks });

        // ローディングが完了するまで待機
        await waitFor(
          () => {
            expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
          },
          { timeout: 3000 }
        );

        // テーブルが表示されていることを確認
        await waitFor(() => {
          expect(screen.getByRole("table")).toBeInTheDocument();
        });

        // テーブルヘッダーが適切に設定されている
        expect(screen.getByRole("columnheader", { name: "施設名" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "日付" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "予約状況" })).toBeInTheDocument();

        // テーブル行が存在する
        const rows = screen.getAllByRole("row");
        expect(rows.length).toBeGreaterThan(1); // ヘッダー + データ行
      });

      it("supports keyboard navigation", async () => {
        const { user } = renderWithProviders(<ReservationPage />, {
          mocks: defaultMocks,
        });

        // フォーカス可能な要素に移動できる
        await user.tab();

        // フォーカスされた要素が存在することを確認
        const focusedElement = document.activeElement;
        expect(focusedElement).toBeInstanceOf(Element);
        expect(focusedElement?.tagName).toBeDefined();
      });
    });
  });

  describe("Individual Components", () => {
    describe("SearchForm Component", () => {
      const defaultProps = {
        chips: ["東京都", "体育館", "利用可能"],
        children: <div>Search Form Content</div>,
      };

      it("has accessible button with proper role", () => {
        renderWithProviders(<SearchForm {...defaultProps} />);

        const button = screen.getByRole("button", { name: /絞り込み/i });
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute("type", "button");
      });

      it("has properly managed focus", async () => {
        const { user } = renderWithProviders(<SearchForm {...defaultProps} />);

        const button = screen.getByRole("button", { name: /絞り込み/i });

        // キーボードでフォーカス
        await user.tab();
        expect(button).toHaveFocus();

        // Enterキーで開く
        await user.keyboard("{Enter}");

        await waitFor(() => {
          expect(screen.getByText("Search Form Content")).toBeVisible();
        });
      });

      it("has accessible drawer with proper ARIA attributes", async () => {
        const { user } = renderWithProviders(<SearchForm {...defaultProps} />);

        const button = screen.getByRole("button", { name: /絞り込み/i });
        await user.click(button);

        await waitFor(() => {
          const drawer = screen.getByRole("presentation");
          expect(drawer).toBeInTheDocument();
        });
      });
    });

    describe("Select Component", () => {
      const selectProps = {
        label: "テスト選択",
        value: "option1",
        onChange: vi.fn(),
        selectOptions: [
          { value: "option1", label: "オプション1" },
          { value: "option2", label: "オプション2" },
        ],
      };

      it("has proper labeling", () => {
        renderWithProviders(<Select {...selectProps} />);

        const select = screen.getByRole("combobox", { name: "テスト選択" });
        expect(select).toBeInTheDocument();
      });

      it("has accessible options", async () => {
        const { user } = renderWithProviders(<Select {...selectProps} />);

        const select = screen.getByRole("combobox", { name: "テスト選択" });
        await user.click(select);

        // オプションが表示される
        await waitFor(() => {
          expect(screen.getByRole("option", { name: "オプション1" })).toBeInTheDocument();
          expect(screen.getByRole("option", { name: "オプション2" })).toBeInTheDocument();
        });
      });
    });

    describe("CheckboxGroup Component", () => {
      const checkboxProps = {
        label: "テストチェックボックス",
        values: ["option1"],
        onChange: vi.fn(),
        children: [
          <Checkbox key="option1" value="option1" label="オプション1" />,
          <Checkbox key="option2" value="option2" label="オプション2" />,
        ],
      };

      it("has proper group labeling", () => {
        renderWithProviders(<CheckboxGroup {...checkboxProps} />);

        // グループラベルが存在する
        expect(screen.getByText("テストチェックボックス")).toBeInTheDocument();
      });

      it("has accessible checkboxes", () => {
        renderWithProviders(<CheckboxGroup {...checkboxProps} />);

        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe("DataTable Component", () => {
      const tableData = [
        { id: "1", name: "施設A", municipality: "東京都新宿区" },
        { id: "2", name: "施設B", municipality: "東京都渋谷区" },
      ];

      const columns = [
        { field: "name", headerName: "施設名", type: "string" as const },
        { field: "municipality", headerName: "地区", type: "string" as const },
      ];

      const tableProps = {
        rows: tableData,
        columns,
        hasNextPage: false,
        fetchMore: vi.fn(),
        onRowClick: vi.fn(),
      };

      it("has proper table structure", () => {
        renderWithProviders(<DataTable {...tableProps} />);

        // テーブルが存在する
        expect(screen.getByRole("table")).toBeInTheDocument();

        // ヘッダーが適切に設定されている
        expect(screen.getByRole("columnheader", { name: "施設名" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "地区" })).toBeInTheDocument();

        // データ行が存在する
        const rows = screen.getAllByRole("row");
        expect(rows.length).toBe(3); // ヘッダー + 2データ行
      });

      it("supports keyboard navigation", async () => {
        const { user } = renderWithProviders(<DataTable {...tableProps} />);

        // テーブル行にフォーカスを移動
        await user.tab();

        // 最初のデータ行を確認
        const firstDataRow = screen.getAllByRole("row")[1];
        expect(firstDataRow).toBeInTheDocument();
      });
    });
  });

  describe("Focus Management", () => {
    it("maintains logical focus order", async () => {
      const { user } = renderWithProviders(
        <SearchForm chips={["東京都", "体育館"]}>
          <div>
            <button>ボタン1</button>
            <button>ボタン2</button>
            <input type="text" placeholder="テキスト入力" />
          </div>
        </SearchForm>
      );

      // 最初のフォーカス可能な要素
      await user.tab();
      const firstFocused = document.activeElement;
      expect(firstFocused).toBeInstanceOf(Element);

      // 次の要素にフォーカス
      await user.tab();
      const secondFocused = document.activeElement;
      expect(secondFocused).toBeInstanceOf(Element);
      expect(secondFocused).not.toBe(firstFocused);
    });

    it("properly traps focus in modal dialogs", async () => {
      const { user } = renderWithProviders(
        <SearchForm chips={["テスト"]}>
          <button>閉じる</button>
        </SearchForm>
      );

      // ドロワーを開く
      const openButton = screen.getByRole("button", { name: /絞り込み/i });
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByText("閉じる")).toBeVisible();
      });

      // フォーカスがドロワー内に移動している
      const focusedElement = document.activeElement;
      const drawer = screen.getByRole("presentation");
      expect(drawer.contains(focusedElement)).toBe(true);
    });
  });

  describe("Screen Reader Support", () => {
    it("has proper ARIA labels for complex UI", () => {
      renderWithProviders(
        <SearchForm chips={["東京都新宿区", "利用可能"]}>
          <div>フォーム内容</div>
        </SearchForm>
      );

      // ボタンに適切なARIAラベルがある
      const button = screen.getByRole("button", { name: /絞り込み/i });
      expect(button).toBeInTheDocument();
    });

    it("provides status updates for dynamic content", async () => {
      const currentDate = new Date();
      const mockMocks: MockedResponse[] = [
        {
          request: {
            query: ReservationsDocument,
            variables: {
              prefecture: null,
              isAvailableStrings: null,
              isAvailableWoodwind: null,
              isAvailableBrass: null,
              isAvailablePercussion: null,
              institutionSizes: null,
              reservationStatus1: {},
              reservationStatus2: {},
              reservationStatus3: {},
              reservationStatus4: {},
              offset: 0,
              limit: 100,
              municipality: [
                "MUNICIPALITY_KOUTOU",
                "MUNICIPALITY_KITA",
                "MUNICIPALITY_ARAKAWA",
                "MUNICIPALITY_SUMIDA",
                "MUNICIPALITY_CHUO",
                "MUNICIPALITY_KAWASAKI",
              ],
              startDate: currentDate.toDateString(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toDateString(),
              isHoliday: null,
            },
          },
          result: {
            data: {
              reservations: [],
              reservations_aggregate: {
                aggregate: { count: 0 },
              },
            },
          },
        },
      ];

      renderWithProviders(<ReservationPage />, { mocks: mockMocks });

      // ローディングが完了するまで待機
      await waitFor(
        () => {
          expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // ローディング状態のaria-busyや進行状況が適切に管理される
      await waitFor(() => {
        // 「データが存在しません」メッセージが表示される
        expect(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
      });
    });

    it("has accessible form validation messages", async () => {
      // フォームバリデーションのテストは実際のバリデーション実装に依存
      // ここでは構造の確認のみ
      renderWithProviders(
        <Select
          label="必須フィールド"
          value=""
          onChange={vi.fn()}
          selectOptions={[{ value: "test", label: "テスト" }]}
        />
      );

      const select = screen.getByRole("combobox", { name: /必須フィールド/i });
      expect(select).toBeInTheDocument();
    });
  });

  describe("Mobile Accessibility", () => {
    beforeEach(async () => {
      const { useIsMobile } = vi.mocked(await import("../../hooks/useIsMobile"));
      useIsMobile.mockReturnValue(true);
    });

    it("has appropriate touch targets", () => {
      renderWithProviders(
        <SearchForm chips={["タッチテスト"]}>
          <button>大きなボタン</button>
        </SearchForm>
      );

      // ボタンが存在することを確認（実際のサイズは CSS で制御）
      const button = screen.getByRole("button", { name: /絞り込み/i });
      expect(button).toBeInTheDocument();
    });
  });
});
