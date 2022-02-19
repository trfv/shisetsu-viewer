import ReactMarkdown from "react-markdown";
import { CONTAINER_WIDTH } from "../constants/styles";
import { styled } from "../utils/theme";

export default () => {
  return (
    <StyledTop className={classes.pageBox}>
      <div className={classes.contentBox}>
        <ReactMarkdown>{CONTENT}</ReactMarkdown>
      </div>
      <div className={classes.copyright}>Copyright © 2021 trfv All Rights Reserved.</div>
    </StyledTop>
  );
};

const PREFIX = "Top";
const classes = {
  pageBox: `${PREFIX}-pageBox`,
  contentBox: `${PREFIX}-contentBox`,
  copyright: `${PREFIX}-copyright`,
};

const StyledTop = styled("main")(({ theme }) => ({
  [`&.${classes.pageBox}`]: {
    width: "100%",
  },
  [`.${classes.contentBox}`]: {
    marginInline: "auto",
    padding: theme.spacing(3),
    maxWidth: CONTAINER_WIDTH,
  },
  [`.${classes.copyright}`]: {
    padding: theme.spacing(3, 0),
    width: "100%",
    textAlign: "center",
  },
  a: {
    color: theme.palette.text.primary,
    textDecoration: "none",
    borderBottom: `1px solid transparent`,
    ":hover": {
      borderBottom: `1px solid ${theme.palette.text.primary}`,
    },
  },
}));

// README.md
const CONTENT = `
## はじめに

- このサイトは音楽練習が可能な公共施設の予約状況・施設情報を閲覧するためのものです。

## 機能の説明

### [予約状況検索機能](/reservation)

- 公共施設の予約状況を予約システムから取得し、加工して表示しています。

### [施設情報検索機能](/institution)

- 公共施設の施設情報をウェブサイトから取得し、加工して表示しています。

## 対応地区

- 荒川区
- 江戸川区
- 大田区
- 北区
- 江東区
- 杉並区
- 墨田区
- 豊島区
- 中央区
- 文京区

## 備考

- 予約状況検索機能については、管理人の許可制としております。管理人までご連絡ください。
- 表示されている情報に関し、当サイトはいかなる責任も負いません。
- PC 環境での利用を推奨しております。
`;
