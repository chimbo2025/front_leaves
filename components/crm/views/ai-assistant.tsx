"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Zap, TrendingUp, Target, RefreshCw, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { contacts, getScoreColor } from "@/lib/crm-data";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: string;
  scoreAdj?: number;
  confidence?: number;
  timestamp: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hello! I am your AI CRM Sales Assistant. I have analyzed your current pipeline and detected 3 high-priority actions. Emily Chen (score 95) has expressed strong buy intent — I recommend an immediate response with a discount offer. How can I help you maximize conversions today?",
    action: "assign_agent",
    scoreAdj: 0,
    confidence: 95,
    timestamp: "10:48 AM",
  },
];

const quickActions = [
  "Analyze top hot leads",
  "Suggest closing strategy for Emily Chen",
  "Summarize today's pipeline status",
  "Which deals need immediate attention?",
  "Generate a follow-up message for Ahmed Al-Rashid",
  "What's my predicted revenue this month?",
];

const aiResponses: Record<string, Message> = {
  default: {
    id: "",
    role: "assistant",
    content: "Based on the current CRM data, I've analyzed your pipeline and identified key opportunities. The system shows 5 hot leads (score 71+) with combined deal value of $84k. Marcus Chen is your top performer with 38% conversion rate. I recommend prioritizing Emily Chen's inquiry immediately — her score of 95 indicates a 92% close probability.",
    action: "trigger_workflow",
    confidence: 88,
    timestamp: "",
  },
  emily: {
    id: "",
    role: "assistant",
    content: `**Emily Chen — Closing Strategy (Confidence: 92%)**\n\n**Lead Analysis:**\n• Score: 95/100 (HOT)\n• Intent: BUY INTENT — mentioned "upgrade today"\n• Stage: Proposal Sent\n• Source: Instagram Ads\n\n**Recommended Action:**\n1. Send message within the next 15 minutes\n2. Offer 15% discount on annual enterprise plan\n3. Include limited-time urgency (offer expires in 24 hours)\n4. Provide payment link directly\n\n**Suggested Message:**\n"Hi Emily! Great news — I can offer you our Enterprise Plan at 15% off if you sign up today. This deal expires in 24 hours. Here's your personalized checkout link: [link]. Ready to get started?"`,
    action: "close_deal",
    confidence: 92,
    timestamp: "",
  },
  pipeline: {
    id: "",
    role: "assistant",
    content: `**Pipeline Summary — Today**\n\n• **Total Active Deals:** 8\n• **Pipeline Value:** $2.86M\n• **Expected Close (30 days):** $184k\n• **At-Risk Deals:** 2 (Carlos Mendez — SLA breach, Aisha Okonkwo — no contact 7 days)\n\n**Top Opportunities:**\n1. Emily Chen — $36k (90% probability) — ACTION NEEDED\n2. Sarah Johnson — $24k (85% probability) — Meeting this week\n3. David Osei — $7.2k (75% probability) — Discount negotiation pending\n\n**AI Forecast:** This month's revenue on track for $142k (+18% vs last month).`,
    action: "none",
    confidence: 94,
    timestamp: "",
  },
  revenue: {
    id: "",
    role: "assistant",
    content: `**Predictive Revenue Forecast — April**\n\n• **Base Forecast:** $138,000\n• **Optimistic (AI-adjusted):** $165,000\n• **Conservative:** $118,000\n\n**Key Drivers:**\n• Emily Chen deal close probability: 92% → +$36k\n• Sarah Johnson negotiation: 85% → +$24k\n• 3 warm leads showing accelerated signals\n\n**Risk Factors:**\n• Carlos Mendez SLA breach — 40% chance of loss (-$4.8k)\n• 2 deals in negotiation with competitor comparison signals\n\n**AI Recommendation:** Focus agent resources on Emily Chen and David Osei this week for maximum revenue impact.`,
    action: "none",
    confidence: 86,
    timestamp: "",
  },
};

function getAIResponse(input: string): Message {
  const lower = input.toLowerCase();
  let response: Message;

  if (lower.includes("emily") || lower.includes("closing") || lower.includes("close")) {
    response = { ...aiResponses.emily };
  } else if (lower.includes("pipeline") || lower.includes("status") || lower.includes("today")) {
    response = { ...aiResponses.pipeline };
  } else if (lower.includes("revenue") || lower.includes("forecast") || lower.includes("predicted")) {
    response = { ...aiResponses.revenue };
  } else {
    response = { ...aiResponses.default };
  }

  const now = new Date();
  return {
    ...response,
    id: `msg-${Date.now()}`,
    timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-semibold text-foreground">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith("• ")) {
          return <p key={i} className="text-muted-foreground pl-2 flex items-start gap-1"><span className="text-primary mt-0.5">•</span>{line.slice(2)}</p>;
        }
        if (line.match(/^\d+\./)) {
          return <p key={i} className="text-muted-foreground pl-2">{line}</p>;
        }
        if (line === "") return <div key={i} className="h-1" />;
        return <p key={i} className="text-foreground/90">{line}</p>;
      })}
    </div>
  );
}

