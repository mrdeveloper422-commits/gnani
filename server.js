// server.js - Backend Server

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Database simulation (replace with actual database)
class Database {
    constructor() {
        this.sessions = new Map();
        this.warnings = new Map();
        exports this.exams = new Map();
        this.candidates = new Map();
        this.logs = [];
        
        this.loadData();
    }
    
    loadData() {
        // Load from file if exists
        const dataPath = path.join(__dirname, 'data.json');
        if (fs.existsSync(dataPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                this.sessions = new Map(data.sessions);
                this.warnings = new Map(data.warnings);
                this.exams = new Map(data.exams);
                this.candidates = new Map(data.candidates);
                this.logs = data.logs || [];
            } catch (e) {
                console.error('Failed to load data:', e);
            }
        }
    }
    
    saveData() {
        const data = {
            sessions: Array.from(this.sessions.entries()),
            warnings: Array.from(this.warnings.entries()),
            exams: Array.from(this.exams.entries()),
            candidates: Array.from(this.candidates.entries()),
            logs: this.logs
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'data.json'),
            JSON.stringify(data, null, 2)
        );
    }
    
    createSession(sessionData) {
        const sessionId = crypto.randomBytes(16).toString('hex');
        const session = {
            ...sessionData,
            id: sessionId,
            createdAt: new Date().toISOString(),
            terminated: false,
            terminationReason: null,
            warnings: []
        };
        
        this.sessions.set(sessionId, session);
        this.saveData();
        return session;
    }
    
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    
    updateSession(sessionId, data) {
        const session = this.sessions.get(sessionId);
        if (session) {
            Object.assign(session, data);
            this.saveData();
        }
        return session;
    }
    
    addWarning(sessionId, warning) {
        const session = this.sessions.get(sessionId);
        if (session && !session.terminated) {
            session.warnings.push(warning);
            session.warningCount = session.warnings.length;
            
            // Check for termination
            if (session.warnings.length >= 3) {
                session.terminated = true;
                session.terminationReason = 'Maximum warnings exceeded';
            }
            
            this.saveData();
            
            // Store warning separately
            const warningId = crypto.randomBytes(8).toString('hex');
            this.warnings.set(warningId, {
                ...warning,
                sessionId,
                id: warningId
            });
            
            return {
                warningCount: session.warnings.length,
                terminated: session.terminated,
                terminationReason: session.terminationReason
            };
        }
        return null;
    }
    
    logEvent(event) {
        const logEntry = {
            ...event,
            id: crypto.randomBytes(8).toString('hex'),
            timestamp: new Date().toISOString()
        };
        
        this.logs.push(logEntry);
        
        // Keep only last 10000 logs
        if (this.logs.length > 10000) {
            this.logs = this.logs.slice(-10000);
        }
        
        this.saveData();
        return logEntry;
    }
    
    getLogs(filters = {}) {
        let filtered = this.logs;
        
        if (filters.sessionId) {
            filtered = filtered.filter(l => l.sessionId === filters.sessionId);
        }
        
        if (filters.type) {
            filtered = filtered.filter(l => l.type === filters.type);
        }
        
        if (filters.startDate) {
            filtered = filtered.filter(l => l.timestamp >= filters.startDate);
        }
        
        if (filters.endDate) {
            filtered = filtered.filter(l => l.timestamp <= filters.endDate);
        }
        
        return filtered.slice(-100); // Return last 100 logs
    }
}

const db = new Database();

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        // Check if session is still valid
        const session = db.getSession(user.sessionId);
        if (!session || session.terminated) {
            return res.status(403).json({ error: 'Session terminated or invalid' });
        }
        
        req.user = user;
        req.session = session;
        next();
    });
};

