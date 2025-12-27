// src/utils/createOpenAIClient.ts
export const getOpenAIClient = () => {
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  if (!apiKey || !endpoint || !deployment) {
    throw new Error("Missing required Azure OpenAI environment variables.");
  }

  const headers = {
    "Content-Type": "application/json",
    "api-key": apiKey,
  };

  return {
    createCompletionStream: async (contextMessages: any[]) => {
      const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
      const body = {
        messages: [
          { role: "system", content: "You are UMA, the Universal Molecular Assistant for The Satellite Project. You are an advanced AI assistant specializing in cannabis cultivation, molecular biology, terpene profiles, cannabinoid science, and the operational aspects of The Satellite Project Om - an automated aquaponics cannabis grow operation in New Mexico. You help members understand their grow spots, lab test results, strain profiles, and the science behind cannabis cultivation. You speak with technical precision but remain approachable. You can answer questions about: cannabis genetics and chemovars, terpene and cannabinoid profiles, cultivation techniques, the aquaponics system, lab testing procedures and results, membership benefits and how tokens work, and the overall mission of The Satellite Project. Always be helpful, accurate, and educational." },
          ...contextMessages,
        ],
        stream: true,
        max_tokens: 3600,
        response_format: { type: "text" },
      };
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const errorText = await res.text();
        throw new Error(`Error creating completion stream: ${res.status} - ${errorText}`);
      }
      return res.body;
    },
  };
};