import styles from "./Top.module.css";

export default () => {
  return (
    <main className={styles["pageBox"]}>
      <div className={styles["contentBox"]}>
        <h2 id="introduction">はじめに</h2>
        <ul>
          <li>
            このサイトは音楽練習が可能な公共施設の予約状況・施設情報を閲覧するためのものです。
          </li>
        </ul>
        <h2 id="features">機能の説明</h2>
        <h3 id="reservation-search">予約状況検索機能</h3>
        <ul>
          <li>公共施設の予約状況を予約システムから取得し、加工して表示しています。</li>
        </ul>
        <h3 id="institution-search">施設情報検索機能</h3>
        <ul>
          <li>公共施設の施設情報をウェブサイトから取得し、加工して表示しています。</li>
        </ul>
        <h2 id="supported-municipalities">対応地区</h2>
        <ul>
          <li>荒川区</li>
          <li>江戸川区（※現在、予約状況が表示できません）</li>
          <li>大田区（※現在、予約状況が表示できません）</li>
          <li>北区</li>
          <li>江東区</li>
          <li>杉並区（※現在、予約状況が表示できません）</li>
          <li>墨田区</li>
          <li>豊島区（※現在、予約状況が表示できません）</li>
          <li>中央区</li>
          <li>文京区（※現在、予約状況が表示できません）</li>
          <li>川崎市</li>
        </ul>
        <h2 id="notes">備考</h2>
        <ul>
          <li>
            予約状況検索機能については、管理人の許可制としております。管理人までご連絡ください。
          </li>
          <li>表示されている情報に関し、当サイトはいかなる責任も負いません。</li>
        </ul>
      </div>
      <div className={styles["copyright"]}>
        Copyright © {new Date().getFullYear()} trfv All Rights Reserved.
      </div>
    </main>
  );
};
