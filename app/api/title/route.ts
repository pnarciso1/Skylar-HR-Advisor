import { NextRequest, NextResponse } from "next/server";
import { generateConversationTitle } from "@/lib/claude";

interface TitleRequest {
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as TitleRequest;

    if (!messages?.length) {
      return NextResponse.json({ title: "HR Conversation" });
    }

    const title = await generateConversationTitle(messages);
    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: "HR Conversation" });
  }
}
