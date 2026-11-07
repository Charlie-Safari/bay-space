import styles from "./briefing-room.module.css";

export function roundExchangeAmount(value: string, rate: number) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount / rate) * rate
    : 0;
}

export default function ExchangeConversion({
  kind, rate, value, onChange, onTrade, loading, balance, available,
}: {
  kind: "coins" | "tokens";
  rate: number;
  value: string;
  onChange: (value: string) => void;
  onTrade: () => void;
  loading: boolean;
  balance: number;
  available: number;
}) {
  const amount = roundExchangeAmount(value, rate);
  const total = amount / rate;
  const source = kind === "coins" ? "points" : "coins";
  const insufficient = amount > available;
  const isTokenExchange = kind === "tokens";

  return (
    <details className={styles.exchangeSection}>
      <summary>Get {kind}</summary>
      <div className={styles.conversionBody}>
        <form onSubmit={(event) => { event.preventDefault(); onTrade(); }}>
          <label className={styles.conversionLabel}>
            <span className="sr-only">{source} to trade</span>
            <input
              className={styles.conversionInput}
              inputMode="numeric"
              autoComplete="off"
              placeholder={`enter ${source}`}
              value={value}
              onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 15))}
              onBlur={() => { if (value !== "") onChange(String(amount)); }}
              disabled={loading}
            />
          </label>
          <button
            type="submit"
            className={styles.conversionButton}
            disabled={loading || total === 0 || insufficient}
          >
            {loading ? "Trading…" : (
              <>
                Trade for {total.toLocaleString("en-US")}{" "}
                <span className={isTokenExchange ? styles.tokenText : undefined}>{kind}</span>
              </>
            )}
          </button>
          {insufficient ? <p className={styles.conversionNotice} role="status">Not enough available {source}.</p> : null}
        </form>
        <dl className={styles.conversionBalances}>
          <div className={isTokenExchange ? styles.coinText : undefined}>
            <dt>Available {source}</dt>
            <dd>{available.toLocaleString("en-US")}</dd>
          </div>
          <div className={isTokenExchange ? styles.tokenText : styles.coinText}>
            <dt>{isTokenExchange ? "Tokens balance" : "Bayo coin balance"}</dt>
            <dd>{balance.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>Exchange rate</dt>
            <dd>{rate}:1</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}
