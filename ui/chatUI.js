export class ChatUI {
    constructor(chatMessagesId, chatInputId, sendBtnId) {
        this.container = document.getElementById(chatMessagesId);
        this.input = document.getElementById(chatInputId);
        this.sendBtn = document.getElementById(sendBtnId);
    }

    renderMessage(message) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${message.role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        let textContent = '';
        if (Array.isArray(message.content)) {
            textContent = message.content.map(c => c.type === 'text' ? c.text : '').join('\n');
        } else {
            textContent = message.content || '';
        }

        if (message.role === 'tool') {
            msgDiv.classList.add('tool-message');
            contentDiv.innerHTML = this.renderToolResult(message);
        } else if (message.tool_use && message.tool_use.length > 0) {
            contentDiv.innerHTML = (textContent ? this.formatMarkdown(textContent) : '') + 
                                  message.tool_use.map(tu => this.renderToolCall(tu)).join('');
        } else {
            contentDiv.innerHTML = this.formatMarkdown(textContent);
            if (message.attachments) {
                message.attachments.forEach(att => {
                    if (att.type === 'image') {
                        const img = document.createElement('img');
                        img.src = att.data;
                        img.style.maxWidth = '100%';
                        img.style.borderRadius = '0.5rem';
                        img.style.marginTop = '0.5rem';
                        img.style.display = 'block';
                        contentDiv.appendChild(img);
                    } else {
                        const link = document.createElement('div');
                        link.className = 'file-attachment';
                        link.innerHTML = `📎 ${att.name}`;
                        link.style.fontSize = '0.8rem';
                        link.style.marginTop = '0.5rem';
                        contentDiv.appendChild(link);
                    }
                });
            }
        }

        const metaDiv = document.createElement('div');
        metaDiv.className = 'message-meta';
        metaDiv.innerHTML = `
            <span>${new Date().toLocaleTimeString()}</span>
            <button class="icon-btn tiny-btn copy-btn" title="Copy Message">📋</button>
            <button class="icon-btn tiny-btn delete-msg-btn" title="Delete Message">🗑️</button>
        `;

        metaDiv.querySelector('.copy-btn').onclick = () => {
            navigator.clipboard.writeText(message.content || '');
        };

        metaDiv.querySelector('.delete-msg-btn').onclick = () => {
            msgDiv.remove();
        };

        msgDiv.appendChild(contentDiv);
        msgDiv.appendChild(metaDiv);
        this.container.appendChild(msgDiv);
        this.scrollToBottom();
    }

    renderToolCall(toolCall) {
        return `
            <div class="tool-call">
                <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    🛠️ Call: ${toolCall.name} ▾
                </div>
                <div class="tool-details hidden">
                    <pre>${JSON.stringify(toolCall.input, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    renderToolResult(message) {
        return `
            <div class="tool-result">
                <div class="tool-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    ✅ Result: ${message.name} ▾
                </div>
                <div class="tool-details hidden">
                    <pre>${message.content}</pre>
                </div>
            </div>
        `;
    }

    formatMarkdown(text) {
        if (!text) return '';
        
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Lists (simple)
            .replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            // Headings
            .replace(/^# (.*)$/gm, '<h1>$1</h1>')
            .replace(/^## (.*)$/gm, '<h2>$1</h2>')
            .replace(/^### (.*)$/gm, '<h3>$1</h3>');

        return html.replace(/\n/g, '<br>');
    }

    scrollToBottom() {
        this.container.parentElement.scrollTop = this.container.parentElement.scrollHeight;
    }

    clearInput() {
        this.input.value = '';
        this.input.style.height = 'auto';
    }

    showLoading() {
        const loader = document.createElement('div');
        loader.id = 'chat-loader';
        loader.className = 'message assistant loading';
        loader.innerHTML = '<div class="message-content">Thinking...</div>';
        this.container.appendChild(loader);
        this.scrollToBottom();
    }

    hideLoading() {
        const loader = document.getElementById('chat-loader');
        if (loader) loader.remove();
    }
}
