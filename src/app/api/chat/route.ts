import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { runCineTasteChat, type ChatMessageInput } from "@/features/chat/chatService";
import type { ScreenContextData } from "@/lib/screenContext";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.username) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to chat with CineTaste AI." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Invalid request. 'messages' array is required." },
        { status: 400 }
      );
    }

    const messages = body.messages as ChatMessageInput[];
    const screenContext = body.screenContext as ScreenContextData | undefined;

    const reply = await runCineTasteChat({
      username: session.username,
      messages,
      screenContext,
    });

    return NextResponse.json({ reply });
  } catch (error: any) {
    const message = error?.message || "CineTaste AI is currently unavailable. Please try again shortly.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
