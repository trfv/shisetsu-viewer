import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "./Table";

describe("Table components", () => {
  it("テーブルが正しくレンダリングされる", () => {
    renderWithProviders(
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

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("ヘッダー")).toBeInTheDocument();
    expect(screen.getByText("データ")).toBeInTheDocument();
  });
});
