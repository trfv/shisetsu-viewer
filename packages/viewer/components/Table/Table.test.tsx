import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "./Table";

describe("Table components", () => {
  it("テーブルが正しくレンダリングされる", async () => {
    await renderWithProviders(
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ヘッダー</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>データ</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );

    await expect.element(screen.getByRole("table")).toBeInTheDocument();
    await expect.element(screen.getByText("ヘッダー")).toBeInTheDocument();
    await expect.element(screen.getByText("データ")).toBeInTheDocument();
  });
});