// Session validation middleware
const validateSession = (req, res, next) => {
    if (req.session.terminated) {
        return res.status(403).json({ 
            error: 'Session terminated',
            reason: req.session.terminationReason 
        });
    }
    next();
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Login
app.post('/api/login', [
    body('candidateId').notEmpty().trim(),
    body('password').notEmpty(),
    body('examCode').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { candidateId, password, examCode } = req.body;
        
        // Validate candidate (simplified - replace with actual DB check)
        if (candidateId !== 'DEMO123' || password !== 'password' || examCode !== 'EXAM2024') {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create session
        const sessionId = crypto.randomBytes(16).toString('hex');
        const token = jwt.sign(
            { 
                candidateId, 
                sessionId,
                examCode 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '3h' }
        );
        
        const session = db.createSession({
            candidateId,
            examCode,
            token,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            startTime: new Date().toISOString(),
            warnings: [],
            warningCount: 0
        });
        
        // Log login
        db.logEvent({
            type: 'login',
            sessionId: session.id,
            candidateId,
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            token,
            sessionId: session.id,
            candidate: {
                id: candidateId,
                name: 'Demo Candidate'
            },
            exam: {
                id: 'EXAM001',
                title: 'Programming Fundamentals',
                duration: 5400,
                questions: getExamQuestions()
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Log warning
app.post('/api/warning', authenticateToken, validateSession, (req, res) => {
    const { warningCount, warningType, timestamp } = req.body;
    
    const warning = {
        type: warningType,
        count: warningCount,
        timestamp: timestamp || new Date().toISOString(),
        ipAddress: req.ip
    };
    
    const result = db.addWarning(req.user.sessionId, warning);
    
    // Log warning event
    db.logEvent({
        type: 'warning',
        sessionId: req.user.sessionId,
        warningType,
        warningCount,
        ipAddress: req.ip
    });
    
    res.json({
        success: true,
        ...result
    });
});

// Submit exam
app.post('/api/submit-exam', authenticateToken, validateSession, (req, res) => {
    const { answers, warningCount, terminated, terminationReason } = req.body;
    
    const session = db.updateSession(req.user.sessionId, {
        submittedAt: new Date().toISOString(),
        answers,
        finalWarningCount: warningCount,
        terminated,
        terminationReason
    });
    
    // Log submission
    db.logEvent({
        type: 'exam_submitted',
        sessionId: req.user.sessionId,
        candidateId: req.user.candidateId,
        terminated,
        warningCount,
        ipAddress: req.ip
    });
    
    // Invalidate session token
    // (In production, add token to blacklist)
    
    res.json({
        success: true,
        message: 'Exam submitted successfully',
        submittedAt: new Date().toISOString()
    });
});

// Auto-save answer
app.post('/api/auto-save', authenticateToken, validateSession, (req, res) => {
    const { questionId, answer, timestamp } = req.body;
    
    // Store in session
    const session = db.getSession(req.user.sessionId);
    if (!session.answers) {
        session.answers = [];
    }
    
    session.answers.push({
        questionId,
        answer,
        timestamp: timestamp || new Date().toISOString()
    });
    
    db.updateSession(req.user.sessionId, { answers: session.answers });
    
    res.json({ success: true });
});

// Bulk auto-save
app.post('/api/auto-save-all', authenticateToken, validateSession, (req, res) => {
    const { answers, timestamp } = req.body;
    
    db.updateSession(req.user.sessionId, {
        answers,
        lastAutoSave: timestamp || new Date().toISOString()
    });
    
    res.json({ success: true });
});

// Log security event
app.post('/api/log/security', authenticateToken, (req, res) => {
    const { event, timestamp } = req.body;
    
    db.logEvent({
        type: 'security',
        event,
        sessionId: req.user.sessionId,
        candidateId: req.user.candidateId,
        timestamp: timestamp || new Date().toISOString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    res.json({ success: true });
});

// Get session status (for heartbeat)
app.get('/api/session-status', authenticateToken, (req, res) => {
    const session = db.getSession(req.user.sessionId);
    
    res.json({
        active: !session.terminated,
        terminated: session.terminated,
        terminationReason: session.terminationReason,
        warningCount: session.warnings?.length || 0,
        timeRemaining: calculateTimeRemaining(session)
    });
});

// Admin endpoints (protected with additional auth)
app.get('/api/admin/logs', authenticateToken, (req, res) => {
    // Check if user is admin (simplified)
    if (req.user.candidateId !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { sessionId, type, startDate, endDate, limit = 100 } = req.query;
    
    let logs = db.getLogs({ sessionId, type, startDate, endDate });
    logs = logs.slice(-parseInt(limit));
    
    res.json({ logs });
});

app.get('/api/admin/sessions', authenticateToken, (req, res) => {
    if (req.user.candidateId !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const sessions = Array.from(db.sessions.values());
    res.json({ sessions });
});

app.get('/api/admin/session/:sessionId', authenticateToken, (req, res) => {
    if (req.user.candidateId !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const session = db.getSession(req.params.sessionId);
    const warnings = Array.from(db.warnings.values())
        .filter(w => w.sessionId === req.params.sessionId);
    
    res.json({
        session,
        warnings,
        logs: db.getLogs({ sessionId: req.params.sessionId })
    });
});

// Helper functions
function getExamQuestions() {
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
        }
    ];
}

function calculateTimeRemaining(session) {
    if (!session.startTime) return 0;
    
    const start = new Date(session.startTime).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - start) / 1000);
    const duration = 5400; // 90 minutes
    
    return Math.max(0, duration - elapsed);
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    db.logEvent({
        type: 'error',
        error: err.message,
        stack: err.stack,
        ipAddress: req.ip,
        path: req.path
    });
    
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    db.saveData();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    db.saveData();
    process.exit(0);
});

module.exports = app;
