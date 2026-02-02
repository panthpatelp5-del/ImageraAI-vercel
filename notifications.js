/**
 * Imagera AI - Modern Notification System
 */

// Initialize structures once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('toast-container')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="toast-container"></div>
            <div id="confirm-modal">
                <div class="modal-card">
                    <div class="modal-icon"><i class="fas fa-question-circle"></i></div>
                    <div class="modal-title">Confirm Action</div>
                    <div class="modal-message" id="confirm-message">Are you sure?</div>
                    <div class="modal-actions">
                        <button class="btn btn-ghost" id="confirm-cancel">Cancel</button>
                        <button class="btn btn-primary" id="confirm-ok">Confirm</button>
                    </div>
                </div>
            </div>
        `);
    }

    // Capture refs inside the DOM ready listener to avoid ReferenceErrors
    const confirmModal = document.getElementById('confirm-modal');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');

    if (confirmOk && confirmModal) {
        confirmOk.onclick = () => {
            if (window.currentConfirmCallback) window.currentConfirmCallback();
            confirmModal.classList.remove('active');
        };
    }

    if (confirmCancel && confirmModal) {
        confirmCancel.onclick = () => {
            confirmModal.classList.remove('active');
        };
    }
});

/**
 * Toast Function
 */
window.showToast = (message, type = 'info') => {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container not ready');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';

    toast.innerHTML = `
        <i class="fas fa-${icon} toast-icon"></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
};

/**
 * Confirmation Modal Function
 */
window.showConfirm = (message, onConfirm) => {
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');

    if (!confirmModal || !confirmMessage) {
        console.warn('Confirm modal not ready');
        // Fallback to standard confirm if UI is not ready
        if (confirm(message)) onConfirm();
        return;
    }

    confirmMessage.textContent = message;
    confirmModal.classList.add('active');
    window.currentConfirmCallback = onConfirm;
};
