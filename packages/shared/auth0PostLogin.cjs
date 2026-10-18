// Auth0 の Post Login Action（Actions → Library）の原本。
// 管理画面のコードはこのファイルの写しである。変えるときはここを直してテストを通し、全文を貼り直して Deploy する。
// クレームの解釈側は auth.ts の readClaims。auth0PostLogin.test.ts が両者の往復を検証している。

const APP_CLAIMS = "https://app.shisetsudb.com/token/claims";
const HASURA_CLAIMS = "https://hasura.io/jwt/claims";

/**
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  // Action は refresh token の交換でも動く。初回判定と通知は本当のログインのときだけにする
  const isRefresh = event.transaction?.protocol === "oauth2-refresh-token";
  const isFirstLogin = !isRefresh && event.stats.logins_count === 1;

  if (isFirstLogin) {
    api.user.setAppMetadata("role", "user");
    api.user.setAppMetadata("trial", true);
  }

  // 初回ログインか、role が未設定なら Slack に通知して設定を促す
  if (!isRefresh && (isFirstLogin || !event.user.app_metadata?.role)) {
    const text = `please check ${event.user.given_name} ${event.user.family_name}'s user setting: https://manage.auth0.com/dashboard/jp/trfv/users`;
    try {
      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${event.secrets.TOKEN}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ channel: event.secrets.CHANNEL, text }),
      });
      // Slack は失敗しても 200 で { ok: false } を返す
      const body = await res.json();
      if (!body.ok) console.log("slack notification failed", body.error);
    } catch (e) {
      // 通知が失敗してもログインは止めない
      console.log("slack notification failed", e instanceof Error ? e.message : e);
    }
  }

  // setAppMetadata は同じ実行中の event.user に反映されないので、初回は値を直接決める
  const role = isFirstLogin ? "user" : event.user.app_metadata?.role || "anonymous";
  const trial = isFirstLogin ? true : event.user.app_metadata?.trial || false;

  // ID トークンは誰も読まない（ブラウザは BFF の Cookie しか持たない）ので、アクセストークンにだけ載せる
  api.accessToken.setCustomClaim(APP_CLAIMS, { role, trial });
  // 旧 Action が発行したアクセストークンが残るあいだの後方互換。それが切れたら外してよい
  api.accessToken.setCustomClaim(HASURA_CLAIMS, {
    "x-hasura-default-role": role,
    "x-hasura-allowed-roles": ["user", "anonymous"],
    "x-hasura-user-id": event.user.user_id,
  });
};
