import { createSafeNarrativeAdapter } from '../index';
import {
  createOpenAiCompatibleProvider,
  openAiCompatibleConfigFromEnv,
} from '../providers/openai-compatible';
import { createNarrativeServer } from './narrative-server';

const port = Number(process.env.FOOTBALL_AI_PORT ?? 8787);
const providerConfig = openAiCompatibleConfigFromEnv(process.env);
const timeoutMs = providerConfig?.timeoutMs ?? 8000;
const adapter = createSafeNarrativeAdapter(
  providerConfig ? createOpenAiCompatibleProvider(providerConfig) : undefined,
  { timeoutMs },
);

const server = createNarrativeServer({
  adapter,
  provider: providerConfig
    ? { configured: true, model: providerConfig.model }
    : { configured: false, model: null },
});

server.listen(port, '127.0.0.1', () => {
  if (providerConfig) {
    process.stdout.write(
      `local-ai narrative service ready at http://127.0.0.1:${port} (model: ${providerConfig.model})\n`,
    );
  } else {
    process.stdout.write(
      `local-ai narrative service ready at http://127.0.0.1:${port} (provider 未配置，全部回退作者原文)\n`,
    );
  }
});
