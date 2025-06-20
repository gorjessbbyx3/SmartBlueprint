/**
 * SmartBlueprint Pro - Universal Button Framework
 * Implements standardized button behaviors across all JavaScript components
 */

// Global button framework configuration
const BUTTON_FRAMEWORK = {
    initialized: false,
    buttons: new Map(),
    successContainer: null,
    tableContainer: null
};

/**
 * Core button functions with console logging for testing
 */

// Submit form function - triggers submit_form() and shows success message
function submit_form() {
    console.log('submit_form() executed - Processing form submission');
    
    try {
        // Collect all form data
        const formElements = document.querySelectorAll('input, select, textarea');
        const formData = {};
        let fieldCount = 0;
        
        formElements.forEach(element => {
            if (element.value && element.value.trim() !== '') {
                const fieldName = element.name || element.id || `field_${fieldCount}`;
                formData[fieldName] = element.value;
                fieldCount++;
                console.log(`Form field captured: ${fieldName} = ${element.value}`);
            }
        });
        
        console.log(`submit_form() - Collected ${fieldCount} form fields:`, formData);
        
        // Show success message
        showSuccessMessage('Form submitted successfully!');
        console.log('submit_form() completed - Success message displayed');
        
        return { success: true, data: formData, fieldCount };
        
    } catch (error) {
        console.error('submit_form() error:', error);
        showSuccessMessage('Form submission failed - please try again', 'error');
        return { success: false, error: error.message };
    }
}

// Reset fields function - calls reset_fields() and clears inputs
function reset_fields() {
    console.log('reset_fields() executed - Clearing all form inputs');
    
    try {
        // Clear all input types
        const inputElements = document.querySelectorAll('input, select, textarea');
        let clearedCount = 0;
        
        inputElements.forEach(element => {
            const originalValue = element.value;
            
            switch (element.type) {
                case 'checkbox':
                case 'radio':
                    if (element.checked) {
                        element.checked = false;
                        clearedCount++;
                        console.log(`Cleared ${element.type}: ${element.name || element.id}`);
                    }
                    break;
                case 'select-one':
                case 'select-multiple':
                    if (element.selectedIndex !== 0) {
                        element.selectedIndex = 0;
                        clearedCount++;
                        console.log(`Reset select: ${element.name || element.id}`);
                    }
                    break;
                default:
                    if (originalValue && originalValue.trim() !== '') {
                        element.value = '';
                        clearedCount++;
                        console.log(`Cleared input: ${element.name || element.id} (was: "${originalValue}")`);
                    }
            }
        });
        
        console.log(`reset_fields() completed - Cleared ${clearedCount} form fields`);
        
        // Clear any error states or validation messages
        const errorElements = document.querySelectorAll('.error, .invalid, [aria-invalid="true"]');
        errorElements.forEach(element => {
            element.classList.remove('error', 'invalid');
            element.removeAttribute('aria-invalid');
        });
        
        return { success: true, clearedCount };
        
    } catch (error) {
        console.error('reset_fields() error:', error);
        return { success: false, error: error.message };
    }
}

