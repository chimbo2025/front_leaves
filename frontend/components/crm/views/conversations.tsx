"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { Search, Send, Paperclip, Smile, MoreVertical, Phone, Video, Tag, User, Zap, CheckCheck, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, type Conversation, type Message, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const channelColors: Record<string, string> = {
  instagram: "bg-yellow-400/10 text-yellow-400",
  whatsapp: "bg-green-400/10 text-green-400",
  facebook: "bg-blue-400/10 text-blue-400",
  email: "bg-purple-400/10 text-purple-400",
};

const channelEmoji: Record<string, string> = {
  instagram: "IG",
  whatsapp: "WA",
  facebook: "FB",
  email: "EM",
};

function getScoreColor(score: number) {
  if (score >= 71) return "text-orange-400 bg-orange-400/10";
  if (score >= 31) return "text-yellow-400 bg-yellow-400/10";
  return "text-blue-400 bg-blue-400/10";
}

const aiSuggestions = [
  "Great! I can help you with that. Can I get your email so I can send the detailed pricing breakdown?",
  "We're currently running a limited-time offer - 20% off annual plans. Shall I lock that in for you?",
  "I'd love to set you up with our fastest onboarding. Can we schedule a 15-min call today?",
];

function ConversationItem({
  conv,
  isSelected,
  onClick,
}: {
  conv: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50",
        isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-secondary/50"
      )}
    >
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
          {conv.contact_name
            ?.split(" ")
            .map((n) => n[0])
            .join("") ?? "?"}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">
          {channelEmoji[conv.channel] ?? conv.channel}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground truncate">{conv.contact_name ?? "Unknown"}</p>
          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">{conv.timestamp}</span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{conv.last_message ?? "No messages"}</p>
        <div className="flex items-center gap-1 mt-1">
          {conv.unread_count > 0 && (
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {conv.unread_count}
            </span>
          )}
          <Badge
            className={cn(
              "text-[9px] border-0 px-1 py-0 h-4 capitalize",
              channelColors[conv.channel] ?? "bg-secondary text-muted-foreground"
            )}
          >
            {conv.channel}
          </Badge>
          <Badge
            className={cn(
              "text-[9px] border-0 px-1 py-0 h-4 capitalize",
              conv.status === "open"
                ? "bg-green-400/10 text-green-400"
                : conv.status === "pending"
                  ? "bg-yellow-400/10 text-yellow-400"
                  : "bg-secondary text-muted-foreground"
            )}
          >
            {conv.status}
          </Badge>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ msg, isAgent }: { msg: Message; isAgent: boolean }) {
  return (
    <div className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
      {!isAgent && (
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary mr-2 flex-shrink-0 mt-1">
          {msg.sender.charAt(0)}
        </div>
      )}
      <div
        className={cn(
          "max-w-xs rounded-2xl px-3 py-2 text-xs",
          isAgent ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"
        )}
      >
        <p>{msg.content}</p>
        <p className={cn("text-[10px] mt-1", isAgent ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>
          {msg.timestamp}
        </p>
      </div>
    </div>
  );
}

export function ConversationsView() {
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [showAI, setShowAI] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "pending" | "resolved">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const {
    data: conversations = [],
    isLoading,
    mutate: mutateConversations,
  } = useSWR("conversations-list", () => api.conversations.list());

  // Fetch messages for selected conversation
  const { data: messages = [], mutate: mutateMessages } = useSWR(
    selected ? `conversation-messages-${selected.id}` : null,
    () => (selected ? api.conversations.getMessages(selected.id) : Promise.resolve([]))
  );

  // Auto-select first conversation
  useEffect(() => {
    if (conversations.length > 0 && !selected) {
      setSelected(conversations[0]);
    }
  }, [conversations, selected]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = conversations.filter((c) => {
    const matchSearch = c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = conversations.filter((c) => c.status === "open").length;
  const pendingCount = conversations.filter((c) => c.status === "pending").length;

  const handleSendMessage = async () => {
    if (!message.trim() || !selected) return;

    try {
      await api.conversations.sendMessage(selected.id, {
        sender: "Agent",
        content: message,
        channel: selected.channel,
      });
      setMessage("");
      mutateMessages();
      mutateConversations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send message");
    }
  };

  const handleMarkRead = async () => {
    if (!selected) return;
    try {
      await api.conversations.markRead(selected.id);
      mutateConversations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to mark as read");
    }
  };

  const handleResolve = async () => {
    if (!selected) return;
    try {
      await api.conversations.resolve(selected.id);
      toast.success("Conversation resolved");
      mutateConversations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to resolve conversation");
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Conversation list */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-card/50">
        {/* Header */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 bg-secondary border-border text-xs"
            />
          </div>
          <div className="flex gap-2 text-xs">
            <Badge
              className={cn(
                "cursor-pointer",
                statusFilter === "all" ? "bg-primary/10 text-primary border-0" : "bg-secondary text-muted-foreground border-0"
              )}
              onClick={() => setStatusFilter("all")}
            >
              All ({conversations.length})
            </Badge>
            <Badge
              className={cn(
                "cursor-pointer",
                statusFilter === "open" ? "bg-primary/10 text-primary border-0" : "bg-secondary text-muted-foreground border-0"
              )}
              onClick={() => setStatusFilter("open")}
            >
              Open ({openCount})
            </Badge>
            <Badge
              className={cn(
                "cursor-pointer",
                statusFilter === "pending"
                  ? "bg-primary/10 text-primary border-0"
                  : "bg-secondary text-muted-foreground border-0"
              )}
              onClick={() => setStatusFilter("pending")}
            >
              Pending ({pendingCount})
            </Badge>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-20">
              <span className="text-xs text-muted-foreground">No conversations</span>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isSelected={selected?.id === conv.id}
                onClick={() => setSelected(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* Center: Chat */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {selected.contact_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") ?? "?"}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selected.contact_name ?? "Unknown"}</p>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-[10px] border-0 capitalize",
                      channelColors[selected.channel] ?? "bg-secondary text-muted-foreground"
                    )}
                  >
                    {channelEmoji[selected.channel]} {selected.channel}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <Video className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <Tag className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <User className="w-3.5 h-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleMarkRead}>
                    <CheckCheck className="w-3 h-3 mr-2" /> Mark as read
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleResolve}>
                    <Archive className="w-3 h-3 mr-2" /> Resolve conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-20">
                <span className="text-xs text-muted-foreground">No messages yet</span>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} isAgent={msg.sender === "Agent"} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* AI Suggestions */}
          {showAI && (
            <div className="border-t border-border px-4 py-2 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-primary">AI Suggested Replies</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] text-muted-foreground ml-auto"
                  onClick={() => setShowAI(false)}
                >
                  Dismiss
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setMessage(s)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent text-foreground/80 hover:text-foreground transition-colors text-left max-w-xs"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-3 bg-card/60">
            <div className="flex items-end gap-2">
              <div className="flex-1 flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground flex-shrink-0">
                  <Paperclip className="w-3.5 h-3.5" />
                </Button>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground flex-shrink-0">
                  <Smile className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Button
                size="icon"
                className="h-9 w-9 bg-primary text-primary-foreground rounded-xl flex-shrink-0"
                onClick={handleSendMessage}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Select a conversation to start chatting</span>
        </div>
      )}

      {/* Right: Contact info panel */}
      {selected && (
        <div className="w-60 flex-shrink-0 border-l border-border bg-card/50 hidden lg:flex flex-col overflow-y-auto p-4 space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary mx-auto mb-2">
              {selected.contact_name
                ?.split(" ")
                .map((n) => n[0])
                .join("") ?? "?"}
            </div>
            <p className="text-sm font-semibold text-foreground">{selected.contact_name ?? "Unknown"}</p>
            <Badge
              className={cn(
                "mt-2 text-xs border-0 capitalize",
                selected.status === "open"
                  ? "bg-green-400/10 text-green-400"
                  : selected.status === "pending"
                    ? "bg-yellow-400/10 text-yellow-400"
                    : "bg-secondary text-muted-foreground"
              )}
            >
              {selected.status}
            </Badge>
          </div>

          {/* AI recommendation */}
          <div className="p-3 rounded-lg bg-orange-400/10 border border-orange-400/20">
            <div className="flex items-start gap-2">
              <Zap className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-foreground/80">
                <span className="font-semibold text-orange-400">AI:</span> High buy intent. Recommend closing with discount
                offer.
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            {[
              { label: "Channel", value: selected.channel },
              { label: "Agent", value: selected.assigned_agent ?? "Unassigned" },
              { label: "Unread", value: selected.unread_count.toString() },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-foreground font-medium">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Tags */}
          {selected.tags && selected.tags.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {selected.tags.map((tag) => (
                  <Badge key={tag} className="text-[10px] bg-secondary text-muted-foreground border-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={handleMarkRead}>
              Mark Read
            </Button>
            <Button size="sm" className="flex-1 h-8 bg-primary text-primary-foreground text-xs" onClick={handleResolve}>
              Resolve
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
