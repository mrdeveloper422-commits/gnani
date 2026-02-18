// face-detection.js - Face Detection Module using MediaPipe

class FaceDetection {
    constructor(onMovementWarning, onFaceLoss, onMultipleFaces) {
        this.onMovementWarning = onMovementWarning;
        this.onFaceLoss = onFaceLoss;
        this.onMultipleFaces = onMultipleFaces;
        
        this.faceMesh = null;
        this.camera = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        
        this.baselinePosition = null;
        this.lastStablePosition = null;
        this.stableFrames = 0;
        this.STABLE_THRESHOLD = 30; // 10 seconds at 3fps
        this.MOVEMENT_THRESHOLD = 50; // pixels
        this.FACE_LOSS_THRESHOLD = 6; // 2 seconds at 3fps
        
        this.noFaceFrames = 0;
        this.multipleFacesDetected = false;
        this.isRunning = false;
        this.detectionInterval = null;
        
        this.noseTipIndex = 1; // MediaPipe nose tip landmark index
        this.faceBox = null;
        
        this.smoothingFactor = 0.7;
        this.lastPositions = [];
    }
    
    async initialize() {
        try {
            // Initialize MediaPipe FaceMesh
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });
            
            this.faceMesh.setOptions({
                maxNumFaces: 3,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            this.faceMesh.onResults(this.onFaceResults.bind(this));
            
            // Setup camera
            this.videoElement = document.getElementById('webcam-feed');
            if (!this.videoElement) {
                throw new Error('Video element not found');
            }
            
            // Create hidden canvas for processing
            this.canvasElement = document.createElement('canvas');
            this.canvasElement.style.display = 'none';
            document.body.appendChild(this.canvasElement);
            this.canvasCtx = this.canvasElement.getContext('2d');
            
            // Initialize camera
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 15 }
                },
                audio: false
            });
            
            this.videoElement.srcObject = stream;
            await this.videoElement.play();
            
            // Start face detection
            this.startDetection();
            
            return true;
        } catch (error) {
            console.error('Face detection initialization failed:', error);
            return false;
        }
    }
    
    startDetection() {
        this.isRunning = true;
        
        // Use requestAnimationFrame for real-time detection
        const detectFaces = async () => {
            if (!this.isRunning) return;
            
            if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
                await this.faceMesh.send({ image: this.videoElement });
            }
            
            requestAnimationFrame(detectFaces);
        };
        
        detectFaces();
        
        // Set up movement detection interval
        this.detectionInterval = setInterval(() => {
            this.checkMovementThreshold();
        }, 500); // Check every 500ms
    }
    
    stop() {
        this.isRunning = false;
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
        }
        
        // Stop camera
        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
    }
    
    onFaceResults(results) {
        if (!this.isRunning) return;
        
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            // No face detected
            this.handleNoFace();
            return;
        }
        
        // Check for multiple faces
        if (results.multiFaceLandmarks.length > 1) {
            this.handleMultipleFaces(results.multiFaceLandmarks.length);
            return;
        }
        
        // Single face detected
        this.noFaceFrames = 0;
        this.multipleFacesDetected = false;
        
        // Get face landmarks
        const landmarks = results.multiFaceLandmarks[0];
        this.processFaceLandmarks(landmarks);
        
        // Draw face mesh on video (optional - can be commented out for performance)
        this.drawFaceMesh(results);
    }
    
    processFaceLandmarks(landmarks) {
        // Get nose tip position (landmark index 1)
        const noseTip = landmarks[this.noseTipIndex];
        const position = {
            x: noseTip.x * this.videoElement.videoWidth,
            y: noseTip.y * this.videoElement.videoHeight,
            z: noseTip.z
        };
        
        // Smooth position
        this.lastPositions.push(position);
        if (this.lastPositions.length > 5) {
            this.lastPositions.shift();
        }
        
        const smoothedPosition = this.smoothPosition();
        
        // Set baseline if not set
        if (!this.baselinePosition) {
            this.baselinePosition = smoothedPosition;
            this.lastStablePosition = smoothedPosition;
            return;
        }
        
        // Check for stability
        if (this.isStable(smoothedPosition)) {
            this.stableFrames++;
            if (this.stableFrames >= this.STABLE_THRESHOLD) {
                this.baselinePosition = smoothedPosition;
                this.stableFrames = 0;
            }
        } else {
            this.stableFrames = Math.max(0, this.stableFrames - 1);
        }
        
        // Store for movement check
        this.lastStablePosition = smoothedPosition;
    }
    
    smoothPosition() {
        if (this.lastPositions.length === 0) return { x: 0, y: 0, z: 0 };
        
        let weightedSum = { x: 0, y: 0, z: 0 };
        let totalWeight = 0;
        
        for (let i = 0; i < this.lastPositions.length; i++) {
            const weight = Math.pow(this.smoothingFactor, this.lastPositions.length - i - 1);
            weightedSum.x += this.lastPositions[i].x * weight;
            weightedSum.y += this.lastPositions[i].y * weight;
            weightedSum.z += this.lastPositions[i].z * weight;
            totalWeight += weight;
        }
        
        return {
            x: weightedSum.x / totalWeight,
            y: weightedSum.y / totalWeight,
            z: weightedSum.z / totalWeight
        };
    }
    
    isStable(position) {
        if (!this.lastStablePosition) return false;
        
        const delta = this.calculateMovement(position, this.lastStablePosition);
        return delta < this.MOVEMENT_THRESHOLD / 2;
    }
    
    checkMovementThreshold() {
        if (!this.isRunning || !this.baselinePosition || !this.lastStablePosition) return;
        
        const movement = this.calculateMovement(this.lastStablePosition, this.baselinePosition);
        
        if (movement > this.MOVEMENT_THRESHOLD) {
            this.handleMovement(movement);
        }
    }
    
    calculateMovement(pos1, pos2) {
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        const dz = Math.abs(pos1.z - pos2.z) * 100; // Scale z movement
        
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    handleMovement(movement) {
        console.log('Movement detected:', movement);
        this.onMovementWarning();
    }
    
    handleNoFace() {
        this.noFaceFrames++;
        
        if (this.noFaceFrames >= this.FACE_LOSS_THRESHOLD) {
            this.onFaceLoss();
            this.noFaceFrames = 0;
        }
    }
    
    handleMultipleFaces(faceCount) {
        if (!this.multipleFacesDetected) {
            this.multipleFacesDetected = true;
            console.log(`${faceCount} faces detected`);
            this.onMultipleFaces();
        }
    }
    
    drawFaceMesh(results) {
        if (!this.canvasCtx) return;
        
        const videoWidth = this.videoElement.videoWidth;
        const videoHeight = this.videoElement.videoHeight;
        
        this.canvasElement.width = videoWidth;
        this.canvasElement.height = videoHeight;
        
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
        this.canvasCtx.drawImage(results.image, 0, 0, videoWidth, videoHeight);
        
        if (results.multiFaceLandmarks) {
            for (const landmarks of results.multiFaceLandmarks) {
                this.drawConnectors(
                    this.canvasCtx, 
                    landmarks, 
                    FACEMESH_TESSELATION,
                    { color: '#C0C0C070', lineWidth: 1 }
                );
                this.drawLandmarks(
                    this.canvasCtx,
                    landmarks,
                    { color: '#FF0000', radius: 1 }
                );
            }
        }
        
        this.canvasCtx.restore();
    }
}

// Constants for face mesh drawing (simplified)
const FACEMESH_TESSELATION = []; // This would contain the actual face mesh connections

function drawConnectors(ctx, landmarks, connections, options) {
    // Simplified implementation
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    
    for (const [start, end] of connections) {
        ctx.beginPath();
        ctx.moveTo(landmarks[start].x * ctx.canvas.width, landmarks[start].y * ctx.canvas.height);
        ctx.lineTo(landmarks[end].x * ctx.canvas.width, landmarks[end].y * ctx.canvas.height);
        ctx.stroke();
    }
}

function drawLandmarks(ctx, landmarks, options) {
    ctx.fillStyle = options.color;
    
    for (const landmark of landmarks) {
        ctx.beginPath();
        ctx.arc(
            landmark.x * ctx.canvas.width,
            landmark.y * ctx.canvas.height,
            options.radius,
            0,
            2 * Math.PI
        );
        ctx.fill();
    }
}
