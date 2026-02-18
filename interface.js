// exam-interface.js - Exam Interface Management

class ExamInterface {
    constructor(examData, candidateInfo) {
        this.examData = examData;
        this.candidateInfo = candidateInfo;
        this.questions = examData.questions || [];
        this.answers = new Array(this.questions.length).fill(null);
        this.currentQuestionIndex = 0;
        this.timeRemaining = examData.duration || 5400; // Default 90 minutes
        this.timerInterval = null;
        this.isSubmitted = false;
        this.startTime = Date.now();
        
        window.examStartTime = this.startTime;
    }
    
    initialize() {
        this.renderCandidateInfo();
        this.renderQuestionNav();
        this.renderQuestion(0);
        this.setupEventListeners();
        this.loadSavedAnswers();
    }
    
    renderCandidateInfo() {
        const infoEl = document.getElementById('candidate-info');
        if (infoEl) {
            infoEl.textContent = `${this.candidateInfo.name} (${this.candidateInfo.id})`;
        }
        
        const titleEl = document.getElementById('exam-title');
        if (titleEl) {
            titleEl.textContent = this.examData.title;
        }
    }
    
    renderQuestionNav() {
        const navContainer = document.getElementById('question-nav');
        if (!navContainer) return;
        
        navContainer.innerHTML = '';
        
        this.questions.forEach((question, index) => {
            const navItem = document.createElement('div');
            navItem.className = `question-nav-item ${this.getQuestionStatus(index)}`;
            navItem.textContent = index + 1;
            navItem.dataset.index = index;
            
            navItem.addEventListener('click', () => {
                this.navigateToQuestion(index);
            });
            
            navContainer.appendChild(navItem);
        });
    }
    
    getQuestionStatus(index) {
        if (this.answers[index] !== null) {
            return 'answered';
        }
        if (index === this.currentQuestionIndex) {
            return 'active';
        }
        return '';
    }
    
