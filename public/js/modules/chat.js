/**
 * Smart Campus AI - Streaming AI Chat Assistant Module
 * Features:
 * - Streaming responses over Server-Sent Events (SSE)
 * - Safe Markdown rendering via DOMPurify
 * - Suggested quick prompts
 * - Copy response to clipboard with animated feedback
 * - Regenerate response button
 * - Visible "Offline Mode" badge
 */

(function (window) {
  'use strict';

  let chatHistory = [];
  let lastUserMessage = '';
  let isGenerating = false;

  // Suggested Prompts Collection
  const SUGGESTED_PROMPTS = [
    'How many classes can I safely skip?',
    'What is on my schedule today?',
    'When do mid-semester exams start?',
    'Explain deadlock prevention rules in OS',
    'Am I at risk of attendance shortage?',
    'How do I calculate placement CGPA?'
  ];

  function initChat() {
    const box = document.getElementById('aiChatMessages');
    const input = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('aiChatSendBtn');
    const header = document.getElementById('aiChatHeader') || document.querySelector('#chat .p-4.border-b') || box?.parentElement?.firstElementChild;

    if (!box || !input) return;

    // 1. Inject or update the Engine Mode Badge in the chat header
    let badge = document.getElementById('aiEngineStatusBadge');
    if (!badge && header) {
      badge = document.createElement('div');
      badge.id = 'aiEngineStatusBadge';
      badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> <span>AI Engine: Ready</span>';
      header.appendChild(badge);
    }

    // 2. Render suggested prompt chips above the composer
    let chipsContainer = document.getElementById('aiSuggestedPromptChips');
    if (!chipsContainer && input.parentElement) {
      chipsContainer = document.createElement('div');
      chipsContainer.id = 'aiSuggestedPromptChips';
      chipsContainer.className = 'flex flex-wrap items-center gap-2 px-4 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-xs';
      chipsContainer.setAttribute('role', 'group');
      chipsContainer.setAttribute('aria-label', 'Suggested Questions');

      chipsContainer.innerHTML = `
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0"><i class="fas fa-lightbulb text-amber-400 mr-1"></i> Suggested:</span>
        ${SUGGESTED_PROMPTS.map((p) => `
          <button type="button" class="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition font-medium hover:border-indigo-400 focus:outline-none" onclick="window.sendSuggestedPrompt('${escapeHtml(p)}')">
            ${escapeHtml(p)}
          </button>
        `).join('')}
      `;
      input.parentElement.insertBefore(chipsContainer, input.parentElement.firstChild);
    }

    // 3. Bind Keyboard Events (Enter sends, Shift+Enter adds newline)
    if (!input.dataset.bound) {
      input.dataset.bound = '1';
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendStreamingChatMessage();
        }
      });
    }

    // 4. Bind Send Button
    if (sendBtn && !sendBtn.dataset.bound) {
      sendBtn.dataset.bound = '1';
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sendStreamingChatMessage();
      });
    }

    // Override legacy features.js handler
    window.sendAIChatMessage = sendStreamingChatMessage;
  }

  window.sendSuggestedPrompt = function (text) {
    const input = document.getElementById('aiChatInput');
    if (!input) return;
    input.value = text;
    sendStreamingChatMessage();
  };

  async function sendStreamingChatMessage() {
    if (isGenerating) return;
    const input = document.getElementById('aiChatInput');
    const box = document.getElementById('aiChatMessages');
    if (!input || !box) return;

    const text = input.value.trim();
    if (!text) return;

    lastUserMessage = text;
    input.value = '';
    isGenerating = true;

    // Render User Message Bubble
    appendMessageBubble('user', text);

    // Create Assistant Message Bubble Placeholder with typing indicator
    const bubbleId = 'ai-msg-' + Date.now();
    const assistantBubble = appendMessageBubble('assistant', '', bubbleId);
    const contentEl = assistantBubble.querySelector('.ai-msg-content');
    const statusMeta = assistantBubble.querySelector('.ai-msg-meta');
    contentEl.innerHTML = '<span class="inline-flex items-center gap-1.5 text-indigo-500 font-bold text-xs"><i class="fas fa-circle-notch fa-spin"></i> Thinking...</span>';

    const token = localStorage.getItem('token') || '';
    let accumulatedText = '';
    let engineUsed = 'offline';
    let modelUsed = '';

    try {
      const response = await fetch('/api/ai/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          message: text,
          history: chatHistory.slice(-8)
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') break;

          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              contentEl.innerHTML = (accumulatedText ? (window.renderAcademicMarkdown || window.renderMarkdown)(accumulatedText) : '') + `<p class="text-rose-500 font-bold mt-2"><i class="fas fa-triangle-exclamation mr-1"></i> ${escapeHtml(data.error)}</p>`;
              engineUsed = 'offline';
            }
            if (data.chunk) {
              accumulatedText += data.chunk;
              engineUsed = data.engine || engineUsed;
              modelUsed = data.model || modelUsed;
              contentEl.innerHTML = (window.renderAcademicMarkdown || window.renderMarkdown)(accumulatedText);
              box.scrollTop = box.scrollHeight;
            }
          } catch {}
        }
      }

      // Add to conversation history
      chatHistory.push({ role: 'user', content: text });
      chatHistory.push({ role: 'assistant', content: accumulatedText });

      // Update Engine Badge
      updateEngineBadge(engineUsed, modelUsed);

      // Render Final Actions: Copy & Regenerate buttons
      renderMessageActions(assistantBubble, accumulatedText, engineUsed, modelUsed);

    } catch (err) {
      console.warn('[chat] Streaming error, falling back to synchronous API:', err);
      try {
        const fallback = await window.api('/ai/chat', { body: { message: text, history: chatHistory } });
        accumulatedText = fallback.reply || 'No response received.';
        engineUsed = fallback.engine || 'offline';
        contentEl.innerHTML = (window.renderAcademicMarkdown || window.renderMarkdown)(accumulatedText);
        updateEngineBadge(engineUsed, fallback.model);
        renderMessageActions(assistantBubble, accumulatedText, engineUsed, fallback.model);
      } catch (fbErr) {
        contentEl.innerHTML = `<span class="text-rose-500 font-bold"><i class="fas fa-triangle-exclamation mr-1"></i> ${escapeHtml(fbErr.message || 'Unable to connect to AI assistant.')}</span>`;
      }
    } finally {
      isGenerating = false;
      box.scrollTop = box.scrollHeight;
      input.focus();
    }
  }

  function appendMessageBubble(role, rawContent, id = null) {
    const box = document.getElementById('aiChatMessages');
    if (!box) return null;

    const div = document.createElement('div');
    if (id) div.id = id;
    div.className = `flex gap-3 mb-4 ${role === 'user' ? 'justify-end' : 'justify-start'} fade-in`;

    if (role === 'user') {
      div.innerHTML = `
        <div class="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-tr-sm bg-indigo-600 text-white p-4 shadow-sm text-xs md:text-sm leading-relaxed">
          ${escapeHtml(rawContent)}
        </div>
      `;
    } else {
      div.innerHTML = `
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 text-sm shadow-md mt-0.5">
          <i class="fas fa-robot"></i>
        </div>
        <div class="max-w-[90%] md:max-w-[80%] rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-4 shadow-sm text-xs md:text-sm text-slate-800 dark:text-slate-100">
          <div class="ai-msg-content leading-relaxed">
            ${rawContent ? (window.renderAcademicMarkdown || window.renderMarkdown)(rawContent) : ''}
          </div>
          <div class="ai-msg-meta flex items-center justify-between text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <span class="engine-tag font-semibold"></span>
            <div class="action-buttons flex items-center gap-2"></div>
          </div>
        </div>
      `;
    }

    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
  }

  function renderMessageActions(bubble, text, engine, model) {
    const meta = bubble.querySelector('.ai-msg-meta');
    if (!meta) return;

    const isOffline = engine === 'offline';
    const engineTag = meta.querySelector('.engine-tag');
    if (engineTag) {
      if (isOffline) {
        engineTag.innerHTML = '<span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold"><i class="fas fa-bolt mr-1"></i>Offline Engine</span>';
      } else {
        engineTag.innerHTML = `<span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold"><i class="fas fa-sparkles mr-1"></i>Google Gemini (${escapeHtml(model || '3.8 Flash')})</span>`;
      }
    }

    const actions = meta.querySelector('.action-buttons');
    if (actions) {
      actions.innerHTML = `
        <button class="copy-reply-btn px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold text-[10px] transition flex items-center gap-1" title="Copy reply to clipboard" onclick="window.copyAiReply(this)">
          <i class="fas fa-copy"></i> <span>Copy</span>
        </button>
        <button class="regen-reply-btn px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold text-[10px] transition flex items-center gap-1" title="Regenerate this response" onclick="window.regenerateLastReply()">
          <i class="fas fa-rotate-right"></i> <span>Regenerate</span>
        </button>
      `;
      actions.dataset.text = text;
    }
  }

  window.copyAiReply = function (btn) {
    const text = btn.parentElement?.dataset?.text || btn.closest('.max-w-\\[90\\%\\]')?.querySelector('.ai-msg-content')?.innerText || '';
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check text-emerald-500"></i> <span class="text-emerald-500">Copied!</span>';
      if (window.toast) window.toast('Response copied to clipboard', 'success', 2000);
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }).catch(() => {
      if (window.toast) window.toast('Failed to copy', 'error');
    });
  };

  window.regenerateLastReply = function () {
    if (!lastUserMessage) return;
    const input = document.getElementById('aiChatInput');
    if (input) input.value = lastUserMessage;
    sendStreamingChatMessage();
  };

  function updateEngineBadge(engine, model) {
    const badge = document.getElementById('aiEngineStatusBadge');
    if (!badge) return;

    if (engine === 'gemini') {
      badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-sm';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> <span>Gemini ${escapeHtml(model || '3.8 Flash')} Active</span>`;
    } else {
      badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-sm';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> <span>⚡ Offline Mode: Local Intelligence</span>`;
    }
  }

  function escapeHtml(s) {
    return window.escapeHtml ? window.escapeHtml(s) : String(s || '');
  }

  window.module_chat = {
    render: initChat
  };

  // Automatically initialize when chat tab loads
  if (window.loaders) {
    const origChat = window.loaders['ai-assistant'] || window.loaders.chat;
    window.loaders.chat = window.loaders['ai-assistant'] = async function () {
      if (typeof origChat === 'function') await origChat();
      initChat();
    };
  }
})(window);

