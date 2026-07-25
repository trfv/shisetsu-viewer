import type { InstitutionSummary } from "@shisetsu-viewer/shared";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { worker } from "../test/mocks/browser";
import { createMockInstitutionsPage, createMockInstitutionSummary } from "../test/mocks/data";
import { renderWithProviders, screen } from "../test/utils/test-utils";
import InstitutionPage, { COLUMNS } from "./Institution";

const BASE = import.meta.env.VITE_API_ENDPOINT;

vi.mock("../hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

const useMswMock = (items: InstitutionSummary[], hasNextPage = false) => {
  worker.use(
    http.get(`${BASE}/v1/institutions`, () =>
      HttpResponse.json(createMockInstitutionsPage(items, hasNextPage))
    )
  );
};

const paramsFor = (row: InstitutionSummary) => ({
  id: row.id,
  value: undefined,
  row,
  columns: COLUMNS,
});

describe("COLUMNS定義", () => {
  it("隠しカラム(municipality)のvalueGetterが正しい値を返す", () => {
    const row = createMockInstitutionSummary();
    const col = COLUMNS.find((c) => c.field === "municipality");
    expect(col?.valueGetter?.({ ...paramsFor(row), value: row.municipality } as never)).toBe(
      "江東区"
    );
  });

  it("隠しカラム(municipality)のvalueGetterが不明な値に対して空文字を返す", () => {
    const row = createMockInstitutionSummary({ municipality: "UNKNOWN" });
    const col = COLUMNS.find((c) => c.field === "municipality");
    expect(col?.valueGetter?.({ ...paramsFor(row), value: row.municipality } as never)).toBe("");
  });

  it("隠しカラム(is_equipped_music_stand)のvalueGetterが正しい値を返す", () => {
    const row = createMockInstitutionSummary();
    const col = COLUMNS.find((c) => c.field === "is_equipped_music_stand");
    expect(
      col?.valueGetter?.({ ...paramsFor(row), value: row.is_equipped_music_stand } as never)
    ).toBeTruthy();
  });

  it("隠しカラム(is_equipped_piano)のvalueGetterが正しい値を返す", () => {
    const row = createMockInstitutionSummary();
    const col = COLUMNS.find((c) => c.field === "is_equipped_piano");
    expect(
      col?.valueGetter?.({ ...paramsFor(row), value: row.is_equipped_piano } as never)
    ).toBeTruthy();
  });

  it.each([
    ["institution_size", { institution_size: "INVALID" }],
    ["is_available_strings", { is_available_strings: "INVALID" }],
    ["is_available_woodwind", { is_available_woodwind: "INVALID" }],
    ["is_available_brass", { is_available_brass: "INVALID" }],
    ["is_available_percussion", { is_available_percussion: "INVALID" }],
    ["is_equipped_music_stand", { is_equipped_music_stand: "INVALID" }],
    ["is_equipped_piano", { is_equipped_piano: "INVALID" }],
  ] as const)("%sのvalueGetterが不明な値に対して空文字を返す", (field, overrides) => {
    const row = createMockInstitutionSummary(overrides);
    const col = COLUMNS.find((c) => c.field === field);
    expect(
      col?.valueGetter?.({
        ...paramsFor(row),
        value: row[field as keyof InstitutionSummary],
      } as never)
    ).toBe("");
  });

  it("building_and_institutionのvalueGetterが空値にフォールバックする", () => {
    const row = createMockInstitutionSummary({ building: "", institution: "" });
    const col = COLUMNS.find((c) => c.field === "building_and_institution");
    expect(col?.valueGetter?.(paramsFor(row) as never)).toBe(" ");
  });
});

describe("Institution Page", () => {
  describe("検索フォームの表示", () => {
    it("絞り込みボタンを押すと地区のSelect、利用可能楽器、施設サイズが表示される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("地区")).toBeInTheDocument();
      await expect.element(screen.getByText("利用可能楽器")).toBeInTheDocument();
      await expect.element(screen.getByText("施設サイズ")).toBeInTheDocument();
    });

    it("選択した地区がチップとして表示される", async () => {
      useMswMock([]);

      await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await expect.element(screen.getByText("江東区")).toBeInTheDocument();
    });

    it("municipality=allの場合、地区チップが表示されない", async () => {
      useMswMock([]);

      await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution"],
      });

      await expect.element(screen.getByText("江東区")).not.toBeInTheDocument();
      await expect.element(screen.getByText("すべて")).not.toBeInTheDocument();
    });
  });

  describe("検索フォームの操作", () => {
    it("地区を変更するとチップが更新される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await expect.element(screen.getByText("江東区")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByRole("combobox", { name: "地区" })).toBeInTheDocument();

      const selectElement = screen.getByRole("combobox", { name: "地区" });
      await user.selectOptions(selectElement, "MUNICIPALITY_KITA");

      await vi.waitFor(() => {
        const elements = screen.getByText("北区").all();
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("利用可能楽器チェックボックスを切り替えるとチップが追加される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("利用可能楽器")).toBeInTheDocument();

      await user.click(screen.getByRole("checkbox", { name: "弦楽器" }));

      await vi.waitFor(() => {
        const chips = screen.getByText("弦楽器").all();
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("利用可能楽器チェックボックスをオフにするとチップが削除される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou&a=s"],
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

      const { user } = await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou&i=l"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("施設サイズ")).toBeInTheDocument();

      const checkbox = screen.getByRole("checkbox", { name: "大（100㎡~）" });
      await expect.element(checkbox).toBeChecked();

      await user.click(checkbox);

      await expect.element(checkbox).not.toBeChecked();
    });

    it("施設サイズチェックボックスを切り替えるとチップが追加される", async () => {
      useMswMock([]);

      const { user } = await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await user.click(screen.getByRole("button", { name: "絞り込み" }));

      await expect.element(screen.getByText("施設サイズ")).toBeInTheDocument();

      await user.click(screen.getByRole("checkbox", { name: "大（100㎡~）" }));

      await vi.waitFor(() => {
        const chips = screen.getByText("大（100㎡~）").all();
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("データが空の場合", () => {
    it("データが存在しないメッセージを表示する", async () => {
      useMswMock([]);

      await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await expect.element(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
    });
  });

  describe("ローディング状態", () => {
    it("データ取得中にスピナーを表示する", async () => {
      worker.use(
        http.get(`${BASE}/v1/institutions`, async () => {
          await new Promise(() => {}); // never resolves
          return HttpResponse.json(createMockInstitutionsPage([]));
        })
      );

      await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
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
          `${BASE}/v1/institutions`,
          () => new HttpResponse("Network error", { status: 500 })
        )
      );

      await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await expect.element(screen.getByRole("alert")).toBeInTheDocument();
      await expect.element(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  describe("データが返却された場合", () => {
    it("DataTableに施設データを表示する", async () => {
      const item1 = createMockInstitutionSummary({
        building: "テスト文化センター",
        institution: "音楽練習室A",
      });
      const item2 = createMockInstitutionSummary({
        id: "a1234567-b890-cdef-1234-567890abcdef",
        building: "サンプル会館",
        institution: "リハーサル室B",
      });

      useMswMock([item1, item2]);

      await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await expect.element(screen.getByText("施設名")).toBeInTheDocument();

      await expect.element(screen.getByText("テスト文化センター 音楽練習室A")).toBeInTheDocument();
      await expect.element(screen.getByText("サンプル会館 リハーサル室B")).toBeInTheDocument();
    });

    it("hasNextPageがtrueでendCursorが存在する場合、IntersectionObserver発火時にfetchMoreが呼ばれる", async () => {
      const items = Array.from({ length: 51 }, (_, i) =>
        createMockInstitutionSummary({
          id: `aaaaaaaa-bbbb-cccc-dddd-${String(i).padStart(12, "0")}`,
          building: `施設ビル${i}`,
          institution: `練習室${i}`,
        })
      );

      let requestCount = 0;
      worker.use(
        http.get(`${BASE}/v1/institutions`, ({ request }) => {
          requestCount++;
          const cursor = new URL(request.url).searchParams.get("cursor");
          if (cursor) {
            return HttpResponse.json(createMockInstitutionsPage([], false));
          }
          return HttpResponse.json(createMockInstitutionsPage(items, true));
        })
      );

      await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await expect.element(screen.getByText("施設ビル0 練習室0")).toBeInTheDocument();

      await vi.waitFor(
        () => {
          expect(requestCount).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 }
      );
    });

    it("施設行はクリック可能で、クリック時にonRowClickが実行される", async () => {
      const item = createMockInstitutionSummary({
        building: "テスト文化センター",
        institution: "音楽練習室A",
      });

      useMswMock([item]);

      const { user } = await renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await expect.element(screen.getByText("テスト文化センター 音楽練習室A")).toBeInTheDocument();

      const cell = screen.getByText("テスト文化センター 音楽練習室A");
      const row = cell.element().closest("tr");
      await expect.element(row).toHaveStyle({ cursor: "pointer" });

      await user.click(cell);
    });
  });
});
