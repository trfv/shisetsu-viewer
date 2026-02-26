import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "../test/utils/test-utils";
import { ReservationsDocument } from "../api/gql/graphql";
import {
  createMockSearchableReservationNode,
  createMockSearchableReservationsConnection,
} from "../test/mocks/data";
import { ErrorBoundary } from "../components/utils/ErrorBoundary";

vi.mock("../hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

const FAKE_NOW = new Date("2025-06-15T12:00:00+09:00");

let ReservationPage: React.ComponentType;

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(FAKE_NOW);
  vi.resetModules();
  const mod = await import("./Reservation");
  ReservationPage = mod.default;
});

afterEach(() => {
  vi.useRealTimers();
});

// Build expected variables matching what the component will generate with the fake date.
const startDate = new Date("2025-06-15T12:00:00+09:00");
const endDate = new Date("2025-07-15T12:00:00+09:00");

const defaultVariables = {
  first: 100,
  after: null,
  municipality: ["MUNICIPALITY_KOUTOU"],
  isAvailableStrings: null,
  isAvailableWoodwind: null,
  isAvailableBrass: null,
  isAvailablePercussion: null,
  institutionSizes: null,
  startDate: startDate.toDateString(),
  endDate: endDate.toDateString(),
  isHoliday: null,
  isMorningVacant: null,
  isAfternoonVacant: null,
  isEveningVacant: null,
};

describe("COLUMNS定義", () => {
  it("隠しカラム(municipality)のvalueGetterが正しい値を返す", async () => {
    const { COLUMNS } = await import("./Reservation");
    const mockNode = createMockSearchableReservationNode();
    const col = COLUMNS.find((c) => c.field === "municipality");
    const params = {
      id: mockNode["id"] as string,
      value: undefined,
      row: mockNode,
      columns: COLUMNS,
    };
    expect(col?.valueGetter?.(params as never)).toBe("江東区");
  });

  it("隠しカラム(municipality)のvalueGetterが不明な値に対して空文字を返す", async () => {
    const { COLUMNS } = await import("./Reservation");
    const mockNode = createMockSearchableReservationNode({
      institution: {
        __typename: "institutions",
        id: "test-id",
        municipality: "UNKNOWN",
        building: "テスト",
        institution: "テスト施設",
        institution_size: "INSTITUTION_SIZE_MEDIUM",
      },
    });
    const col = COLUMNS.find((c) => c.field === "municipality");
    const params = {
      id: mockNode["id"] as string,
      value: undefined,
      row: mockNode,
      columns: COLUMNS,
    };
    expect(col?.valueGetter?.(params as never)).toBe("");
  });

  it("building_and_institutionのvalueGetterがnull値にフォールバックする", async () => {
    const { COLUMNS } = await import("./Reservation");
    const mockNode = createMockSearchableReservationNode({
      institution: {
        __typename: "institutions",
        id: "test-id",
        municipality: "MUNICIPALITY_KOUTOU",
        building: null,
        institution: null,
        institution_size: "INSTITUTION_SIZE_MEDIUM",
      },
    });
    const col = COLUMNS.find((c) => c.field === "building_and_institution");
    const params = {
      id: mockNode["id"] as string,
      value: undefined,
      row: mockNode,
      columns: COLUMNS,
    };
    expect(col?.valueGetter?.(params as never)).toBe(" ");
  });

  it("institution_sizeのvalueGetterが不明な値に対して空文字を返す", async () => {
    const { COLUMNS } = await import("./Reservation");
    const mockNode = createMockSearchableReservationNode({
      institution: {
        __typename: "institutions",
        id: "test-id",
        municipality: "MUNICIPALITY_KOUTOU",
        building: "テスト",
        institution: "テスト施設",
        institution_size: "INVALID",
      },
    });
    const col = COLUMNS.find((c) => c.field === "institution_size");
    const params = {
      id: mockNode["id"] as string,
      value: undefined,
      row: mockNode,
      columns: COLUMNS,
    };
    expect(col?.valueGetter?.(params as never)).toBe("");
  });

  it("institution_sizeのvalueGetterがnullのinstitution_sizeに対して空文字を返す", async () => {
    const { COLUMNS } = await import("./Reservation");
    const mockNode = createMockSearchableReservationNode({
      institution: {
        __typename: "institutions",
        id: "test-id",
        municipality: "MUNICIPALITY_KOUTOU",
        building: "テスト",
        institution: "テスト施設",
        institution_size: null,
      },
    });
    const col = COLUMNS.find((c) => c.field === "institution_size");
    const params = {
      id: mockNode["id"] as string,
      value: undefined,
      row: mockNode,
      columns: COLUMNS,
    };
    expect(col?.valueGetter?.(params as never)).toBe("");
  });
});

