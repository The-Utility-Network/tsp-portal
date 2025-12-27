// src/app/Chatbot.tsx
'use client';
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const MONO_FONT_FAMILY = `'Fira Mono', Menlo, Monaco, Consolas, 'Courier New', monospace`;

interface Message {
  sender: "user" | "assistant";
  text: string;
}

interface ChatbotProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  optionsVisible: boolean;
  setOptionsVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const Chatbot: React.FC<ChatbotProps> = ({
  messages,
  setMessages,
  input,
  setInput,
  optionsVisible,
  setOptionsVisible,
}) => {
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [client, setClient] = useState<any>(null);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<string | null>(null);

  useEffect(() => {
    const cl = {
      createCompletionStream: async (contextMessages: any[]) => {
        const res = await fetch("/api/openai-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: contextMessages }),
        });
        if (!res.ok || !res.body) {
          const errText = await res.text();
          throw new Error(`OpenAI proxy error: ${res.status} – ${errText}`);
        }
        return res.body;
      },
    };
    setClient(cl);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const getOpenAIResponseStream = async (
    userInput: string,
    onChunk: (chunk: string) => void
  ): Promise<string> => {
    if (!client) {
      throw new Error("OpenAI client not initialized.");
    }

    const contextMessages = messages.map((msg) => ({
      role: msg.sender,
      content: msg.text,
    })).concat({ role: "user", content: userInput });

    const stream = await client.createCompletionStream(contextMessages);
    const reader = stream.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";
    let done = false;

    try {
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (!value && done) break;
        const chunkValue = decoder.decode(value || new Uint8Array(), { stream: true });
        const lines = chunkValue.split("\n").filter((line) => line.trim() !== "");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            if (jsonStr === "[DONE]") {
              done = true;
              break;
            }
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                onChunk(fullText);
              }
            } catch (err) {
              console.error("Error parsing stream chunk:", err);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  };

  const handleSendMessage = async (message: string) => {
    setMessages((prev) => [...prev, { sender: "user", text: message }]);
    setOptionsVisible(false);
    setMessages((prev) => [...prev, { sender: "assistant", text: "" }]);
    setIsTyping(true);

    try {
      await getOpenAIResponseStream(message, (chunk: string) => {
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = chunk;
          return newMessages;
        });
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error fetching OpenAI response:", errorMessage);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].text = `Error: ${errorMessage || "Unknown error occurred."}`;
        return newMessages;
      });
    }
    setIsTyping(false);
  };

  const handleOptionClick = (option: string) => {
    handleSendMessage(option);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (input.trim()) {
      handleSendMessage(input);
      setInput("");
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setOptionsVisible(true);
    setInput("");
  };

  const clipboardIcon = (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="3" width="10" height="14" rx="2" stroke="#00ccff" strokeWidth="1.5" fill="none" />
      <rect x="7" y="1" width="6" height="4" rx="1" stroke="#00ccff" strokeWidth="1.2" fill="none" />
    </svg>
  );

  const checkIcon = (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 10.5L9 14.5L15 7.5" stroke="#00ccff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  interface CustomCodeProps {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
    [key: string]: any;
  }

  const markdownComponents: Partial<Components> = {
    code: ({ inline, className, children, ...props }: CustomCodeProps) => {
      const match = /language-(\w+)/.exec(className || "");
      const codeString = String(children).replace(/\n$/, "");
      const codeKey = `${className || 'inline'}-${codeString.slice(0, 16)}`;
      const handleCopyCode = () => {
        navigator.clipboard.writeText(codeString);
        setCopiedCodeIdx(codeKey);
        setTimeout(() => setCopiedCodeIdx(null), 1200);
      };
      const lineCount = codeString.split('\n').length;

      return inline ? (
        <code className="inline-code" {...props}>{children}</code>
      ) : match ? (
        lineCount === 1 ? (
          <code className="inline-code" {...props}>{codeString.trim()}</code>
        ) : (
          <div className="codeblock-container">
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1] === "sol" ? "solidity" : match[1]}
              PreTag="div"
              customStyle={{
                background: 'rgba(0, 204, 255, 0.1)',
                border: '1px solid rgba(0, 204, 255, 0.3)',
                borderRadius: '8px',
                margin: '0',
                fontSize: '11px',
                lineHeight: '1.5',
                fontFamily: MONO_FONT_FAMILY,
                overflowX: 'auto',
                color: '#fff',
                boxShadow: '0 0 15px rgba(0, 204, 255, 0.1)',
                padding: '12px',
              }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
            {lineCount > 2 && (
              <div className="flex justify-end mt-2">
                <button
                  className="copy-btn-text"
                  onClick={handleCopyCode}
                  type="button"
                  aria-label="Copy code"
                >
                  {copiedCodeIdx === codeKey ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <code className="inline-code" {...props}>{children}</code>
      );
    },
  };

  return (
    <div
      className="rounded-2xl shadow-2xl flex flex-col h-full font-mono"
      style={{
        background: 'rgba(0, 20, 30, 0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 204, 255, 0.2)',
        boxShadow: '0 0 40px rgba(0, 204, 255, 0.1)',
      }}
    >
      <style jsx>{`
        .inline-code {
          background: rgba(0, 204, 255, 0.15);
          color: #00ccff;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: ${MONO_FONT_FAMILY};
          border: 1px solid rgba(0, 204, 255, 0.3);
        }
        .copy-btn-text {
          background: none;
          color: #00ccff;
          border: none;
          font-size: 0.75em;
          padding: 4px 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: ${MONO_FONT_FAMILY};
        }
        .copy-btn-text:hover {
          color: #fff;
        }
      `}</style>

      {/* Header */}
      <div
        className="p-3 sm:p-4 border-b text-center"
        style={{ borderColor: 'rgba(0, 204, 255, 0.2)' }}
      >
        <h2 className="text-base sm:text-xl font-bold tracking-widest" style={{ color: '#00ccff' }}>
          UMA.INTERFACE
        </h2>
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-3 sm:p-4 flex flex-col-reverse">
        <div className="chat-messages space-y-3 sm:space-y-4 flex flex-col">
          {messages.map((msg, index) => {
            const isLast = index === messages.length - 1;
            if (isLast && msg.sender === "assistant" && msg.text === "" && isTyping) {
              return (
                <div key={index} className="flex flex-col items-start">
                  <span className="text-xs text-[#00ccff]/70 mb-1 font-mono">UMA</span>
                  <div
                    className="relative max-w-[85%] px-3 sm:px-4 py-2 sm:py-3 rounded-lg"
                    style={{
                      background: 'rgba(0, 204, 255, 0.15)',
                      border: '1px solid rgba(0, 204, 255, 0.3)',
                    }}
                  >
                    <span className="animated-ellipsis text-[#00ccff]">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={index} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <span className="text-xs text-[#00ccff]/70 mb-1 font-mono">
                  {msg.sender === "user" ? "OPERATOR" : "UMA"}
                </span>
                <div className="relative max-w-[90%] sm:max-w-[85%] group">
                  {msg.sender === "assistant" && msg.text && (
                    <button
                      className="absolute -top-2 -right-2 z-10 p-1.5 rounded transition-all duration-200 opacity-0 group-hover:opacity-100"
                      style={{
                        background: 'rgba(0, 204, 255, 0.2)',
                        border: '1px solid rgba(0, 204, 255, 0.4)',
                      }}
                      onClick={() => {
                        navigator.clipboard.writeText(msg.text);
                        setCopiedMsgIdx(index);
                        setTimeout(() => setCopiedMsgIdx(null), 1200);
                      }}
                      type="button"
                      aria-label="Copy message"
                    >
                      {copiedMsgIdx === index ? checkIcon : clipboardIcon}
                    </button>
                  )}
                  <div
                    className="px-3 sm:px-4 py-2 sm:py-3 rounded-lg"
                    style={{
                      background: msg.sender === "user"
                        ? 'linear-gradient(135deg, rgba(255, 105, 180, 0.2), rgba(200, 50, 120, 0.15))'
                        : 'rgba(0, 204, 255, 0.05)',
                      border: `1px solid ${msg.sender === "user" ? 'rgba(255, 105, 180, 0.4)' : 'rgba(0, 204, 255, 0.2)'}`,
                    }}
                  >
                    {msg.sender === "assistant" ? (
                      <div className="prose prose-invert max-w-none text-xs sm:text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={markdownComponents}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <span className="text-white text-xs sm:text-sm">{msg.text}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {messages.length === 0 && !isTyping && (
            <div className="flex justify-start">
              <div
                className="max-w-[90%] sm:max-w-[85%] px-3 sm:px-4 py-2 sm:py-3 rounded-lg"
                style={{
                  background: 'rgba(0, 204, 255, 0.1)',
                  border: '1px solid rgba(0, 204, 255, 0.3)',
                }}
              >
                <span className="text-[#00ccff] text-xs sm:text-sm">
                  UMA: Systems online. Select a topic below or type your query.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Options */}
      {optionsVisible && (
        <div className="p-3 sm:p-4">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl"
            style={{
              background: 'rgba(0, 204, 255, 0.05)',
              border: '1px solid rgba(0, 204, 255, 0.2)',
            }}
          >
            {[
              'What strains do you currently grow?',
              'How does the aquaponics system work?',
              'Explain terpene profiles and their effects.',
              'How do I track my grow spot production?',
            ].map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                className="py-2 px-3 rounded-lg text-xs text-[#00ccff] transition-all duration-200 hover:scale-[1.02] text-left"
                style={{
                  background: 'rgba(0, 204, 255, 0.1)',
                  border: '1px solid rgba(0, 204, 255, 0.3)',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t" style={{ borderColor: 'rgba(0, 204, 255, 0.2)' }}>
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            className="flex-grow p-2 sm:p-3 rounded-lg text-white text-xs sm:text-sm focus:outline-none"
            style={{
              background: 'rgba(0, 204, 255, 0.05)',
              border: '1px solid rgba(0, 204, 255, 0.3)',
            }}
            placeholder="Type your query..."
          />
          <button
            type="submit"
            className="p-2 sm:p-3 rounded-lg transition-all duration-200 hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, #00ccff, #0099cc)',
              border: '1px solid rgba(0, 204, 255, 0.5)',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9-7-9-7-9 7z" />
            </svg>
          </button>

          {!optionsVisible && (
            <button
              onClick={startNewChat}
              type="button"
              className="p-2 sm:p-3 rounded-lg transition-all duration-200"
              style={{
                background: 'rgba(255, 105, 180, 0.1)',
                border: '1px solid rgba(255, 105, 180, 0.3)',
                color: '#ff69b4',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </form>
      </div>

      <style jsx>{`
        .animated-ellipsis span {
          opacity: 0.2;
          animation: ellipsisFade 1.2s infinite;
          font-size: 1rem;
          font-weight: bold;
          margin-right: 2px;
        }
        .animated-ellipsis span:nth-child(1) { animation-delay: 0s; }
        .animated-ellipsis span:nth-child(2) { animation-delay: 0.2s; }
        .animated-ellipsis span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes ellipsisFade {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
};

export default Chatbot;