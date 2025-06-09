class EnhancedNestleChatbot {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.locationService = null;
        this.locationUI = null;
        
        this.initializeElements();
        this.initializeLocationServices();
        this.attachEventListeners();
        this.initializeInteractiveElements();
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

    async initializeLocationServices() {
        try {
            // Initialize location service
            this.locationService = new LocationService();
            
            // Initialize location UI
            this.locationUI = new LocationUI(this, this.locationService);
            
            console.log('Location services initialized successfully');
        } catch (error) {
            console.error('Error initializing location services:', error);
        }
    }

    attachEventListeners() {
        this.chatbotToggle.addEventListener('click', () => this.toggleChatbot());
        this.minimizeBtn.addEventListener('click', () => this.minimizeChatbot());
        this.closeBtn.addEventListener('click', () => this.closeChatbot());
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.messageInput.addEventListener('input', () => this.autoResizeInput());
    }

    initializeInteractiveElements() {
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            card.addEventListener('click', (e) => {
                this.handleProductCardClick(e.currentTarget);
            });
            card.addEventListener('mousedown', (e) => {
                this.createRipple(e, card);
            });
        });

        this.initializeParticleSystem();
        this.initializeScrollEffects();
    }

    handleProductCardClick(card) {
        card.classList.add('clicked');
        setTimeout(() => card.classList.remove('clicked'), 600);

        const productType = card.dataset.product;
        const productName = card.querySelector('h3').textContent;
        
        if (!this.isOpen) {
            this.openChatbot();
        }
        
        setTimeout(async () => {
            let message;
            
            // Check if location is enabled for location-based queries
            if (this.locationService && this.locationService.isLocationEnabled()) {
                message = `Where can I buy ${productName} near me?`;
            } else {
                message = `Tell me more about ${productName} and where I can buy it`;
            }
            
            this.addMessage(message, 'user');
            this.showLoading();
            
            try {
                const requestData = { message: message };
                
                // Include location data if available
                if (this.locationService && this.locationService.isLocationEnabled()) {
                    requestData.location = this.locationService.getUserLocation();
                }
                
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                this.hideLoading();
                
                // Handle location-based responses
                if (data.query_type === 'location' && this.locationUI) {
                    const locationResponse = await this.locationUI.handleLocationQuery(message, productType);
                    if (locationResponse) {
                        this.addMessage(locationResponse, 'bot');
                    } else {
                        this.addMessage(data.response || "I'd be happy to help you learn more about our Nestlé products!", 'bot');
                    }
                } else {
                    this.addMessage(data.response || "I'd be happy to help you learn more about our Nestlé products!", 'bot');
                }
                
            } catch (error) {
                console.error('Error getting product info:', error);
                this.hideLoading();
                this.addMessage(
                    "I'd be happy to help you learn more about our Nestlé products! What specific information are you looking for?",
                    'bot'
                );
            }
        }, 500);
    }

    createRipple(event, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(139, 69, 19, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
        `;
        
        element.style.position = 'relative';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    initializeParticleSystem() {
        const particlesContainer = document.querySelector('.bg-particles');
        
        for (let i = 4; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(139, 69, 19, ${0.05 + Math.random() * 0.1});
                width: ${20 + Math.random() * 60}px;
                height: ${20 + Math.random() * 60}px;
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
                animation: bgFloat ${10 + Math.random() * 10}s infinite linear;
                animation-delay: ${Math.random() * 5}s;
            `;
            particlesContainer.appendChild(particle);
        }
    }

    initializeScrollEffects() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        document.querySelectorAll('.product-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s ease';
            observer.observe(card);
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
        this.trackEvent('chatbot_opened');
    }

    closeChatbot() {
        this.chatbotWindow.classList.remove('active');
        this.isOpen = false;
        this.trackEvent('chatbot_closed');
    }

    minimizeChatbot() {
        this.closeChatbot();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isLoading) return;

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.autoResizeInput();
        this.showLoading();

        try {
            const requestData = { message: message };
            
            // Include location data if available and relevant
            if (this.locationService && this.locationService.isLocationEnabled() && 
                this.locationUI && this.locationUI.isLocationQuery(message)) {
                requestData.location = this.locationService.getUserLocation();
            }

            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            this.hideLoading();
            
            // Handle different response types
            if (data.query_type === 'location' && this.locationUI) {
                const productName = this.locationUI.extractProductFromQuery(message);
                const locationResponse = await this.locationUI.handleLocationQuery(message, productName);
                if (locationResponse) {
                    this.addMessage(locationResponse, 'bot');
                } else {
                    this.addMessage(data.response || "I'm sorry, I didn't receive a proper response. Please try again.", 'bot');
                }
            } else {
                this.addMessage(data.response || "I'm sorry, I didn't receive a proper response. Please try again.", 'bot');
            }
            
            this.saveChatHistory();
            this.trackEvent('message_sent', { message_length: message.length, query_type: data.query_type });

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
        contentDiv.innerHTML = `<p>${this.processMessageContent(content)}</p>`;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    processMessageContent(content) {
        return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
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
                    content: msg.querySelector('.message-content p').textContent,
                    sender: msg.classList.contains('user-message') ? 'user' : 'bot',
                    timestamp: Date.now()
                }));
            
            localStorage.setItem('nestle_chat_history', JSON.stringify(messages.slice(-20)));
        } catch (error) {
            console.warn('Could not save chat history:', error);
        }
    }

    loadChatHistory() {
        try {
            const history = localStorage.getItem('nestle_chat_history');
            if (history) {
                const messages = JSON.parse(history);
                const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
                const recentMessages = messages.filter(msg => msg.timestamp > dayAgo);
                
                const welcomeMessage = this.chatMessages.querySelector('.message');
                this.chatMessages.innerHTML = '';
                if (welcomeMessage) {
                    this.chatMessages.appendChild(welcomeMessage);
                }
                
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
        contentDiv.innerHTML = `<p>${content}</p>`;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);

        this.chatMessages.appendChild(messageDiv);
    }

    trackEvent(eventName, data = {}) {
        try {
            if (typeof gtag !== 'undefined') {
                gtag('event', eventName, data);
            }
            console.log('Event tracked:', eventName, data);
        } catch (error) {
            console.warn('Analytics tracking failed:', error);
        }
    }

    async refreshKnowledge() {
        try {
            const response = await fetch('/refresh-knowledge', { method: 'POST' });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error refreshing knowledge:', error);
            return { error: 'Failed to refresh knowledge' };
        }
    }

    clearChatHistory() {
        try {
            localStorage.removeItem('nestle_chat_history');
            const welcomeMessage = this.chatMessages.querySelector('.message');
            this.chatMessages.innerHTML = '';
            if (welcomeMessage) {
                this.chatMessages.appendChild(welcomeMessage);
            }
        } catch (error) {
            console.warn('Could not clear chat history:', error);
        }
    }

    // Public API for location services
    getLocationService() {
        return this.locationService;
    }

    getLocationUI() {
        return this.locationUI;
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.nestleChatbot = new EnhancedNestleChatbot();
    
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