/** 生产环境注册离线服务程序；开发环境与注册失败均静默跳过（离线缓存只是增强）。 */
export const registerServiceWorker = (): void => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
    const serviceWorkerUrl = new URL('sw.js', baseUrl);
    void navigator.serviceWorker
      .register(serviceWorkerUrl, { scope: baseUrl.pathname })
      .catch(() => {
        // 注册失败不影响游戏本体。
      });
  });
};
