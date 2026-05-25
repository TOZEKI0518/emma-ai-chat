"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  Send,
  Volume2,
  Sparkles,
  MessageCircle,
  Languages,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const backgroundSrc = "/Room.png";

const emmaImages = [
  "/emma/emma1.png",
  "/emma/emma2.png",
  "/emma/emma3.png",
  "/emma/emma4.png",
  "/emma/emma5.png",
  "/emma/emma6.png",
  "/emma/emma7.png",
  "/emma/emma8.png",
];

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
      "こんにちは、タクマ！エマです。今日は英語で話しましょう。今日はどんな一日でしたか？",
    correction: null,
  },
];

const getRandomEmmaImage = () => {
  return emmaImages[Math.floor(Math.random() * emmaImages.length)];
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [languageMode, setLanguageMode] = useState<"en" | "ja">("en");
  const [speechReady, setSpeechReady] = useState(false);
  const [currentEmmaImage, setCurrentEmmaImage] = useState("/emma/emma1.png");

  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

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
    utterance.rate = 0.82;
    utterance.pitch = 1.12;
    utterance.volume = 1;

    const voice = getBestVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentEmmaImage(getRandomEmmaImage());
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);

    setTimeout(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 300);
  };

  const stopListening = () => {
    listeningRef.current = false;
    setIsListening(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const startListening = () => {
    if (typeof window === "undefined") return;

    unlockSpeech();

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "このブラウザは音声入力に対応していない可能性があります。Chromeで試してください。"
      );
      return;
    }

    listeningRef.current = true;
    setIsListening(true);

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setInput(transcript);
    };

    recognition.onerror = () => {
      if (!listeningRef.current) {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          setTimeout(() => {
            if (listeningRef.current) {
              try {
                recognition.start();
              } catch {
                setIsListening(false);
              }
            }
          }, 400);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    unlockSpeech();
    stopListening();
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

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

      const emmaReply: Message = {
        role: "emma",
        english: data.reply || data.error || "Sorry, I could not reply.",
        japanese: data.japanese || null,
        correction: data.correction || null,
      };

      setMessages((prev) => [...prev, emmaReply]);

      setTimeout(() => {
        speak(emmaReply.english);
      }, 500);
    } catch {
      const errorReply: Message = {
        role: "emma",
        english: "Sorry, something went wrong.",
        japanese: "ごめんね、エラーが起きたみたい。",
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
            onClick={() =>
              setLanguageMode((prev) => (prev === "en" ? "ja" : "en"))
            }
          >
            <Languages className="mr-1 h-4 w-4" />
            {languageMode === "en" ? "日本語" : "English"}
          </Button>
        </header>

        <Card className="sticky top-3 z-20 overflow-hidden rounded-3xl shadow-xl">
          <CardContent className="p-0">
            <div className="relative h-80 overflow-hidden bg-pink-100">
              <img
                src={backgroundSrc}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
                draggable={false}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-white/10 via-transparent to-white/10" />

              <img
                src={currentEmmaImage}
                alt="Emma"
                className="absolute inset-0 h-full w-full object-contain object-center"
                draggable={false}
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

                <p className="text-sm leading-relaxed">
                  {languageMode === "en"
                    ? msg.english
                    : msg.japanese || msg.english}
                </p>

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

          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 rounded-3xl bg-white/90 p-3 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              className={`h-11 w-11 rounded-full ${
                isListening
                  ? "bg-rose-400 text-white"
                  : "bg-rose-100 text-rose-500"
              }`}
            >
              {isListening ? (
                <Square className="h-5 w-5 fill-white" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
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