import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, waitFor } from "../test/utils/test-utils";
import { InstitutionsDocument } from "../api/gql/graphql";
import { createMockInstitutionNode, createMockInstitutionsConnection } from "../test/mocks/data";
import InstitutionPage from "./Institution";

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
  });
});
