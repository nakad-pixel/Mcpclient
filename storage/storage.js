export const Storage = {
    KEYS: {
        SERVERS: 'mcp_client_servers',
        MODELS: 'mcp_client_models',
        ACTIVE_MODEL: 'mcp_client_activeModel',
        COUNCIL_ENABLED: 'mcp_client_councilEnabled',
        COUNCIL_MODELS: 'mcp_client_councilModels',
        CHAT_HISTORY: 'mcp_client_chatHistory',
        THEME: 'mcp_client_theme',
        UI_PREFS: 'mcp_client_uiPreferences'
    },

    save(key, data) {
        try {
            // Don't save API keys to local storage if they are in the models
            const dataToSave = JSON.parse(JSON.stringify(data));
            if (key === this.KEYS.MODELS) {
                dataToSave.forEach(model => {
                    delete model.apiKey;
                });
            }
            localStorage.setItem(key, JSON.stringify(dataToSave));
        } catch (e) {
            console.error('Error saving to localStorage', e);
        }
    },

    load(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Error loading from localStorage', e);
            return null;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    clear() {
        localStorage.clear();
    },

    exportChatHistory() {
        const history = this.load(this.KEYS.CHAT_HISTORY) || [];
        return JSON.stringify(history, null, 2);
    }
};
