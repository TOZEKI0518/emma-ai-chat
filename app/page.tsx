"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [isListening, setIsListening] = useState(false);
  const [showJapanese, setShowJapanese] = useState(true);
  const [speechReady, setSpeechReady] = useState(false);
  const [expression, setExpression] =
    useState<keyof typeof emmaImages>("normal");

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const unlockSpeech = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(" ");
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
    setSpeechReady(true);
  };

  const getBestVoice = () => {
    const voices = window.speechSynthesis.getVoices();

    return (
      voices.find((voice) => voice.name.includes("Jenny")) ||
      voices.find((voice) => voice.name.includes("Aria")) ||
      voices.find((voice) => voice.name.includes("Samantha")) ||
      voices.find((voice) => voice.name.includes("Zira")) ||
      voices.find(
        (voice) =>
          voice.lang.startsWith("en") &&
          voice.name.toLowerCase().includes("female")
      ) ||
      voices.find((voice) => voice.lang === "en-US") ||
      voices.find((voice) => voice.lang.startsWith("en")) ||
      null
    );
  };

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1.15;
    utterance.volume = 1;

    const voice = getBestVoice();
    if (voice) utterance.voice = voice;

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

    utterance.onerror = () => {
      setIsSpeaking(false);
      setExpression("surprised");
    };

    window.speechSynthesis.speak(utterance);

    // スマホで途中停止する場合の保険
    setTimeout(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 300);
  };

  const startListening = () => {
    if (typeof window === "undefined") return;

    unlockSpeech();

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("このブラウザは音声入力に対応していない可能性があります。Chromeで試してください。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setExpression("thinking");
    };

    recognition.onresult = (event: any) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setInput(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setExpression("surprised");
    };

    recognition.onend = () => {
      setIsListening(false);
      setExpression("normal");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    unlockSpeech();
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

      const replyText = (data.reply || "").toLowerCase();

      if (replyText.includes("wow") || replyText.includes("really")) {
        setExpression("surprised");
      } else if (
        replyText.includes("great") ||
        replyText.includes("nice") ||
        replyText.includes("good")
      ) {
        setExpression("smile");
      } else if (replyText.includes("😉") || replyText.includes("cute")) {
        setExpression("wink");
      } else {
        setExpression("smile");
      }

      const emmaReply: Message = {
        role: "emma",
        english: data.reply || data.error || "Sorry, I could not reply.",
        japanese: null,
        correction: null,
      };

      setMessages((prev) => [...prev, emmaReply]);

      setTimeout(() => {
        speak(emmaReply.english);
      }, 500);
    } catch {
      setExpression("surprised");

      const errorReply: Message = {
        role: "emma",
        english: "Sorry, something went wrong.",
        japanese: null,
        correction: null,
      };

      setMessages((prev) => [...prev, errorReply]);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50"
      onClick={() => {
        if (!speechReady) unlockSpeech();
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-5">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-rose-400">
              AI English Partner
            </p>
            <h1 className="text-2xl font-bold">Talk with Emma</h1>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJapanese(!showJapanese)}
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
                    ? { scale: [1, 1.02, 1], y: [0, -2, 0] }
                    : { scale: [1, 1.01, 1] }
                }
                transition={{
                  duration: isSpeaking ? 0.7 : 3,
                  repeat: Infinity,
                }}
              />

              <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold shadow">
                {isListening
                  ? "Listening..."
                  : isSpeaking
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
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[82%] rounded-3xl px-4 py-3 shadow ${
                  msg.role === "user" ? "bg-rose-400 text-white" : "bg-white"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {msg.role === "user" ? "You" : "Emma"}
                </div>

                <p className="text-sm leading-relaxed">{msg.english}</p>

                {showJapanese && msg.japanese && (
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
                    onClick={() => {
                      unlockSpeech();
                      speak(msg.english);
                    }}
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
              onClick={startListening}
              className={`h-11 w-11 rounded-full ${
                isListening
                  ? "bg-rose-400 text-white"
                  : "bg-rose-100 text-rose-500"
              }`}
            >
              <Mic className="h-5 w-5" />
            </Button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={
                isListening ? "Listening..." : "Type or speak in English..."
              }
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