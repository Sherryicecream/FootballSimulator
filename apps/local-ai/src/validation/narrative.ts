import type { NarrativePolishOutput, NarrativePolishRequest } from '@football/contracts';

const extractNumbers = (texts: readonly string[]): string[] =>
  texts.flatMap((text) => text.match(/\d+(?:\.\d+)?/g) ?? []);

const textFields = (request: NarrativePolishRequest): string[] => [
  request.context.eventTitle,
  request.context.choiceText,
  request.context.playerName,
  ...request.context.participantNames,
  request.draft.response,
  request.draft.followUp,
  ...request.draft.participantResponses.map(({ text }) => text),
];

const outputTexts = (output: NarrativePolishOutput): string[] => [
  output.response,
  output.followUp,
  ...output.participantResponses.map(({ text }) => text),
];

export class UnsafeNarrativeOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeNarrativeOutputError';
  }
}

export const fallbackNarrativeDraft = (request: NarrativePolishRequest): NarrativePolishOutput => ({
  response: request.draft.response,
  participantResponses: request.draft.participantResponses.map(({ personId, text }) => ({
    personId,
    text,
  })),
  followUp: request.draft.followUp,
});

export const validateNarrativePolishOutput = (
  request: NarrativePolishRequest,
  output: NarrativePolishOutput,
): NarrativePolishOutput => {
  const expectedIds = request.draft.participantResponses.map(({ personId }) => personId);
  const outputIds = output.participantResponses.map(({ personId }) => personId);
  if (expectedIds.join('|') !== outputIds.join('|')) {
    throw new UnsafeNarrativeOutputError('叙事输出修改了参与人物');
  }

  const allowedNumbers = new Set(extractNumbers(textFields(request)));
  const introducedNumbers = extractNumbers(outputTexts(output)).filter(
    (token) => !allowedNumbers.has(token),
  );
  if (introducedNumbers.length > 0) {
    throw new UnsafeNarrativeOutputError('叙事输出引入了未经事实包允许的数字');
  }

  if (outputTexts(output).some((text) => /[<>]/.test(text))) {
    throw new UnsafeNarrativeOutputError('叙事输出包含未允许的标记');
  }

  return output;
};
