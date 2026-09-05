declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_LOCAL_AI_ENDPOINT?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
