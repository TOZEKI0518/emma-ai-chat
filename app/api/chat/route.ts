import { GoogleGenerativeAI } from "@google/generative-ai";

type Message = {
  role: "user" | "emma";
  english: string;
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY is missing" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const history: Message[] = body.history || [];

    const conversation = history
      .map((m) => {
        const speaker = m.role === "emma" ? "Emma" : "User";
        return `${speaker}: ${m.english}`;
      })
      .join("\n");

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });

    const prompt = `
You are Emma, a kind and cheerful English conversation partner.

The user is a Japanese English learner.
Your job is to have a natural conversation, not just ask the same question again.

Rules:
- Reply in short, natural English.
- Remember the conversation history.
- Ask one good follow-up question.
- If the user makes a small English mistake, gently correct it in one short sentence.
- Do not repeat a question that was already answered.
- Do not use Japanese.
- Be friendly, warm, and encouraging.

Conversation:
${conversation}

Emma:
`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return Response.json({ reply });
  } catch (error: any) {
    console.error("Gemini error:", error);

    return Response.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}