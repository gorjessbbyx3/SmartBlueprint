/**
 * SmartBlueprint Pro - Main JavaScript Functions
 * Button event handlers and core functionality
 */

// Form submission function - triggers submit_form() and shows success message
function submit_form() {
    console.log('submit_form() called - Processing form submission');
    
    try {
        // Collect all form data with enhanced validation
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
        
        // Show success message as required
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
    console.log('reset_fields() called - Clearing all form inputs');
    
    try {
        // Clear all input types with detailed logging
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
        return { success: true, clearedCount };
        
    } catch (error) {
        console.error('reset_fields() error:', error);
        return { success: false, error: error.message };
    }
}

// Load data function - runs load_data() and renders into #table_data
function load_data() {
    console.log('load_data() called - Fetching and rendering data to #table_data');
    
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
            }
        ];
        
        console.log('load_data() - Generated sample data:', sampleData);
        
        // Render data to #table_data as required
        const renderResult = renderDataToTable(sampleData);
        console.log('load_data() completed - Data rendered to #table_data');
        
        return { success: true, data: sampleData, rendered: renderResult };
        
    } catch (error) {
        console.error('load_data() error:', error);
        return { success: false, error: error.message };
    }
}

// Helper function to show success message
function showSuccessMessage(message) {
    console.log('Showing success message:', message);
    
    // Create or update success message element
    let successDiv = document.getElementById('success-message');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'success-message';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 1000;
            font-weight: 500;
        `;
        document.body.appendChild(successDiv);
    }
    
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Enhanced helper function to render data to #table_data
function renderDataToTable(data) {
    console.log('renderDataToTable() called with data:', data);
    
    try {
        // Get or create #table_data container
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
        
        // Generate enhanced table HTML
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
                <tr style="background: ${rowBg}; border-bottom: 1px solid #e5e7eb;">
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
        console.log(`renderDataToTable() completed - Rendered ${data.length} rows to #table_data`);
        return { success: true, rowCount: data.length };
        
    } catch (error) {
        console.error('renderDataToTable() error:', error);
        return { success: false, error: error.message };
    }
}

// Initialize button event handlers when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - Initializing button event handlers');
    
    // Submit button
    const btnSubmit = document.getElementById('btn_submit');
    if (btnSubmit) {
        btnSubmit.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('#btn_submit clicked');
            submit_form();
        });
        console.log('#btn_submit event handler attached');
    } else {
        console.log('#btn_submit not found - creating button');
        createButton('btn_submit', 'Submit Form', submit_form);
    }
    
    // Reset button
    const btnReset = document.getElementById('btn_reset');
    if (btnReset) {
        btnReset.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('#btn_reset clicked');
            reset_fields();
        });
        console.log('#btn_reset event handler attached');
    } else {
        console.log('#btn_reset not found - creating button');
        createButton('btn_reset', 'Reset Fields', reset_fields);
    }
    
    // Load button
    const btnLoad = document.getElementById('btn_load');
    if (btnLoad) {
        btnLoad.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('#btn_load clicked');
            load_data();
        });
        console.log('#btn_load event handler attached');
    } else {
        console.log('#btn_load not found - creating button');
        createButton('btn_load', 'Load Data', load_data);
    }
    
    console.log('All button event handlers initialized successfully');
});

// Helper function to create buttons if they don't exist
function createButton(id, text, clickHandler) {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.style.cssText = `
        margin: 10px;
        padding: 12px 24px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    
    button.addEventListener('click', function(e) {
        e.preventDefault();
        console.log(`#${id} clicked`);
        clickHandler();
    });
    
    button.addEventListener('mouseover', function() {
        this.style.background = '#2563eb';
    });
    
    button.addEventListener('mouseout', function() {
        this.style.background = '#3b82f6';
    });
    
    // Add to a buttons container or body
    let container = document.getElementById('buttons-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'buttons-container';
        container.style.cssText = 'padding: 20px; text-align: center;';
        document.body.appendChild(container);
    }
    
    container.appendChild(button);
    console.log(`#${id} button created and added to DOM`);
}

// Export functions for external use
window.submit_form = submit_form;
window.reset_fields = reset_fields;
window.load_data = load_data;

console.log('main.js loaded successfully - All functions available globally');