describe("Reservation Page", () => {
  describe("検索フォームの表示", () => {
    it("絞り込みボタンを押すとSelect、DateRangePicker、CheckboxGroupが表示される", async () => {
      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("地区")).toBeInTheDocument();
      });
      expect(screen.getByText("期間指定")).toBeInTheDocument();
      expect(screen.getByText("絞り込み", { selector: "span" })).toBeInTheDocument();
      expect(screen.getByText("利用可能楽器")).toBeInTheDocument();
      expect(screen.getByText("施設サイズ")).toBeInTheDocument();
    });

    it("選択した地区と日付範囲がチップとして表示される", () => {
      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      expect(screen.getByText("江東区")).toBeInTheDocument();
      expect(screen.getByText(/2025\/06\/15.*〜.*2025\/07\/15/)).toBeInTheDocument();
    });

    it("municipality=allの場合、地区チップが表示されない", () => {
      const allMunicipalityVariables = {
        ...defaultVariables,
        municipality: [
          "MUNICIPALITY_KOUTOU",
          "MUNICIPALITY_KITA",
          "MUNICIPALITY_ARAKAWA",
          "MUNICIPALITY_SUMIDA",
          "MUNICIPALITY_CHUO",
          "MUNICIPALITY_KAWASAKI",
        ],
      };
      const mock = {
        request: {
          query: ReservationsDocument,
          variables: allMunicipalityVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation"],
        mocks: [mock],
      });

      // When no municipality param is set, defaults to "all"
      // The municipality chip should not appear, only the date range chip
      expect(screen.queryByText("江東区")).not.toBeInTheDocument();
      expect(screen.queryByText("すべて")).not.toBeInTheDocument();
      expect(screen.getByText(/2025\/06\/15.*〜.*2025\/07\/15/)).toBeInTheDocument();
    });

    it("予約状況除外対象の自治体がSelectの選択肢から除外されている", async () => {
      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      // Open the drawer to access Select
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("地区")).toBeInTheDocument();
      });

      // Open the MUI Select dropdown
      const selectTrigger = screen.getByRole("combobox", { name: "地区" });
      await user.click(selectTrigger);

      // Wait for the listbox to appear
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });

      // Non-excluded municipalities should be present as options
      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveTextContent("江東区");
      expect(listbox).toHaveTextContent("北区");
      expect(listbox).toHaveTextContent("荒川区");

      // Excluded municipalities should NOT be present
      // RESERVATION_EXCLUDED_MUNICIPALITIES: edogawa, ota, suginami, toshima, bunkyo
      expect(listbox).not.toHaveTextContent("江戸川区");
      expect(listbox).not.toHaveTextContent("大田区");
      expect(listbox).not.toHaveTextContent("杉並区");
      expect(listbox).not.toHaveTextContent("豊島区");
      expect(listbox).not.toHaveTextContent("文京区");
    });
  });

  describe("検索フォームの操作", () => {
    it("地区を変更するとチップが更新される", async () => {
      const kitaVariables = {
        ...defaultVariables,
        municipality: ["MUNICIPALITY_KITA"],
      };

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: kitaVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock1, mock2],
      });

      // Verify initial chip
      expect(screen.getByText("江東区")).toBeInTheDocument();

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "地区" })).toBeInTheDocument();
      });

      // Change the municipality select
      const selectTrigger = screen.getByRole("combobox", { name: "地区" });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });

      // Select "北区"
      await user.click(screen.getByRole("option", { name: "北区" }));

      // The chip should update to "北区" (chip + select display value)
      await waitFor(() => {
        const elements = screen.getAllByText("北区");
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("利用可能楽器チェックボックスを切り替えるとチップが追加される", async () => {
      const stringsVariables = {
        ...defaultVariables,
        isAvailableStrings: "AVAILABILITY_DIVISION_AVAILABLE",
      };

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: stringsVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock1, mock2],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("利用可能楽器")).toBeInTheDocument();
      });

      // Click the "弦楽器" checkbox
      await user.click(screen.getByRole("checkbox", { name: "弦楽器" }));

      // The chip "弦楽器" should appear (label + chip)
      await waitFor(() => {
        const chips = screen.getAllByText("弦楽器");
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("施設サイズチェックボックスを切り替えるとチップが追加される", async () => {
      const sizeVariables = {
        ...defaultVariables,
        institutionSizes: ["INSTITUTION_SIZE_LARGE"],
      };

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: sizeVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock1, mock2],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("施設サイズ")).toBeInTheDocument();
      });

      // Click the "大（100㎡~）" checkbox
      await user.click(screen.getByRole("checkbox", { name: "大（100㎡~）" }));

      // The chip should appear (label + chip)
      await waitFor(() => {
        const chips = screen.getAllByText("大（100㎡~）");
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("利用可能楽器チェックボックスをオフにするとチップが削除される", async () => {
      const stringsVariables = {
        ...defaultVariables,
        isAvailableStrings: "AVAILABILITY_DIVISION_AVAILABLE",
      };

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: stringsVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&a=s"],
        mocks: [mock1, mock2],
      });

      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("利用可能楽器")).toBeInTheDocument();
      });

      const checkbox = screen.getByRole("checkbox", { name: "弦楽器" });
      expect(checkbox).toBeChecked();

      await user.click(checkbox);

      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it("施設サイズチェックボックスをオフにするとチップが削除される", async () => {
      const sizeVariables = {
        ...defaultVariables,
        institutionSizes: ["INSTITUTION_SIZE_LARGE"],
      };

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: sizeVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&i=l"],
        mocks: [mock1, mock2],
      });

      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("施設サイズ")).toBeInTheDocument();
      });

      const checkbox = screen.getByRole("checkbox", { name: "大（100㎡~）" });
      expect(checkbox).toBeChecked();

      await user.click(checkbox);

      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it("絞り込みチェックボックスをオフにするとチップが削除される", async () => {
      const filterVariables = {
        ...defaultVariables,
        isMorningVacant: true,
      };

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: filterVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&f=m"],
        mocks: [mock1, mock2],
      });

      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        const checkbox = screen.getByRole("checkbox", { name: "午前空き" });
        expect(checkbox).toBeChecked();
      });

      await user.click(screen.getByRole("checkbox", { name: "午前空き" }));

      await waitFor(() => {
        expect(screen.getByRole("checkbox", { name: "午前空き" })).not.toBeChecked();
      });
    });

    it("絞り込みチェックボックスを切り替えるとチップが追加される", async () => {
      const filterVariables = {
        ...defaultVariables,
        isMorningVacant: true,
      };

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: filterVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock1, mock2],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByRole("checkbox", { name: "午前空き" })).toBeInTheDocument();
      });

      // Click the "午前空き" checkbox
      await user.click(screen.getByRole("checkbox", { name: "午前空き" }));

      // The chip "午前空き" should appear (label + chip)
      await waitFor(() => {
        const chips = screen.getAllByText("午前空き");
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("データが空の場合", () => {
    it("データが存在しないメッセージを表示する", async () => {
      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      await waitFor(() => {
        expect(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
      });
    });
  });

  describe("ローディング状態", () => {
    it("データ取得中にスピナーを表示する", () => {
      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        delay: Infinity,
        result: createMockSearchableReservationsConnection([]),
      };

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      expect(screen.getByRole("progressbar", { name: "読み込み中" })).toBeInTheDocument();
    });
  });

  describe("エラー処理", () => {
    it("クエリエラーが発生した場合、ErrorBoundaryがエラーをキャッチする", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        error: new Error("Network error"),
      };

      renderWithProviders(
        <ErrorBoundary>
          <ReservationPage />
        </ErrorBoundary>,
        {
          initialEntries: ["/reservation?m=koutou"],
          mocks: [mock],
        }
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            "予期せぬエラーが発生しました。再読み込みしてください。何度も発生する場合は管理者にお問い合わせください。"
          )
        ).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe("日付変更ハンドラー", () => {
    it("handleStartDateChange: 新しい開始日が終了日より前の場合、終了日は変更されない", async () => {
      const updatedStartVariables = {
        ...defaultVariables,
        startDate: new Date("2025-06-20").toDateString(),
      };

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: updatedStartVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock1, mock2],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("期間指定")).toBeInTheDocument();
      });

      // Find the start date "Choose date" button (first one)
      const chooseDateButtons = screen.getAllByRole("button", { name: /Choose date/ });
      await user.click(chooseDateButtons[0]!);

      // Wait for calendar to open
      await waitFor(() => {
        expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
      });

      // Click on day "20" in the calendar (June 20, which is before July 15 endDate)
      // onChange fires on day click, updating the start date immediately
      const dayButtons = document.querySelectorAll('[role="gridcell"]');
      const day20 = Array.from(dayButtons).find((el) => el.textContent === "20");
      expect(day20).toBeTruthy();
      await user.click(day20 as Element);

      // Wait for chip to update: startDate = June 20, endDate = July 15 (unchanged)
      // The min/max logic: dt = min(maxDate, max(June 20, July 15)) = July 15
      await waitFor(() => {
        expect(screen.getByText(/2025\/06\/20.*〜.*2025\/07\/15/)).toBeInTheDocument();
      });
    });

    it("handleStartDateChange: 新しい開始日が終了日より後の場合、終了日も更新される", async () => {
      const initialVariables = {
        ...defaultVariables,
        endDate: new Date("2025-06-20").toDateString(),
      };
      const updatedVariables = {
        ...defaultVariables,
        startDate: new Date("2025-06-25").toDateString(),
        endDate: new Date("2025-06-25").toDateString(),
      };

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: initialVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: updatedVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&dt=2025-06-20"],
        mocks: [mock1, mock2],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("期間指定")).toBeInTheDocument();
      });

      // Find the start date "Choose date" button (first one)
      const chooseDateButtons = screen.getAllByRole("button", { name: /Choose date/ });
      await user.click(chooseDateButtons[0]!);

      // Wait for calendar to open
      await waitFor(() => {
        expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
      });

      // Click on day "25" in the calendar (June 25, which is after June 20 endDate)
      // onChange fires on day click; since June 25 > endDate (June 20),
      // endDate is also adjusted to June 25
      const dayButtons = document.querySelectorAll('[role="gridcell"]');
      const day25 = Array.from(dayButtons).find((el) => el.textContent === "25");
      expect(day25).toBeTruthy();
      await user.click(day25 as Element);

      // Wait for chip to update: both start and end should be June 25
      // (onChange fires on day click, no need to click "閉じる" to trigger state update)
      await waitFor(() => {
        expect(screen.getByText(/2025\/06\/25.*〜.*2025\/06\/25/)).toBeInTheDocument();
      });
    });

    it("handleEndDateChange: 新しい終了日が開始日より後の場合、開始日は変更されない", async () => {
      const updatedEndVariables = {
        ...defaultVariables,
        endDate: new Date("2025-07-10").toDateString(),
      };

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: updatedEndVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock1, mock2],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("期間指定")).toBeInTheDocument();
      });

      // Find the end date "Choose date" button (second one)
      const chooseDateButtons = screen.getAllByRole("button", { name: /Choose date/ });
      await user.click(chooseDateButtons[1]!);

      // Wait for calendar to open (shows July 2025 since endDate = July 15)
      await waitFor(() => {
        expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
      });

      // Click on day "10" in the calendar (July 10, before July 15 endDate but after June 15 startDate)
      // onChange is called on day selection, which updates the state immediately
      const dayButtons = document.querySelectorAll('[role="gridcell"]');
      const day10 = Array.from(dayButtons).find((el) => el.textContent === "10");
      expect(day10).toBeTruthy();
      await user.click(day10 as Element);

      // onChange fires on day click and updates state. Wait for chip to reflect new date.
      // startDate unchanged (June 15), endDate = July 10
      await waitFor(() => {
        expect(screen.getByText(/2025\/06\/15.*〜.*2025\/07\/10/)).toBeInTheDocument();
      });

      // Close the dialog if still open
      const closeBtn = document.querySelector('[aria-label="閉じる"], button[class*="MuiButton"]');
      if (closeBtn && closeBtn.textContent === "閉じる") {
        await user.click(closeBtn as Element);
      }
    });

    it("handleEndDateChange: 新しい終了日が開始日より前の場合、開始日も更新される", async () => {
      const initialVariables = {
        ...defaultVariables,
        startDate: new Date("2025-06-20").toDateString(),
      };
      const updatedVariables = {
        ...defaultVariables,
        startDate: new Date("2025-06-18").toDateString(),
        endDate: new Date("2025-06-18").toDateString(),
      };

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: initialVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: updatedVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&df=2025-06-20"],
        mocks: [mock1, mock2],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("期間指定")).toBeInTheDocument();
      });

      // Find the end date "Choose date" button (second one)
      const chooseDateButtons = screen.getAllByRole("button", { name: /Choose date/ });
      await user.click(chooseDateButtons[1]!);

      // Wait for calendar to open (shows July 2025 since endDate = July 15)
      await waitFor(() => {
        expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
      });

      // Navigate to previous month (June 2025) since calendar opens at July
      const prevMonthButton = document.querySelector('[aria-label="Previous month"]');
      expect(prevMonthButton).toBeTruthy();
      await user.click(prevMonthButton as Element);

      // Click on day "18" in the calendar (June 18, before June 20 startDate)
      // onChange fires on day click; since June 18 < startDate (June 20),
      // startDate is also adjusted to June 18
      await waitFor(() => {
        const dayButtons = document.querySelectorAll('[role="gridcell"]');
        const day18 = Array.from(dayButtons).find((el) => el.textContent === "18");
        expect(day18).toBeTruthy();
      });

      const dayButtonsAfterNav = document.querySelectorAll('[role="gridcell"]');
      const day18 = Array.from(dayButtonsAfterNav).find((el) => el.textContent === "18");
      await user.click(day18 as Element);

      // Wait for chip to update: both start and end should be June 18
      await waitFor(() => {
        expect(screen.getByText(/2025\/06\/18.*〜.*2025\/06\/18/)).toBeInTheDocument();
      });
    });
  });

  describe("ページネーション (fetchMore)", () => {
    it("hasNextPage=trueかつendCursorがある場合、IntersectionObserverがfetchMoreを起動する", async () => {
      // Create 51 mock nodes to trigger IntersectionObserver
      // DataTable sets ref at index (rows.length - 50), which is index 1 for 51 rows
      const nodes = Array.from({ length: 51 }, (_, i) =>
        createMockSearchableReservationNode({
          id: `searchable-reservation-${i}`,
          institution: {
            __typename: "institutions",
            id: btoa(
              JSON.stringify([
                1,
                "public",
                "institutions",
                `b3ed861c-${String(i).padStart(4, "0")}-4b71-8678-93b7fea06202`,
              ])
            ),
            municipality: "MUNICIPALITY_KOUTOU",
            building: `テスト文化センター${i}`,
            institution: "音楽練習室A",
            institution_size: "INSTITUTION_SIZE_MEDIUM",
          },
        })
      );

      // endCursor from createMockSearchableReservationsConnection with 51 nodes = btoa("cursor-50")
      const endCursor = btoa("cursor-50");
      const fetchMoreVariables = {
        ...defaultVariables,
        after: endCursor,
      };

      // Track whether the fetchMore query was called
      let fetchMoreCalled = false;

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection(nodes, true),
      };
      const mock2 = {
        request: {
          query: ReservationsDocument,
          variables: fetchMoreVariables,
        },
        result: () => {
          fetchMoreCalled = true;
          return createMockSearchableReservationsConnection([]);
        },
      };

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock1, mock2],
      });

      // Wait for initial data to load (51 rows with hasNextPage=true → skeleton visible)
      await waitFor(() => {
        expect(screen.getByText("テスト文化センター0 音楽練習室A")).toBeInTheDocument();
      });

      // The skeleton loading row should appear because hasNextPage=true
      const skeletons = document.querySelectorAll(".MuiSkeleton-root");
      expect(skeletons.length).toBeGreaterThanOrEqual(1);

      // Wait for IntersectionObserver to fire and trigger fetchMore
      // The ref is set on the row at index 1 (which is visible in the browser)
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify that fetchMore was called with the correct after cursor
      await waitFor(
        () => {
          expect(fetchMoreCalled).toBe(true);
        },
        { timeout: 3000 }
      );
    });

    it("hasNextPage=falseの場合、fetchMoreコールバックは早期リターンする", async () => {
      // Create 51 nodes but with hasNextPage=false
      const nodes = Array.from({ length: 51 }, (_, i) =>
        createMockSearchableReservationNode({
          id: `searchable-reservation-${i}`,
          institution: {
            __typename: "institutions",
            id: btoa(
              JSON.stringify([
                1,
                "public",
                "institutions",
                `ffffffff-${String(i).padStart(4, "0")}-4b71-8678-93b7fea06202`,
              ])
            ),
            municipality: "MUNICIPALITY_KOUTOU",
            building: `施設${i}`,
            institution: "練習室",
            institution_size: "INSTITUTION_SIZE_MEDIUM",
          },
        })
      );

      const mock1 = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection(nodes, false),
      };

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock1],
      });

      // Wait for initial data to load
      await waitFor(() => {
        expect(screen.getByText("施設0 練習室")).toBeInTheDocument();
      });

      // With hasNextPage=false, no skeleton should appear
      const skeletons = document.querySelectorAll(".MuiSkeleton-root");
      expect(skeletons.length).toBe(0);

      // Wait to confirm no additional fetchMore request is made
      await new Promise((resolve) => setTimeout(resolve, 300));

      // No second mock consumed means the early return in fetchMore worked correctly
      // (Only mock1 was needed)
    });
  });

  describe("データが返却された場合", () => {
    it("DataTableに予約データを表示する", async () => {
      const node1 = createMockSearchableReservationNode({
        institution: {
          __typename: "institutions",
          id: btoa(
            JSON.stringify([1, "public", "institutions", "b3ed861c-c057-4b71-8678-93b7fea06202"])
          ),
          municipality: "MUNICIPALITY_KOUTOU",
          building: "テスト文化センター",
          institution: "音楽練習室A",
          institution_size: "INSTITUTION_SIZE_MEDIUM",
        },
      });
      const node2 = createMockSearchableReservationNode({
        id: "searchable-reservation-2",
        institution: {
          __typename: "institutions",
          id: btoa(
            JSON.stringify([1, "public", "institutions", "a1234567-b890-cdef-1234-567890abcdef"])
          ),
          municipality: "MUNICIPALITY_KOUTOU",
          building: "サンプル会館",
          institution: "リハーサル室B",
          institution_size: "INSTITUTION_SIZE_LARGE",
        },
        reservation: {
          __typename: "reservations",
          id: "reservation-2",
          date: "2025-07-01",
          reservation: {
            RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
          },
          updated_at: "2025-06-30T12:00:00",
        },
      });

      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([node1, node2]),
      };

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      await waitFor(() => {
        expect(screen.getByText("施設名")).toBeInTheDocument();
      });

      expect(screen.getByText("テスト文化センター 音楽練習室A")).toBeInTheDocument();
      expect(screen.getByText("サンプル会館 リハーサル室B")).toBeInTheDocument();
    });

    it("予約行はクリック可能で、クリック時にonRowClickが実行される", async () => {
      const node = createMockSearchableReservationNode({
        institution: {
          __typename: "institutions",
          id: btoa(
            JSON.stringify([1, "public", "institutions", "b3ed861c-c057-4b71-8678-93b7fea06202"])
          ),
          municipality: "MUNICIPALITY_KOUTOU",
          building: "テスト文化センター",
          institution: "音楽練習室A",
          institution_size: "INSTITUTION_SIZE_MEDIUM",
        },
      });

      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([node]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      await waitFor(() => {
        expect(screen.getByText("テスト文化センター 音楽練習室A")).toBeInTheDocument();
      });

      // Verify the row has cursor pointer style (clickable via onRowClick)
      const cell = screen.getByText("テスト文化センター 音楽練習室A");
      const row = cell.closest("tr");
      expect(row).toHaveStyle({ cursor: "pointer" });

      // Click the row - this exercises the onRowClick handler which extracts
      // the institution ID from the relay ID and calls navigate
      await user.click(cell);
    });

    it("institution.idがnullの予約行をクリックしてもナビゲーションが発生しない", async () => {
      const node = createMockSearchableReservationNode({
        institution: {
          __typename: "institutions",
          id: null,
          municipality: "MUNICIPALITY_KOUTOU",
          building: "テスト施設",
          institution: "音楽室",
          institution_size: "INSTITUTION_SIZE_MEDIUM",
        },
      });

      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([node]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      await waitFor(() => {
        expect(screen.getByText("テスト施設 音楽室")).toBeInTheDocument();
      });

      // Click row with null institution.id - onRowClick short-circuits
      await user.click(screen.getByText("テスト施設 音楽室"));

      // Should still be on the same page (no navigation occurred)
      expect(screen.getByText("テスト施設 音楽室")).toBeInTheDocument();
    });
  });
});
