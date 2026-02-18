# Proctor Exam System - Comprehensive Online Examination Platform

## Overview

The Proctor Exam System is a fully-featured, secure online examination platform with AI-powered proctoring capabilities. It provides real-time face detection, movement tracking, and comprehensive exam monitoring to ensure academic integrity during online assessments.

## Features

### Phase 1: Frontend Exam Interface ✅
- Responsive single-page exam application built with vanilla JavaScript
- Secure candidate login with JWT token authentication
- Pre-exam system check for camera and microphone permissions
- Live webcam preview in corner frame during exam
- Timer countdown with visual warnings
- Page refresh prevention and right-click disabling
- Tab switching detection
- Warning banner and modal popup system
- Auto-submission on reaching warning limit
- Clean, distraction-free UI

### Phase 2: Face Detection & Movement Tracking ✅
- MediaPipe FaceMesh integration for accurate face detection
- Real-time camera stream using WebRTC
- Single face detection with landmark tracking
- Baseline position storage at exam start
- Nose tip coordinate tracking for stability
- Horizontal and vertical movement detection
- Configurable movement threshold
- 500ms detection loop with smoothing algorithm
- Face disappearance detection (2-second threshold)
- Multiple face detection with immediate warning
- Low CPU usage optimization
- Camera disconnect handling

### Phase 3: Warning & Termination Logic ✅
- Progressive warning system (3 strikes)
- Visual alerts with warning counters
- Timestamp logging for each warning
- Backend synchronization of warning events
- 3-second interface lock after warnings
- Soft alert sounds on warnings
- Automatic exam termination at 3 warnings
- Instant timer stop and input disabling
- Webcam capture termination
- Session token invalidation
- Clear termination reason display

### Phase 4: Backend Session & Logging ✅
- Node.js/Express backend server
- RESTful API endpoints for all events
- Session management with database storage
- Warning logs with timestamps and reasons
- Movement detection metadata storage
- Termination status flags
- JWT authentication validation
- Server-side request validation
- IP address and browser fingerprint logging
- Exam start/end timestamp recording
- Admin endpoints for log review
- Rate limiting implementation
- HTTPS-ready configuration

### Phase 5: Security & Enhancements ✅
- HTTPS-only secure camera streaming
- Fullscreen mode enforcement
- Fullscreen exit detection
- Copy-paste blocking
- Keyboard shortcut prevention
- Server heartbeat for active sessions
- Browser crash recovery
- Concurrent login prevention
- Environment variable configuration
- Scalable architecture ready
- Load balancing support
- Health monitoring system
- Admin dashboard for flagged exams
- Data retention policies
- GDPR consent compliance
- Pre-test movement calibration
- Configurable sensitivity settings

## Technology Stack

### Frontend
- HTML5
- CSS3 (with CSS variables, flexbox, grid)
- Vanilla JavaScript (ES6+)
- MediaPipe FaceMesh for face detection
- WebRTC for camera streaming
- Web Audio API for warning sounds

### Backend
- Node.js
- Express.js
- JWT for authentication
- bcrypt for password hashing
- express-rate-limit for rate limiting
- helmet for security headers
- File-based storage (easily replaceable with MongoDB/PostgreSQL)

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Modern browser with WebRTC support
- Camera and microphone

### Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/yourusername/proctor-exam-system.git
cd proctor-exam-system
