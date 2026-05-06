import express from "express";
import { openai } from "../../services/ai/openaiClient";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "user",
          content: "Reply with: OpenAI connection successful"
        }
      ]
    });

    res.json({
      success: true,
      message: response.choices[0].message.content,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "OpenAI request failed",
    });
  }
});

export default router;