/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Paperclip, ArrowUp, X, FileText, Image as ImageIcon, 
  Copy, Check, Plus, MessageSquare, Trash2, Menu, Smartphone, LayoutDashboard, AlertCircle, Sparkles, Palette
} from "lucide-react";
import { HeroSection } from "./components/HeroSection";
import { FeaturesBar } from "./components/FeaturesBar";
import { ProAndHighlights } from "./components/ProAndHighlights";
import { PhoneMockup } from "./components/PhoneMockup";
import { MarkdownRenderer } from "./components/MarkdownRenderer";
import { HERO_FEATURES } from "./data/mockData";

// SkyPro AI SVG Logo
export function BrandLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_12px_rgba(14,165,233,0.6)]">
        <path d="M6 38L24 6L42 38L24 30L6 38Z" fill="url(#skypro-grad-primary)" stroke="#38BDF8" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M16 28L24 14L32 28L24 24L16 28Z" fill="url(#skypro-grad-core)" />
        <circle cx="24" cy="23" r="3" fill="#FFFFFF" />
        <defs>
          <linearGradient id="skypro-grad-primary" x1="6" y1="6" x2="42" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0284C7" />
            <stop offset="0.5" stopColor="#6366F1" />
            <stop offset="1" stopColor="#0EA5E9" />
          </linearGradient>
          <linearGradient id="skypro-grad-core" x1="16" y1="14" x2="32" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#818CF8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

interface Attachment {
  name: string;
  mimeType: string;
  base64: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  isError?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [inputPrompt, setInputPrompt] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"workspace" | "showcase">("workspace");
  const [apiErrorBanner, setApiErrorBanner] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("skypro_saved_sessions");
    if (saved) {
      try {
        const parsed: ChatSession[] = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
        else initNewChat();
      } catch {
        initNewChat();
      }
    } else {
      initNewChat();
    }
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, isLoading]);

  const saveSessions = (data: ChatSession[]) => {
    setSessions(data);
    localStorage.setItem("skypro_saved_sessions", JSON.stringify(data));
  };

  const initNewChat = () => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: "ការសន្ទនាថ្មី",
      messages: [],
    };
    const updated = [newChat, ...sessions];
    saveSessions(updated);
    setCurrentSessionId(newChat.id);
  };

  const deleteChat = (id: string) => {
    const filtered = sessions.filter((s) => s.id !== id);
    saveSessions(filtered);
    if (currentSessionId === id) {
      if (filtered.length > 0) {
        setCurrentSessionId(filtered[0].id);
      } else {
        initNewChat();
      }
    }
  };

  const activeChat = sessions.find((s) => s.id === currentSessionId) || sessions[0];

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            base64: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const sendMessage = async (overridePrompt?: string) => {
    const promptToSend = overridePrompt !== undefined ? overridePrompt : inputPrompt;
    if ((!promptToSend.trim() && attachments.length === 0) || isLoading || !activeChat) return;

    setApiErrorBanner(null);

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Generous fallback timeout (90s) only if network completely drops, allowing full long answers and code
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 90000);

    const userMessage: Message = {
      role: "user",
      content: promptToSend,
      attachments: attachments,
    };

    const lowerPrompt = promptToSend.toLowerCase();
    const isImgTask =
      lowerPrompt.includes("គូរ") ||
      lowerPrompt.includes("បង្កើតរូប") ||
      lowerPrompt.includes("ចង់បានរូប") ||
      lowerPrompt.includes("draw") ||
      lowerPrompt.includes("generate image") ||
      lowerPrompt.includes("create image") ||
      lowerPrompt.includes("picture of") ||
      lowerPrompt.includes("wallpaper") ||
      lowerPrompt.includes("photo of") ||
      (attachments.length > 0 &&
        (lowerPrompt.includes("ស្ទីល") ||
          lowerPrompt.includes("style") ||
          lowerPrompt.includes("recreate") ||
          lowerPrompt.includes("រូប")));
    setIsGeneratingImage(isImgTask);

    const updatedMessages = [...activeChat.messages, userMessage];
    const newTitle = activeChat.messages.length === 0 
      ? (promptToSend.slice(0, 24) || "ការវិភាគឯកសារ/រូបភាព") 
      : activeChat.title;

    // Immediately show user message + streaming placeholder
    const withReplyMessages = [...updatedMessages, { role: "assistant" as const, content: "" }];

    const newSessions = sessions.map((s) =>
      s.id === activeChat.id ? { ...s, title: newTitle, messages: withReplyMessages } : s
    );
    saveSessions(newSessions);

    const sentAttachments = [...attachments];
    setInputPrompt("");
    setAttachments([]);
    setIsLoading(true);

    try {
      // Connect to fast streaming endpoint with AbortController signal
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments
          })),
          attachments: sentAttachments,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        let errMsg = errJson.error;
        if (!errMsg) {
          if (res.status === 404) {
            errMsg = "មិនអាចស្វែងរក API Route (/api/chat) បានទេ (HTTP 404)។ សូមពិនិត្យមើល Vercel Serverless Function ឬ Environment Variables។";
          } else if (res.status === 401) {
            errMsg = "មិនទាន់កំណត់ API Key នៅឡើយទេ។ សូមកំណត់ GEMINI_API_KEY នៅក្នុង Vercel Project Settings។";
          } else {
            errMsg = `HTTP ${res.status}: បរាជ័យក្នុងការតភ្ជាប់`;
          }
        }
        throw new Error(errMsg);
      }

      if (!res.body) {
        throw new Error("មិនអាចទទួល Response Stream បានទេ");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamAccumulator = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        streamAccumulator += chunk;

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeChat.id) {
              const msgs = [...s.messages];
              msgs[msgs.length - 1] = {
                role: "assistant",
                content: streamAccumulator,
              };
              return { ...s, messages: msgs };
            }
            return s;
          })
        );
      }

      // Finalize and save
      setSessions((currentSessions) => {
        localStorage.setItem("skypro_saved_sessions", JSON.stringify(currentSessions));
        return currentSessions;
      });

    } catch (err: any) {
      console.error("Chat Error:", err);
      let rawMsg = err?.message || "";
      let errorMessage = "សូមអភ័យទោស ប្រព័ន្ធកំពុងមមាញឹកបន្តិច។ សូមមេត្តាសាកល្បងម្ដងទៀតនៅបន្តិចក្រោយនេះ។";

      if (err?.name === "AbortError") {
        errorMessage = "ការតភ្ជាប់ត្រូវបានកាត់ផ្តាច់ ឬផុតកំណត់។ សូមសាកល្បងម្តងទៀត។";
      } else if (
        rawMsg &&
        !rawMsg.includes("{") &&
        !rawMsg.includes("ApiError") &&
        !rawMsg.includes("503") &&
        !rawMsg.includes("429") &&
        !rawMsg.includes("UNAVAILABLE")
      ) {
        errorMessage = rawMsg;
      }

      setApiErrorBanner(errorMessage);

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeChat.id) {
            const msgs = [...s.messages];
            const lastMsg = msgs[msgs.length - 1];
            // If some content was already streamed, keep it!
            if (!lastMsg.content) {
              msgs[msgs.length - 1] = {
                role: "assistant",
                content: errorMessage,
                isError: true,
              };
            }
            return { ...s, messages: msgs };
          }
          return s;
        })
      );
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsGeneratingImage(false);
    }
  };

  const copyText = (txt: string, idx: number) => {
    navigator.clipboard.writeText(txt);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleQuickPromptClick = (promptText: string) => {
    setViewMode("workspace");
    sendMessage(promptText);
  };

  return (
    <div className="flex h-screen bg-[#0B0F17] text-slate-100 overflow-hidden font-['Kantumruy_Pro',sans-serif]">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed md:static top-0 bottom-0 left-0 z-50 w-72 bg-[#0F1523] border-r border-slate-800/80 flex flex-col transition-all duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="w-8 h-8" />
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-sky-400 via-indigo-300 to-sky-200 bg-clip-text text-transparent font-['Plus_Jakarta_Sans',sans-serif]">
                SkyPro AI
              </span>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider">SUPREME HYBRID</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={() => {
              initNewChat();
              setViewMode("workspace");
            }}
            className="w-full flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 text-sm font-medium transition shadow-sm"
          >
            <Plus size={16} /> ការសន្ទនាថ្មី
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {sessions.map((item) => (
            <div
              key={item.id}
              onClick={() => { 
                setCurrentSessionId(item.id); 
                setSidebarOpen(false); 
                setViewMode("workspace");
              }}
              className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-sm transition ${
                item.id === currentSessionId && viewMode === "workspace"
                  ? "bg-slate-800/90 text-sky-400 border border-slate-700/50"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <MessageSquare size={15} className="shrink-0" />
                <span className="truncate">{item.title}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteChat(item.id); }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition"
                title="លុបការសន្ទនា"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* View Switcher at bottom of sidebar */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0c121e]">
          <button
            onClick={() => {
              setViewMode(viewMode === "workspace" ? "showcase" : "workspace");
              setSidebarOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-blue-950/60 border border-blue-800/40 text-xs text-sky-300 hover:bg-blue-900/50 transition"
          >
            <span className="flex items-center gap-2">
              {viewMode === "workspace" ? <Smartphone size={14} /> : <LayoutDashboard size={14} />}
              <span>{viewMode === "workspace" ? "ទម្រង់ទូរស័ព្ទ / Showcase" : "Workspace Chat"}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">ប្តូរ</span>
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE OR SHOWCASE */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-b from-[#0B0F17] via-[#0B0F17] to-[#080B11]">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-800/60 flex items-center justify-between px-4 bg-[#080d17]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-slate-400 hover:text-white">
              <Menu size={20} />
            </button>
            <span className="text-sm font-medium text-slate-200 truncate max-w-xs md:max-w-md">
              {viewMode === "workspace" ? (activeChat?.title || "SkyPro AI") : "ទម្រង់ទូរស័ព្ទ & ផ្ទាំង Showcase"}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle Button */}
            <button
              onClick={() => setViewMode(viewMode === "workspace" ? "showcase" : "workspace")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/70 text-xs text-slate-200 hover:border-sky-500/50 transition"
            >
              {viewMode === "workspace" ? (
                <>
                  <Smartphone size={13} className="text-cyan-400" />
                  <span className="hidden sm:inline">មើលទូរស័ព្ទជ្រុង (Phone View)</span>
                </>
              ) : (
                <>
                  <LayoutDashboard size={13} className="text-cyan-400" />
                  <span className="hidden sm:inline">Workspace AI</span>
                </>
              )}
            </button>

            <span className="text-[11px] bg-sky-950/80 border border-sky-800/50 text-sky-300 px-2.5 py-0.5 rounded-full font-mono">
              ភាសាខ្មែរ / Multimodal AI
            </span>
          </div>
        </header>

        {apiErrorBanner && (
          <div className="bg-amber-950/70 border-b border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-400 shrink-0" />
              <span>{apiErrorBanner}</span>
            </div>
            <button onClick={() => setApiErrorBanner(null)} className="text-amber-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {viewMode === "showcase" ? (
          /* SHOWCASE MODE (With the corner phone view matching previous prompt) */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <HeroSection onStartChat={() => setViewMode("workspace")} />
            <FeaturesBar
              features={HERO_FEATURES}
              onSelectFeature={(feat) => {
                setViewMode("workspace");
                handleQuickPromptClick(`សូមជួយពន្យល់លម្អិត និងបង្ហាញការប្រើប្រាស់ ${feat}`);
              }}
            />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 flex flex-col gap-4">
                <ProAndHighlights onOpenPricing={() => {}} />
              </div>
              <div className="lg:col-span-4 flex justify-center">
                <PhoneMockup onExpandMobileView={() => setViewMode("workspace")} />
              </div>
            </div>
          </div>
        ) : (
          /* ULTRA-FAST MULTIMODAL CHAT WORKSPACE */
          <>
            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto">
              {activeChat && activeChat.messages.length > 0 ? (
                activeChat.messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`py-6 px-4 md:px-12 flex gap-4 ${
                      m.role === "assistant" ? "bg-[#0E1422]/60 border-y border-slate-800/40" : ""
                    }`}
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      {m.role === "assistant" ? (
                        <BrandLogo className="w-7 h-7" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
                          អ្នក
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 overflow-hidden">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {m.role === "assistant" ? "SKYPRO INTELLIGENCE" : "អ្នកប្រើប្រាស់"}
                      </div>

                      {m.attachments && m.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pb-2">
                          {m.attachments.map((f, i) => (
                            <span key={i} className="text-xs bg-slate-800 text-sky-300 border border-slate-700/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              {f.mimeType.startsWith("image/") ? <ImageIcon size={13} /> : <FileText size={13} />}
                              {f.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* AI Markdown / Text Output */}
                      <div className="text-slate-200 leading-relaxed font-sans">
                        {m.isError ? (
                          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs sm:text-sm">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>{m.content}</span>
                          </div>
                        ) : m.content ? (
                          <MarkdownRenderer content={m.content} />
                        ) : (
                          isLoading && idx === activeChat.messages.length - 1 && (
                            <div className="flex items-center gap-2 text-xs text-sky-400 animate-pulse py-1">
                              {isGeneratingImage ? (
                                <>
                                  <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                                  <span className="text-amber-300 font-medium">SkyPro កំពុងគូររូបភាព...</span>
                                </>
                              ) : (
                                <>
                                  <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                                  <span>SkyPro AI កំពុងវិភាគ...</span>
                                </>
                              )}
                            </div>
                          )
                        )}
                      </div>

                      {m.role === "assistant" && m.content && (
                        <div className="flex items-center gap-4 pt-2">
                          <button
                            onClick={() => copyText(m.content, idx)}
                            className="text-xs text-slate-400 hover:text-sky-400 flex items-center gap-1 transition"
                          >
                            {copiedIndex === idx ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                            <span>{copiedIndex === idx ? "បានចម្លង" : "ចម្លង"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
                  <BrandLogo className="w-16 h-16 mb-4" />
                  <h2 className="text-xl md:text-2xl font-bold text-slate-100 mb-2">
                    សួស្តី! ខ្ញុំគឺ SkyPro AI
                  </h2>
                  <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-6">
                    ជំនួយការបញ្ញាសិប្បនិម្មិតល្បឿនលឿនកម្រិតខ្ពស់។ ខ្ញុំអាចជួយដោះស្រាយលំហាត់, សរសេរកូដ, វិភាគរូបភាព និងអានឯកសារ PDF ជាភាសាខ្មែរយ៉ាងរហ័ស។
                  </p>

                  {/* Fast Starter Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl w-full text-left">
                    <button
                      onClick={() => handleQuickPromptClick("សូមសរសេរកូដ JavaScript បង្កើត Countdown Timer ដ៏ស្រស់ស្អាត ជាមួយ CSS និងពន្យល់គ្រប់ជំហានជាភាសាខ្មែរ")}
                      className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-sky-500/50 hover:bg-slate-800/50 transition group"
                    >
                      <p className="text-xs font-bold text-slate-200 group-hover:text-sky-400">💻 សរសេរកូដ JavaScript</p>
                      <p className="text-[11px] text-slate-400 truncate">Countdown Timer + ពន្យល់លម្អិត</p>
                    </button>

                    <button
                      onClick={() => handleQuickPromptClick("សូមជួយសរសេរគំរូអ៊ីមែលផ្លូវការជាភាសាខ្មែរ សម្រាប់ស្នើសុំកិច្ចសហការអាជីវកម្មជាមួយក្រុមហ៊ុនដៃគូ")}
                      className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-sky-500/50 hover:bg-slate-800/50 transition group"
                    >
                      <p className="text-xs font-bold text-slate-200 group-hover:text-sky-400">📝 សរសេរអត្ថបទផ្លូវការ</p>
                      <p className="text-[11px] text-slate-400 truncate">អ៊ីមែលស្នើសុំកិច្ចសហការអាជីវកម្ម</p>
                    </button>

                    <button
                      onClick={() => handleQuickPromptClick("សូមពន្យល់ពីដំណើរការនៃ Artificial Intelligence (AI) និង Machine Learning ឱ្យបានក្បោះក្បាយជាភាសាខ្មែរ")}
                      className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-sky-500/50 hover:bg-slate-800/50 transition group"
                    >
                      <p className="text-xs font-bold text-slate-200 group-hover:text-sky-400">🧠 ពន្យល់វិទ្យាសាស្ត្រ AI</p>
                      <p className="text-[11px] text-slate-400 truncate">របៀបដែល AI គិត និងរៀនសូត្រ</p>
                    </button>

                    <button
                      onClick={() => handleQuickPromptClick("សូមបង្កើតរូបភាព AI ដ៏ស្រស់ស្អាត: ប្រាសាទអង្គរវត្តពេលថ្ងៃលិច ឆ្លុះលើផ្ទៃទឹកបែប 3D Cinematic 8K")}
                      className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-amber-500/50 hover:bg-slate-800/50 transition group"
                    >
                      <p className="text-xs font-bold text-slate-200 group-hover:text-amber-400 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-400" /> គូររូបភាព AI (Image Gen)
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">ប្រាសាទអង្គរវត្តពេលថ្ងៃលិច 3D Cinematic</p>
                    </button>
                  </div>
                </div>
              )}
              
              {isLoading && activeChat && activeChat.messages.length > 0 && activeChat.messages[activeChat.messages.length - 1].content === "" && (
                <div className="p-4 px-4 md:px-12 flex items-center gap-2 text-slate-400 text-xs animate-pulse">
                  {isGeneratingImage ? (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                      <span className="text-amber-300">SkyPro កំពុងគូររូបភាព...</span>
                    </>
                  ) : (
                    <>
                      <BrandLogo className="w-4 h-4 animate-spin" />
                      <span>SkyPro AI កំពុងវិភាគ...</span>
                    </>
                  )}
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* INPUT BAR */}
            <div className="w-full max-w-4xl mx-auto px-4 pb-4">
              <div className="bg-[#121827] border border-slate-800 rounded-2xl p-3 shadow-2xl focus-within:border-sky-500/70 transition-all">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-1">
                    {attachments.map((file, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-slate-800 text-xs text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700">
                        {file.mimeType.startsWith("image/") ? <ImageIcon size={13} className="text-sky-400" /> : <FileText size={13} />}
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="hover:text-red-400">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFiles}
                    multiple
                    accept="image/*,application/pdf,text/plain"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800/60 rounded-xl transition"
                    title="ភ្ជាប់រូបភាព ឬឯកសារ"
                  >
                    <Paperclip size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputPrompt((prev) =>
                        prev
                          ? `សូមបង្កើតរូបភាព AI: ${prev}`
                          : "សូមបង្កើតរូបភាព AI ស្អាតប្លែកកម្រិត 4K: "
                      );
                    }}
                    className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 rounded-xl transition"
                    title="បង្កើតរូបភាព AI (Image Generation)"
                  >
                    <Sparkles size={19} className="text-amber-400/90" />
                  </button>

                  <textarea
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="សួរ SkyPro AI ជាភាសាខ្មែរ, ប្រាប់ឱ្យគូររូប ឬទម្លាក់ File..."
                    rows={1}
                    className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 resize-none max-h-36 py-2 text-base leading-relaxed touch-manipulation"
                  />

                  <button
                    type="button"
                    disabled={(!inputPrompt.trim() && attachments.length === 0) || isLoading}
                    onClick={() => sendMessage()}
                    className={`p-2.5 rounded-xl transition-all ${
                      (inputPrompt.trim() || attachments.length > 0) && !isLoading
                        ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30 hover:opacity-90 active:scale-95"
                        : "bg-slate-800 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    <ArrowUp size={18} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
