/**
 * Location UI Components for Nestlé Chatbot
 * Handles location-related user interface elements and interactions
 * 
 * Features:
 * - Location status indicator in chatbot header
 * - Permission request modal/prompt
 * - Visual feedback for location state changes
 * - Pre-made prompts for location-based queries
 * 
 * Author: Paramvir (Vick) Gill
 */

class LocationUI {
    constructor(chatbotInstance, locationService) {
        this.chatbot = chatbotInstance;
        this.locationService = locationService;
        this.locationIndicator = null;
        this.permissionModal = null;
        
        this.initializeLocationUI();
        this.attachLocationEventListeners();
    }

    /**
     * Initialize location UI components
     */
    initializeLocationUI() {
        this.createLocationIndicator();
        this.createPermissionModal();
        this.createLocationPrompts();
        this.updateLocationStatus();
    }

    /**
     * Create location status indicator in chatbot header
     */
    createLocationIndicator() {
        const chatbotHeader = document.querySelector('.chatbot-header .header-controls');
        
        if (!chatbotHeader) {
            console.error('Chatbot header not found');
            return;
        }

        // Create location indicator container
        const locationContainer = document.createElement('div');
        locationContainer.className = 'location-indicator-container';
        locationContainer.innerHTML = `
            <div class="location-indicator" id="locationIndicator" title="Location Status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
                </svg>
                <span class="location-status-dot"></span>
            </div>
        `;

        // Insert before minimize button
        const minimizeBtn = chatbotHeader.querySelector('.minimize-btn');
        if (minimizeBtn) {
            chatbotHeader.insertBefore(locationContainer, minimizeBtn);
        } else {
            chatbotHeader.appendChild(locationContainer);
        }

        this.locationIndicator = document.getElementById('locationIndicator');
        this.attachLocationIndicatorEvents();

        // Add CSS styles
        this.addLocationIndicatorStyles();
    }

    /**
     * Add CSS styles for location indicator
     */
    addLocationIndicatorStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .location-indicator-container {
                position: relative;
                display: flex;
                align-items: center;
                margin-right: 8px;
            }

            .location-indicator {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 6px;
                width: 28px;
                height: 28px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                transition: all 0.3s ease;
                position: relative;
            }