export function AIAssistantView() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text?: string) => {
    const content = text ?? input.trim();
    if (!content) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg = getAIResponse(content);
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const actionColors: Record<string, string> = {
    close_deal: "bg-green-400/10 text-green-400",
    assign_agent: "bg-primary/10 text-primary",
    trigger_workflow: "bg-yellow-400/10 text-yellow-400",
    escalate: "bg-red-400/10 text-red-400",
    none: "bg-secondary text-muted-foreground",
  };

  return (
    <div className="flex h-full overflow-hidden gap-0">
      {/* Chat panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* AI Status bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">NexusAI Sales Assistant</p>
              <p className="text-[10px] text-primary">Active · Autonomous Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-400/10 text-green-400 border-0 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={cn("max-w-lg", msg.role === "user" ? "order-first" : "")}>
                <div className={cn(
                  "rounded-2xl px-4 py-3 text-xs leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border text-foreground rounded-bl-sm"
                )}>
                  <MessageContent content={msg.content} />
                </div>

                {/* AI metadata */}
                {msg.role === "assistant" && msg.action && msg.action !== "none" && (
                  <div className="flex items-center gap-2 mt-1.5 px-1">
                    {msg.confidence && (
                      <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                        <Target className="w-2.5 h-2.5 mr-1" /> {msg.confidence}% confidence
                      </Badge>
                    )}
                    <Badge className={cn("border-0 text-[10px]", actionColors[msg.action])}>
                      <Zap className="w-2.5 h-2.5 mr-1" /> {msg.action.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                  </div>
                )}
                {msg.role === "user" && (
                  <p className="text-[10px] text-muted-foreground text-right mt-1 px-1">{msg.timestamp}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Actions */}
        <div className="border-t border-border px-4 py-2 flex flex-wrap gap-1.5">
          {quickActions.slice(0, 4).map((action) => (
            <button
              key={action}
              onClick={() => sendMessage(action)}
              className="text-[11px] px-3 py-1.5 rounded-full bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              {action}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 bg-card/60">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-secondary rounded-xl px-4 py-2.5">
              <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                placeholder="Ask AI: analyze leads, suggest strategies, forecast revenue..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            <Button
              size="icon"
              className="h-10 w-10 bg-primary text-primary-foreground rounded-xl flex-shrink-0"
              onClick={() => sendMessage()}
              disabled={!input.trim() && !isTyping}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right sidebar — AI insights */}
      <div className="w-64 border-l border-border flex-shrink-0 hidden xl:flex flex-col bg-card/30 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Intelligence</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Real-time score insights */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" /> Top Priority Leads
            </p>
            <div className="space-y-2">
              {contacts.filter((c) => c.score >= 75).slice(0, 4).map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-xs font-medium text-foreground">{contact.name.split(" ")[0]}</p>
                    <p className="text-[10px] text-muted-foreground">{contact.stage}</p>
                  </div>
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", getScoreColor(contact.score))}>
                    {contact.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Decision Matrix */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-primary" /> Autonomous Decisions
            </p>
            <div className="space-y-2">
              {[
                { action: "Auto-assigned Emily Chen", result: "Marcus Chen", time: "2 min ago", color: "text-green-400" },
                { action: "Score boosted", result: "+25 pts (buy intent)", time: "2 min ago", color: "text-orange-400" },
                { action: "Workflow triggered", result: "Hot Lead sequence", time: "5 min ago", color: "text-primary" },
                { action: "SLA alert sent", result: "Carlos Mendez", time: "1 hr ago", color: "text-red-400" },
              ].map((item, i) => (
                <div key={i} className="text-xs border-l-2 border-border pl-2">
                  <p className={`font-medium ${item.color}`}>{item.action}</p>
                  <p className="text-muted-foreground">{item.result}</p>
                  <p className="text-[10px] text-muted-foreground/70">{item.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Prediction */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs font-semibold text-primary mb-1">Revenue Prediction</p>
            <p className="text-xl font-bold text-foreground">$165k</p>
            <p className="text-[10px] text-muted-foreground">April forecast (86% confidence)</p>
            <div className="flex items-center gap-1 mt-2">
              <ChevronRight className="w-3 h-3 text-primary" />
              <p className="text-[11px] text-foreground/80">Close Emily Chen deal to hit target</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