// Load data function - runs load_data() and renders into #table_data
function load_data() {
    console.log('load_data() executed - Fetching and rendering data to #table_data');
    
    try {
        // Generate comprehensive sample data for testing
        const sampleData = [
            { 
                id: 1, 
                name: 'Smart Router', 
                status: 'Online', 
                signal: '-42 dBm', 
                type: 'Network Device',
                lastSeen: new Date().toLocaleString()
            },
            { 
                id: 2, 
                name: 'Living Room TV', 
                status: 'Online', 
                signal: '-48 dBm', 
                type: 'Media Device',
                lastSeen: new Date(Date.now() - 60000).toLocaleString()
            },
            { 
                id: 3, 
                name: 'Kitchen Speaker', 
                status: 'Offline', 
                signal: 'N/A', 
                type: 'Audio Device',
                lastSeen: new Date(Date.now() - 300000).toLocaleString()
            },
            { 
                id: 4, 
                name: 'Smart Thermostat', 
                status: 'Online', 
                signal: '-51 dBm', 
                type: 'Climate Device',
                lastSeen: new Date(Date.now() - 30000).toLocaleString()
            },
            { 
                id: 5, 
                name: 'Security Camera', 
                status: 'Online', 
                signal: '-45 dBm', 
                type: 'Security Device',
                lastSeen: new Date(Date.now() - 120000).toLocaleString()
            }
        ];
        
        console.log('load_data() - Generated sample data:', sampleData);
        
        // Render data to table
        const renderResult = renderDataToTable(sampleData);
        console.log('load_data() completed - Data rendered to #table_data');
        
        return { success: true, data: sampleData, rendered: renderResult };
        
    } catch (error) {
        console.error('load_data() error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Helper Functions
 */

// Show success/error messages
function showSuccessMessage(message, type = 'success') {
    console.log(`showSuccessMessage() called: ${message} (type: ${type})`);
    
    // Create or get success message container
    let messageContainer = document.getElementById('success-message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'success-message-container';
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(messageContainer);
        console.log('Created success message container');
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message-alert message-${type}`;
    messageElement.textContent = message;
    
    const backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
    messageElement.style.cssText = `
        background: ${backgroundColor};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 500;
        font-size: 14px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    messageContainer.appendChild(messageElement);
    
    // Animate in
    setTimeout(() => {
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
    }, 3000);
    
    console.log(`Success message displayed: ${message}`);
}

// Render data to table in #table_data
function renderDataToTable(data) {
    console.log('renderDataToTable() called with data:', data);
    
    try {
        // Get or create table container
        let tableContainer = document.getElementById('table_data');
        if (!tableContainer) {
            tableContainer = document.createElement('div');
            tableContainer.id = 'table_data';
            tableContainer.style.cssText = `
                margin: 20px;
                padding: 20px;
                background: #f8fafc;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                overflow-x: auto;
            `;
            
            // Try to find a logical place to insert the table
            const mainContent = document.querySelector('main, .main-content, .content, #content');
            if (mainContent) {
                mainContent.appendChild(tableContainer);
            } else {
                document.body.appendChild(tableContainer);
            }
            
            console.log('Created #table_data container');
        }
        
        // Generate table HTML
        let tableHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                    Device Data Table
                </h3>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
                    Loaded ${data.length} records at ${new Date().toLocaleTimeString()}
                </p>
            </div>
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 14px;">ID</th>
                        <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 14px;">Device Name</th>
                        <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 14px;">Status</th>
                        <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 14px;">Signal</th>
                        <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 14px;">Type</th>
                        <th style="padding: 16px 12px; text-align: left; font-weight: 600; font-size: 14px;">Last Seen</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach((item, index) => {
            const statusColor = item.status === 'Online' ? '#10b981' : '#ef4444';
            const statusBg = item.status === 'Online' ? '#ecfdf5' : '#fef2f2';
            const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';
            
            tableHTML += `
                <tr style="background: ${rowBg}; border-bottom: 1px solid #e5e7eb; transition: background-color 0.2s ease;">
                    <td style="padding: 14px 12px; font-weight: 500; color: #374151;">${item.id}</td>
                    <td style="padding: 14px 12px; color: #111827; font-weight: 500;">${item.name}</td>
                    <td style="padding: 14px 12px;">
                        <span style="
                            color: ${statusColor}; 
                            background: ${statusBg}; 
                            padding: 4px 8px; 
                            border-radius: 6px; 
                            font-size: 12px; 
                            font-weight: 600;
                            text-transform: uppercase;
                        ">${item.status}</span>
                    </td>
                    <td style="padding: 14px 12px; color: #6b7280; font-family: monospace;">${item.signal}</td>
                    <td style="padding: 14px 12px; color: #4b5563;">${item.type}</td>
                    <td style="padding: 14px 12px; color: #6b7280; font-size: 13px;">${item.lastSeen}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
            <div style="margin-top: 15px; padding: 10px; background: #f1f5f9; border-radius: 6px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; color: #475569; font-size: 13px;">
                    <strong>Data loaded successfully!</strong> Table updated at ${new Date().toLocaleString()}.
                    Total records: ${data.length}
                </p>
            </div>
        `;
        
        tableContainer.innerHTML = tableHTML;
        
        // Add hover effects to table rows
        const rows = tableContainer.querySelectorAll('tbody tr');
        rows.forEach(row => {
            row.addEventListener('mouseenter', function() {
                this.style.background = '#e0f2fe';
            });
            row.addEventListener('mouseleave', function() {
                const index = Array.from(this.parentNode.children).indexOf(this);
                this.style.background = index % 2 === 0 ? '#ffffff' : '#f9fafb';
            });
        });
        
        console.log(`renderDataToTable() completed - Rendered ${data.length} rows to #table_data`);
        return { success: true, rowCount: data.length };
        
    } catch (error) {
        console.error('renderDataToTable() error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Button Event Handler Setup
 */

// Initialize button handlers when DOM is ready
function initializeButtonHandlers() {
    console.log('initializeButtonHandlers() called - Setting up button event listeners');
    
    const buttonConfigs = [
        {
            id: 'btn_submit',
            text: 'Submit Form',
            handler: submit_form,
            style: 'primary',
            description: 'Triggers submit_form() and shows success message'
        },
        {
            id: 'btn_reset',
            text: 'Reset Fields',
            handler: reset_fields,
            style: 'secondary',
            description: 'Calls reset_fields() and clears all inputs'
        },
        {
            id: 'btn_load',
            text: 'Load Data',
            handler: load_data,
            style: 'success',
            description: 'Runs load_data() and renders into #table_data'
        }
    ];
    
    buttonConfigs.forEach(config => {
        let button = document.getElementById(config.id);
        
        if (button) {
            // Button exists - update its event handler
            button.removeEventListener('click', button._customHandler);
            
            const handler = function(e) {
                e.preventDefault();
                console.log(`${config.id} clicked - executing ${config.handler.name}()`);
                config.handler();
            };
            
            button.addEventListener('click', handler);
            button._customHandler = handler;
            
            console.log(`${config.id} event handler updated`);
        } else {
            // Button doesn't exist - create it
            console.log(`${config.id} not found - creating button`);
            createButton(config);
        }
        
        BUTTON_FRAMEWORK.buttons.set(config.id, config);
    });
    
    BUTTON_FRAMEWORK.initialized = true;
    console.log('initializeButtonHandlers() completed - All button handlers ready');
}

// Create a button if it doesn't exist
function createButton(config) {
    const button = document.createElement('button');
    button.id = config.id;
    button.textContent = config.text;
    button.title = config.description;
    
    // Style based on button type
    const styles = {
        primary: { bg: '#3b82f6', hover: '#2563eb' },
        secondary: { bg: '#6b7280', hover: '#4b5563' },
        success: { bg: '#10b981', hover: '#059669' }
    };
    
    const style = styles[config.style] || styles.primary;
    
    button.style.cssText = `
        margin: 8px;
        padding: 12px 24px;
        background: ${style.bg};
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        min-width: 120px;
    `;
    
    // Event handlers
    const clickHandler = function(e) {
        e.preventDefault();
        console.log(`${config.id} clicked - executing ${config.handler.name}()`);
        config.handler();
    };
    
    button.addEventListener('click', clickHandler);
    button._customHandler = clickHandler;
    
    button.addEventListener('mouseenter', function() {
        this.style.background = style.hover;
        this.style.transform = 'translateY(-1px)';
        this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    });
    
    button.addEventListener('mouseleave', function() {
        this.style.background = style.bg;
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });
    
    // Find or create button container
    let container = document.getElementById('buttons-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'buttons-container';
        container.style.cssText = `
            padding: 20px;
            text-align: center;
            background: #f8fafc;
            border-radius: 12px;
            margin: 20px;
            border: 1px solid #e2e8f0;
        `;
        
        // Add title to container
        const title = document.createElement('h3');
        title.textContent = 'SmartBlueprint Pro Controls';
        title.style.cssText = 'margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: 600;';
        container.appendChild(title);
        
        // Try to find a logical place to insert
        const mainContent = document.querySelector('main, .main-content, .content, #content');
        if (mainContent) {
            mainContent.insertBefore(container, mainContent.firstChild);
        } else {
            document.body.appendChild(container);
        }
        
        console.log('Created buttons-container');
    }
    
    container.appendChild(button);
    console.log(`${config.id} button created and added to DOM`);
}

/**
 * Auto-initialization
 */

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeButtonHandlers);
} else {
    // DOM already loaded
    initializeButtonHandlers();
}

// Make functions globally available
window.submit_form = submit_form;
window.reset_fields = reset_fields;
window.load_data = load_data;
window.initializeButtonHandlers = initializeButtonHandlers;
window.BUTTON_FRAMEWORK = BUTTON_FRAMEWORK;

console.log('SmartBlueprint Pro Button Framework loaded - All functions available globally');
console.log('Available functions: submit_form(), reset_fields(), load_data()');
console.log('Button IDs: #btn_submit, #btn_reset, #btn_load');