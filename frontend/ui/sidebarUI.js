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

        document.getElementById('add-server-btn').onclick = () => {
            this.showModal('server-modal');
        };

        document.getElementById('cancel-server-btn').onclick = () => this.hideModals();

        document.getElementById('test-server-btn').onclick = async () => {
            const url = document.getElementById('server-url').value;
            const headersText = document.getElementById('server-headers').value;
            let headers = {};
            try {
                if (headersText.trim()) {
                    headers = JSON.parse(headersText);
                }
            } catch {
                alert('Invalid JSON in headers');
                return;
            }

            const btn = document.getElementById('test-server-btn');
            btn.textContent = 'Testing...';
            btn.disabled = true;

            try {
                await this.app.mcpClient.testConnection(url, headers);
                btn.textContent = '✅ Success';
            } catch (err) {
                console.error('Connection test failed:', err);
                
                // Provide mobile-friendly error messages
                let errorMessage = err.message;
                
                if (err.message.includes('HTML instead of JSON')) {
                    errorMessage = 'Connection failed. Check:\n• Server URL is correct\n• Server supports CORS\n• strata_id is valid';
                } else if (err.message.includes('timed out')) {
                    errorMessage = 'Connection timed out. Server may be slow or unavailable.';
                } else if (err.message.includes('CORS')) {
                    errorMessage = 'CORS error: Server may not allow requests from this domain.';
                }
                
                btn.textContent = '❌ Failed';
                
                // Show mobile-friendly alert
                setTimeout(() => {
                    alert(`Test failed: ${errorMessage}`);
                    btn.textContent = 'Test Connection';
                }, 500);
            } finally {
                btn.disabled = false;
                setTimeout(() => (btn.textContent = 'Test Connection'), 2000);
            }
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

        document.getElementById('open-tool-modal').onclick = () => {
            this.populateToolModal();
            this.showModal('tool-modal');
        };

        document.getElementById('cancel-tool-btn').onclick = () => this.hideModals();

        document.getElementById('tool-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.runTool();
        };

        // LLM Keys Modal
        document.getElementById('open-llm-keys-btn').onclick = () => {
            this.populateLLMKeysModal();
            this.showModal('llm-modal');
        };

        document.getElementById('cancel-llm-btn').onclick = () => this.hideModals();

        document.getElementById('llm-form').onsubmit = async (e) => {
            e.preventDefault();
            const serviceName = document.getElementById('llm-service-name').value.trim();
            const apiKey = document.getElementById('llm-api-key').value.trim();

            if (!serviceName || !apiKey) {
                alert('Please enter both service name and API key');
                return;
            }

            try {
                await this.app.saveLLMKey(serviceName, apiKey);
                alert(`✅ API key for "${serviceName}" saved successfully`);
                document.getElementById('llm-form').reset();
                this.hideModals();
            } catch (err) {
                alert(`❌ Error saving key: ${err.message}`);
            }
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

    saveServer() {
        const name = document.getElementById('server-name').value;
        const url = document.getElementById('server-url').value;
        const headersText = document.getElementById('server-headers').value;

        let headers = {};
        if (headersText.trim()) {
            try {
                headers = JSON.parse(headersText);
            } catch {
                alert('Invalid JSON in headers field');
                return;
            }
        }

        const config = { name, url, headers };
        const server = this.app.mcpClient.registerServer(config);
        this.app.mcpClient
            .refreshTools(server.id)
            .then(() => {
                this.renderServers();
                this.app.updateActiveModelDisplay();
            })
            .catch(() => {
                this.renderServers();
            });

        this.app.saveConfig();
        this.renderServers();
        this.hideModals();
        document.getElementById('server-form').reset();
    }

    populateToolModal() {
        const tools = this.app.mcpClient.getAllTools();
        const select = document.getElementById('tool-select');
        select.innerHTML = '';

        if (tools.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No tools available';
            select.appendChild(opt);
            select.disabled = true;
            return;
        }

        select.disabled = false;
        tools.forEach(tool => {
            const opt = document.createElement('option');
            opt.value = tool.name;
            opt.textContent = `${tool.name} (${tool.description || 'no description'})`;
            opt.dataset.schema = JSON.stringify(tool.inputSchema || {});
            select.appendChild(opt);
        });
    }

    async runTool() {
        const toolName = document.getElementById('tool-select').value;
        const argsText = document.getElementById('tool-args').value;

        if (!toolName) {
            alert('Please select a tool');
            return;
        }

        let args = {};
        if (argsText.trim()) {
            try {
                args = JSON.parse(argsText);
            } catch {
                alert('Invalid JSON in arguments');
                return;
            }
        }

        this.hideModals();

        try {
            await this.app.orchestrator.runToolManually(toolName, args);
        } catch (err) {
            alert(`Tool execution failed: ${err.message}`);
        }
    }

    renderModels() {
        this.modelList.innerHTML = '';

        const llmTools = this.app.mcpClient
            .getAllTools()
            .filter(t => typeof t.name === 'string' && t.name.startsWith('llm_'))
            .map(t => ({
                toolName: t.name,
                modelName: t.name.replace(/^llm_/, '').replace(/_/g, '-'),
                description: t.description || ''
            }));

        // Get configured LLM services (API keys) to determine Council eligibility
        const hasMultipleLLMServices = this.app.hasMultipleLLMServices();

        // Show message if no LLM tools found
        if (llmTools.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No llm_* tools found. Connect to an MCP server that exposes LLM tools.';
            this.modelList.appendChild(empty);
            this.updateCouncilControls(hasMultipleLLMServices);
            return;
        }

        // Show LLM tools and Council controls if multiple services are configured
        llmTools.forEach(model => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.dataset.model = model.modelName;

            const checkedCouncil = this.app.councilModels.includes(model.modelName);
            const checkedActive = this.app.activeModel === model.modelName;

            row.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${model.modelName}</div>
                    <div class="item-status">${model.description || model.toolName}</div>
                </div>
                ${hasMultipleLLMServices && this.app.councilEnabled
                    ? `<input type="checkbox" class="council-cb" ${checkedCouncil ? 'checked' : ''} title="Include in Council">`
                    : `<input type="radio" name="active-model" ${checkedActive ? 'checked' : ''} title="Set as Active">`
                }
            `;

            if (hasMultipleLLMServices && this.app.councilEnabled) {
                row.querySelector('.council-cb').onchange = () => {
                    const selected = Array.from(this.modelList.querySelectorAll('.council-cb:checked')).map(cb => cb.closest('.item-row').dataset.model);
                    this.app.councilModels = selected;
                    this.updateCouncilControls(hasMultipleLLMServices);
                    this.app.saveConfig();
                };
            } else {
                const radio = row.querySelector('input[type="radio"]');
                if (radio) {
                    radio.onchange = () => {
                        this.app.activeModel = model.modelName;
                        this.app.updateActiveModelDisplay();
                        this.app.saveConfig();
                    };
                }
            }

            this.modelList.appendChild(row);
        });

        if (!hasMultipleLLMServices || !this.app.councilEnabled) {
            if (!this.app.activeModel && llmTools.length > 0) {
                this.app.activeModel = llmTools[0].modelName;
                this.app.saveConfig();
            }
        }

        this.updateCouncilControls(hasMultipleLLMServices);
    }

    updateCouncilControls(hasMultipleServices) {
        const councilSection = document.querySelector('.council-toggle');
        const badge = document.getElementById('council-badge');
        
        if (hasMultipleServices) {
            // Show Council controls when 2+ LLM services are configured
            councilSection.style.display = 'block';
            this.updateCouncilBadge();
        } else {
            // Hide Council controls and disable Council mode
            councilSection.style.display = 'none';
            if (this.app.councilEnabled) {
                this.app.councilEnabled = false;
                document.getElementById('council-mode-toggle').checked = false;
            }
            badge.classList.add('hidden');
        }
    }

    updateCouncilBadge() {
        const badge = document.getElementById('council-badge');
        const count = this.app.councilModels.length;
        if (this.app.councilEnabled && count > 0) {
            badge.textContent = `Council [${count}]`;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    renderServers() {
        this.serverList.innerHTML = '';
        const servers = this.app.mcpClient.listServers();

        if (servers.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No servers configured. Click + to add one.';
            this.serverList.appendChild(empty);
            return;
        }

        servers.forEach(server => {
            const row = document.createElement('div');
            row.className = 'item-row';

            const statusIcon = {
                connected: '🟢',
                connecting: '🟡',
                disconnected: '⚪',
                error: '🔴'
            }[server.status];

            const statusText =
                server.status === 'error' && server.statusMessage
                    ? `${server.status}: ${server.statusMessage}`
                    : `${server.status} - ${server.tools.length} tools`;

            row.innerHTML = `
                <div class="item-info">
                    <div class="item-name">${statusIcon} ${server.name}</div>
                    <div class="item-status">${statusText}</div>
                </div>
                <button class="icon-btn refresh-btn" title="Refresh">🔄</button>
                <button class="icon-btn delete-btn" title="Delete">🗑️</button>
            `;

            row.querySelector('.refresh-btn').onclick = () => {
                this.app.mcpClient
                    .refreshTools(server.id)
                    .then(() => {
                        this.renderServers();
                        this.app.updateActiveModelDisplay();
                    })
                    .catch(err => {
                        alert(`Refresh failed: ${err.message}`);
                        this.renderServers();
                    });
            };

            row.querySelector('.delete-btn').onclick = () => {
                if (confirm(`Delete server "${server.name}"?`)) {
                    this.app.mcpClient.removeServer(server.id);
                    this.renderServers();
                    this.app.saveConfig();
                    this.app.updateActiveModelDisplay();
                }
            };

            this.serverList.appendChild(row);
        });
    }

    /**
     * Populate the LLM keys modal with current keys and render them
     */
    populateLLMKeysModal() {
        const formContainer = document.getElementById('llm-modal');
        let listContainer = formContainer.querySelector('.llm-keys-list');
        
        // Create list container if it doesn't exist
        if (!listContainer) {
            listContainer = document.createElement('div');
            listContainer.className = 'llm-keys-list';
            formContainer.appendChild(listContainer);
        }
        
        this.renderLLMKeys();
    }

    /**
     * Render the list of LLM API keys (without secrets)
     */
    renderLLMKeys() {
        let listContainer = document.querySelector('#llm-modal .llm-keys-list');
        
        // Create if doesn't exist
        if (!listContainer) {
            listContainer = document.createElement('div');
            listContainer.className = 'llm-keys-list';
            document.getElementById('llm-modal').appendChild(listContainer);
        }

        listContainer.innerHTML = '';

        const services = this.app.getAllLLMServices();

        if (services.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No LLM keys added yet. Add one above to get started.';
            listContainer.appendChild(empty);
            return;
        }

        const title = document.createElement('h4');
        title.textContent = 'Saved API Keys:';
        title.style.marginBottom = '10px';
        listContainer.appendChild(title);

        services.forEach(service => {
            const row = document.createElement('div');
            row.className = 'llm-key-item';

            row.innerHTML = `
                <div class="key-info">
                    <div class="key-name">🔑 ${service.name}</div>
                    <div class="key-status">Added: ${new Date(service.addedAt).toLocaleDateString()}</div>
                </div>
                <div class="key-actions">
                    <button type="button" class="icon-btn delete-key-btn" title="Delete">🗑️</button>
                </div>
            `;

            row.querySelector('.delete-key-btn').onclick = (e) => {
                e.preventDefault();
                if (confirm(`Delete API key for "${service.name}"?`)) {
                    this.app.removeLLMKey(service.name);
                }
            };

            listContainer.appendChild(row);
        });
    }
}
