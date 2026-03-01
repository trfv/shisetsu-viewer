import { useCallback, useState } from "react";
import { graphqlQuery } from "../../api/graphqlClient";
import {
  CREATE_API_TOKEN_MUTATION,
  DELETE_API_TOKEN_MUTATION,
  LIST_API_TOKENS_QUERY,
  type ApiTokenNode,
  type CreateApiTokenMutationData,
  type DeleteApiTokenMutationData,
  type ListApiTokensQueryData,
} from "../../api/queries";
import { useAuth0 } from "../../contexts/Auth0";
import { useGraphQLQuery } from "../../hooks/useGraphQLQuery";
import { extractSinglePkFromRelayId } from "../../utils/relay";
import styles from "./ApiTokenManager.module.css";

async function sha256(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export const ApiTokenManager = () => {
  const { token } = useAuth0();
  const { data, refetch } = useGraphQLQuery<ListApiTokensQueryData>(LIST_API_TOKENS_QUERY, {});
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !token) return;
    setCreating(true);
    setError(null);
    try {
      const plainToken = crypto.randomUUID();
      const tokenHash = await sha256(plainToken);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await graphqlQuery<CreateApiTokenMutationData>(
        CREATE_API_TOKEN_MUTATION,
        { name: name.trim(), tokenHash, expiresAt },
        token
      );
      setNewToken(plainToken);
      setName("");
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "トークンの作成に失敗しました");
    } finally {
      setCreating(false);
    }
  }, [name, token, refetch]);

  const handleDelete = useCallback(
    async (relayId: string) => {
      if (!token) return;
      const id = extractSinglePkFromRelayId(relayId);
      await graphqlQuery<DeleteApiTokenMutationData>(DELETE_API_TOKEN_MUTATION, { id }, token);
      refetch();
    },
    [token, refetch]
  );

  const handleCopy = useCallback(async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [newToken]);

  const handleCloseDialog = useCallback(() => {
    setNewToken(null);
    setCopied(false);
  }, []);

  const tokens: ApiTokenNode[] = data?.api_tokens_connection?.edges.map((e) => e.node) ?? [];

  return (
    <div className={styles["container"]}>
      <form
        className={styles["createForm"]}
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
      >
        <input
          className={styles["nameInput"]}
          disabled={creating}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          placeholder="トークン名 (例: Claude Desktop)"
          type="text"
          value={name}
        />
        <button
          className={styles["createButton"]}
          disabled={creating || !name.trim()}
          type="submit"
        >
          {creating ? "作成中..." : "新規発行（有効期限: 30日）"}
        </button>
      </form>

      {error && <p className={styles["errorMessage"]}>{error}</p>}

      <div className={styles["tokenList"]}>
        {tokens.length === 0 && (
          <p className={styles["emptyMessage"]}>API トークンはまだありません。</p>
        )}
        {tokens.map((t) => (
          <div className={styles["tokenItem"]} key={t.id}>
            <div className={styles["tokenInfo"]}>
              <span className={styles["tokenName"]}>{t.name}</span>
              <span className={styles["tokenMeta"]}>
                作成日: {formatDate(t.created_at)}
                {t.last_used_at ? ` ・ 最終使用: ${formatDate(t.last_used_at)}` : ""}
                {t.expires_at ? ` ・ 有効期限: ${formatDate(t.expires_at)}` : ""}
              </span>
            </div>
            <button
              className={styles["deleteButton"]}
              onClick={() => handleDelete(t.id)}
              type="button"
            >
              削除
            </button>
          </div>
        ))}
      </div>

      {newToken && (
        <div className={styles["newTokenDialog"]} onClick={handleCloseDialog}>
          <div className={styles["dialogContent"]} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles["dialogTitle"]}>APIトークンを発行しました</h3>
            <p className={styles["dialogWarning"]}>
              このトークンは二度と表示されません。必ずコピーして安全な場所に保存してください。
            </p>
            <div className={styles["tokenDisplay"]}>
              <code className={styles["tokenValue"]}>{newToken}</code>
              <button className={styles["copyButton"]} onClick={handleCopy} type="button">
                {copied ? "コピー済み" : "コピー"}
              </button>
            </div>
            <button className={styles["dialogClose"]} onClick={handleCloseDialog} type="button">
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
