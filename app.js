// app.js - Main Application Controller

class ProctorExamApp {
    constructor() {
        this.currentSection = 'login';
        this.sessionToken = null;
        this.candidateInfo = null;
        this.examData = null;
        this.warningCount = 0;
        this.isExamActive = false;
        this.isTerminated = false;
        this.faceDetection = null;
        this.warningSystem = null;
        this.examInterface = null;
        
        this.initializeApp();
    }
    
    initializeApp() {
        this.bindEvents();
        this.checkExistingSession();
        this.setupSecurityMeasures();
    }
    
    bindEvents() {
        // Login form submission
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Start exam button
        document.getElementById('start-exam-btn').addEventListener('click', () => {
            this.startExam();
        });
        
        // Warning dismissal
        document.getElementById('dismiss-warning').addEventListener('click', () => {
            this.hideWarningBanner();
        });
        
        // Close termination modal
        document.getElementById('close-termination').addEventListener('click', () => {
            this.handleTerminationClose();
        });
        
        // Submit exam
        document.getElementById('submit-exam').addEventListener('click', () => {
            this.submitExam();
        });
        
        // Previous/Next question
        document.getElementById('prev-question').addEventListener('click', () => {
            this.examInterface?.navigateQuestion('prev');
        });
        
        document.getElementById('next-question').addEventListener('click', () => {
            this.examInterface?.navigateQuestion('next');
        });
    }
    
