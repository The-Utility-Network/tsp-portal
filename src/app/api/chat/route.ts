// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "../../../utils/createOpenAIClient";

export async function POST(req: NextRequest) {
  const client = getOpenAIClient();

  try {
    const { action, threadId, message } = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    if (action === "initialize") {
      const threadId = await client.createThread();
      return NextResponse.json({ threadId });
    }

    if (!threadId) {
      return NextResponse.json({ error: "Thread ID is required" }, { status: 400 });
    }

    if (action === "sendMessage") {
      if (!message) {
        return NextResponse.json({ error: "Message is required" }, { status: 400 });
      }

      // Wait for any active run to complete before adding a new message
      // const runs = await client.beta.threads.runs.list(threadId);
      // const activeRun = runs.data.find((run) => run.status === "queued" || run.status === "in_progress");
      // if (activeRun) {
      //   let runStatus = activeRun.status;
      //   while (runStatus === "queued" || runStatus === "in_progress") {
      //     await new Promise((resolve) => setTimeout(resolve, 500));
      //     const runStatusResponse = await client.threads.runs.retrieve(threadId, activeRun.id);
      //     runStatus = runStatusResponse.status;
      //   }
      // }

      await client.addMessage(threadId, message);

      const stream = new ReadableStream({
        async start(controller) {
          await client.runAssistant(threadId, (chunk) => {
            controller.enqueue(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          });
          controller.enqueue(`data: [DONE]\n\n`);
          controller.close();
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("API Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}