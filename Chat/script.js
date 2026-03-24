// Mock Data State
let chats = [
    { id: 1, title: 'Learn React Hooks', isArchived: false, messages: [{ sender: 'user', text: 'How do React hooks work?' }, { sender: 'ai', text: 'React hooks are functions that let you "hook into" React state and lifecycle features from function components.' }] },
    { id: 2, title: 'Tailwind CSS Tips', isArchived: false, messages: [{ sender: 'user', text: 'Give me some Tailwind tips.' }, { sender: 'ai', text: 'Sure! Use arbitrary values like `w-[300px]` when you need a specific value not in your tailwind config.' }] },
    { id: 3, title: 'Future of AI', isArchived: false, messages: [{ sender: 'user', text: 'What is the future of AI?' }, { sender: 'ai', text: 'The future of AI involves more capable multimodal models and agentic workflows.' }] },
    { id: 4, title: 'Old Project Ideas', isArchived: true, messages: [] },
    { id: 5, title: 'Grocery List App', isArchived: true, messages: [] }
];

let currentChatId = null;
let currentTab = 'recent'; // 'recent' or 'archived'
let chatToDelete = null;
let selectedFiles = [];

$(document).ready(function() {
    
    // Initial Render
    initializeTheme();
    renderSidebar();

    // -------------------------
    // Event Listeners
    // -------------------------

    // Tab Switching
    $('#tab-recent').on('click', () => switchTab('recent'));
    $('#tab-archived').on('click', () => switchTab('archived'));

    // New Chat
    $('#new-chat-btn').on('click', createNewChat);

    // Sidebar Interactions
    $('#chat-list-container').on('click', '.history-item', function(e) {
        // Prevent clicking if target is action buttons
        if ($(e.target).closest('.action-btn').length > 0) return;
        
        const id = $(this).data('id');
        loadChat(id);
        
        // Mobile auto-close sidebar
        if (window.innerWidth < 768) {
            toggleMobileSidebar(false);
        }
    });

    $('#chat-list-container').on('click', '.archive-btn', function(e) {
        e.stopPropagation();
        const id = $(this).closest('.history-item').data('id');
        toggleArchiveChat(id);
    });

    $('#chat-list-container').on('click', '.delete-btn', function(e) {
        e.stopPropagation();
        const id = $(this).closest('.history-item').data('id');
        openDeleteModal(id);
    });

    // Modal
    $('#cancel-delete, #delete-modal-backdrop').on('click', closeDeleteModal);
    $('#confirm-delete').on('click', deleteChat);

    // Sending Messages
    $('#message-input').on('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // File Attachments
    $('#attach-btn').on('click', () => $('#file-upload').click());
    
    $('#file-upload').on('change', function(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        files.forEach(file => {
            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                selectedFiles.push({
                    name: file.name,
                    type: file.type,
                    // in a real app, we'd use URL.createObjectURL or read as data URL
                    raw: file 
                });
            }
        });
        
        $(this).val('');
        renderFilePreviews();
        updateSendButtonState();
    });

    // Remove file from preview
    $('#messages-area').parent().on('click', '.remove-file-btn', function() {
        const index = $(this).data('index');
        selectedFiles.splice(index, 1);
        renderFilePreviews();
        updateSendButtonState();
    });

    $('#message-input').on('input', function() {
        updateSendButtonState();
        
        // Auto-resize
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    $('#send-btn').on('click', sendMessage);

    // Mobile Sidebar
    $('#open-sidebar').on('click', () => toggleMobileSidebar(true));
    $('#close-sidebar, #mobile-overlay').on('click', () => toggleMobileSidebar(false));

    // Search
    $('#search-input').on('input', function() {
        const query = $(this).val().toLowerCase();
        renderSidebar(query);
    });

    // Theme
    $('#theme-toggle').on('click', toggleTheme);

    // -------------------------
    // Functions
    // -------------------------

    function switchTab(tab) {
        currentTab = tab;
        
        if (tab === 'recent') {
            $('#tab-recent').addClass('border-brand-500 text-light-text dark:text-dark-text').removeClass('border-transparent text-light-muted dark:text-dark-muted');
            $('#tab-archived').removeClass('border-brand-500 text-light-text dark:text-dark-text').addClass('border-transparent text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text');
        } else {
            $('#tab-archived').addClass('border-brand-500 text-light-text dark:text-dark-text').removeClass('border-transparent text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text');
            $('#tab-recent').removeClass('border-brand-500 text-light-text dark:text-dark-text').addClass('border-transparent text-light-muted dark:text-dark-muted');
        }
        
        // Reset search field
        $('#search-input').val('');
        renderSidebar();
    }

    function renderSidebar(searchQuery = '') {
        const container = $('#chat-list-container');
        container.empty();

        const filteredChats = chats.filter(c => {
            const matchesTab = currentTab === 'recent' ? !c.isArchived : c.isArchived;
            const matchesSearch = c.title.toLowerCase().includes(searchQuery);
            return matchesTab && matchesSearch;
        });

        if (filteredChats.length === 0) {
            container.append(`
                <div class="text-center p-4 text-sm text-light-muted dark:text-dark-muted">
                    No chats found.
                </div>
            `);
            return;
        }

        filteredChats.forEach(chat => {
            const isActive = chat.id === currentChatId;
            const activeClass = isActive 
                ? 'bg-light-hover dark:bg-dark-hover text-light-text dark:text-dark-text font-medium' 
                : 'text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover text-light-muted dark:text-dark-muted';
                
            const archiveIcon = chat.isArchived ? 'fa-box-open' : 'fa-inbox';
            const archiveTitle = chat.isArchived ? 'Unarchive' : 'Archive';

            const itemHTML = `
                <div class="history-item group relative flex items-center justify-between p-3 cursor-pointer rounded-xl transition-colors ${activeClass}" data-id="${chat.id}">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <i class="fas fa-message text-light-muted dark:text-dark-muted text-sm shrink-0"></i>
                        <span class="truncate text-sm flex-1 ${isActive ? 'font-semibold' : ''}">${escapeHTML(chat.title)}</span>
                    </div>
                    
                    <div class="action-icons absolute right-2 flex items-center gap-1 bg-light-sidebar dark:bg-dark-sidebar shadow-[0_0_10px_5px] shadow-light-sidebar dark:shadow-dark-sidebar px-1 rounded-md ${isActive ? '!opacity-100 !visible' : ''}">
                        <button class="action-btn archive-btn p-1.5 rounded-lg text-light-muted dark:text-dark-muted hover:text-brand-500 hover:bg-light-border dark:hover:bg-dark-bg transition-colors" title="${archiveTitle}">
                            <i class="fas ${archiveIcon} text-xs"></i>
                        </button>
                        <button class="action-btn delete-btn p-1.5 rounded-lg text-light-muted dark:text-dark-muted hover:text-red-500 hover:bg-light-border dark:hover:bg-dark-bg transition-colors" title="Delete">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
            `;
            container.append(itemHTML);
        });
    }

    function createNewChat() {
        const newId = Date.now();
        const newChat = {
            id: newId,
            title: 'New Chat',
            isArchived: false,
            messages: []
        };
        chats.unshift(newChat); // Add to top
        if (currentTab !== 'recent') {
            switchTab('recent');
        } else {
            renderSidebar();
        }
        loadChat(newId);
    }

    function loadChat(id) {
        currentChatId = id;
        renderSidebar($('#search-input').val().toLowerCase()); // re-render to update active state
        
        const chat = chats.find(c => c.id === id);
        if (!chat) return;

        $('#current-chat-title-mobile').text(chat.title);
        
        const messagesArea = $('#messages-area');
        messagesArea.empty();

        if (chat.messages.length === 0) {
            messagesArea.append(`
                <div id="empty-state" class="m-auto flex flex-col items-center justify-center text-center space-y-4 max-w-sm message-animate">
                    <div class="w-16 h-16 bg-light-sidebar dark:bg-dark-sidebar rounded-full flex items-center justify-center text-3xl mb-2 shadow-sm border border-light-border dark:border-dark-border">
                        🪄
                    </div>
                    <h2 class="text-2xl font-bold tracking-tight">How can I help you today?</h2>
                    <p class="text-light-muted dark:text-dark-muted text-sm">Let's brainstorm, write code, or learn something new.</p>
                </div>
            `);
        } else {
            chat.messages.forEach(msg => {
                appendMessageToUI(msg);
            });
            scrollToBottom();
        }
    }

    function appendMessageToUI(msg) {
        const messagesArea = $('#messages-area');
        $('#empty-state').remove();

        // Grok styling: User messages usually float right or just have different avatar styling.
        // We'll use a clean styling similar to standard modern ai clents
        
        const isUser = msg.sender === 'user';
        const alignClass = isUser ? 'self-end bg-brand-500 text-white' : 'self-start bg-light-sidebar dark:bg-dark-sidebar border border-light-border dark:border-dark-border text-light-text dark:text-dark-text';
        
        const avatar = isUser ? '' : `<div class="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mb-auto mt-1"><i class="fas fa-robot text-sm"></i></div>`;
        const userAvatar = isUser ? `<div class="w-8 h-8 rounded-full bg-light-border dark:bg-dark-border flex items-center justify-center text-xs font-bold shrink-0 mb-auto mt-1"><i class="fas fa-user text-sm"></i></div>` : '';

        let filesHTML = '';
        if (msg.files && msg.files.length > 0) {
            filesHTML = `<div class="flex flex-wrap gap-2 mb-2">`;
            msg.files.forEach(f => {
                let iconClass = f.type && f.type.startsWith('image/') ? 'fa-image' : 'fa-file-pdf';
                filesHTML += `
                    <div class="flex items-center gap-2 bg-black/10 dark:bg-white/10 py-1.5 px-3 rounded-lg text-sm">
                        <i class="fas ${iconClass}"></i>
                        <span class="truncate max-w-[150px]">${escapeHTML(f.name)}</span>
                    </div>
                `;
            });
            filesHTML += `</div>`;
        }

        const msgHTML = `
            <div class="flex gap-3 w-full message-animate ${isUser ? 'justify-end' : 'justify-start'}">
                ${isUser ? '' : avatar}
                <div class="${alignClass} px-5 py-3 rounded-2xl max-w-[85%] sm:max-w-xl text-[15px] leading-relaxed break-words shadow-sm flex flex-col">
                    ${filesHTML}
                    ${msg.text ? `<div>${escapeHTML(msg.text)}</div>` : ''}
                </div>
                ${isUser ? userAvatar : ''}
            </div>
        `;
        messagesArea.append(msgHTML);
    }

    function sendMessage() {
        const input = $('#message-input');
        const text = input.val().trim();
        if (!text && selectedFiles.length === 0) return;

        // Auto create chat if none selected
        if (!currentChatId) {
            createNewChat();
        }

        const chat = chats.find(c => c.id === currentChatId);
        
        // Update Title if it's the first message
        if (chat.messages.length === 0) {
            chat.title = text ? (text.substring(0, 30) + (text.length > 30 ? '...' : '')) : 'File Attachment';
            $('#current-chat-title-mobile').text(chat.title);
            renderSidebar();
        }

        // Add user msg
        const userMsg = { sender: 'user', text, files: [...selectedFiles] };
        chat.messages.push(userMsg);
        appendMessageToUI(userMsg);
        scrollToBottom();
        
        // Reset input
        input.val('');
        input.css('height', '56px');
        selectedFiles = [];
        renderFilePreviews();
        updateSendButtonState();

        // Simulate AI typing delay
        setTimeout(() => {
            const contextText = text ? `"${text}"` : "the attachment";
            const attachmentNote = userMsg.files && userMsg.files.length > 0 ? " And I received your attachment." : "";
            const aiMsg = { sender: 'ai', text: `This is a mock response from the system acting like Grok. You said: ${contextText}.${attachmentNote}` };
            chat.messages.push(aiMsg);
            appendMessageToUI(aiMsg);
            scrollToBottom();
        }, 1000);
    }

    function renderFilePreviews() {
        const container = $('#file-preview-container');
        container.empty();
        
        if (selectedFiles.length === 0) {
            container.addClass('hidden');
            return;
        }
        
        container.removeClass('hidden');
        
        selectedFiles.forEach((file, index) => {
            let iconClass = file.type && file.type.startsWith('image/') ? 'fa-image' : 'fa-file-pdf';
            const previewHTML = `
                <div class="relative flex items-center gap-2 bg-light-sidebar dark:bg-dark-sidebar border border-light-border dark:border-dark-border py-1.5 px-3 rounded-lg text-sm max-w-[150px]">
                    <i class="fas ${iconClass} text-brand-500"></i>
                    <span class="truncate flex-1">${escapeHTML(file.name)}</span>
                    <button class="remove-file-btn text-light-muted dark:text-dark-muted hover:text-red-500 transition-colors ml-1" data-index="${index}">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            `;
            container.append(previewHTML);
        });
    }

    function updateSendButtonState() {
        const val = $('#message-input').val().trim();
        $('#send-btn').prop('disabled', val.length === 0 && selectedFiles.length === 0);
    }

    function toggleArchiveChat(id) {
        const chat = chats.find(c => c.id === id);
        if (chat) {
            chat.isArchived = !chat.isArchived;
            // Add a small slide out animation before removing
            $(`.history-item[data-id="${id}"]`).animate({ opacity: 0, scale: 0.9 }, 200, function() {
                renderSidebar();
                // If we archived the active chat, unselect or keep it. We'll keep it active.
            });
        }
    }

    function openDeleteModal(id) {
        chatToDelete = id;
        $('#delete-modal').addClass('modal-active');
    }

    function closeDeleteModal() {
        chatToDelete = null;
        $('#delete-modal').removeClass('modal-active');
    }

    function deleteChat() {
        if (!chatToDelete) return;

        // Ensure we remove it safely
        const index = chats.findIndex(c => c.id === chatToDelete);
        if (index > -1) {
            chats.splice(index, 1);
            
            // Re-render
            renderSidebar();

            // Handle current viewing chat deletion
            if (currentChatId === chatToDelete) {
                currentChatId = null;
                $('#messages-area').empty();
                $('#current-chat-title-mobile').text('New Chat');
            }
        }
        closeDeleteModal();
    }

    function scrollToBottom() {
        const area = $('#messages-area')[0];
        area.scrollTo({
            top: area.scrollHeight,
            behavior: 'smooth'
        });
    }

    function toggleMobileSidebar(show) {
        if (show) {
            $('#sidebar').removeClass('-translate-x-full');
            $('#mobile-overlay').removeClass('hidden');
            // small delay to allow display block to apply before opacity transition
            setTimeout(() => {
                $('#mobile-overlay').removeClass('opacity-0');
            }, 10);
        } else {
            $('#sidebar').addClass('-translate-x-full');
            $('#mobile-overlay').addClass('opacity-0');
            setTimeout(() => {
                $('#mobile-overlay').addClass('hidden');
            }, 300);
        }
    }

    function initializeTheme() {
        // Check local storage or system preference
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            $('html').addClass('dark');
        } else {
            $('html').removeClass('dark');
        }
    }

    function toggleTheme() {
        if ($('html').hasClass('dark')) {
            $('html').removeClass('dark');
            localStorage.theme = 'light';
        } else {
            $('html').addClass('dark');
            localStorage.theme = 'dark';
        }
    }

    // Utility: XSS prevention
    function escapeHTML(str) {
        return $('<div>').text(str).html();
    }
});
