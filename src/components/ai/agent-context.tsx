"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type AgentType = "clinical" | "claims" | "schedule" | "safety" | "correspondence" | "analytics";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agent?: AgentType;
  timestamp: string;
}

interface TautokoState {
  isOpen: boolean;
  messages: ChatMessage[];
  isThinking: boolean;
  activeAgent: AgentType | null;
}

interface TautokoContextValue extends TautokoState {
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

const TautokoContext = createContext<TautokoContextValue | null>(null);

export function useTautoko() {
  const ctx = useContext(TautokoContext);
  if (!ctx) throw new Error("useTautoko must be used within TautokoProvider");
  return ctx;
}

/** Route user intent to the correct specialist agent */
function detectAgent(message: string): AgentType {
  const lower = message.toLowerCase();
  if (/claim|module|section\s*94|payment|invoice|billing|acs|rpats/i.test(lower)) return "claims";
  if (/schedule|appointment|calendar|visit\s*plan|route|when.*see/i.test(lower)) return "schedule";
  if (/risk|alert|warning|edinburgh|pnd|blood\s*pressure|bp\s*(over|high|>)|pre.?eclampsia|urgent/i.test(lower)) return "safety";
  if (/letter|referral|transfer|email|write\s*(to|a)|correspondence|report\s*to/i.test(lower)) return "correspondence";
  if (/report|analytics|income|forecast|trend|breakdown|stats|benchmark/i.test(lower)) return "analytics";
  return "clinical";
}

function getAgentLabel(agent: AgentType): string {
  switch (agent) {
    case "clinical": return "Clinical Agent";
    case "claims": return "Claims Agent";
    case "schedule": return "Schedule Agent";
    case "safety": return "Safety Agent";
    case "correspondence": return "Correspondence Agent";
    case "analytics": return "Analytics Agent";
  }
}

/** Local mock responses until Bedrock is wired up */
function getMockResponse(message: string, agent: AgentType): string {
  switch (agent) {
    case "clinical":
      return "I can help with clinical queries. Once connected to the AI service, I'll be able to:\n\n- Structure visit notes from voice/text\n- Generate care plan summaries\n- Screen for clinical risk factors\n- Suggest follow-up actions based on latest observations\n\nFor now, you can use the visit forms to record clinical data directly.";
    case "claims":
      return "I can help with Section 94 claiming. Once fully connected, I'll be able to:\n\n- Calculate module eligibility based on gestation and visit history\n- Check for unclaimed modules\n- Prepare RPaTS submission data\n- Identify ACS eligibility for complex cases\n\nYou can view your current claims breakdown in the Reports page.";
    case "schedule":
      return "I can help with scheduling. Once connected, I'll be able to:\n\n- Suggest optimal visit schedules based on gestation\n- Plan efficient travel routes between home visits\n- Send appointment reminders\n- Flag clients overdue for visits\n\nUse the Calendar to manage appointments in the meantime.";
    case "safety":
      return "I monitor clinical safety. Once connected, I'll actively:\n\n- Screen Edinburgh PND scores for concerning trends\n- Flag abnormal BP readings and pre-eclampsia risk\n- Alert on overdue visits for high-risk clients\n- Highlight clinical red flags from visit data\n\nAlerts currently appear on your Dashboard.";
    case "correspondence":
      return "I can draft correspondence. Once connected, I'll be able to:\n\n- Write referral letters to specialists\n- Generate transfer summaries\n- Draft client communications\n- Prepare discharge summaries\n\nDocuments can be uploaded in the Documents tab on each client.";
    case "analytics":
      return "I can provide practice analytics. Once connected, I'll offer:\n\n- MSR reporting summaries\n- Outcome benchmarking against national data\n- Income forecasting based on current caseload\n- Workload analysis and trends\n\nBasic reports are available now on the Reports page.";
  }
}

export function TautokoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TautokoState>({
    isOpen: false,
    messages: [],
    isThinking: false,
    activeAgent: null,
  });

  const open = useCallback(() => setState((s) => ({ ...s, isOpen: true })), []);
  const close = useCallback(() => setState((s) => ({ ...s, isOpen: false })), []);
  const toggle = useCallback(() => setState((s) => ({ ...s, isOpen: !s.isOpen })), []);
  const clearChat = useCallback(() => setState((s) => ({ ...s, messages: [], activeAgent: null })), []);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    const agent = detectAgent(content);

    setState((s) => ({
      ...s,
      messages: [...s.messages, userMsg],
      isThinking: true,
      activeAgent: agent,
    }));

    // Simulate thinking delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

    const response = getMockResponse(content, agent);
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: response,
      agent,
      timestamp: new Date().toISOString(),
    };

    setState((s) => ({
      ...s,
      messages: [...s.messages, assistantMsg],
      isThinking: false,
    }));
  }, []);

  return (
    <TautokoContext.Provider value={{ ...state, open, close, toggle, sendMessage, clearChat }}>
      {children}
    </TautokoContext.Provider>
  );
}

export { getAgentLabel };
