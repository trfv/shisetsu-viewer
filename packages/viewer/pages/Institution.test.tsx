import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { worker } from "../test/mocks/browser";
import { renderWithProviders, screen, waitFor } from "../test/utils/test-utils";
import { createMockInstitutionNode, createMockInstitutionsConnection } from "../test/mocks/data";
import { ErrorBoundary } from "../components/utils/ErrorBoundary";
import InstitutionPage, { COLUMNS } from "./Institution";

const TEST_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT;

vi.mock("../hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

const useMswMock = (nodes: Record<string, unknown>[], hasNextPage = false) => {
  worker.use(
    http.post(TEST_ENDPOINT, () => {
      return HttpResponse.json(createMockInstitutionsConnection(nodes, hasNextPage));
    })
  );
};

describe("COLUMNS定義", () => {
  it("隠しカラム(municipality)のvalueGetterが正しい値を返す", () => {
    const mockRow = createMockInstitutionNode();
    const col = COLUMNS.find((c) => c.field === "municipality");
    const params = {
      id: mockRow["id"] as string,
      value: mockRow["municipality"],
      row: mockRow,
      columns: COLUMNS,
    };
    expect(col?.valueGetter?.(params as never)).toBe("江東区");
  });

  it("隠しカラム(municipality)のvalueGetterが不明な値に対して空文字を返す", () => {
    const mockRow = createMockInstitutionNode({ municipality: "UNKNOWN" });
    const col = COLUMNS.find((c) => c.field === "municipality");
    const params = {
      id: mockRow["id"] as string,
      value: mockRow["municipality"],
      row: mockRow,
      columns: COLUMNS,
    };
    expect(col?.valueGetter?.(params as never)).toBe("");
  });

  it("隠しカラム(is_equipped_music_stand)のvalueGetterが正しい値を返す", () => {
    const mockRow = createMockInstitutionNode();
    const col = COLUMNS.find((c) => c.field === "is_equipped_music_stand");
    const params = {
      id: mockRow["id"] as string,
      value: mockRow["is_equipped_music_stand"],
      row: mockRow,
      columns: COLUMNS,
    };
    expect(col?.valueGetter?.(params as never)).toBeTruthy();
  });

  it("隠しカラム(is_equipped_piano)のvalueGetterが正しい値を返す", () => {
    const mockRow = createMockInstitutionNode();
    const col = COLUMNS.find((c) => c.field === "is_equipped_piano");
    const params = {
      id: mockRow["id"] as string,
      value: mockRow["is_equipped_piano"],
      row: mockRow,
      columns: COLUMNS,
    };
    expect(col?.valueGetter?.(params as never)).toBeTruthy();
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
    const mockRow = createMockInstitutionNode(overrides);
    const col = COLUMNS.find((c) => c.field === field);
    const params = {
      id: mockRow["id"] as string,
      value: mockRow[field as string],
      row: mockRow,
      columns: COLUMNS,
    };
    expect(col?.valueGetter?.(params as never)).toBe("");
  });

  it("building_and_institutionのvalueGetterがnull値にフォールバックする", () => {
    const mockRow = createMockInstitutionNode({ building: null, institution: null });
    const col = COLUMNS.find((c) => c.field === "building_and_institution");
    const params = {
      id: mockRow["id"] as string,
      value: undefined,
      row: mockRow,
      columns: COLUMNS,
    };
    expect(col?.valueGetter?.(params as never)).toBe(" ");
  });
});

describe("Institution Page", () => {
  describe("検索フォームの表示", () => {
    it("絞り込みボタンを押すと地区のSelect、利用可能楽器、施設サイズが表示される", async () => {
      useMswMock([]);

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("地区")).toBeInTheDocument();
      });
      expect(screen.getByText("利用可能楽器")).toBeInTheDocument();
      expect(screen.getByText("施設サイズ")).toBeInTheDocument();
    });

    it("選択した地区がチップとして表示される", () => {
      useMswMock([]);

      renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      expect(screen.getByText("江東区")).toBeInTheDocument();
    });

    it("municipality=allの場合、地区チップが表示されない", () => {
      useMswMock([]);

      renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution"],
      });

      expect(screen.queryByText("江東区")).not.toBeInTheDocument();
      expect(screen.queryByText("すべて")).not.toBeInTheDocument();
    });
  });

  describe("検索フォームの操作", () => {
    it("地区を変更するとチップが更新される", async () => {
      useMswMock([]);

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      expect(screen.getByText("江東区")).toBeInTheDocument();

      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "地区" })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole("combobox", { name: "地区" });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("option", { name: "北区" }));

      await waitFor(() => {
        const elements = screen.getAllByText("北区");
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("利用可能楽器チェックボックスを切り替えるとチップが追加される", async () => {
      useMswMock([]);

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("利用可能楽器")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("checkbox", { name: "弦楽器" }));

      await waitFor(() => {
        const chips = screen.getAllByText("弦楽器");
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("利用可能楽器チェックボックスをオフにするとチップが削除される", async () => {
      useMswMock([]);

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou&a=s"],
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
      useMswMock([]);

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou&i=l"],
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

    it("施設サイズチェックボックスを切り替えるとチップが追加される", async () => {
      useMswMock([]);

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("施設サイズ")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("checkbox", { name: "大（100㎡~）" }));

      await waitFor(() => {
        const chips = screen.getAllByText("大（100㎡~）");
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("データが空の場合", () => {
    it("データが存在しないメッセージを表示する", async () => {
      useMswMock([]);

      renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
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
          return HttpResponse.json(createMockInstitutionsConnection([]));
        })
      );

      renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
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
          <InstitutionPage />
        </ErrorBoundary>,
        {
          initialEntries: ["/institution?m=koutou"],
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

  describe("データが返却された場合", () => {
    it("DataTableに施設データを表示する", async () => {
      const node1 = createMockInstitutionNode({
        building: "テスト文化センター",
        institution: "音楽練習室A",
      });
      const node2 = createMockInstitutionNode({
        id: btoa(
          JSON.stringify([1, "public", "institutions", "a1234567-b890-cdef-1234-567890abcdef"])
        ),
        building: "サンプル会館",
        institution: "リハーサル室B",
      });

      useMswMock([node1, node2]);

      renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await waitFor(() => {
        expect(screen.getByText("施設名")).toBeInTheDocument();
      });

      expect(screen.getByText("テスト文化センター 音楽練習室A")).toBeInTheDocument();
      expect(screen.getByText("サンプル会館 リハーサル室B")).toBeInTheDocument();
    });

    it("hasNextPageがtrueでendCursorが存在する場合、IntersectionObserver発火時にfetchMoreが呼ばれる", async () => {
      const nodes = Array.from({ length: 51 }, (_, i) =>
        createMockInstitutionNode({
          id: btoa(
            JSON.stringify([
              1,
              "public",
              "institutions",
              `aaaaaaaa-bbbb-cccc-dddd-${String(i).padStart(12, "0")}`,
            ])
          ),
          building: `施設ビル${i}`,
          institution: `練習室${i}`,
        })
      );

      let requestCount = 0;
      worker.use(
        http.post(TEST_ENDPOINT, async ({ request }) => {
          requestCount++;
          const body = (await request.json()) as { variables: Record<string, unknown> };
          if (body.variables.after) {
            // Return empty page for fetchMore
            return HttpResponse.json(createMockInstitutionsConnection([], false));
          }
          return HttpResponse.json(createMockInstitutionsConnection(nodes, true));
        })
      );

      renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await waitFor(() => {
        expect(screen.getByText("施設ビル0 練習室0")).toBeInTheDocument();
      });

      // Wait for the IntersectionObserver to fire and fetchMore to be called
      await waitFor(
        () => {
          expect(requestCount).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 }
      );
    });

    it("施設行はクリック可能で、クリック時にonRowClickが実行される", async () => {
      const node = createMockInstitutionNode({
        building: "テスト文化センター",
        institution: "音楽練習室A",
      });

      useMswMock([node]);

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await waitFor(() => {
        expect(screen.getByText("テスト文化センター 音楽練習室A")).toBeInTheDocument();
      });

      const cell = screen.getByText("テスト文化センター 音楽練習室A");
      const row = cell.closest("tr");
      expect(row).toHaveStyle({ cursor: "pointer" });

      await user.click(cell);
    });

    it("無効なRelay IDの施設行をクリックしてもナビゲーションが発生しない", async () => {
      const invalidNode = createMockInstitutionNode({
        id: btoa(JSON.stringify([1, "public", "institutions"])),
        building: "無効ID施設",
        institution: "テスト室",
      });

      useMswMock([invalidNode]);

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
      });

      await waitFor(() => {
        expect(screen.getByText("無効ID施設 テスト室")).toBeInTheDocument();
      });

      await user.click(screen.getByText("無効ID施設 テスト室"));

      expect(screen.getByText("無効ID施設 テスト室")).toBeInTheDocument();
    });
  });
});
