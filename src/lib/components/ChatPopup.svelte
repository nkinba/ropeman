<script lang="ts">
  import { chatOpen, chatMessages, chatLoading, toggleChat, addMessage } from '$lib/stores/chatStore';
  import type { ChatMessage as ChatMessageType } from '$lib/stores/chatStore';
  import { t } from '$lib/stores/i18nStore';
  import { sendMessage } from '$lib/services/aiService';
  import { selectionStore } from '$lib/stores/selectionStore.svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte';
  import { authStore } from '$lib/stores/authStore.svelte';
  import ChatMessage from './ChatMessage.svelte';

  let isOpen = $state(false);
  let messages = $state<ChatMessageType[]>([]);
  let isLoading = $state(false);
  let tFunc = $state<(key: string) => string>((key: string) => key);

  let inputText = $state('');
  let messagesContainer = $state<HTMLDivElement | null>(null);
  let lastFromCache = $state(false);

  let { onconnect }: { onconnect?: () => void } = $props();

  $effect(() => {
    const unsubOpen = chatOpen.subscribe(v => { isOpen = v; });
    const unsubMessages = chatMessages.subscribe(msgs => { messages = msgs; });
    const unsubLoading = chatLoading.subscribe(v => { isLoading = v; });
    const unsubT = t.subscribe(fn => { tFunc = fn; });
    return () => { unsubOpen(); unsubMessages(); unsubLoading(); unsubT(); };
  });

  $effect(() => {
    if (messages.length && messagesContainer) {
      setTimeout(() => {
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 0);
    }
  });

  let sendDisabled = $derived(isLoading || !inputText.trim());

  async function handleSend(): Promise<void> {
    const text = inputText.trim();
    if (!text || isLoading) return;

    inputText = '';
    lastFromCache = false;
    addMessage('user', text);
    chatLoading.set(true);

    try {
      const currentMessages = messages;
      const history = currentMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const nodeContext = selectionStore.selectedNode;
      const response = await sendMessage(text, nodeContext, history);
      lastFromCache = response.fromCache ?? false;
      addMessage('assistant', response.content, response.relatedNodes);
    } catch (error) {
      addMessage('assistant', `Error: ${(error as Error).message}`);
    } finally {
      chatLoading.set(false);
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }
</script>

{#if isOpen}
  <div class="chat-popup">
    <div class="chat-header">
      <span class="chat-header-title">{tFunc('chatTitle')}</span>
      <button class="chat-close-btn" onclick={toggleChat}>&#10005;</button>
    </div>

    {#if !authStore.isReady}
      <div class="chat-warning">
        <span>AI not connected</span>
        {#if onconnect}
          <button class="chat-warning-link" onclick={onconnect}>
            Connect
          </button>
        {/if}
      </div>
    {/if}

    <div class="chat-messages" bind:this={messagesContainer}>
      {#if messages.length === 0}
        <p class="chat-empty-state">{tFunc('chatPlaceholder')}</p>
      {/if}

      {#each messages as msg, i (msg.timestamp)}
        <ChatMessage message={msg} />
        {#if lastFromCache && i === messages.length - 1 && msg.role === 'assistant'}
          <div class="cache-hit-badge">cached</div>
        {/if}
      {/each}

      {#if isLoading}
        <div class="chat-loading">
          <span>{tFunc('loading')}</span>
          <span class="chat-loading-dots"><span>.</span><span>.</span><span>.</span></span>
        </div>
      {/if}
    </div>

    <div class="chat-input-area">
      <textarea
        class="chat-input"
        placeholder={tFunc('chatPlaceholder')}
        bind:value={inputText}
        onkeydown={handleKeydown}
        rows="1"
      ></textarea>
      <button class="chat-send-btn" onclick={handleSend} disabled={sendDisabled}>
        {tFunc('send')}
      </button>
    </div>
  </div>
{/if}

<button class="chat-float-btn" onclick={toggleChat}>
  {isOpen ? '✕' : '💬'}
</button>

<style>
  .chat-empty-state { color: var(--text-secondary); text-align: center; margin-top: 40px; font-size: 13px; }
  .chat-input { resize: none; overflow-y: auto; max-height: 80px; }
  .chat-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(243, 139, 168, 0.15);
    border-bottom: 1px solid rgba(243, 139, 168, 0.3);
    font-size: 12px;
    color: #f38ba8;
  }
  .chat-warning-link {
    background: none;
    border: none;
    color: var(--accent-color, #89b4fa);
    cursor: pointer;
    font-size: 12px;
    text-decoration: underline;
    padding: 0;
  }
  .cache-hit-badge {
    display: inline-block;
    margin: 0 0 8px 12px;
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(166, 227, 161, 0.15);
    color: #a6e3a1;
    font-size: 10px;
    font-weight: 500;
  }
</style>
