"use client";

import { useState } from "react";
import { Compass, Bot } from "lucide-react";
import DiscoverTab from "@/components/research/DiscoverTab";
import ChatInterface from "@/components/ChatInterface";

type Tab = "discover" | "chat";

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<Tab>("discover");

  return (
    <div className="space-y-6 min-w-0">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold font-serif mb-1">
          Research
        </h1>
        <p className="text-sm text-muted">
          Discover investing ideas, analyst activity, and market news — or ask
          the AI assistant.
        </p>
      </header>

      <div className="flex items-center gap-1 rounded-lg bg-card border border-border p-0.5 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("discover")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "discover"
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Compass className="h-4 w-4" />
          Discover
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "chat"
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Bot className="h-4 w-4" />
          AI Chat
        </button>
      </div>

      {activeTab === "discover" ? <DiscoverTab /> : <ChatInterface />}
    </div>
  );
}
