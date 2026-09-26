import React, { useEffect, useState } from 'react';
import { ArrowUp, Bot, Check, LoaderCircle, Sparkles } from 'lucide-react';
import { apiOrThrow } from '../lib/api';

const starterPrompts = [
  'Summarize the open work.',
  'Draft a status update for the team.',
  'Find overdue or blocked work.',
];

export default function AiCopilotPanel({ teamId, teamName }) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    setMessages([]);
    setPrompt('');
    setProvider(null);
  }, [teamId]);

  const askCopilot = async (value) => {
    const nextPrompt = (value || prompt).trim();
    if (!nextPrompt || loading) return;

    setPrompt('');
    setMessages((current) => [...current, { role: 'user', text: nextPrompt }]);
    setLoading(true);
    try {
      const data = await apiOrThrow('/api/ai/assistant', 'POST', { teamId, prompt: nextPrompt });
      setProvider(data.provider);
      setMessages((current) => [...current, { role: 'assistant', text: data.reply }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: 'assistant',
        text: error.message || 'I could not reach the assistant right now. Try again in a moment.',
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="human-ai-card" aria-labelledby="copilot-title">
      <div className="human-ai-card__header">
        <div className="human-ai-card__icon"><Sparkles className="h-4 w-4" /></div>
        <div>
          <div className="human-eyebrow">Optional assistant</div>
          <h2 id="copilot-title">Ask about {teamName || 'this workspace'}</h2>
        </div>
        <span className="human-ai-card__status"><span /> {provider === 'openai' ? 'AI connected' : 'Ready to help'}</span>
      </div>

      <div className="human-ai-card__body">
        {messages.length === 0 ? (
          <div className="human-ai-empty">
            <Bot className="h-5 w-5" />
            <p>Ask for a plan, a clear status update, or a quick risk check. The copilot only sees this team’s task board.</p>
          </div>
        ) : (
          <div className="human-ai-messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`human-ai-message human-ai-message--${message.role}${message.error ? ' human-ai-message--error' : ''}`}>
                {message.role === 'assistant' ? <Bot className="mt-0.5 h-4 w-4 flex-shrink-0" /> : null}
                <p>{message.text}</p>
              </div>
            ))}
            {loading ? (
              <div className="human-ai-message human-ai-message--assistant"><LoaderCircle className="h-4 w-4 animate-spin" /><p>Reading the board…</p></div>
            ) : null}
          </div>
        )}

        <div className="human-ai-prompts">
          {starterPrompts.map((starter) => (
            <button type="button" key={starter} onClick={() => askCopilot(starter)} disabled={loading}>
              {starter}
            </button>
          ))}
        </div>

        <form className="human-ai-input" onSubmit={(event) => { event.preventDefault(); void askCopilot(); }}>
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask your workspace…"
            aria-label="Ask your workspace"
            maxLength={2000}
          />
          <button type="submit" disabled={!prompt.trim() || loading} aria-label="Send to copilot">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </form>
        <p className="human-ai-card__footnote"><Check className="h-3.5 w-3.5" /> Grounded in your team’s current tasks, not generic advice.</p>
      </div>
    </section>
  );
}
