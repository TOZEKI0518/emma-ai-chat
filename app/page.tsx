"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  Send,
  Volume2,
  Sparkles,
  MessageCircle,
 Languages,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const emmaImages = {
  normal: "/emma-normal.png",
  smile: "/emma-smile.png",
  speaking: "/emma-speaking.png",
  thinking: "/emma-thinking.png",
  surprised: "/emma-surprised.png",
  wink: "/emma-wink.png",
};

type Message = {
  role: "user" | "emma";
  english: string;
  japanese: string | null;
  correction: string | null;
};

const initialMessages: Message[] = [
  {
    role: "emma",
    english:
      "Hi Takuma! I'm Emma. Let's talk in English today. How was your day?",
    japanese:
      "こんにちは、Takuma！Emmaだよ。今日は英語で話そう。今日はどんな一日だった？",
    correction: null,
  },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showJapanese, setShowJapanese] = useState(true);

  const [expression, setExpression] =
    useState<keyof typeof emmaImages>("normal");

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";

    // 可愛い感じ寄り
    utterance.rate = 0.95;
    utterance.pitch = 1.25;

    const voices = speechSynthesis.getVoices();

    // 女性音声優先
    const femaleVoice =
      voices.find((voice) =>
        voice.name.includes("Jenny")
      ) ||
      voices.find((voice) =>
        voice.name.includes("Aria")
      ) ||
      voices.find((voice) =>
        voice.name.includes("Samantha")
      ) ||
      voices.find((voice) =>
        voice.name.includes("Zira")
      ) ||
      voices.find((voice) =>
        voice.name.toLowerCase().includes("female")
      );

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setExpression("speaking");
    };

    utterance.onend = () => {
      setIsSpeaking(false);

      setExpression("smile");

      setTimeout(() => {
        setExpression("normal");
      }, 1500);
    };

    speechSynthesis.speak(utterance);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    setIsSpeaking(false);

    setExpression("thinking");

    const userText = input.trim();

    const userMessage: Message = {
      role: "user",
      english: userText,
      japanese: null,
      correction: null,
    };

    const newMessages = [...messages, userMessage];

    setMessages(newMessages);

    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userText,
          history: newMessages,
        }),
      });

      const data = await res.json();

      // 内容に応じた表情
      const replyText = (
        data.reply ||
        ""
      ).toLowerCase();

      if (
        replyText.includes("wow") ||
        replyText.includes("really")
      ) {
        setExpression("surprised");
      } else if (
        replyText.includes("great") ||
        replyText.includes("nice") ||
        replyText.includes("good")
      ) {
        setExpression("smile");
      } else if (
        replyText.includes("😉") ||
        replyText.includes("cute")
      ) {
        setExpression("wink");
      } else {
        setExpression("smile");
      }

      const emmaReply: Message = {
        role: "emma",
        english:
          data.reply ||
          data.error ||
          "Sorry, I could not reply.",
        japanese: null,
        correction: null,
      };

      setMessages((prev) => [
        ...prev,
        emmaReply,
      ]);

      setTimeout(() => {
        speak(emmaReply.english);
      }, 300);
    } catch {
      setExpression("surprised");

      const errorReply: Message = {
        role: "emma",
        english:
          "Sorry, something went wrong.",
        japanese: null,
        correction: null,
      };

      setMessages((prev) => [
        ...prev,
        errorReply,
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-5">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-rose-400">
              AI English Partner
            </p>

            <h1 className="text-2xl font-bold">
              Talk with Emma
            </h1>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setShowJapanese(!showJapanese)
            }
          >
            <Languages className="mr-1 h-4 w-4" />
            JP
          </Button>
        </header>

        <Card className="overflow-hidden rounded-3xl shadow-xl">
          <CardContent className="p-0">
            <div className="relative h-80 overflow-hidden bg-pink-100">
              <motion.img
                src={emmaImages[expression]}
                alt="Emma"
                className="h-full w-full object-cover object-top"
                animate={
                  isSpeaking
                    ? {
                        scale: [1, 1.02, 1],
                        y: [0, -2, 0],
                      }
                    : {
                        scale: [1, 1.01, 1],
                      }
                }
                transition={{
                  duration: isSpeaking ? 0.7 : 3,
                  repeat: Infinity,
                }}
              />

              <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold shadow">
                {isSpeaking
                  ? "Emma is speaking..."
                  : "Emma"}
              </div>

              <div className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow">
                <Sparkles className="h-5 w-5 text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-3">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[82%] rounded-3xl px-4 py-3 shadow ${
                  msg.role === "user"
                    ? "bg-rose-400 text-white"
                    : "bg-white"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                  <MessageCircle className="h-3.5 w-3.5" />

                  {msg.role === "user"
                    ? "You"
                    : "Emma"}
                </div>

                <p className="text-sm leading-relaxed">
                  {msg.english}
                </p>

                {showJapanese &&
                  msg.japanese && (
                    <p className="mt-2 border-t pt-2 text-xs text-slate-500">
                      {msg.japanese}
                    </p>
                  )}

                {msg.correction && (
                  <p className="mt-2 rounded-2xl bg-white/20 p-2 text-xs">
                    {msg.correction}
                  </p>
                )}

                {msg.role === "emma" && (
                  <button
                    className="mt-2 inline-flex items-center gap-1 text-xs text-rose-500"
                    onClick={() =>
                      speak(msg.english)
                    }
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Replay
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 rounded-3xl bg-white/90 p-3 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-11 w-11 rounded-full bg-rose-100 text-rose-500"
            >
              <Mic className="h-5 w-5" />
            </Button>

            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                sendMessage()
              }
              placeholder="Type in English..."
              className="h-11 flex-1 rounded-full border border-rose-100 bg-rose-50 px-4 text-sm outline-none"
            />

            <Button
              onClick={sendMessage}
              className="h-11 w-11 rounded-full bg-rose-400 hover:bg-rose-500"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}