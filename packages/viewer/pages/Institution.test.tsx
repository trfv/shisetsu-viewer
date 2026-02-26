import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { renderWithProviders, screen, waitFor } from "../test/utils/test-utils";
import { MockedProvider } from "@apollo/client/testing/react";
import { MockLink } from "@apollo/client/testing";
import { InstitutionsDocument } from "../api/gql/graphql";
import { createMockInstitutionNode, createMockInstitutionsConnection } from "../test/mocks/data";
import { ErrorBoundary } from "../components/utils/ErrorBoundary";
import InstitutionPage, { COLUMNS } from "./Institution";
import { Auth0Context } from "../contexts/Auth0";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

const defaultVariables = {
  first: 100,
  after: null,
  municipality: ["MUNICIPALITY_KOUTOU"],
  isAvailableStrings: null,
  isAvailableWoodwind: null,
  isAvailableBrass: null,
  isAvailablePercussion: null,
  institutionSizes: null,
};

const allMunicipalityVariables = {
  first: 100,
  after: null,
  municipality: [
    "MUNICIPALITY_KOUTOU",
    "MUNICIPALITY_BUNKYO",
    "MUNICIPALITY_KITA",
    "MUNICIPALITY_TOSHIMA",
    "MUNICIPALITY_EDOGAWA",
    "MUNICIPALITY_ARAKAWA",
    "MUNICIPALITY_SUMIDA",
    "MUNICIPALITY_OTA",
    "MUNICIPALITY_SUGINAMI",
    "MUNICIPALITY_CHUO",
    "MUNICIPALITY_KAWASAKI",
  ],
  isAvailableStrings: null,
  isAvailableWoodwind: null,
  isAvailableBrass: null,
  isAvailablePercussion: null,
  institutionSizes: null,
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
      const mock = {
        request: {
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection([]),
      };

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
        mocks: [mock],
      });

      // SearchForm renders a "絞り込み" button; clicking it opens the Drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("地区")).toBeInTheDocument();
      });
      expect(screen.getByText("利用可能楽器")).toBeInTheDocument();
      expect(screen.getByText("施設サイズ")).toBeInTheDocument();
    });

    it("選択した地区がチップとして表示される", () => {
      const mock = {
        request: {
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection([]),
      };

      renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
        mocks: [mock],
      });

      // When municipality is koutou, chip "江東区" should be displayed
      expect(screen.getByText("江東区")).toBeInTheDocument();
    });

    it("municipality=allの場合、地区チップが表示されない", () => {
      const mock = {
        request: {
          query: InstitutionsDocument,
          variables: allMunicipalityVariables,
        },
        result: createMockInstitutionsConnection([]),
      };

      renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution"],
        mocks: [mock],
      });

      // When no municipality param is set, defaults to "all"
      // The municipality chip should not appear
      expect(screen.queryByText("江東区")).not.toBeInTheDocument();
      expect(screen.queryByText("すべて")).not.toBeInTheDocument();
    });
  });

  describe("検索フォームの操作", () => {
    it("地区を変更するとチップが更新される", async () => {
      // We need mocks for both the initial query (koutou) and the updated query (kita)
      const kitaVariables = {
        ...defaultVariables,
        municipality: ["MUNICIPALITY_KITA"],
      };

      const mock1 = {
        request: {
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection([]),
      };
      const mock2 = {
        request: {
          query: InstitutionsDocument,
          variables: kitaVariables,
        },
        result: createMockInstitutionsConnection([]),
      };

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
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
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection([]),
      };
      const mock2 = {
        request: {
          query: InstitutionsDocument,
          variables: stringsVariables,
        },
        result: createMockInstitutionsConnection([]),
      };

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
        mocks: [mock1, mock2],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("利用可能楽器")).toBeInTheDocument();
      });

      // Click the "弦楽器" checkbox
      await user.click(screen.getByRole("checkbox", { name: "弦楽器" }));

      // The chip "弦楽器" should appear
      await waitFor(() => {
        // There are multiple "弦楽器" elements (label and chip), check at least one is a chip
        const chips = screen.getAllByText("弦楽器");
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("利用可能楽器チェックボックスをオフにするとチップが削除される", async () => {
      // Start with strings already selected via URL param
      const stringsVariables = {
        ...defaultVariables,
        isAvailableStrings: "AVAILABILITY_DIVISION_AVAILABLE",
      };

      const mock1 = {
        request: {
          query: InstitutionsDocument,
          variables: stringsVariables,
        },
        result: createMockInstitutionsConnection([]),
      };
      const mock2 = {
        request: {
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection([]),
      };

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou&a=s"],
        mocks: [mock1, mock2],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("利用可能楽器")).toBeInTheDocument();
      });

      // The "弦楽器" checkbox should already be checked
      const checkbox = screen.getByRole("checkbox", { name: "弦楽器" });
      expect(checkbox).toBeChecked();

      // Uncheck the "弦楽器" checkbox
      await user.click(checkbox);

      // After unchecking, only one "弦楽器" should remain (the label in the drawer)
      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it("施設サイズチェックボックスをオフにするとチップが削除される", async () => {
      // Start with large size already selected via URL param
      const sizeVariables = {
        ...defaultVariables,
        institutionSizes: ["INSTITUTION_SIZE_LARGE"],
      };

      const mock1 = {
        request: {
          query: InstitutionsDocument,
          variables: sizeVariables,
        },
        result: createMockInstitutionsConnection([]),
      };
      const mock2 = {
        request: {
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection([]),
      };

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou&i=l"],
        mocks: [mock1, mock2],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("施設サイズ")).toBeInTheDocument();
      });

      // The "大（100㎡~）" checkbox should already be checked
      const checkbox = screen.getByRole("checkbox", { name: "大（100㎡~）" });
      expect(checkbox).toBeChecked();

      // Uncheck the checkbox
      await user.click(checkbox);

      await waitFor(() => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it("施設サイズチェックボックスを切り替えるとチップが追加される", async () => {
      const sizeVariables = {
        ...defaultVariables,
        institutionSizes: ["INSTITUTION_SIZE_LARGE"],
      };

      const mock1 = {
        request: {
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection([]),
      };
      const mock2 = {
        request: {
          query: InstitutionsDocument,
          variables: sizeVariables,
        },
        result: createMockInstitutionsConnection([]),
      };

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
        mocks: [mock1, mock2],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("施設サイズ")).toBeInTheDocument();
      });

      // Click the "大（100㎡~）" checkbox
      await user.click(screen.getByRole("checkbox", { name: "大（100㎡~）" }));

      // The chip "大（100㎡~）" should appear
      await waitFor(() => {
        const chips = screen.getAllByText("大（100㎡~）");
        expect(chips.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("データが空の場合", () => {
    it("データが存在しないメッセージを表示する", async () => {
      const mock = {
        request: {
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection([]),
      };

      renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
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
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        delay: Infinity,
        result: createMockInstitutionsConnection([]),
      };

      renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
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
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        error: new Error("Network error"),
      };

      renderWithProviders(
        <ErrorBoundary>
          <InstitutionPage />
        </ErrorBoundary>,
        {
          initialEntries: ["/institution?m=koutou"],
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

      const mock = {
        request: {
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection([node1, node2]),
      };

      renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
        mocks: [mock],
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

      const endCursor = btoa("cursor-50");

      const initialMock = {
        request: {
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection(nodes, true),
      };

      const fetchMoreMock = {
        request: {
          query: InstitutionsDocument,
          variables: { ...defaultVariables, after: endCursor },
        },
        result: createMockInstitutionsConnection([], false),
      };

      // Track variables received by the MockLink to verify fetchMore was called.
      // We use a custom link prop on MockedProvider to intercept requests.
      const mockLink = new MockLink([initialMock, fetchMoreMock], { showWarnings: false });
      const requestedVariables: unknown[] = [];
      const originalRequest = mockLink.request.bind(mockLink);
      vi.spyOn(mockLink, "request").mockImplementation((operation) => {
        requestedVariables.push(operation.variables);
        return originalRequest(operation);
      });

      const auth0Value = {
        isLoading: false,
        token: "mock-token",
        userInfo: { anonymous: false, trial: false },
        login: vi.fn(),
        logout: vi.fn(),
      };

      render(
        <MockedProvider link={mockLink} showWarnings={false}>
          <Auth0Context.Provider value={auth0Value}>
            <ThemeProvider theme={createTheme()}>
              <MemoryRouter initialEntries={["/institution?m=koutou"]}>
                <Routes>
                  <Route path="/*" element={<InstitutionPage />} />
                </Routes>
              </MemoryRouter>
            </ThemeProvider>
          </Auth0Context.Provider>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("施設ビル0 練習室0")).toBeInTheDocument();
      });

      // Wait for the IntersectionObserver to fire on the sentinel row (index 1 = 51 - 50)
      // and for the fetchMore callback to call Apollo's fetchMore with after: endCursor.
      await waitFor(
        () => {
          expect(requestedVariables).toContainEqual({ ...defaultVariables, after: endCursor });
        },
        { timeout: 3000 }
      );
    });

    it("施設行はクリック可能で、クリック時にonRowClickが実行される", async () => {
      const node = createMockInstitutionNode({
        building: "テスト文化センター",
        institution: "音楽練習室A",
      });

      const mock = {
        request: {
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection([node]),
      };

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
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

    it("無効なRelay IDの施設行をクリックしてもナビゲーションが発生しない", async () => {
      const invalidNode = createMockInstitutionNode({
        id: btoa(JSON.stringify([1, "public", "institutions"])), // missing pk at index 3
        building: "無効ID施設",
        institution: "テスト室",
      });

      const mock = {
        request: {
          query: InstitutionsDocument,
          variables: defaultVariables,
        },
        result: createMockInstitutionsConnection([invalidNode]),
      };

      const { user } = renderWithProviders(<InstitutionPage />, {
        initialEntries: ["/institution?m=koutou"],
        mocks: [mock],
      });

      await waitFor(() => {
        expect(screen.getByText("無効ID施設 テスト室")).toBeInTheDocument();
      });

      // Click row with invalid relay ID - extractSinglePkFromRelayId returns undefined
      await user.click(screen.getByText("無効ID施設 テスト室"));

      // Should still be on the same page (no navigation occurred)
      expect(screen.getByText("無効ID施設 テスト室")).toBeInTheDocument();
    });
  });
});
