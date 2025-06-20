// Settings page functionality with sidebar navigation
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    loadSettings();
    
    // Event listeners
    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('saveBtn').addEventListener('click', saveSettings);
    document.getElementById('testConnectionBtn').addEventListener('click', testConnection);
    
    // Sidebar navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            showSection(targetSection);
            
            // Update active nav link
            navLinks.forEach(nl => nl.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Auto-save on input change
    const inputs = document.querySelectorAll('.form-input, input[type="checkbox"]');
    inputs.forEach(input => {
        input.addEventListener('change', autoSave);
    });
    
    // Update last updated time
    updateLastUpdated();
});

function loadSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('parseaSettings') || '{}');
        
        // Load email settings
        if (settings.email) document.getElementById('emailInput').value = settings.email;
        if (settings.password) document.getElementById('passwordInput').value = settings.password;
        if (settings.server) document.getElementById('serverInput').value = settings.server;
        if (settings.port) document.getElementById('portInput').value = settings.port;
        if (settings.secure !== undefined) document.getElementById('secureInput').checked = settings.secure;
        
        // Update status
        updateConnectionStatus(settings.lastConnectionStatus || 'Not Connected');
        updateLastCheck(settings.lastCheck);
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Error loading settings', 'error');
    }
}

function saveSettings() {
    try {
        const settings = {
            email: document.getElementById('emailInput').value,
            password: document.getElementById('passwordInput').value,
            server: document.getElementById('serverInput').value,
            port: parseInt(document.getElementById('portInput').value) || 993,
            secure: document.getElementById('secureInput').checked,
            lastSaved: new Date().toISOString()
        };
        
        // Validate required fields
        if (!settings.email || !settings.password || !settings.server) {
            showNotification('Please fill in all required email fields', 'error');
            return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(settings.email)) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }
        
        localStorage.setItem('parseaSettings', JSON.stringify(settings));
        showNotification('Settings saved successfully!', 'success');        // Update save button
        const saveBtn = document.getElementById('saveBtn');
        const originalHtml = saveBtn.innerHTML;
        saveBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          Saved Successfully
        `;
        saveBtn.classList.add('success');
        
        setTimeout(() => {
            saveBtn.innerHTML = originalHtml;
            saveBtn.classList.remove('success');
        }, 2000);
        
        // Update last updated time
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

function autoSave() {
    // Debounce auto-save
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(() => {
        const settings = JSON.parse(localStorage.getItem('parseaSettings') || '{}');
        
        // Update only changed fields
        settings.email = document.getElementById('emailInput').value;
        settings.password = document.getElementById('passwordInput').value;
        settings.server = document.getElementById('serverInput').value;
        settings.port = parseInt(document.getElementById('portInput').value) || 993;
        settings.secure = document.getElementById('secureInput').checked;
        
        localStorage.setItem('parseaSettings', JSON.stringify(settings));
    }, 1000);
}

function updateLastUpdated() {
    const now = new Date().toLocaleString();
    const lastUpdatedElement = document.getElementById('lastUpdated');
    const sidebarLastUpdatedElement = document.getElementById('sidebarLastUpdated');
    
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = now;
    }
    if (sidebarLastUpdatedElement) {
        sidebarLastUpdatedElement.textContent = now;
    }
}

async function testConnection() {
    const testBtn = document.getElementById('testConnectionBtn');
    const originalHtml = testBtn.innerHTML;
    
    try {
        testBtn.disabled = true;
        testBtn.classList.add('loading');
        testBtn.innerHTML = 'Testing Connection...';
        updateConnectionStatus('Testing...', 'testing');
        
        const settings = {
            email: document.getElementById('emailInput').value,
            password: document.getElementById('passwordInput').value,
            server: document.getElementById('serverInput').value,
            port: parseInt(document.getElementById('portInput').value) || 993,
            secure: document.getElementById('secureInput').checked
        };
        
        // Validate required fields
        if (!settings.email || !settings.password || !settings.server) {
            throw new Error('Please fill in all email configuration fields');
        }
        
        // Simulate connection test (replace with actual IMAP connection test)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // For now, we'll simulate a successful connection
        // In a real implementation, you'd test the IMAP connection here
        const isConnected = Math.random() > 0.3; // 70% success rate for demo
        
        if (isConnected) {
            updateConnectionStatus('Connected', 'connected');
            updateLastCheck(new Date().toISOString());
            showNotification('Connection successful!', 'success');
            
            // Save successful connection status
            const savedSettings = JSON.parse(localStorage.getItem('parseaSettings') || '{}');
            savedSettings.lastConnectionStatus = 'Connected';
            savedSettings.lastCheck = new Date().toISOString();
            localStorage.setItem('parseaSettings', JSON.stringify(savedSettings));
            
        } else {
            throw new Error('Failed to connect to email server');
        }
        
    } catch (error) {
        console.error('Connection test failed:', error);
        updateConnectionStatus('Connection Failed', 'disconnected');
        showNotification(error.message || 'Connection test failed', 'error');
        
        // Save failed connection status
        const savedSettings = JSON.parse(localStorage.getItem('parseaSettings') || '{}');
        savedSettings.lastConnectionStatus = 'Connection Failed';
        localStorage.setItem('parseaSettings', JSON.stringify(savedSettings));
        
    } finally {
        testBtn.disabled = false;
        testBtn.classList.remove('loading');
        testBtn.innerHTML = originalHtml;
    }
}

function updateConnectionStatus(status, type = 'disconnected') {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = status;
    
    // Remove existing status classes
    statusElement.classList.remove('status-connected', 'status-disconnected', 'status-testing');
    
    // Add appropriate class
    switch (type) {
        case 'connected':
            statusElement.classList.add('status-connected');
            break;
        case 'testing':
            statusElement.classList.add('status-testing');
            break;
        default:
            statusElement.classList.add('status-disconnected');
    }
}

function updateLastCheck(timestamp) {
    const lastCheckElement = document.getElementById('lastCheckStatus');
    if (timestamp) {
        const date = new Date(timestamp);
        lastCheckElement.textContent = date.toLocaleString();
    } else {
        lastCheckElement.textContent = 'Never';
    }
}

function goBack() {
    window.location.href = 'index.html';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.875rem',
        fontWeight: '500',
        zIndex: '1000',
        opacity: '0',
        transform: 'translateY(-20px)',
        transition: 'all 0.3s ease',
        border: '1px solid',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        maxWidth: '400px'
    });
    
    // Set colors based on type
    switch (type) {
        case 'success':
            notification.style.background = '#f0fdf4';
            notification.style.borderColor = '#bbf7d0';
            notification.style.color = '#166534';
            break;
        case 'error':
            notification.style.background = '#fef2f2';
            notification.style.borderColor = '#fecaca';
            notification.style.color = '#dc2626';
            break;
        default:
            notification.style.background = '#eff6ff';
            notification.style.borderColor = '#bfdbfe';
            notification.style.color = '#1d4ed8';
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// Export settings for use in other files
window.getSettings = function() {
    try {
        return JSON.parse(localStorage.getItem('parseaSettings') || '{}');
    } catch (error) {
        console.error('Error getting settings:', error);
        return {};
    }
};
