/**
 * Helper function to construct complete JSON with prefix and suffix
 * @param rawOutput The raw JSON output from the model
 * @param prompt The prompt object containing the prefix and suffix
 * @returns The complete JSON string
 */
export const constructCompleteJson = (
  rawOutput: any,
  prompt: { json_prefix?: string | null; json_suffix?: string | null }
): string => {
  const prefix = prompt.json_prefix || '';
  const suffix = prompt.json_suffix || '';

  // Format the raw output based on what the prompt expects
  let formattedOutput: string;
  if (Array.isArray(rawOutput)) {
    // For arrays, format each element with proper indentation and remove outer brackets
    formattedOutput = rawOutput
      .map((item) =>
        JSON.stringify(item, null, 2)
          .split('\n')
          .map((line) => (line ? '            ' + line : line))
          .join('\n')
      )
      .join(',\n');
  } else {
    formattedOutput = JSON.stringify(rawOutput, null, 2);
  }

  return prefix + formattedOutput + suffix;
};
