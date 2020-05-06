import Box from "@material-ui/core/Box";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import Select from "@material-ui/core/Select";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Skeleton from "@material-ui/lab/Skeleton";
import React, { FC, useEffect, useMemo, useState } from "react";
import { TokyoWard, TokyoWardMap } from "../../constants/enums";
import { formatPrice } from "../../utils/format";
import NoResult from "../templates/NoResult";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const runtimeEnv = require("@mars/heroku-js-runtime-env");
const ENDPOINT_URL = runtimeEnv().REACT_APP_SHISETSU_APPS_SCRIPT_ENDPOINT;

type Institition = {
  building?: string;
  institution?: string;
  capaciry?: string;
  area?: string;
  reservation_division?: string;
  weekday_usage_fee?: string;
  holiday_usage_fee?: string;
  address?: string;
  is_available_strings?: string;
  is_available_woodwind?: string;
  is_available_brass?: string;
  is_available_percussion?: string;
  is_equipped_music_stand?: string;
  is_equipped_piano?: string;
  website_url?: string;
  layout_image_url?: string;
  note?: string;
};

const formatUsageFee = (val: string): string => {
  const [key, value] = val.split("=");
  return `${key}: ${formatPrice(value)}`;
};

const Search: FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);
  const [data, setData] = useState<Institition[] | null>(null);
  const [tokyoWard, setTokyoWard] = useState<TokyoWard>(TokyoWard.KOUTOU);
  const handleTokyoWardChange = (event: React.ChangeEvent<{ value: unknown }>): void => {
    setTokyoWard(event.target.value as TokyoWard);
  };

  useEffect(() => {
    const fn = async (): Promise<void> => {
      setLoading(true);
      try {
        const url = new URL(ENDPOINT_URL);
        url.searchParams.append("tokyoWard", tokyoWard);
        const response = await fetch(url.toString());
        setData((await response.json()) as Institition[]);
      } catch (e) {
        const error = e.message ? e : { message: String(e) };
        console.error(`failed to fetch institutions: ${error.message}`);
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    fn();
    return (): void => setData(null);
  }, [tokyoWard]);

  const renderSearchForm = useMemo(() => {
    return (
      <Box p="16px">
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl>
              <InputLabel>区</InputLabel>
              <Select value={tokyoWard} onChange={handleTokyoWardChange}>
                {TokyoWardMap.filter((option) => !option.value.includes("INVALID")).map(
                  (option, index) => (
                    <MenuItem key={index} value={option.value}>
                      {option.label}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
    );
  }, [tokyoWard]);

  const renderSearchResult = useMemo(() => {
    if (error) {
      return <Box>{error.message}</Box>;
    }
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell variant="head">施設名</TableCell>
              <TableCell variant="head">部屋名</TableCell>
              <TableCell variant="head" align="right">
                定員
              </TableCell>
              <TableCell variant="head" align="right">
                面積
              </TableCell>
              <TableCell variant="head">利用料金</TableCell>
              <TableCell variant="head">住所</TableCell>
              <TableCell variant="head">使用可能楽器</TableCell>
              <TableCell variant="head">譜面台</TableCell>
              <TableCell variant="head">ピアノ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <>
                {[...Array(10)].map((_, index) => (
                  <TableRow key={`row-${index}`}>
                    {[...Array(9)].map((_, i) => (
                      <TableCell key={`cell-${i}`} variant="body">
                        <Skeleton variant="text" height="80px" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : (
              <>
                {data && data.length > 0 ? (
                  <>
                    {data.map((info, index) => (
                      <TableRow key={index}>
                        <TableCell variant="body">{info.building}</TableCell>
                        <TableCell variant="body">{info.institution}</TableCell>
                        <TableCell variant="body" align="right">
                          {`${info.capaciry}人`}
                        </TableCell>
                        <TableCell variant="body" align="right">
                          {`${info.area}m²`}
                        </TableCell>
                        <TableCell variant="body">
                          <p>
                            {`平日 ${info.weekday_usage_fee
                              ?.split(",")
                              .map(formatUsageFee)
                              .join(" ")}`}
                          </p>
                          <p>
                            {`休日 ${info.holiday_usage_fee
                              ?.split(",")
                              .map(formatUsageFee)
                              .join(" ")}`}
                          </p>
                        </TableCell>
                        <TableCell variant="body">{info.address}</TableCell>
                        <TableCell variant="body">
                          {[
                            ...(info.is_available_strings === "true" ? ["弦楽器"] : []),
                            ...(info.is_available_woodwind === "true" ? ["木管楽器"] : []),
                            ...(info.is_available_brass === "true" ? ["金管楽器"] : []),
                            ...(info.is_available_percussion === "true" ? ["打楽器"] : []),
                          ].join(" ")}
                        </TableCell>
                        <TableCell variant="body">
                          {info.is_equipped_music_stand === "true" ? "あり" : "なし"}
                        </TableCell>
                        <TableCell variant="body">
                          {info.is_equipped_piano === "true" ? "あり" : "なし"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <NoResult />
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [loading, error, data]);

  return (
    <Box p="16px">
      {renderSearchForm}
      {renderSearchResult}
    </Box>
  );
};

export default Search;
