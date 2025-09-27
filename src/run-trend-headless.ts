import "dotenv/config";
import fs from "fs";
import path from "path";
import { tradingConfig } from "./config";
import { AsterExchangeAdapter } from "./exchanges/aster-adapter";
import { TrendEngine, type TrendEngineSnapshot } from "./core/trend-engine";

// Ensure logs directory
const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const dateStr = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
const logFile = path.join(logsDir, `${dateStr}.log`);

function append(line: string) {
  fs.appendFileSync(logFile, line + "\n");
}

function formatTs(ts: number | Date = Date.now()): string {
  const d = typeof ts === "number" ? new Date(ts) : ts;
  return d.toISOString();
}

const apiKey = process.env.ASTER_API_KEY;
const apiSecret = process.env.ASTER_API_SECRET;
if (!apiKey || !apiSecret) {
  console.error("缺少 ASTER_API_KEY / ASTER_API_SECRET 环境变量");
  process.exit(1);
}

append(`[${formatTs()}] 启动 TrendEngine (symbol=${tradingConfig.symbol}, kline=${tradingConfig.klineInterval})`);

const adapter = new AsterExchangeAdapter({ apiKey, apiSecret, symbol: tradingConfig.symbol });
const engine = new TrendEngine(tradingConfig, adapter);

let lastWrittenId = 0;

engine.on("update", (snapshot: TrendEngineSnapshot) => {
  // 写入新增 tradeLog 记录
  const logs = snapshot.tradeLog;
  if (logs.length > lastWrittenId) {
    const slice = logs.slice(lastWrittenId);
    slice.forEach((e) => {
      append(`[${e.time}] [${e.type}] ${e.detail}`);
    });
    lastWrittenId = logs.length;
  }
});

engine.start();

// 定期写状态概要（每 60s）
setInterval(() => {
  const snap = engine.getSnapshot();
  if (!snap.ready) return;
  const pos = snap.position;
  append(
    `[${formatTs()}] STATE price=${snap.lastPrice} sma30=${snap.maValue} trend=${snap.trend} posAmt=${pos.positionAmt} entry=${pos.entryPrice} pnl=${snap.pnl.toFixed(4)} totalProfit=${snap.totalProfit.toFixed(4)} trades=${snap.totalTrades}`
  );
}, 60_000).unref();

// 优雅退出
const shutdown = () => {
  append(`[${formatTs()}] 收到退出信号，停止引擎`);
  engine.stop();
  setTimeout(() => process.exit(0), 200);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
