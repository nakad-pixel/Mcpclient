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
                btn.textContent = '❌ Failed';
                alert(`Test failed: ${err.message}`);
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

        if (llmTools.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No llm_* tools found. Connect to an MCP server that exposes LLM tools.';
            this.modelList.appendChild(empty);
            this.updateCouncilBadge();
            return;
        }

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
                ${this.app.councilEnabled
                    ? `<input type="checkbox" class="council-cb" ${checkedCouncil ? 'checked' : ''} title="Include in Council">`
                    : `<input type="radio" name="active-model" ${checkedActive ? 'checked' : ''} title="Set as Active">`
                }
            `;

            if (this.app.councilEnabled) {
                row.querySelector('.council-cb').onchange = () => {
                    const selected = Array.from(this.modelList.querySelectorAll('.council-cb:checked')).map(cb => cb.closest('.item-row').dataset.model);
                    this.app.councilModels = selected;
                    this.updateCouncilBadge();
                    this.app.saveConfig();
                };
            } else {
                row.querySelector('input[type="radio"]').onchange = () => {
                    this.app.activeModel = model.modelName;
                    this.app.updateActiveModelDisplay();
                    this.app.saveConfig();
                };
            }

            this.modelList.appendChild(row);
        });

        if (!this.app.councilEnabled && !this.app.activeModel) {
            this.app.activeModel = llmTools[0].modelName;
            this.app.saveConfig();
        }

        this.updateCouncilBadge();
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
}
