import { NextResponse } from "next/server";
import { getOpenAIClient } from "../../../utils/createOpenAIClient";

// Ensure this route always runs on the Node runtime
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const client = getOpenAIClient();
        const stream = await client.createCompletionStream(messages);
        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
            },
        });
    } catch (err: any) {
        console.error("/api/openai-stream error", err);
        return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
    }
}
