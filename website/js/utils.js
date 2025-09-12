// Utility functions adapted from WebToEpub
class Utils {
    static isNullOrEmpty(str) {
        return !str || str.trim().length === 0;
    }

    static extractHostName(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return '';
        }
    }

    static safeForFileName(title, maxLength = 50) {
        if (!title) return 'untitled';
        return title
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, maxLength);
    }

    static normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.href;
        } catch {
            return url;
        }
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static createEmptyXhtmlDoc() {
        const doc = document.implementation.createHTMLDocument('');
        doc.documentElement.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        return doc;
    }

    static xmlToString(xmlDoc) {
        return new XMLSerializer().serializeToString(xmlDoc);
    }

    static removeScriptElements(element) {
        const scripts = element.querySelectorAll('script, noscript');
        scripts.forEach(script => script.remove());
    }

    static removeComments(element) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_COMMENT,
            null,
            false
        );
        const comments = [];
        let node;
        while (node = walker.nextNode()) {
            comments.push(node);
        }
        comments.forEach(comment => comment.remove());
    }

    static cleanContent(element) {
        // Remove unwanted elements
        const unwanted = element.querySelectorAll(
            'script, noscript, style, nav, header, footer, aside, ' +
            '.navigation, .nav, .menu, .sidebar, .ads, .advertisement, ' +
            '.social-share, .comments, .comment-section'
        );
        unwanted.forEach(el => el.remove());

        // Remove comments
        this.removeComments(element);

        // Clean attributes
        const allElements = element.querySelectorAll('*');
        allElements.forEach(el => {
            // Keep only essential attributes
            const keepAttrs = ['href', 'src', 'alt', 'title', 'id', 'class'];
            const attrs = Array.from(el.attributes);
            attrs.forEach(attr => {
                if (!keepAttrs.includes(attr.name)) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        return element;
    }

    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').classList.remove('hidden');
    }

    static hideError() {
        document.getElementById('errorModal').classList.add('hidden');
    }

    static updateProgress(percent, text, details = '') {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressDetails = document.getElementById('progressDetails');
        
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = text;
        if (progressDetails) progressDetails.textContent = details;
    }

    static async fetchWithProxy(url) {
        // In a real implementation, this would call your backend API
        // For demo purposes, we'll simulate with a delay
        await this.sleep(1000);
        
        // This is a mock response - in reality you'd call your backend
        throw new Error('Backend proxy not implemented. This is a frontend-only demo.');
    }

    static parseHtml(htmlString) {
        return new DOMParser().parseFromString(htmlString, 'text/html');
    }

    static extractTextContent(element) {
        if (!element) return '';
        return element.textContent.trim();
    }

    static findContentBySelectors(doc, selectors) {
        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element && element.textContent.trim().length > 100) {
                return element;
            }
        }
        return null;
    }

    static getCommonContentSelectors() {
        return [
            'article',
            '.content',
            '.post-content',
            '.entry-content',
            '.chapter-content',
            '.story-content',
            'main',
            '#content',
            '.main-content',
            '.text-content'
        ];
    }
}

// Error handling
window.closeErrorModal = function() {
    Utils.hideError();
};

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    Utils.showError(`An error occurred: ${event.error.message}`);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    Utils.showError(`Promise rejection: ${event.reason}`);
});