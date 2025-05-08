document.addEventListener('DOMContentLoaded', () => {
    // Get elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const statusDiv = document.getElementById('status');
    const startButton = document.getElementById('startButton');
    const verifyButton = document.getElementById('verifyButton');
    const manualLoginButton = document.getElementById('manualLoginButton');
    const loadingDiv = document.getElementById('loading');
    
    // Get card number from URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const cardNo = urlParams.get('cardNo') || localStorage.getItem('cardNo');
    
    if (!cardNo) {
      updateStatus('Card number not found. Please log in again.', 'error');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }
    
    // Store reference to user's photo URL
    let userPhotoUrl = null;
    let stream = null;
    let faceDetectionInterval = null;
    
    // Make sure face-api.js is loaded before proceeding
    function waitForFaceApi() {
      if (window.faceapi) {
        console.log('face-api.js is loaded');
        initFaceRecognition();
      } else {
        console.log('Waiting for face-api.js to load...');
        setTimeout(waitForFaceApi, 100);
      }
    }
    
    // Initialize face recognition after face-api.js is loaded
    function initFaceRecognition() {
      // Load models
      loadModels().catch(error => {
        console.error('Error in loadModels:', error);
        updateStatus('Failed to load face recognition models. Please try again later.', 'error');
      });
      
      // Try to fetch user data early
      fetchUserData().catch(error => {
        console.error('Initial user data fetch failed:', error);
        updateStatus('Failed to load user data. Please check your connection.', 'error');
      });
    }
    
    // Load face-api.js models
    async function loadModels() {
      try {
        updateStatus('Loading face recognition models...', 'info');
        
        // Create models directory URL - modify this based on where you host the models
        const modelUrl = '/models';
        
        // Load models sequentially to avoid race conditions
        await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
        console.log('Tiny face detector model loaded');
        
        await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
        console.log('Face landmark model loaded');
        
        await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
        console.log('Face recognition model loaded');
        
        updateStatus('Face recognition models loaded successfully!', 'success');
        startButton.disabled = false;
      } catch (error) {
        console.error('Error loading models:', error);
        updateStatus('Failed to load face recognition models. Please try again later.', 'error');
      }
    }
    
    // Start camera
    async function startCamera() {
      try {
        updateStatus('Starting camera...', 'info');
        
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          } 
        });
        
        video.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise(resolve => {
          video.onloadedmetadata = () => {
            video.play();
            resolve();
          };
        });
        
        // Set canvas dimensions to match video
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        
        updateStatus('Camera started. Position your face in the frame.', 'success');
        verifyButton.disabled = false;
        
        // Start face detection
        startFaceDetection();
      } catch (error) {
        console.error('Error accessing camera:', error);
        if (error.name === 'NotAllowedError') {
          updateStatus('Camera access denied. Please allow camera access and try again.', 'error');
        } else {
          updateStatus('Failed to start camera. Please check your device settings.', 'error');
        }
      }
    }
    
    // Face detection loop
    function startFaceDetection() {
      if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
      }
      
      faceDetectionInterval = setInterval(async () => {
        if (!video.paused && !video.ended && video.readyState === 4) {
          try {
            const detections = await faceapi.detectAllFaces(
              video, 
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            ).withFaceLandmarks();
            
            // Clear previous drawings
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw detections
            if (detections && detections.length > 0) {
              faceapi.draw.drawDetections(canvas, detections);
              faceapi.draw.drawFaceLandmarks(canvas, detections);
              
              if (detections.length === 1) {
                verifyButton.disabled = false;
              } else {
                verifyButton.disabled = true;
                updateStatus('Only one face should be visible for verification.', 'error');
              }
            } else {
              verifyButton.disabled = true;
            }
          } catch (err) {
            console.error("Error in face detection:", err);
          }
        }
      }, 100);
    }
    
    // Simplified face verification that uses a direct approach
    // without sending to the server (for demo purposes)
    async function verifyFace() {
      try {
        // Show loading state
        loadingDiv.style.display = 'block';
        updateStatus('Verifying your identity...', 'info');
        
        // Stop face detection interval
        if (faceDetectionInterval) {
          clearInterval(faceDetectionInterval);
        }
        
        // Simulate verification - in a real app, this would compare with stored image
        setTimeout(() => {
          // In a real implementation, we would compare the current face with the stored image
          // For demo purposes, we'll just pretend it worked
          const success = true; // In real app, would be result of face comparison
          
          if (success) {
            updateStatus('Face verification successful! Redirecting to dashboard...', 'success');
            
            // Store login state and redirect
            localStorage.setItem('cardNo', cardNo);
            localStorage.setItem('faceVerified', 'true');
            
            setTimeout(() => {
              window.location.href = `/dashboard1.html?cardNo=${cardNo}`;
            }, 1500);
          } else {
            updateStatus('Face verification failed. Please try again or use manual login.', 'error');
            // Restart face detection
            startFaceDetection();
          }
          
          loadingDiv.style.display = 'none';
        }, 2000);
      } catch (error) {
        console.error('Face verification error:', error);
        updateStatus('Error during face verification. Please try again.', 'error');
        // Restart face detection
        startFaceDetection();
        loadingDiv.style.display = 'none';
      }
    }
    
    // Fetch user data including photo URL
    async function fetchUserData() {
      try {
        const response = await fetch(`/api/userinfo?cardNo=${cardNo}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const userData = await response.json();
        userPhotoUrl = userData.photo;
        
        return userData;
      } catch (error) {
        console.error('Error fetching user data:', error);
        throw error;
      }
    }
    
    // Manual login option
    function handleManualLogin() {
      localStorage.setItem('cardNo', cardNo);
      window.location.href = `/dashboard1.html?cardNo=${cardNo}`;
    }
    
    // Helper to update status message
    function updateStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.className = `status ${type}`;
    }
    
    // Clean up resources when leaving the page
    function cleanup() {
      if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    
    // Event listeners
    startButton.addEventListener('click', startCamera);
    verifyButton.addEventListener('click', verifyFace);
    manualLoginButton.addEventListener('click', handleManualLogin);
    
    window.addEventListener('beforeunload', cleanup);
    
    // Wait for face-api.js to load
    waitForFaceApi();
  });