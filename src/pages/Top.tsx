import { CONTAINER_WIDTH } from "../constants/styles";
import { styled } from "../utils/theme";

export default () => {
  return (
    <StyledTop className={classes.pageBox}>
      <div className={classes.contentBox}>
        <h2 id="はじめに">はじめに</h2>
        <ul>
          <li>
            このサイトは音楽練習が可能な公共施設の予約状況・施設情報を閲覧するためのものです。
          </li>
        </ul>
        <h2 id="機能の説明">機能の説明</h2>
        <h3 id="予約状況検索機能">予約状況検索機能</h3>
        <ul>
          <li>公共施設の予約状況を予約システムから取得し、加工して表示しています。</li>
        </ul>
        <h3 id="施設情報検索機能">施設情報検索機能</h3>
        <ul>
          <li>公共施設の施設情報をウェブサイトから取得し、加工して表示しています。</li>
        </ul>
        <h2 id="対応地区">対応地区</h2>
        <ul>
          <li>荒川区</li>
          <li>江戸川区</li>
          <li>大田区</li>
          <li>北区</li>
          <li>江東区</li>
          <li>杉並区</li>
          <li>墨田区</li>
          <li>豊島区</li>
          <li>中央区</li>
          <li>文京区（※現在、予約状況が表示できません）</li>
          <li>川崎市</li>
        </ul>
        <h2 id="備考">備考</h2>
        <ul>
          <li>
            予約状況検索機能については、管理人の許可制としております。管理人までご連絡ください。
          </li>
          <li>表示されている情報に関し、当サイトはいかなる責任も負いません。</li>
          <li>PC 環境での利用を推奨しております。</li>
        </ul>
      </div>
      <div className={classes.copyright}>Copyright © 2022 trfv All Rights Reserved.</div>
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