    renderQuestion(index) {
        const container = document.getElementById('questions-container');
        if (!container) return;
        
        const question = this.questions[index];
        if (!question) return;
        
        const questionHtml = `
            <div class="question" data-question-id="${question.id}">
                <div class="question-header">
                    <span class="question-number">Question ${index + 1} of ${this.questions.length}</span>
                    <span class="question-marks">${question.marks} marks</span>
                </div>
                <div class="question-text">${question.text}</div>
                <div class="options-container">
                    ${question.options.map((option, optIndex) => `
                        <label class="option ${this.answers[index] === optIndex ? 'selected' : ''}">
                            <input type="radio" 
                                   name="question-${question.id}" 
                                   value="${optIndex}"
                                   ${this.answers[index] === optIndex ? 'checked' : ''}>
                            <span class="option-text">${option}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = questionHtml;
        
        // Add event listeners to radio buttons
        container.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleAnswerChange(index, parseInt(e.target.value));
            });
        });
        
        // Update navigation buttons
        this.updateNavigationButtons();
        
        // Update active state in nav
        this.updateNavActiveState(index);
    }
    
    handleAnswerChange(questionIndex, answerIndex) {
        this.answers[questionIndex] = answerIndex;
        
        // Update question status in nav
        this.updateQuestionStatus(questionIndex, 'answered');
        
        // Save to localStorage
        this.saveAnswers();
        
        // Auto-save to backend
        this.autoSaveAnswer(questionIndex, answerIndex);
    }
    
    updateQuestionStatus(index, status) {
        const navItems = document.querySelectorAll('.question-nav-item');
        if (navItems[index]) {
            navItems[index].className = `question-nav-item ${status}`;
        }
    }
    
    updateNavActiveState(index) {
        document.querySelectorAll('.question-nav-item').forEach((item, i) => {
            if (i === index) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    navigateToQuestion(index) {
        if (index >= 0 && index < this.questions.length) {
            this.currentQuestionIndex = index;
            this.renderQuestion(index);
        }
    }
    
    navigateQuestion(direction) {
        if (direction === 'prev' && this.currentQuestionIndex > 0) {
            this.navigateToQuestion(this.currentQuestionIndex - 1);
        } else if (direction === 'next' && this.currentQuestionIndex < this.questions.length - 1) {
            this.navigateToQuestion(this.currentQuestionIndex + 1);
        }
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-question');
        const nextBtn = document.getElementById('next-question');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentQuestionIndex === this.questions.length - 1;
        }
    }
    
    startTimer(onTimeUp) {
        this.timerInterval = setInterval(() => {
            if (this.timeRemaining > 0) {
                this.timeRemaining--;
                this.updateTimerDisplay();
                
                // Auto-save every minute
                if (this.timeRemaining % 60 === 0) {
                    this.autoSaveAllAnswers();
                }
            } else {
                this.stopTimer();
                if (onTimeUp) {
                    onTimeUp();
                }
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateTimerDisplay() {
        const timerEl = document.getElementById('timer');
        if (!timerEl) return;
        
        const hours = Math.floor(this.timeRemaining / 3600);
        const minutes = Math.floor((this.timeRemaining % 3600) / 60);
        const seconds = this.timeRemaining % 60;
        
        timerEl.textContent = `${this.padNumber(hours)}:${this.padNumber(minutes)}:${this.padNumber(seconds)}`;
        
        // Change color when time is low
        if (this.timeRemaining < 300) { // Last 5 minutes
            timerEl.style.color = '#ef4444';
        } else if (this.timeRemaining < 600) { // Last 10 minutes
            timerEl.style.color = '#f59e0b';
        }
    }
    
    padNumber(num) {
        return num.toString().padStart(2, '0');
    }
    
    saveAnswers() {
        try {
            localStorage.setItem('examAnswers', JSON.stringify({
                examId: this.examData.id,
                answers: this.answers,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('Failed to save answers to localStorage:', e);
        }
    }
    
    loadSavedAnswers() {
        try {
            const saved = localStorage.getItem('examAnswers');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.examId === this.examData.id) {
                    this.answers = data.answers;
                    
                    // Update UI
                    this.answers.forEach((answer, index) => {
                        if (answer !== null) {
                            this.updateQuestionStatus(index, 'answered');
                        }
                    });
                }
            }
        } catch (e) {
            console.error('Failed to load saved answers:', e);
        }
    }
    
    async autoSaveAnswer(questionIndex, answer) {
        try {
            await fetch('/api/auto-save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.proctorApp?.sessionToken}`
                },
                body: JSON.stringify({
                    questionId: this.questions[questionIndex].id,
                    answer: answer,
                    timestamp: Date.now()
                })
            });
        } catch (e) {
            console.error('Auto-save failed:', e);
        }
    }
    
    async autoSaveAllAnswers() {
        const answersToSave = this.answers
            .map((answer, index) => ({
                questionId: this.questions[index].id,
                answer: answer
            }))
            .filter(a => a.answer !== null);
        
        if (answersToSave.length === 0) return;
        
        try {
            await fetch('/api/auto-save-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.proctorApp?.sessionToken}`
                },
                body: JSON.stringify({
                    answers: answersToSave,
                    timestamp: Date.now()
                })
            });
        } catch (e) {
            console.error('Bulk auto-save failed:', e);
        }
    }
    
    getAnswers() {
        return this.questions.map((question, index) => ({
            questionId: question.id,
            questionText: question.text,
            selectedAnswer: this.answers[index],
            isCorrect: this.answers[index] === question.correct,
            marks: question.marks,
            timeSpent: this.getTimeSpentOnQuestion(index)
        }));
    }
    
    getTimeSpentOnQuestion(questionIndex) {
        // Calculate time spent on this question
        // This is a simplified version
        return 0;
    }
    
    getExamSummary() {
        const answered = this.answers.filter(a => a !== null).length;
        const total = this.questions.length;
        const percentage = (answered / total) * 100;
        
        return {
            totalQuestions: total,
            answered: answered,
            unanswered: total - answered,
            percentage: Math.round(percentage),
            timeSpent: Math.floor((Date.now() - this.startTime) / 1000),
            timeRemaining: this.timeRemaining
        };
    }
    
    setupEventListeners() {
        // Prevent copy-paste in exam area
        const questionArea = document.querySelector('.question-area');
        if (questionArea) {
            questionArea.addEventListener('copy', (e) => e.preventDefault());
            questionArea.addEventListener('paste', (e) => e.preventDefault());
            questionArea.addEventListener('cut', (e) => e.preventDefault());
        }
        
        // Prevent text selection
        document.querySelectorAll('.question-text, .option-text').forEach(el => {
            el.style.userSelect = 'none';
        });
    }
    
    cleanup() {
        this.stopTimer();
        
        // Remove event listeners
        // Clear localStorage
        localStorage.removeItem('examAnswers');
    }
}
