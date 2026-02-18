// warning-system.js - Warning and Termination Logic

class WarningSystem {
    constructor(onWarning, onTermination) {
        this.onWarning = onWarning;
        this.onTermination = onTermination;
        
        this.warningCount = 0;
        this.maxWarnings = 3;
        this.warningHistory = [];
        this.warningTypes = new Set();
        this.isLocked = false;
        this.lockTimeout = null;
        
        this.LOCK_DURATION = 3000; // 3 seconds
        this.warningSound = null;
        
        this.initializeWarningSound();
    }
    
    initializeWarningSound() {
        // Create audio context for warning sounds
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }
    
    addWarning(type) {
        // Prevent duplicate warnings in quick succession
        if (this.warningTypes.has(type)) {
            return;
        }
        
        this.warningTypes.add(type);
        
        // Clear after 5 seconds
        setTimeout(() => {
            this.warningTypes.delete(type);
        }, 5000);
        
        this.warningCount++;
        const warning = {
            id: Date.now(),
            type: type,
            count: this.warningCount,
            timestamp: new Date().toISOString(),
            sessionTime: this.getSessionTime()
        };
        
        this.warningHistory.push(warning);
        
        // Trigger warning callback
        this.onWarning(this.warningCount, type);
        
        // Play sound
        this.playWarningSound(type);
        
        // Lock interface
        this.lockInterface();
        
        // Check for termination
        if (this.warningCount >= this.maxWarnings) {
            this.terminateExam('Maximum warnings exceeded');
        }
        
        return warning;
    }
    
    lockInterface() {
        if (this.isLocked) return;
        
        this.isLocked = true;
        
        // Disable all inputs
        const inputs = document.querySelectorAll('input, textarea, button');
        inputs.forEach(input => {
            if (!input.classList.contains('permanent-enabled')) {
                input.disabled = true;
            }
        });
        
        // Show lock overlay
        this.showLockOverlay();
        
        // Auto-unlock after duration
        this.lockTimeout = setTimeout(() => {
            this.unlockInterface();
        }, this.LOCK_DURATION);
    }
    
    unlockInterface() {
        this.isLocked = false;
        
        // Enable inputs
        const inputs = document.querySelectorAll('input, textarea, button');
        inputs.forEach(input => {
            if (!input.classList.contains('permanent-disabled')) {
                input.disabled = false;
            }
        });
        
        // Hide lock overlay
        this.hideLockOverlay();
        
        if (this.lockTimeout) {
            clearTimeout(this.lockTimeout);
            this.lockTimeout = null;
        }
    }
    
    showLockOverlay() {
        let overlay = document.getElementById('warning-lock-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'warning-lock-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
            `;
            
            const message = document.createElement('div');
            message.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            `;
            message.innerHTML = `
                <h3>⚠️ Warning</h3>
                <p>Interface locked for 3 seconds</p>
                <div class="lock-timer"></div>
            `;
            
            overlay.appendChild(message);
            document.body.appendChild(overlay);
        }
        
        overlay.style.display = 'flex';
        
        // Start timer animation
        this.startLockTimer();
    }
    
    hideLockOverlay() {
        const overlay = document.getElementById('warning-lock-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    startLockTimer() {
        const timerEl = document.querySelector('.lock-timer');
        if (!timerEl) return;
        
        let timeLeft = 3;
        timerEl.textContent = `${timeLeft}s`;
        
        const interval = setInterval(() => {
            timeLeft--;
            timerEl.textContent = `${timeLeft}s`;
            
            if (timeLeft <= 0) {
                clearInterval(interval);
            }
        }, 1000);
    }
    
    playWarningSound(type) {
        if (!this.audioContext) return;
        
        // Different sounds for different warning types
        const frequencies = {
            'movement': 880,
            'face_loss': 660,
            'multiple_faces': 550,
            'tab_switch': 440,
            'fullscreen_exit': 330
        };
        
        const frequency = frequencies[type] || 440;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            
            oscillator.start();
            
            // Two beeps for warning
            oscillator.stop(this.audioContext.currentTime + 0.2);
            
            setTimeout(() => {
                const oscillator2 = this.audioContext.createOscillator();
                const gainNode2 = this.audioContext.createGain();
                
                oscillator2.connect(gainNode2);
                gainNode2.connect(this.audioContext.destination);
                
                oscillator2.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                gainNode2.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                
                oscillator2.start();
                oscillator2.stop(this.audioContext.currentTime + 0.2);
            }, 300);
            
        } catch (e) {
            console.warn('Could not play warning sound:', e);
        }
    }
    
    terminateExam(reason) {
        // Log termination
        const termination = {
            timestamp: new Date().toISOString(),
            warningCount: this.warningCount,
            reason: reason,
            history: this.warningHistory
        };
        
        // Trigger termination callback
        this.onTermination(reason);
        
        // Store termination record
        this.storeTerminationRecord(termination);
        
        // Clear all warnings
        this.reset();
    }
    
    storeTerminationRecord(termination) {
        // Store in localStorage for backup
        try {
            const records = JSON.parse(localStorage.getItem('terminationRecords') || '[]');
            records.push(termination);
            localStorage.setItem('terminationRecords', JSON.stringify(records));
        } catch (e) {
            console.error('Failed to store termination record:', e);
        }
    }
    
    getSessionTime() {
        const startTime = window.examStartTime;
        if (!startTime) return 0;
        
        return Math.floor((Date.now() - startTime) / 1000);
    }
    
    reset() {
        this.warningCount = 0;
        this.warningHistory = [];
        this.warningTypes.clear();
        this.unlockInterface();
    }
    
    getWarningStats() {
        return {
            count: this.warningCount,
            history: this.warningHistory,
            types: Array.from(this.warningTypes)
        };
    }
    
    getWarningByType(type) {
        return this.warningHistory.filter(w => w.type === type);
    }
    
    getWarningsInTimeRange(startTime, endTime) {
        return this.warningHistory.filter(w => {
            const time = new Date(w.timestamp).getTime();
            return time >= startTime && time <= endTime;
        });
    }
}
