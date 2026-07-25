import type { ReservationSearchHit } from "@shisetsu-viewer/shared";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { worker } from "../test/mocks/browser";
import {
  createMockReservationDto,
  createMockReservationSearchHit,
  createMockReservationSearchPage,
} from "../test/mocks/data";
import { renderWithProviders, screen } from "../test/utils/test-utils";
import ReservationPage, { COLUMNS } from "./Reservation";

vi.mock("../hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

const BASE = import.meta.env.VITE_API_ENDPOINT;

const FAKE_NOW = new Date("2025-06-15T12:00:00+09:00");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(FAKE_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const useMswMock = (items: ReservationSearchHit[], hasNextPage = false) => {
  worker.use(
    http.get(`${BASE}/v1/reservations/search`, () =>
      HttpResponse.json(createMockReservationSearchPage(items, hasNextPage))
    )
  );
};

const paramsFor = (hit: ReservationSearchHit) => ({
  id: "row-1",
  value: undefined,
  row: { id: "row-1", ...hit },
  columns: COLUMNS,
});

describe("COLUMNS定義", () => {
  it("隠しカラム(municipality)のvalueGetterが正しい値を返す", () => {
    const hit = createMockReservationSearchHit();
    const col = COLUMNS.find((c) => c.field === "municipality");
    expect(col?.valueGetter?.(paramsFor(hit) as never)).toBe("江東区");
  });

  it("隠しカラム(municipality)のvalueGetterが不明な値に対して空文字を返す", () => {
    const hit = createMockReservationSearchHit({
      institution: {
        id: "test-id",
        municipality: "UNKNOWN",
        building: "テスト",
        institution: "テスト施設",
        institution_size: "INSTITUTION_SIZE_MEDIUM",
      },
    });
    const col = COLUMNS.find((c) => c.field === "municipality");
    expect(col?.valueGetter?.(paramsFor(hit) as never)).toBe("");
  });

  it("building_and_institutionのvalueGetterが空値にフォールバックする", () => {
    const hit = createMockReservationSearchHit({
      institution: {
        id: "test-id",
        municipality: "MUNICIPALITY_KOUTOU",
        building: "",
        institution: "",
        institution_size: "INSTITUTION_SIZE_MEDIUM",
      },
    });
    const col = COLUMNS.find((c) => c.field === "building_and_institution");
    expect(col?.valueGetter?.(paramsFor(hit) as never)).toBe(" ");
  });

  it("institution_sizeのvalueGetterが不明な値に対して空文字を返す", () => {
    const hit = createMockReservationSearchHit({
      institution: {
        id: "test-id",
        municipality: "MUNICIPALITY_KOUTOU",
        building: "テスト",
        institution: "テスト施設",
        institution_size: "INVALID",
      },
    });
    const col = COLUMNS.find((c) => c.field === "institution_size");
    expect(col?.valueGetter?.(paramsFor(hit) as never)).toBe("");
  });
});

describe("Reservation Page", () => {
  describe("検索フォームの表示", () => {
    it("絞り込みボタンを押すとSelect、DateRangePicker、CheckboxGroupが表示される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("地区")).toBeInTheDocument();
      await expect.element(screen.getByText("期間指定")).toBeInTheDocument();
      await expect.element(screen.getByText("絞り込み", { exact: true })).toBeInTheDocument();
      await expect.element(screen.getByText("利用可能楽器")).toBeInTheDocument();
      await expect.element(screen.getByText("施設サイズ")).toBeInTheDocument();
    });

    it("選択した地区と日付範囲がチップとして表示される", async () => {
      useMswMock([]);

      await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await expect.element(screen.getByText("江東区")).toBeInTheDocument();
      await expect.element(screen.getByText(/2025\/06\/15.*〜.*2025\/07\/15/)).toBeInTheDocument();
    });

    it("municipality=allの場合、地区チップが表示されない", async () => {
      useMswMock([]);

      await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation"],
      });

      await expect.element(screen.getByText("江東区")).not.toBeInTheDocument();
      await expect.element(screen.getByText("すべて")).not.toBeInTheDocument();
      await expect.element(screen.getByText(/2025\/06\/15.*〜.*2025\/07\/15/)).toBeInTheDocument();
    });

    it("予約状況除外対象の自治体がSelectの選択肢から除外されている", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByRole("combobox", { name: "地区" })).toBeInTheDocument();

      const select = screen.getByRole("combobox", { name: "地区" });
      const optionTexts = Array.from(select.element().querySelectorAll("option")).map(
        (o) => o.textContent
      );

      expect(optionTexts).toContain("江東区");
      expect(optionTexts).toContain("北区");
      expect(optionTexts).toContain("荒川区");
      expect(optionTexts).toContain("江戸川区");

      expect(optionTexts).not.toContain("杉並区");
    });
  });

  describe("検索フォームの操作", () => {
    it("地区を変更するとチップが更新される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await expect.element(screen.getByText("江東区")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByRole("combobox", { name: "地区" })).toBeInTheDocument();

      const select = screen.getByRole("combobox", { name: "地区" });
      await user.selectOptions(select, "MUNICIPALITY_KITA");

      await vi.waitFor(() => {
        const elements = screen.getByText("北区").all();
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("利用可能楽器チェックボックスを切り替えるとチップが追加される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("利用可能楽器")).toBeInTheDocument();

      await user.click(screen.getByRole("checkbox", { name: "弦楽器" }));

      await vi.waitFor(() => {
        const chips = screen.getByText("弦楽器").all();
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("施設サイズチェックボックスを切り替えるとチップが追加される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("施設サイズ")).toBeInTheDocument();

      await user.click(screen.getByRole("checkbox", { name: "大（100㎡~）" }));

      await vi.waitFor(() => {
        const chips = screen.getByText("大（100㎡~）").all();
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("利用可能楽器チェックボックスをオフにするとチップが削除される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&a=s"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("利用可能楽器")).toBeInTheDocument();

      const checkbox = screen.getByRole("checkbox", { name: "弦楽器" });
      await expect.element(checkbox).toBeChecked();

      await user.click(checkbox);

      await expect.element(checkbox).not.toBeChecked();
    });

    it("施設サイズチェックボックスをオフにするとチップが削除される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&i=l"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("施設サイズ")).toBeInTheDocument();

      const checkbox = screen.getByRole("checkbox", { name: "大（100㎡~）" });
      await expect.element(checkbox).toBeChecked();

      await user.click(checkbox);

      await expect.element(checkbox).not.toBeChecked();
    });

    it("絞り込みチェックボックスをオフにするとチップが削除される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&f=m"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByRole("checkbox", { name: "午前空き" })).toBeChecked();

      await user.click(screen.getByRole("checkbox", { name: "午前空き" }));

      await expect.element(screen.getByRole("checkbox", { name: "午前空き" })).not.toBeChecked();
    });

    it("絞り込みチェックボックスを切り替えるとチップが追加される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByRole("checkbox", { name: "午前空き" })).toBeInTheDocument();

      await user.click(screen.getByRole("checkbox", { name: "午前空き" }));

      await vi.waitFor(() => {
        const chips = screen.getByText("午前空き").all();
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("データが空の場合", () => {
    it("データが存在しないメッセージを表示する", async () => {
      useMswMock([]);

      await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await expect.element(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
    });
  });

  describe("ローディング状態", () => {
    it("データ取得中にスピナーを表示する", async () => {
      worker.use(
        http.get(`${BASE}/v1/reservations/search`, async () => {
          await new Promise(() => {}); // never resolves
          return HttpResponse.json(createMockReservationSearchPage([]));
        })
      );

      await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await expect
        .element(screen.getByRole("progressbar", { name: "読み込み中" }))
        .toBeInTheDocument();
    });
  });

  describe("エラー処理", () => {
    it("クエリエラーが発生した場合、Snackbarでエラーを表示する", async () => {
      worker.use(
        http.get(
          `${BASE}/v1/reservations/search`,
          () => new HttpResponse("Network error", { status: 500 })
        )
      );

      await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await expect.element(screen.getByRole("alert")).toBeInTheDocument();
      await expect.element(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  describe("日付変更ハンドラー", () => {
    it("handleStartDateChange: 新しい開始日が終了日より前の場合、終了日は変更されない", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("期間指定")).toBeInTheDocument();

      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);

      await user.fill(dateInputs[0]!, "2025-06-20");

      await expect.element(screen.getByText(/2025\/06\/20.*〜.*2025\/07\/15/)).toBeInTheDocument();
    });

    it("handleStartDateChange: 新しい開始日が終了日より後の場合、終了日も更新される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&dt=2025-06-20"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("期間指定")).toBeInTheDocument();

      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);

      await user.fill(dateInputs[0]!, "2025-06-25");

      await expect.element(screen.getByText(/2025\/06\/25.*〜.*2025\/06\/25/)).toBeInTheDocument();
    });

    it("handleEndDateChange: 新しい終了日が開始日より後の場合、開始日は変更されない", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("期間指定")).toBeInTheDocument();

      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);

      await user.fill(dateInputs[1]!, "2025-07-10");

      await expect.element(screen.getByText(/2025\/06\/15.*〜.*2025\/07\/10/)).toBeInTheDocument();
    });

    it("handleEndDateChange: 新しい終了日が開始日より前の場合、開始日も更新される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou&df=2025-06-20"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("期間指定")).toBeInTheDocument();

      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);

      await user.fill(dateInputs[1]!, "2025-06-18");

      await expect.element(screen.getByText(/2025\/06\/18.*〜.*2025\/06\/18/)).toBeInTheDocument();
    });
  });

  describe("ページネーション (fetchMore)", () => {
    it("hasNextPage=trueかつendCursorがある場合、IntersectionObserverがfetchMoreを起動する", async () => {
      const items = Array.from({ length: 51 }, (_, i) =>
        createMockReservationSearchHit({
          institution: {
            id: `b3ed861c-${String(i).padStart(4, "0")}-4b71-8678-93b7fea06202`,
            municipality: "MUNICIPALITY_KOUTOU",
            building: `テスト文化センター${i}`,
            institution: "音楽練習室A",
            institution_size: "INSTITUTION_SIZE_MEDIUM",
          },
        })
      );

      let requestCount = 0;
      worker.use(
        http.get(`${BASE}/v1/reservations/search`, async ({ request }) => {
          requestCount++;
          const cursor = new URL(request.url).searchParams.get("cursor");
          if (cursor) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return HttpResponse.json(createMockReservationSearchPage([], false));
          }
          return HttpResponse.json(createMockReservationSearchPage(items, true));
        })
      );

      await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await expect.element(screen.getByText("テスト文化センター0 音楽練習室A")).toBeInTheDocument();

      await vi.waitFor(() => {
        expect(document.querySelectorAll('[data-testid="skeleton"]').length).toBeGreaterThanOrEqual(
          1
        );
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      await vi.waitFor(
        () => {
          expect(requestCount).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 }
      );
    });

    it("hasNextPage=falseの場合、fetchMoreコールバックは早期リターンする", async () => {
      const items = Array.from({ length: 51 }, (_, i) =>
        createMockReservationSearchHit({
          institution: {
            id: `ffffffff-${String(i).padStart(4, "0")}-4b71-8678-93b7fea06202`,
            municipality: "MUNICIPALITY_KOUTOU",
            building: `施設${i}`,
            institution: "練習室",
            institution_size: "INSTITUTION_SIZE_MEDIUM",
          },
        })
      );

      useMswMock(items, false);

      await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await expect.element(screen.getByText("施設0 練習室")).toBeInTheDocument();

      const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
      expect(skeletons.length).toBe(0);

      await new Promise((resolve) => setTimeout(resolve, 300));
    });
  });

  describe("データが返却された場合", () => {
    it("DataTableに予約データを表示する", async () => {
      const hit1 = createMockReservationSearchHit({
        institution: {
          id: "b3ed861c-c057-4b71-8678-93b7fea06202",
          municipality: "MUNICIPALITY_KOUTOU",
          building: "テスト文化センター",
          institution: "音楽練習室A",
          institution_size: "INSTITUTION_SIZE_MEDIUM",
        },
      });
      const hit2 = createMockReservationSearchHit({
        institution: {
          id: "a1234567-b890-cdef-1234-567890abcdef",
          municipality: "MUNICIPALITY_KOUTOU",
          building: "サンプル会館",
          institution: "リハーサル室B",
          institution_size: "INSTITUTION_SIZE_LARGE",
        },
        reservation: createMockReservationDto({
          date: "2025-07-01",
          reservation: { RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT" },
          updated_at: "2025-06-30T12:00:00",
        }),
      });

      useMswMock([hit1, hit2]);

      await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await expect.element(screen.getByText("施設名")).toBeInTheDocument();

      await expect.element(screen.getByText("テスト文化センター 音楽練習室A")).toBeInTheDocument();
      await expect.element(screen.getByText("サンプル会館 リハーサル室B")).toBeInTheDocument();
    });

    it("予約行はクリック可能で、クリック時にonRowClickが実行される", async () => {
      const hit = createMockReservationSearchHit({
        institution: {
          id: "b3ed861c-c057-4b71-8678-93b7fea06202",
          municipality: "MUNICIPALITY_KOUTOU",
          building: "テスト文化センター",
          institution: "音楽練習室A",
          institution_size: "INSTITUTION_SIZE_MEDIUM",
        },
      });

      useMswMock([hit]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await expect.element(screen.getByText("テスト文化センター 音楽練習室A")).toBeInTheDocument();

      const cell = screen.getByText("テスト文化センター 音楽練習室A");
      const row = cell.element().closest("tr");
      await expect.element(row!).toHaveStyle({ cursor: "pointer" });

      await user.click(cell);
    });

    it("institution.idが空の予約行をクリックしてもナビゲーションが発生しない", async () => {
      const hit = createMockReservationSearchHit({
        institution: {
          id: "",
          municipality: "MUNICIPALITY_KOUTOU",
          building: "テスト施設",
          institution: "音楽室",
          institution_size: "INSTITUTION_SIZE_MEDIUM",
        },
      });

      useMswMock([hit]);

      const { user } = await renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
      });

      await expect.element(screen.getByText("テスト施設 音楽室")).toBeInTheDocument();

      await user.click(screen.getByText("テスト施設 音楽室"));

      await expect.element(screen.getByText("テスト施設 音楽室")).toBeInTheDocument();
    });
  });
});
