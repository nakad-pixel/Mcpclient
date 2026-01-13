export class SidebarUI {
    constructor(app) {
        this.app = app;
        this.modelList = document.getElementById('model-list');
        this.serverList = document.getElementById('server-list');
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('open-sidebar').onclick = () => {
            document.getElementById('sidebar').classList.remove('collapsed');
        };
        document.getElementById('close-sidebar').onclick = () => {
            document.getElementById('sidebar').classList.add('collapsed');
        };

        document.getElementById('add-model-btn').onclick = () => {
            this.showModal('model-modal');
        };
        document.getElementById('add-server-btn').onclick = () => {
            this.showModal('server-modal');
        };

        document.getElementById('cancel-model-btn').onclick = () => this.hideModals();
        document.getElementById('cancel-server-btn').onclick = () => this.hideModals();

        document.getElementById('test-model-btn').onclick = async () => {
            const config = {
                endpoint: document.getElementById('model-endpoint').value,
                apiKey: document.getElementById('model-key').value
            };
            const btn = document.getElementById('test-model-btn');
            btn.textContent = 'Testing...';
            const ok = await this.app.llmManager.validateApiKey(config);
            btn.textContent = ok ? '✅ Success' : '❌ Failed';
            setTimeout(() => btn.textContent = 'Test Connection', 2000);
        };

        document.getElementById('test-server-btn').onclick = async () => {
            const url = document.getElementById('server-url').value;
            const auth = document.getElementById('server-auth').value;
            const btn = document.getElementById('test-server-btn');
            btn.textContent = 'Testing...';
            const ok = await this.app.mcpClient.testConnection(url, auth);
            btn.textContent = ok ? '✅ Success' : '❌ Failed';
            setTimeout(() => btn.textContent = 'Test Connection', 2000);
        };

        document.getElementById('model-form').onsubmit = (e) => {
            e.preventDefault();
            this.saveModel();
        };

        document.getElementById('server-form').onsubmit = (e) => {
            e.preventDefault();
            this.saveServer();
        };

        document.getElementById('theme-toggle').onclick = () => {
            document.body.classList.toggle('dark-mode');
            const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            this.app.storage.save(this.app.storage.KEYS.THEME, theme);
        };
    }

    showModal(id) {
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.getElementById(id).classList.remove('hidden');
    }

    hideModals() {
        document.getElementById('modal-overlay').classList.add('hidden');
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    }

    saveModel() {
        const config = {
            name: document.getElementById('model-name').value,
            provider: document.getElementById('model-provider').value,
            endpoint: document.getElementById('model-endpoint').value,
            apiKey: document.getElementById('model-key').value,
            modelId: document.getElementById('model-id').value
        };
        this.app.llmManager.registerModel(config);
        this.app.saveConfig();
        this.renderModels();
        this.hideModals();
        document.getElementById('model-form').reset();
    }

    saveServer() {
        const config = {
            name: document.getElementById('server-name').value,
            url: document.getElementById('server-url').value,
            auth: document.getElementById('server-auth').value
        };
        const server = this.app.mcpClient.registerServer(config);
        this.app.mcpClient.refreshTools(server.id).then(() => {
            this.renderServers();
        }).catch(() => {
            this.renderServers();
        });
        this.app.saveConfig();
        this.renderServers();
        this.hideModals();
        document.getElementById('server-form').reset();
    }

    renderModels() {
        this.modelList.innerHTML = '';
        const models = this.app.llmManager.listModels();
        const activeId = this.app.llmManager.activeModelId;
        const councilMode = this.app.llmManager.councilEnabled;
        const councilIds = this.app.llmManager.councilModelIds;

        models.forEach(model => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${model.name}</div>
                    <div class="item-status">${model.modelId}</div>
                </div>
                ${councilMode ? 
                    `<input type="checkbox" class="council-cb" ${councilIds.includes(model.id) ? 'checked' : ''} title="Include in Council">` : 
                    `<input type="radio" name="active-model" ${model.id === activeId ? 'checked' : ''} title="Set as Active">`
                }
                <button class="icon-btn delete-btn">🗑️</button>
            `;
            
            if (councilMode) {
                row.querySelector('.council-cb').onclick = (e) => {
                    const ids = Array.from(this.modelList.querySelectorAll('.council-cb:checked'))
                                     .map(cb => cb.closest('.item-row').dataset.id);
                    this.app.llmManager.setCouncilModels(ids);
                    this.updateCouncilBadge();
                    this.app.saveConfig();
                };
            } else {
                row.querySelector('input[type="radio"]').onclick = () => {
                    this.app.llmManager.selectModel(model.id);
                    this.app.updateActiveModelDisplay();
                    this.app.saveConfig();
                };
            }

            row.dataset.id = model.id;
            row.querySelector('.delete-btn').onclick = () => {
                if (confirm('Delete this model?')) {
                    this.app.llmManager.removeModel(model.id);
                    this.renderModels();
                    this.app.saveConfig();
                }
            };

            this.modelList.appendChild(row);
        });
        this.updateCouncilBadge();
    }

    updateCouncilBadge() {
        const badge = document.getElementById('council-badge');
        const count = this.app.llmManager.councilModelIds.length;
        if (this.app.llmManager.councilEnabled && count > 0) {
            badge.textContent = `Council [${count}]`;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    renderServers() {
        this.serverList.innerHTML = '';
        const servers = this.app.mcpClient.listServers();

        servers.forEach(server => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${server.name}</div>
                    <div class="item-status">${server.status} - ${server.tools.length} tools</div>
                </div>
                <button class="icon-btn refresh-btn">🔄</button>
                <button class="icon-btn delete-btn">🗑️</button>
            `;

            row.querySelector('.refresh-btn').onclick = () => {
                this.app.mcpClient.refreshTools(server.id).then(() => this.renderServers());
            };

            row.querySelector('.delete-btn').onclick = () => {
                if (confirm('Delete this server?')) {
                    this.app.mcpClient.removeServer(server.id);
                    this.renderServers();
                    this.app.saveConfig();
                }
            };

            this.serverList.appendChild(row);
        });
    }
}