            .location-indicator:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.05);
            }

            .location-indicator.enabled {
                background: rgba(76, 175, 80, 0.3);
            }

            .location-indicator.disabled {
                background: rgba(244, 67, 54, 0.3);
            }

            .location-indicator.pending {
                background: rgba(255, 193, 7, 0.3);
                animation: pulse 1.5s infinite;
            }

            .location-status-dot {
                position: absolute;
                top: 2px;
                right: 2px;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #ccc;
                transition: all 0.3s ease;
            }

            .location-indicator.enabled .location-status-dot {
                background: #4CAF50;
                box-shadow: 0 0 4px rgba(76, 175, 80, 0.6);
            }

            .location-indicator.disabled .location-status-dot {
                background: #F44336;
            }

            .location-indicator.pending .location-status-dot {
                background: #FFC107;
                animation: blink 1s infinite;
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }

            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.3; }
            }

            .permission-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }

            .permission-modal.active {
                display: flex;
            }

            .permission-modal-content {
                background: white;
                border-radius: 16px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease;
                text-align: center;
            }

            .permission-modal-header {
                margin-bottom: 16px;
            }

            .permission-modal-icon {
                width: 48px;
                height: 48px;
                margin: 0 auto 12px;
                background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }

            .permission-modal h3 {
                margin: 0 0 8px 0;
                color: #2c3e50;
                font-size: 18px;
                font-weight: 600;
            }

            .permission-modal p {
                margin: 0 0 20px 0;
                color: #666;
                line-height: 1.5;
                font-size: 14px;
            }

            .permission-modal-buttons {
                display: flex;
                gap: 12px;
                justify-content: center;
            }

            .permission-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                min-width: 80px;
            }

            .permission-btn.primary {
                background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%);
                color: white;
            }

            .permission-btn.primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(44, 90, 160, 0.3);
            }

            .permission-btn.secondary {
                background: #f8f9fa;
                color: #666;
                border: 1px solid #ddd;
            }

            .permission-btn.secondary:hover {
                background: #e9ecef;
            }

            .location-prompts {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 16px 0;
                padding: 16px;
                background: #f8f9fa;
                border-radius: 12px;
                border-left: 4px solid #2c5aa0;
            }

            .location-prompt-btn {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 20px;
                padding: 6px 12px;
                font-size: 12px;
                color: #2c5aa0;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }

            .location-prompt-btn:hover {
                background: #2c5aa0;
                color: white;
                transform: translateY(-1px);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Create permission request modal
     */
    createPermissionModal() {
        const modal = document.createElement('div');
        modal.className = 'permission-modal';
        modal.id = 'locationPermissionModal';
        modal.innerHTML = `
            <div class="permission-modal-content">
                <div class="permission-modal-header">
                    <div class="permission-modal-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
                        </svg>
                    </div>
                    <h3>Enable Location Services</h3>
                    <p>Allow SMARTIE to access your location to find nearby stores where you can purchase Nestlé products.</p>
                </div>
                <div class="permission-modal-buttons">
                    <button class="permission-btn secondary" id="locationDenyBtn">Not Now</button>
                    <button class="permission-btn primary" id="locationAllowBtn">Allow Location</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.permissionModal = modal;

        // Attach modal event listeners
        this.attachModalEventListeners();
    }

    /**
     * Create location-based prompt suggestions
     */
    createLocationPrompts() {
        // This will be added to chat messages area when appropriate
        this.locationPromptsHTML = `
            <div class="location-prompts" id="locationPrompts" style="display: none;">
                <div style="font-size: 12px; font-weight: 600; color: #2c5aa0; margin-bottom: 8px;">
                    📍 Try asking about nearby stores:
                </div>
                <button class="location-prompt-btn" data-prompt="Where can I buy KitKat nearby?">
                    Find KitKat stores
                </button>
                <button class="location-prompt-btn" data-prompt="Show me nearby stores with Smarties">
                    Smarties locations
                </button>
                <button class="location-prompt-btn" data-prompt="Where can I buy Quality Street near me?">
                    Quality Street shops
                </button>
                <button class="location-prompt-btn" data-prompt="Find Coffee Crisp in my area">
                    Coffee Crisp nearby
                </button>
            </div>
        `;
    }

    /**
     * Attach event listeners for location indicator
     */
    attachLocationIndicatorEvents() {
        console.log('Attaching location indicator events, element:', this.locationIndicator);
    
    if (this.locationIndicator) {
        this.locationIndicator.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Location indicator clicked!');
            this.handleLocationIndicatorClick();
        });
        console.log('Location indicator event listener attached');
    } else {
        console.error('Location indicator element not found!');
    }
    }

    /**
     * Attach modal event listeners
     */
    attachModalEventListeners() {
        const allowBtn = document.getElementById('locationAllowBtn');
        const denyBtn = document.getElementById('locationDenyBtn');

        if (allowBtn) {
            allowBtn.addEventListener('click', () => {
                this.handleLocationAllow();
            });
        }

        if (denyBtn) {
            denyBtn.addEventListener('click', () => {
                this.handleLocationDeny();
            });
        }

        // Close modal on background click
        this.permissionModal.addEventListener('click', (e) => {
            if (e.target === this.permissionModal) {
                this.hidePermissionModal();
            }
        });
    }

    /**
     * Attach location service event listeners
     */
    attachLocationEventListeners() {
        this.locationService.addEventListener('onLocationUpdate', (location) => {
            this.updateLocationStatus();
            this.showLocationSuccessMessage();
        });

        this.locationService.addEventListener('onPermissionChange', (status) => {
            this.updateLocationStatus();
        });
    }

    /**
     * Handle location indicator click
     */
    handleLocationIndicatorClick() {
        console.log('handleLocationIndicatorClick called');
        const status = this.locationService.getLocationStatus();
        console.log('Current location status:', status);
        
        if (status.permission === 'denied') {
            // Show JavaScript confirm dialog for denied permissions
            const userWantsToEnable = confirm(
                "Location access is currently blocked.\n\n" +
                "To find nearby Nestlé stores, please:\n" +
                "1. Click 'OK' to try again\n" +
                "2. Allow location when your browser asks\n\n" +
                "If that doesn't work:\n" +
                "• Click the lock icon in your address bar\n" +
                "• Set location to 'Allow'\n" +
                "• Refresh the page\n\n" +
                "Would you like to try enabling location now?"
            );
            
            if (userWantsToEnable) {
                console.log('User wants to enable location - resetting permission state');
                
                // Reset permission state to allow fresh attempt
                this.locationService.locationPermission = 'unknown';
                this.locationService.locationEnabled = false;
                this.locationService.userLocation = null;
                
                this.showPermissionModal();
                this.attemptLocationRequest();
            } else {
                this.showLocationDeniedMessage();
            }
        } else if (status.permission === 'granted' && status.enabled) {
            this.showLocationInfoMessage();
        } else {
            console.log('Showing permission modal');
            this.showPermissionModal();
        }
    }

    /**
     * Handle location allow button click
     */
    async handleLocationAllow() {
        try {
            this.updateLocationStatus('pending');
            await this.locationService.requestLocationPermission();
            this.hidePermissionModal();
            this.showLocationPrompts();
        } catch (error) {
            console.error('Location permission error:', error);
            this.hidePermissionModal();
            this.showLocationErrorMessage(error.message);
        }
    }

    /**
     * Handle location deny button click
     */
    handleLocationDeny() {
        this.hidePermissionModal();
        this.showLocationDeniedMessage();
    }

    /**
     * Show/hide permission modal
     */
    showPermissionModal() {
        if (this.permissionModal) {
            this.permissionModal.classList.add('active');
        }
    }

    hidePermissionModal() {
        if (this.permissionModal) {
            this.permissionModal.classList.remove('active');
        }
    }

    /**
     * Update location status indicator
     */
    updateLocationStatus(forceStatus = null) {
        if (!this.locationIndicator) return;

        const status = forceStatus || this.locationService.getLocationStatus();
        
        // Remove existing status classes
        this.locationIndicator.classList.remove('enabled', 'disabled', 'pending');
        
        // Add appropriate status class
        if (forceStatus === 'pending') {
            this.locationIndicator.classList.add('pending');
            this.locationIndicator.title = 'Requesting location...';
        } else if (status.enabled && status.permission === 'granted') {
            this.locationIndicator.classList.add('enabled');
            this.locationIndicator.title = 'Location enabled - Click for info';
        } else if (status.permission === 'denied') {
            this.locationIndicator.classList.add('disabled');
            this.locationIndicator.title = 'Location access denied - Click to enable';
        } else {
            this.locationIndicator.classList.add('disabled');
            this.locationIndicator.title = 'Click to enable location services';
        }
    }

    /**
     * Show location-based prompts in chat
     */
    showLocationPrompts() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        // Remove existing prompts
        const existingPrompts = document.getElementById('locationPrompts');
        if (existingPrompts) {
            existingPrompts.remove();
        }

        // Add new prompts
        const promptsDiv = document.createElement('div');
        promptsDiv.innerHTML = this.locationPromptsHTML;
        const prompts = promptsDiv.firstElementChild;
        prompts.style.display = 'block';

        chatMessages.appendChild(prompts);

        // Attach click listeners to prompt buttons
        const promptButtons = prompts.querySelectorAll('.location-prompt-btn');
        promptButtons.forEach(button => {
            button.addEventListener('click', () => {
                const prompt = button.getAttribute('data-prompt');
                this.chatbot.messageInput.value = prompt;
                this.chatbot.sendMessage();
                prompts.style.display = 'none';
            });
        });

        this.chatbot.scrollToBottom();
    }

    /**
     * Chat message helpers
     */
    showLocationSuccessMessage() {
        const message = "🎉 Location enabled! I can now help you find nearby stores carrying Nestlé products. Try asking 'Where can I buy KitKat nearby?'";
        this.chatbot.addMessage(message, 'bot');
        this.showLocationPrompts();
    }

    showLocationDeniedMessage() {
        const message = "📍 No problem! You can still ask me about stores by mentioning your city (e.g., 'Find KitKat stores in Toronto') and I'll help you find nearby locations.";
        this.chatbot.addMessage(message, 'bot');
    }

    showLocationErrorMessage(errorMessage) {
        const message = `❌ Unable to get your location: ${errorMessage}. You can still ask me about stores in your city or area.`;
        this.chatbot.addMessage(message, 'bot');
    }

    showLocationInfoMessage() {
        const location = this.locationService.getUserLocation();
        if (location) {
            const message = `📍 Location services are active. Your approximate location is being used to find nearby stores. Last updated: ${new Date(location.timestamp).toLocaleTimeString()}`;
            this.chatbot.addMessage(message, 'bot');
            this.showLocationPrompts();
        }
    }

    /**
     * Handle location-based queries from chatbot
     */
    async handleLocationQuery(message, productName = null) {
        if (!this.locationService.isLocationEnabled()) {
            // Prompt user to enable location
            const enableMessage = "📍 To find nearby stores, I'll need access to your location. Would you like to enable location services?";
            this.chatbot.addMessage(enableMessage, 'bot');
            
            // Show a location enable button in the chat
            this.showLocationEnablePrompt();
            return null;
        }

        try {
            let nearbyStores;
            if (productName) {
                nearbyStores = this.locationService.findStoresWithProduct(productName);
            } else {
                nearbyStores = this.locationService.findNearbyStores();
            }

            return this.locationService.generateStoreResponse(productName || 'Nestlé products', nearbyStores);
        } catch (error) {
            console.error('Error handling location query:', error);
            return "I'm having trouble finding nearby stores right now. Please try again later or tell me your city and I'll help you find stores in your area.";
        }
    }

    /**
     * Show location enable prompt in chat
     */
    showLocationEnablePrompt() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        const enablePrompt = document.createElement('div');
        enablePrompt.className = 'message bot-message';
        enablePrompt.innerHTML = `
            <div class="message-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17L10.5 10.84L11.92 12.25L17.58 6.59L20.25 9.26L21 9ZM1 9L2.26 9.26L4.93 6.59L10.59 12.25L12 10.84L6.34 5.17L9 2.5L7.5 1L1 7V9ZM12 13.5C7.03 13.5 3 17.53 3 22.5H21C21 17.53 16.97 13.5 12 13.5Z" fill="currentColor"/>
                </svg>
            </div>
            <div class="message-content">
                <div style="text-align: center; padding: 12px;">
                    <button id="enableLocationInChat" style="
                        background: linear-gradient(135deg, #2c5aa0 0%, #1e3d72 100%);
                        color: white;
                        border: none;
                        border-radius: 24px;
                        padding: 10px 20px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin: 0 auto;
                    ">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
                        </svg>
                        Enable Location Services
                    </button>
                </div>
            </div>
        `;

        chatMessages.appendChild(enablePrompt);

        // Add hover effect
        const enableBtn = document.getElementById('enableLocationInChat');
        enableBtn.addEventListener('mouseenter', () => {
            enableBtn.style.transform = 'translateY(-2px)';
            enableBtn.style.boxShadow = '0 6px 20px rgba(44, 90, 160, 0.4)';
        });
        enableBtn.addEventListener('mouseleave', () => {
            enableBtn.style.transform = '';
            enableBtn.style.boxShadow = '';
        });

        enableBtn.addEventListener('click', () => {
            this.showPermissionModal();
            enablePrompt.style.opacity = '0.5';
            enableBtn.disabled = true;
        });

        this.chatbot.scrollToBottom();
    }

    /**
     * Check if message contains location-related query
     */
    isLocationQuery(message) {
        const locationKeywords = [
            'near me', 'nearby', 'close by', 'in my area', 'around here',
            'where can i buy', 'where to buy', 'stores near', 'shops near',
            'find stores', 'locate stores', 'store locator'
        ];
        
        const messageLower = message.toLowerCase();
        return locationKeywords.some(keyword => messageLower.includes(keyword));
    }

    /**
     * Extract product name from location query
     */
    extractProductFromQuery(message) {
        const products = ['kitkat', 'kit kat', 'smarties', 'quality street', 'coffee crisp', 'aero', 'butterfinger'];
        const messageLower = message.toLowerCase();
        
        for (const product of products) {
            if (messageLower.includes(product)) {
                return product;
            }
        }
        return null;
    }

    /**
     * Public API methods
     */
    getLocationService() {
        return this.locationService;
    }

    isLocationEnabled() {
        return this.locationService.isLocationEnabled();
    }

    getCurrentLocation() {
        return this.locationService.getUserLocation();
    }

    // Clean up method
    destroy() {
        if (this.permissionModal) {
            this.permissionModal.remove();
        }
        
        const locationPrompts = document.getElementById('locationPrompts');
        if (locationPrompts) {
            locationPrompts.remove();
        }
    }

    async attemptLocationRequest() {
        try {
            console.log('Attempting direct location request...');
            
            // Reset permission state for fresh attempt
            this.locationService.locationPermission = 'unknown';
            this.locationService.locationEnabled = false;
            this.locationService.userLocation = null;
            
            await this.locationService.requestLocationPermission();
            console.log('Location request successful!');
            this.hidePermissionModal();
        } catch (error) {
            console.log('Location request failed:', error);
            // If it fails, show the custom modal as backup
            this.showPermissionModal();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocationUI;
} else if (typeof window !== 'undefined') {
    window.LocationUI = LocationUI;
}