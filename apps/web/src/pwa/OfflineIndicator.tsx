import { useEffect, useState } from 'react';

/** 离线状态可见（spec §20）：离线时提示数据仍在本机、AI 润色暂不可用。 */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false,
  );

  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="offline-chip" role="status" aria-label="离线状态">
      离线运行中——生涯数据仍保存在本机，AI 润色暂不可用。
    </div>
  );
}
