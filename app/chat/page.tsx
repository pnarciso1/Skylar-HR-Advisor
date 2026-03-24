import type { Metadata } from "next";
import ChatInterface from "@/components/ChatInterface";

export const metadata: Metadata = {
  title: "Chat — Skylar HR Assistant",
};

export default function ChatPage() {
  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <ChatInterface />
    </div>
  );
}
