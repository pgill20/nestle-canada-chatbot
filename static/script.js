class NestleChatbot {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.initializeElements();
        this.attachEventListeners();
        this.loadChatHistory();
    }

    initializeElements() {
        this.chatbotToggle = document.getElementById('chatbotToggle');
        this.chatbotWindow = document.getElementById('chatbotWindow');
        this.minimizeBtn = document.getElementById('minimizeBtn');
        this.closeBtn = document.getElementById('closeBtn');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.loadingIndicator = document.getElementById('loadingIndicator');
    }

    attachEventListeners() {
        // Toggle chatbot
        this.chatbotToggle.addEventListener('click', () => this.toggleChatbot());
        
        // Minimize and close buttons
        this.minimizeBtn.addEventListener('click', () => this.minimizeChatbot());
        this.closeBtn.addEventListener('click', () => this.closeChatbot());
        
        // Send message
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize input
        this.messageInput.addEventListener('input', () => this.autoResizeInput());
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.chatbotToggle.contains(e.target) && 
                !this.chatbotWindow.contains(e.target) && 
                this.isOpen) {
                // Optional: uncomment to close on outside click
                // this.closeChatbot();
            }
        });
    }

    toggleChatbot() {
        if (this.isOpen) {
            this.closeChatbot();
        } else {
            this.openChatbot();
        }
    }

    openChatbot() {
        this.chatbotWindow.classList.add('active');
        this.isOpen = true;
        this.messageInput.focus();
        this.scrollToBottom();
        
        // Analytics event (optional)
        this.trackEvent('chatbot_opened');
    }

    closeChatbot() {
        this.chatbotWindow.classList.remove('active');
        this.isOpen = false;
        
        // Analytics event (optional)
        this.trackEvent('chatbot_closed');
    }

    minimizeChatbot() {
        this.closeChatbot();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isLoading) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.autoResizeInput();

        // Show loading indicator
        this.showLoading();

        try {
            // Send message to backend
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Hide loading and add bot response
            this.hideLoading();
            this.addMessage(data.response, 'bot');
            
            // Save to chat history
            this.saveChatHistory();
            
            // Analytics event
            this.trackEvent('message_sent', { message_length: message.length });

        } catch (error) {
            console.error('Error sending message:', error);
            this.hideLoading();
            this.addMessage(
                "I'm sorry, I'm having trouble connecting right now. Please try again later or visit www.madewithnestle.ca for more information.",
                'bot'
            );
        }
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        
        if (sender === 'bot') {
            avatarDiv.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17L10.5 10.84L11.92 12.25L17.58 6.59L20.25 9.26L21 9ZM1 9L2.26 9.26L4.93 6.59L10.59 12.25L12 10.84L6.34 5.17L9 2.5L7.5 1L1 7V9ZM12 13.5C7.03 13.5 3 17.53 3 22.5H21C21 17.53 16.97 13.5 12 13.5Z" fill="currentColor"/>
                </svg>
            `;
        } else {
            avatarDiv.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                </svg>
            `;
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Process content to handle links and formatting
        const processedContent = this.processMessageContent(content);
        contentDiv.innerHTML = processedContent;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    processMessageContent(content) {
        // Convert markdown-style links to HTML
        let processed = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Convert newlines to <br> tags
        processed = processed.replace(/\n/g, '<br>');
        
        // Wrap in paragraph tags if not already HTML
        if (!processed.includes('<')) {
            processed = `<p>${processed}</p>`;
        }
        
        return processed;
    }

    showLoading() {
        this.isLoading = true;
        this.loadingIndicator.style.display = 'flex';
        this.sendButton.disabled = true;
        this.scrollToBottom();
    }

    hideLoading() {
        this.isLoading = false;
        this.loadingIndicator.style.display = 'none';
        this.sendButton.disabled = false;
    }

    autoResizeInput() {
        const input = this.messageInput;
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    saveChatHistory() {
        try {
            const messages = Array.from(this.chatMessages.children)
                .filter(msg => msg.classList.contains('message'))
                .map(msg => ({
                    content: msg.querySelector('.message-content').innerHTML,
                    sender: msg.classList.contains('user-message') ? 'user' : 'bot',
                    timestamp: Date.now()
                }));
            
            localStorage.setItem('nestle_chat_history', JSON.stringify(messages.slice(-20))); // Keep last 20 messages
        } catch (error) {
            console.warn('Could not save chat history:', error);
        }
    }

    loadChatHistory() {
        try {
            const history = localStorage.getItem('nestle_chat_history');
            if (history) {
                const messages = JSON.parse(history);
                // Only load recent messages (last 24 hours)
                const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
                const recentMessages = messages.filter(msg => msg.timestamp > dayAgo);
                
                // Clear existing messages except welcome message
                const welcomeMessage = this.chatMessages.querySelector('.message');
                this.chatMessages.innerHTML = '';
                if (welcomeMessage) {
                    this.chatMessages.appendChild(welcomeMessage);
                }
                
                // Add historical messages
                recentMessages.forEach(msg => {
                    if (msg.content && msg.sender) {
                        this.addMessageFromHistory(msg.content, msg.sender);
                    }
                });
            }
        } catch (error) {
            console.warn('Could not load chat history:', error);
        }
    }

    addMessageFromHistory(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        
        if (sender === 'bot') {
            avatarDiv.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17L10.5 10.84L11.92 12.25L17.58 6.59L20.25 9.26L21 9ZM1 9L2.26 9.26L4.93 6.59L10.59 12.25L12 10.84L6.34 5.17L9 2.5L7.5 1L1 7V9ZM12 13.5C7.03 13.5 3 17.53 3 22.5H21C21 17.53 16.97 13.5 12 13.5Z" fill="currentColor"/>
                </svg>
            `;
        } else {
            avatarDiv.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                </svg>
            `;
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = content;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
    }

    trackEvent(eventName, data = {}) {
        // Analytics tracking - replace with your preferred analytics service
        try {
            if (typeof gtag !== 'undefined') {
                gtag('event', eventName, data);
            }
            console.log('Event tracked:', eventName, data);
        } catch (error) {
            console.warn('Analytics tracking failed:', error);
        }
    }

    // Public methods for external access
    refreshKnowledge() {
        return fetch('/refresh-knowledge', { method: 'POST' })
            .then(response => response.json())
            .catch(error => console.error('Error refreshing knowledge:', error));
    }

    clearChatHistory() {
        try {
            localStorage.removeItem('nestle_chat_history');
            // Keep only the welcome message
            const welcomeMessage = this.chatMessages.querySelector('.message');
            this.chatMessages.innerHTML = '';
            if (welcomeMessage) {
                this.chatMessages.appendChild(welcomeMessage);
            }
        } catch (error) {
            console.warn('Could not clear chat history:', error);
        }
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.nestleChatbot = new NestleChatbot();
    
    // Optional: Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Alt + C to toggle chatbot
        if (e.altKey && e.key === 'c') {
            e.preventDefault();
            window.nestleChatbot.toggleChatbot();
        }
        
        // Escape to close chatbot
        if (e.key === 'Escape' && window.nestleChatbot.isOpen) {
            window.nestleChatbot.closeChatbot();
        }
    });
    
    // Handle visibility change (pause/resume functionality)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Page is hidden, could pause certain operations
            console.log('Page hidden');
        } else {
            // Page is visible, resume operations
            console.log('Page visible');
        }
    });
});