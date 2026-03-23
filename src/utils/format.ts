/** Format a duration in seconds as a human-readable string, e.g. "3分12秒". */
export function formatDurationSec(seconds: number): string {
  const totalSec = Math.round(seconds);
  if (totalSec < 60) return `${totalSec}秒`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}分${sec}秒` : `${min}分`;
}
