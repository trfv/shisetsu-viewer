import { describe, it, expect } from "vitest";
import { renderWithProviders, screen, waitFor } from "../utils/test-utils";
import { AuthGuard } from "../../components/utils/AuthGuard";
import Detail from "../../pages/Detail";
import { InstitutionDetailDocument } from "../../api/gql/graphql";
import {
  createMockInstitutionDetailNode,
  createMockInstitutionDetailConnection,
} from "../mocks/data";

const VALID_UUID = "b3ed861c-c057-4b71-8678-93b7fea06202";

describe("Authentication Flow", () => {
  describe("AuthGuard", () => {
    it("匿名ユーザーの場合、保護されたコンテンツを表示しない", () => {
      renderWithProviders(<AuthGuard Component={<div>Protected Content</div>} />, {
        auth0Config: {
          isLoading: false,
          userInfo: { anonymous: true, trial: false },
        },
      });

      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("認証済みユーザーの場合、保護されたコンテンツを表示する", () => {
      renderWithProviders(<AuthGuard Component={<div>Protected Content</div>} />, {
        auth0Config: {
          isLoading: false,
          userInfo: { anonymous: false, trial: false },
        },
      });

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  describe("Detail page - reservation tab access", () => {
    const mockDetailNode = createMockInstitutionDetailNode();
    const mockDetailResponse = createMockInstitutionDetailConnection(mockDetailNode);

    const detailMock = {
      request: {
        query: InstitutionDetailDocument,
        variables: { id: VALID_UUID },
      },
      result: mockDetailResponse,
    };

    it("匿名ユーザーの場合、予約状況タブが無効になる", async () => {
      renderWithProviders(<Detail />, {
        route: "/institution/:id",
        initialEntries: [`/institution/${VALID_UUID}`],
        mocks: [detailMock],
        auth0Config: {
          isLoading: false,
          userInfo: { anonymous: true, trial: false },
        },
      });

      await waitFor(() => {
        const reservationTab = screen.getByRole("tab", { name: "予約状況" });
        expect(reservationTab).toHaveClass("Mui-disabled");
      });
    });

    it("トライアルユーザーの場合、予約状況タブが無効になる", async () => {
      renderWithProviders(<Detail />, {
        route: "/institution/:id",
        initialEntries: [`/institution/${VALID_UUID}`],
        mocks: [detailMock],
        auth0Config: {
          isLoading: false,
          userInfo: { anonymous: false, trial: true },
        },
      });

      await waitFor(() => {
        const reservationTab = screen.getByRole("tab", { name: "予約状況" });
        expect(reservationTab).toHaveClass("Mui-disabled");
      });
    });
  });
});
