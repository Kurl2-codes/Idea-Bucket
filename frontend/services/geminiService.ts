import { IdeaAnalysis } from "../types";

const API_URL = process.env.VITE_API_URL || "http://localhost:8000";

export const analyzeIdea = async (content: string, imageDatas?: string[]): Promise<IdeaAnalysis> => {
  try {
    const response = await fetch(`${API_URL}/api/v1/gemini/analyze-idea`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        image_datas: imageDatas || [],
      }),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Gemini content analysis failed:", error);
    // Return a fallback object so the application remains functional
    return {
      title: content.split('\n')[0].substring(0, 50) || "Captured Insight",
      category: "Personal Insight",
      tags: ["captured", "offline"]
    };
  }
};
