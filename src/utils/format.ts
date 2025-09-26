export function formatNumber(value: number | null | undefined, digits = 4, fallback = "-"): string {
  if (value == null || Number.isNaN(value)) return fallback;
  return Number(value).toFixed(digits);
}

/**
 * 根据最小价格步长推断应显示的小数位数。
 * 例：tick=0.0001 -> 4；tick=0.1 -> 1；tick=1 -> 0。
 * 若传入科学计数或异常值，回退到 4（再限定到 0..8 范围）。
 */
export function inferDigitsFromTick(tick: number, fallback = 4): number {
  if (!Number.isFinite(tick) || tick <= 0) return fallback;
  // 直接用字符串解析，避免浮点精度陷阱
  let s = tick.toString();
  if (s.includes("e") || s.includes("E")) {
    // 极小步长用最大 8 位展示
    return 8;
  }
  const idx = s.indexOf('.');
  if (idx === -1) return 0; // 没有小数点
  const decimals = s.length - idx - 1;
  // 去掉末尾多余 0 决定真实最小刻度位数
  const trimmed = s.slice(idx + 1).replace(/0+$/, "");
  const effective = trimmed.length === 0 ? 0 : trimmed.length;
  const digits = Math.min(8, Math.max(0, effective));
  return digits;
}

export function formatTrendLabel(trend: "做多" | "做空" | "无信号"): string {
  return trend;
}
