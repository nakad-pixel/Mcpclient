export class UploadUI {
    constructor(app) {
        this.app = app;
        this.preview = document.getElementById('upload-preview');
        this.fileInput = document.getElementById('file-input');
        this.attachBtn = document.getElementById('attach-btn');
        this.files = [];

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.attachBtn.onclick = () => this.fileInput.click();
        this.fileInput.onchange = (e) => this.handleFiles(e.target.files);

        // Drag and drop
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                this.handleFiles(e.dataTransfer.files);
            }
        });
    }

    async handleFiles(fileList) {
        if (this.files.length + fileList.length > 5) {
            alert('Max 5 files per message');
            return;
        }

        for (const file of fileList) {
            if (file.size > 50 * 1024 * 1024) {
                alert(`File ${file.name} is too large (> 50MB)`);
                continue;
            }

            const base64 = await this.toBase64(file);
            const fileObj = {
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64
            };
            this.files.push(fileObj);
            this.renderPreview(fileObj);
        }
        this.fileInput.value = '';
    }

    toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    renderPreview(fileObj) {
        const div = document.createElement('div');
        div.className = 'preview-item';
        
        if (fileObj.type.startsWith('image/')) {
            div.innerHTML = `<img src="${fileObj.data}" alt="${fileObj.name}">`;
        } else {
            div.innerHTML = `<div class="file-icon">📄</div><div class="file-name">${fileObj.name}</div>`;
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file';
        removeBtn.textContent = '✕';
        removeBtn.onclick = () => {
            this.files = this.files.filter(f => f !== fileObj);
            div.remove();
        };

        div.appendChild(removeBtn);
        this.preview.appendChild(div);
    }

    clear() {
        this.files = [];
        this.preview.innerHTML = '';
    }

    getAttachments() {
        return this.files.map(f => ({
            type: f.type.startsWith('image/') ? 'image' : 'file',
            name: f.name,
            data: f.data
        }));
    }
}
