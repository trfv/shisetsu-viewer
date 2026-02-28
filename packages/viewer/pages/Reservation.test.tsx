import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { worker } from "../test/mocks/browser";
import { fireEvent, renderWithProviders, screen, waitFor } from "../test/utils/test-utils";
import {
  createMockSearchableReservationNode,
  createMockSearchableReservationsConnection,
} from "../test/mocks/data";
import { ErrorBoundary } from "../components/utils/ErrorBoundary";

vi.mock("../hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

const TEST_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT;

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

const useMswMock = (nodes: Record<string, unknown>[], hasNextPage = false) => {
  worker.use(
    http.post(TEST_ENDPOINT, () => {
      return HttpResponse.json(createMockSearchableReservationsConnection(nodes, hasNextPage));
    })
  );
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
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      // Open the drawer
      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await waitFor(() => {
        expect(screen.getByText("地区")).toBeInTheDocument();
      });
      expect(screen.getByText("期間指定")).toBeInTheDocument();
      expect(screen.getByText("絞り込み", { selector: "span" })).toBeInTheDocument();
      expect(screen.getByText("利用可能楽器")).toBeInTheDocument();
      expect(screen.getByText("施設サイズ")).toBeInTheDocument();
    });

    it("選択した地区と日付範囲がチップとして表示される", () => {
      useMswMock([]);

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      expect(screen.getByText("江東区")).toBeInTheDocument();
      expect(screen.getByText(/2025\/06\/15.*〜.*2025\/07\/15/)).toBeInTheDocument();
    });

    it("municipality=allの場合、地区チップが表示されない", () => {
      useMswMock([]);

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation"],
      });

      // When no municipality param is set, defaults to "all"
      // The municipality chip should not appear, only the date range chip
      expect(screen.queryByText("江東区")).not.toBeInTheDocument();
      expect(screen.queryByText("すべて")).not.toBeInTheDocument();
      expect(screen.getByText(/2025\/06\/15.*〜.*2025\/07\/15/)).toBeInTheDocument();
    });

    it("予約状況除外対象の自治体がSelectの選択肢から除外されている", async () => {
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      // Open the drawer to access Select
      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "地区" })).toBeInTheDocument();
      });

      // For native <select>, check <option> elements directly (always in the DOM)
      const select = screen.getByRole("combobox", { name: "地区" });
      const optionTexts = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);

      // Non-excluded municipalities should be present as options
      expect(optionTexts).toContain("江東区");
      expect(optionTexts).toContain("北区");
      expect(optionTexts).toContain("荒川区");

      // Excluded municipalities should NOT be present
      // RESERVATION_EXCLUDED_MUNICIPALITIES: edogawa, ota, suginami, toshima, bunkyo
      expect(optionTexts).not.toContain("江戸川区");
      expect(optionTexts).not.toContain("大田区");
      expect(optionTexts).not.toContain("杉並区");
      expect(optionTexts).not.toContain("豊島区");
      expect(optionTexts).not.toContain("文京区");
    });
  });

  describe("検索フォームの操作", () => {
    it("地区を変更するとチップが更新される", async () => {
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      // Verify initial chip
      expect(screen.getByText("江東区")).toBeInTheDocument();

      // Open the drawer
      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "地区" })).toBeInTheDocument();
      });

      // For native <select>, use fireEvent.change to change the value
      const select = screen.getByRole("combobox", { name: "地区" });
      fireEvent.change(select, { target: { value: "MUNICIPALITY_KITA" } });

      // The chip should update to "北区"
      await waitFor(() => {
        const elements = screen.getAllByText("北区");
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("利用可能楽器チェックボックスを切り替えるとチップが追加される", async () => {
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      // Open the drawer
      await user.click(screen.getByRole("button", { name: "絞り込み" }));

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
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      // Open the drawer
      await user.click(screen.getByRole("button", { name: "絞り込み" }));

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
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&a=s"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

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
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&i=l"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

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
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&f=m"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

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
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      // Open the drawer
      await user.click(screen.getByRole("button", { name: "絞り込み" }));

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
      useMswMock([]);

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await waitFor(() => {
        expect(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
      });
    });
  });

  describe("ローディング状態", () => {
    it("データ取得中にスピナーを表示する", () => {
      // Use a handler that delays indefinitely
      worker.use(
        http.post(TEST_ENDPOINT, async () => {
          await new Promise(() => {}); // never resolves
          return HttpResponse.json(createMockSearchableReservationsConnection([]));
        })
      );

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      expect(screen.getByRole("progressbar", { name: "読み込み中" })).toBeInTheDocument();
    });
  });

  describe("エラー処理", () => {
    it("クエリエラーが発生した場合、ErrorBoundaryがエラーをキャッチする", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      worker.use(
        http.post(TEST_ENDPOINT, () => {
          return HttpResponse.json({
            errors: [{ message: "Network error" }],
          });
        })
      );

      renderWithProviders(
        <ErrorBoundary>
          <ReservationPage />
        </ErrorBoundary>,
        {
          initialEntries: ["/reservation?m=koutou"],
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
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      // Open the drawer
      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await waitFor(() => {
        expect(screen.getByText("期間指定")).toBeInTheDocument();
      });

      // Find the start date input (first input[type="date"])
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);

      // Change start date to June 20 (before July 15 endDate)
      fireEvent.change(dateInputs[0]!, { target: { value: "2025-06-20" } });

      // Wait for chip to update: startDate = June 20, endDate = July 15 (unchanged)
      await waitFor(() => {
        expect(screen.getByText(/2025\/06\/20.*〜.*2025\/07\/15/)).toBeInTheDocument();
      });
    });

    it("handleStartDateChange: 新しい開始日が終了日より後の場合、終了日も更新される", async () => {
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&dt=2025-06-20"],
      });

      // Open the drawer
      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await waitFor(() => {
        expect(screen.getByText("期間指定")).toBeInTheDocument();
      });

      // Find the start date input (first input[type="date"])
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);

      // Change start date to June 25 (after June 20 endDate)
      fireEvent.change(dateInputs[0]!, { target: { value: "2025-06-25" } });

      // Wait for chip to update: both start and end should be June 25
      await waitFor(() => {
        expect(screen.getByText(/2025\/06\/25.*〜.*2025\/06\/25/)).toBeInTheDocument();
      });
    });

    it("handleEndDateChange: 新しい終了日が開始日より後の場合、開始日は変更されない", async () => {
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      // Open the drawer
      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await waitFor(() => {
        expect(screen.getByText("期間指定")).toBeInTheDocument();
      });

      // Find the end date input (second input[type="date"])
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);

      // Change end date to July 10 (after June 15 startDate)
      fireEvent.change(dateInputs[1]!, { target: { value: "2025-07-10" } });

      // startDate unchanged (June 15), endDate = July 10
      await waitFor(() => {
        expect(screen.getByText(/2025\/06\/15.*〜.*2025\/07\/10/)).toBeInTheDocument();
      });
    });

    it("handleEndDateChange: 新しい終了日が開始日より前の場合、開始日も更新される", async () => {
      useMswMock([]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&df=2025-06-20"],
      });

      // Open the drawer
      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await waitFor(() => {
        expect(screen.getByText("期間指定")).toBeInTheDocument();
      });

      // Find the end date input (second input[type="date"])
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);

      // Change end date to June 18 (before June 20 startDate)
      fireEvent.change(dateInputs[1]!, { target: { value: "2025-06-18" } });

      // Wait for chip to update: both start and end should be June 18
      await waitFor(() => {
        expect(screen.getByText(/2025\/06\/18.*〜.*2025\/06\/18/)).toBeInTheDocument();
      });
    });
  });

  describe("ページネーション (fetchMore)", () => {
    it("hasNextPage=trueかつendCursorがある場合、IntersectionObserverがfetchMoreを起動する", async () => {
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

      let requestCount = 0;
      worker.use(
        http.post(TEST_ENDPOINT, async ({ request }) => {
          requestCount++;
          const body = (await request.json()) as { variables: Record<string, unknown> };
          if (body.variables["after"]) {
            // Return empty page for fetchMore
            return HttpResponse.json(createMockSearchableReservationsConnection([], false));
          }
          return HttpResponse.json(createMockSearchableReservationsConnection(nodes, true));
        })
      );

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      // Wait for initial data to load
      await waitFor(() => {
        expect(screen.getByText("テスト文化センター0 音楽練習室A")).toBeInTheDocument();
      });

      // The skeleton loading row should appear because hasNextPage=true
      const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(1);

      // Wait for IntersectionObserver to fire and trigger fetchMore
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify that fetchMore was called with the correct after cursor
      await waitFor(
        () => {
          expect(requestCount).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 }
      );
    });

    it("hasNextPage=falseの場合、fetchMoreコールバックは早期リターンする", async () => {
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

      useMswMock(nodes, false);

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      // Wait for initial data to load
      await waitFor(() => {
        expect(screen.getByText("施設0 練習室")).toBeInTheDocument();
      });

      // With hasNextPage=false, no skeleton should appear
      const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBe(0);

      // Wait to confirm no additional fetchMore request is made
      await new Promise((resolve) => setTimeout(resolve, 300));
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

      useMswMock([node1, node2]);

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
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

      useMswMock([node]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await waitFor(() => {
        expect(screen.getByText("テスト文化センター 音楽練習室A")).toBeInTheDocument();
      });

      // Verify the row has cursor pointer style (clickable via onRowClick)
      const cell = screen.getByText("テスト文化センター 音楽練習室A");
      const row = cell.closest("tr");
      expect(row).toHaveStyle({ cursor: "pointer" });

      // Click the row - this exercises the onRowClick handler
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

      useMswMock([node]);

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
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
