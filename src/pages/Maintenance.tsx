import { NEW_SITE_URL } from "../constants/env";

export const Maintenance = () => {
  return (
    <div
      style={{
        width: "100vw",
        height: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <a href={NEW_SITE_URL} target="_blank" rel="noreferrer">
        こちらに移行しました。
      </a>
    </div>
  );
};