    setupSecurityMeasures() {
        // Prevent page refresh
        window.addEventListener('beforeunload', (e) => {
            if (this.isExamActive && !this.isTerminated) {
                e.preventDefault();
                e.returnValue = 'Your exam is in progress. Are you sure you want to leave?';
                this.logSecurityEvent('page_refresh_attempt');
            }
        });
        
        // Disable right-click
        document.addEventListener('contextmenu', (e) => {
            if (this.isExamActive) {
                e.preventDefault();
                this.logSecurityEvent('right_click_attempt');
            }
        });
        
        // Detect tab switching
        document.addEventListener('visibilitychange', () => {
            if (this.isExamActive && document.hidden) {
                this.handleTabSwitch();
            }
        });
        
        // Detect fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            if (this.isExamActive && !document.fullscreenElement) {
                this.handleFullscreenExit();
            }
        });
        
        // Disable keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isExamActive) {
                // Prevent Alt+Tab, Ctrl+W, etc.
                if (e.altKey || (e.ctrlKey && e.key === 'w') || (e.ctrlKey && e.key === 'r')) {
                    e.preventDefault();
                    this.logSecurityEvent('keyboard_shortcut_attempt');
                }
            }
        });
        
        // Disable copy-paste
        document.addEventListener('copy', (e) => {
            if (this.isExamActive) {
                e.preventDefault();
            }
        });
        
        document.addEventListener('paste', (e) => {
            if (this.isExamActive) {
                e.preventDefault();
            }
        });
    }
    
    async handleLogin() {
        const candidateId = document.getElementById('candidate-id').value;
        const password = document.getElementById('password').value;
        const examCode = document.getElementById('exam-code').value;
        
        try {
            // Show loading state
            const loginBtn = document.getElementById('login-btn');
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
            
            // Simulate API call (replace with actual backend call)
            const response = await this.authenticateUser(candidateId, password, examCode);
            
            if (response.success) {
                this.sessionToken = response.token;
                this.candidateInfo = response.candidate;
                this.examData = response.exam;
                
                // Move to system check
                this.switchSection('system-check');
                this.initializeSystemCheck();
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            document.getElementById('login-error').textContent = error.message;
        } finally {
            const loginBtn = document.getElementById('login-btn');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login & Start Verification';
        }
    }
    
    async authenticateUser(candidateId, password, examCode) {
        // Simulate authentication (replace with actual API call)
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    token: 'mock-jwt-token-' + Date.now(),
                    candidate: {
                        id: candidateId,
                        name: 'John Doe',
                        email: 'john@example.com'
                    },
                    exam: {
                        id: 'EX001',
                        title: 'Programming Fundamentals',
                        duration: 5400, // 90 minutes in seconds
                        questions: this.getMockQuestions()
                    }
                });
            }, 1500);
        });
    }
    
    getMockQuestions() {
        return [
            {
                id: 1,
                text: 'What is the time complexity of binary search?',
                options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
                marks: 2,
                correct: 1
            },
            {
                id: 2,
                text: 'Which data structure uses FIFO principle?',
                options: ['Stack', 'Queue', 'Tree', 'Graph'],
                marks: 2,
                correct: 1
            },
            {
                id: 3,
                text: 'What is encapsulation in OOP?',
                options: [
                    'Binding data and methods',
                    'Inheriting properties',
                    'Hiding implementation details',
                    'Creating multiple instances'
                ],
                marks: 3,
                correct: 2
            },
            {
                id: 4,
                text: 'Which is not a JavaScript framework?',
                options: ['React', 'Angular', 'Vue', 'Django'],
                marks: 1,
                correct: 3
            },
            {
                id: 5,
                text: 'What does HTML stand for?',
                options: [
                    'Hyper Text Markup Language',
                    'High Tech Modern Language',
                    'Hyper Transfer Markup Language',
                    'Home Tool Markup Language'
                ],
                marks: 1,
                correct: 0
            }
        ];
    }
    
    async initializeSystemCheck() {
        const systemCheck = new SystemChecker();
        
        try {
            // Check camera
            const cameraStatus = await systemCheck.checkCamera();
            this.updateCheckStatus('camera-check', cameraStatus);
            
            // Check microphone
            const micStatus = await systemCheck.checkMicrophone();
            this.updateCheckStatus('microphone-check', micStatus);
            
            // Check browser compatibility
            const browserStatus = systemCheck.checkBrowser();
            this.updateCheckStatus('browser-check', browserStatus);
            
            // Check connection
            const connectionStatus = await systemCheck.checkConnection();
            this.updateCheckStatus('connection-check', connectionStatus);
            
            // Enable start button if all checks pass
            if (cameraStatus && micStatus && browserStatus && connectionStatus) {
                document.getElementById('start-exam-btn').disabled = false;
                
                // Initialize camera preview
                const preview = document.getElementById('camera-preview');
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: true 
                });
                preview.srcObject = stream;
            }
        } catch (error) {
            console.error('System check failed:', error);
        }
    }
    
    updateCheckStatus(elementId, success) {
        const element = document.getElementById(elementId);
        const statusDiv = element.querySelector('.check-status');
        
        if (success) {
            statusDiv.textContent = '✓ Passed';
            statusDiv.className = 'check-status success';
        } else {
            statusDiv.textContent = '✗ Failed';
            statusDiv.className = 'check-status error';
        }
    }
    
    async startExam() {
        try {
            // Initialize exam interface
            this.examInterface = new ExamInterface(this.examData, this.candidateInfo);
            this.examInterface.initialize();
            
            // Initialize face detection
            this.faceDetection = new FaceDetection(
                this.handleMovementWarning.bind(this),
                this.handleFaceLoss.bind(this),
                this.handleMultipleFaces.bind(this)
            );
            await this.faceDetection.initialize();
            
            // Initialize warning system
            this.warningSystem = new WarningSystem(
                this.handleWarning.bind(this),
                this.handleTermination.bind(this)
            );
            
            // Switch to exam section
            this.switchSection('exam');
            this.isExamActive = true;
            
            // Start timer
            this.examInterface.startTimer(this.handleTimeUp.bind(this));
            
            // Log exam start
            this.logExamEvent('exam_started');
            
            // Request fullscreen
            document.documentElement.requestFullscreen();
            
        } catch (error) {
            console.error('Failed to start exam:', error);
            alert('Failed to start exam. Please check your camera and try again.');
        }
    }
    
    handleMovementWarning() {
        if (this.isExamActive && !this.isTerminated) {
            this.warningSystem.addWarning('movement');
            this.showWarningBanner('Excessive movement detected!');
            this.logSecurityEvent('movement_detected');
        }
    }
    
    handleFaceLoss() {
        if (this.isExamActive && !this.isTerminated) {
            this.warningSystem.addWarning('face_loss');
            this.showWarningBanner('Face not detected!');
            this.logSecurityEvent('face_loss_detected');
        }
    }
    
    handleMultipleFaces() {
        if (this.isExamActive && !this.isTerminated) {
            this.warningSystem.addWarning('multiple_faces');
            this.showWarningBanner('Multiple faces detected!');
            this.logSecurityEvent('multiple_faces_detected');
        }
    }
    
    handleWarning(warningCount, warningType) {
        this.warningCount = warningCount;
        document.getElementById('warning-count').textContent = warningCount;
        
        // Show warning modal
        const modal = document.getElementById('warning-modal');
        const message = document.getElementById('warning-modal-message');
        const progress = document.getElementById('warning-progress');
        
        message.textContent = this.getWarningMessage(warningType);
        progress.style.width = `${(warningCount / 3) * 100}%`;
        
        modal.classList.remove('hidden');
        
        // Lock interface
        this.lockInterface(true);
        
        // Play warning sound
        this.playWarningSound();
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            modal.classList.add('hidden');
            this.lockInterface(false);
        }, 3000);
        
        // Send to backend
        this.sendWarningToBackend(warningCount, warningType);
    }
    
    getWarningMessage(type) {
        const messages = {
            'movement': 'Please maintain your position and face the camera.',
            'face_loss': 'Your face is not visible. Please position yourself in front of the camera.',
            'multiple_faces': 'Only one person should be visible in the frame.'
        };
        return messages[type] || 'Warning: Exam violation detected.';
    }
    
    handleTermination(reason) {
        this.isTerminated = true;
        this.isExamActive = false;
        
        // Stop all processes
        this.faceDetection?.stop();
        this.examInterface?.stop();
        
        // Stop webcam
        const webcam = document.getElementById('webcam-feed');
        if (webcam && webcam.srcObject) {
            webcam.srcObject.getTracks().forEach(track => track.stop());
        }
        
        // Show termination modal
        document.getElementById('termination-reason').textContent = 
            `Termination Reason: ${reason}`;
        document.getElementById('termination-modal').classList.remove('hidden');
        
        // Submit exam
        this.submitExam(true);
        
        // Log termination
        this.logExamEvent('exam_terminated', { reason });
        
        // Invalidate session
        this.invalidateSession();
    }
    
    handleTabSwitch() {
        if (this.isExamActive && !this.isTerminated) {
            this.warningSystem.addWarning('tab_switch');
            this.showWarningBanner('Tab switching detected!');
            this.logSecurityEvent('tab_switch_detected');
        }
    }
    
    handleFullscreenExit() {
        if (this.isExamActive && !this.isTerminated) {
            this.warningSystem.addWarning('fullscreen_exit');
            this.showWarningBanner('Fullscreen mode exited!');
            this.logSecurityEvent('fullscreen_exit_detected');
            
            // Attempt to re-enter fullscreen
            document.documentElement.requestFullscreen();
        }
    }
    
    handleTimeUp() {
        if (this.isExamActive && !this.isTerminated) {
            this.handleTermination('Time expired');
        }
    }
    
    showWarningBanner(message) {
        const banner = document.getElementById('warning-banner');
        const messageEl = document.getElementById('warning-message');
        
        messageEl.textContent = message;
        banner.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideWarningBanner();
        }, 5000);
    }
    
    hideWarningBanner() {
        document.getElementById('warning-banner').classList.add('hidden');
    }
    
    lockInterface(locked) {
        const inputs = document.querySelectorAll('input, textarea, button:not(#dismiss-warning)');
        inputs.forEach(input => {
            input.disabled = locked;
        });
    }
    
    playWarningSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }
    
    async sendWarningToBackend(count, type) {
        try {
            // Simulate API call
            await fetch('/api/warning', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    warningCount: count,
                    warningType: type,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Failed to send warning to backend:', error);
        }
    }
    
    async submitExam(forceSubmit = false) {
        if (!forceSubmit && !confirm('Are you sure you want to submit your exam?')) {
            return;
        }
        
        try {
            // Get answers from exam interface
            const answers = this.examInterface?.getAnswers() || [];
            
            // Send to backend
            const response = await fetch('/api/submit-exam', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.sessionToken}`
                },
                body: JSON.stringify({
                    answers,
                    warningCount: this.warningCount,
                    terminated: this.isTerminated,
                    terminationReason: this.isTerminated ? 
                        document.getElementById('termination-reason').textContent : null,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                this.handleExamSubmitted();
            }
        } catch (error) {
            console.error('Failed to submit exam:', error);
            alert('Failed to submit exam. Please contact your proctor.');
        }
    }
    
    handleExamSubmitted() {
        // Show submission message
        alert('Exam submitted successfully!');
        
        // Clean up
        this.faceDetection?.stop();
        this.examInterface?.stop();
        
        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        
        // Redirect to login or end screen
        this.switchSection('login');
        this.isExamActive = false;
        this.isTerminated = false;
        
        // Clear forms
        document.getElementById('login-form').reset();
    }
    
    handleTerminationClose() {
        document.getElementById('termination-modal').classList.add('hidden');
        this.switchSection('login');
    }
    
    invalidateSession() {
        this.sessionToken = null;
        this.candidateInfo = null;
        this.examData = null;
    }
    
    switchSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionId}-section`).classList.add('active');
        this.currentSection = sectionId;
    }
    
    logSecurityEvent(event) {
        console.log(`Security Event: ${event}`, {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionToken,
            candidateId: this.candidateInfo?.id
        });
        
        // Send to backend for logging
        fetch('/api/log/security', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.sessionToken}`
            },
            body: JSON.stringify({
                event,
                timestamp: new Date().toISOString()
            })
        }).catch(err => console.error('Failed to log security event:', err));
    }
    
    logExamEvent(event, data = {}) {
        console.log(`Exam Event: ${event}`, {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionToken,
            candidateId: this.candidateInfo?.id,
            ...data
        });
    }
    
    checkExistingSession() {
        // Check for existing session in localStorage
        const savedSession = localStorage.getItem('examSession');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                // Validate session (implement actual validation)
                if (session.expires > Date.now()) {
                    // Restore session
                    this.sessionToken = session.token;
                    this.candidateInfo = session.candidate;
                    this.examData = session.exam;
                    
                    // Prompt to resume
                    if (confirm('You have an ongoing exam session. Would you like to resume?')) {
                        this.resumeExam();
                    }
                }
            } catch (e) {
                localStorage.removeItem('examSession');
            }
        }
    }
    
    resumeExam() {
        // Implement exam resumption logic
        this.switchSection('system-check');
        this.initializeSystemCheck();
    }
}

// System Checker Class
class SystemChecker {
    async checkCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Camera check failed:', error);
            return false;
        }
    }
    
    async checkMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Microphone check failed:', error);
            return false;
        }
    }
    
    checkBrowser() {
        // Check for required APIs
        const requirements = {
            mediaDevices: !!navigator.mediaDevices,
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            webGL: this.checkWebGL(),
            webWorkers: !!window.Worker,
            localStorage: !!window.localStorage,
            fullscreen: !!(
                document.fullscreenEnabled ||
                document.webkitFullscreenEnabled ||
                document.mozFullScreenEnabled ||
                document.msFullscreenEnabled
            )
        };
        
        return Object.values(requirements).every(Boolean);
    }
    
    checkWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }
    
    async checkConnection() {
        try {
            const response = await fetch('/api/health', { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.proctorApp = new ProctorExamApp();
});
