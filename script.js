let map, platform, behavior, ui, drawingLayer;
let landPolygon;

document.addEventListener('DOMContentLoaded', function () {
  // Registration form handling
  const registrationForm = document.getElementById('registrationForm');
  if (registrationForm) {
    registrationForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      const formData = new FormData(this);
      const photoFile = document.querySelector('input[name="photo"]').files[0];
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(photoFile.type)) {
        alert('Invalid image file type. Please upload a .jpeg, .jpg, or .png file.');
        return;
      }
      
      try {
        const response = await fetch('/register', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
          alert(`Registration successful! Your card number is: ${result.cardNo}`);
          document.getElementById('cardDisplay').textContent = `Your Card Number: ${result.cardNo}`;
        } else {
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error during registration:', error);
        alert('Something went wrong. Please try again.');
      }
    });
  }
  
  const loginSteps = ['cardNo', 'phone', 'dob'];
  let currentLoginStep = 0;
  let verifiedLoginData = {};
  let completedLoginSteps = 0;

  const loginProgressFill = document.getElementById('progressFill');
  const loginProgressText = document.getElementById('progressPercentage');
  const loginBtn = document.getElementById('loginButton');

  if (loginBtn) loginBtn.addEventListener('click', submitLogin);

  loginSteps.forEach(step => {
    const verifyBtn = document.getElementById(`verify-${step}`);
    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => verifyLoginStep(step));
    }
  });

  showLoginStep();
  updateLoginProgress(0);

  function showLoginStep() {
    document.querySelectorAll('.verification-step').forEach(s => s.classList.remove('active'));
    const stepDiv = document.getElementById(`step-${loginSteps[currentLoginStep]}`);
    if (stepDiv) stepDiv.classList.add('active');
  }

  function updateLoginProgress(done) {
    const percent = Math.round((done / loginSteps.length) * 100);
    if (loginProgressFill) loginProgressFill.style.width = `${percent}%`;
    if (loginProgressText) loginProgressText.textContent = `${percent}%`;
  }

  function verifyLoginStep(step) {
    const input = document.getElementById(step);
    const error = document.getElementById(`${step}-error`);
    const indicator = document.getElementById(`${step}-indicator`);
    const status = document.getElementById(`${step}-status`);

    if (!input || !error || !indicator || !status) return;

    const value = input.value.trim();
    error.textContent = '';
    if (!value) {
      error.textContent = `${step.toUpperCase()} is required.`;
      return;
    }

    status.textContent = 'Verifying...';
    const body = { [step]: value };
    if (step !== 'cardNo') body.cardNo = verifiedLoginData.cardNo;

    fetch(`/login/verify/${step}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          input.disabled = true;
          input.classList.add('success');

          indicator.classList.remove('pending');
          indicator.classList.add('verified');
          indicator.textContent = '✓';

          status.textContent = 'Verified';
          verifiedLoginData[step] = value;
          completedLoginSteps++;
          updateLoginProgress(completedLoginSteps);

          if (currentLoginStep < loginSteps.length - 1) {
            currentLoginStep++;
            showLoginStep();
          } else {
            document.getElementById('step-final').classList.add('active');
            document.getElementById('finalMessage').innerHTML = '<span class="success-message">All verifications complete! You can now login.</span>';
            loginBtn.disabled = false;
          }
        } else {
          error.textContent = data.message || 'Verification failed.';
          indicator.classList.remove('pending');
          indicator.classList.add('failed');
          indicator.textContent = '!';
          status.textContent = 'Failed';
        }
      })
      .catch(err => {
        console.error(err);
        error.textContent = 'Verification failed. Please try again.';
        status.textContent = 'Failed';
      });
  }

  function submitLogin() {
    const finalMessage = document.getElementById('finalMessage');
    finalMessage.textContent = 'Logging in...';
    loginBtn.disabled = true;

    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifiedLoginData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          finalMessage.innerHTML = '<span class="success-message">Login successful! Redirecting...</span>';
          localStorage.setItem('cardNo', verifiedLoginData.cardNo);
          setTimeout(() => {
            window.location.href = `/face.html?cardNo=${verifiedLoginData.cardNo}`;
          }, 1500);
        } else {
          finalMessage.innerHTML = `<span class="error-final-message">${data.message}</span>`;
          loginBtn.disabled = false;
        }
      })
      .catch(err => {
        console.error('Login error:', err);
        finalMessage.innerHTML = '<span class="error-final-message">Login failed. Please try again.</span>';
        loginBtn.disabled = false;
      });
  }

  // Map functionality
  const methodSelect = document.getElementById('landInputMethod');
  const dimensionDiv = document.getElementById('dimensionInputs');

  if (methodSelect && dimensionDiv) {
    methodSelect.addEventListener('change', () => {
      dimensionDiv.style.display = methodSelect.value === 'rectangle' ? 'block' : 'none';
    });

    // Get current location
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      initMap(latitude, longitude);
    }, () => alert('Location access required to mark land.'));
  }

  function initMap(lat, lng) {
    platform = new H.service.Platform({
      apikey: 'mzDLjmDOdq62sKIc4y81FgMv8pqj2ndZWPBraNyCm2w'
    });

    const defaultLayers = platform.createDefaultLayers();
    map = new H.Map(document.getElementById('mapContainer'), defaultLayers.vector.normal.map, {
      center: { lat, lng },
      zoom: 17,
      pixelRatio: window.devicePixelRatio || 1
    });

    window.addEventListener('resize', () => map.getViewPort().resize());
    behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
    ui = H.ui.UI.createDefault(map, defaultLayers);

    drawingLayer = new H.map.Group();
    map.addObject(drawingLayer);

    if (document.getElementById('landInputMethod') && document.getElementById('landInputMethod').value === 'draw') {
      enableDrawing(map);
    }
  }

  function enableDrawing(map) {
    let drawing = [];
    map.addEventListener('tap', function (evt) {
      const coord = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
      drawing.push({ lat: coord.lat, lng: coord.lng });
      
      // Create a marker for each tap point to visualize the drawing
      const marker = new H.map.Marker({lat: coord.lat, lng: coord.lng});
      drawingLayer.addObject(marker);
      
      if (drawing.length >= 3) {
        // Create proper coordinate array for LineString
        const lineStringCoords = [];
        for (const point of drawing) {
          lineStringCoords.push(point.lat, point.lng);
        }
        // Add the first point again to close the polygon
        if (drawing.length > 0) {
          lineStringCoords.push(drawing[0].lat, drawing[0].lng);
        }
        
        try {
          // Create the polygon with proper H.geo.LineString format
          const lineString = new H.geo.LineString(lineStringCoords);
          landPolygon = new H.map.Polygon(lineString);
          drawingLayer.addObject(landPolygon);
          document.getElementById('landData').value = JSON.stringify(drawing);
          enablePhotoCapture(drawing.length);
        } catch (error) {
          console.error("Error creating polygon:", error);
          alert("Error drawing the land boundary. Please try again.");
          // Clear the drawing and start over
          drawing = [];
          drawingLayer.removeAll();
        }
      }
    });
  }

  window.generateRectangle = () => {
    const length = parseFloat(document.getElementById('length').value);
    const breadth = parseFloat(document.getElementById('breadth').value);
  
    if (!length || !breadth || isNaN(length) || isNaN(breadth)) {
      alert("Please enter valid length and breadth values");
      return;
    }
  
    navigator.geolocation.getCurrentPosition(pos => {
      const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const earthRadius = 6378137; // meters
  
      const deltaLat = (length / 2) / earthRadius * (180 / Math.PI);
      const deltaLng = (breadth / 2) / (earthRadius * Math.cos(Math.PI * center.lat / 180)) * (180 / Math.PI);
  
      const rectPoints = [
        { lat: center.lat - deltaLat, lng: center.lng - deltaLng },
        { lat: center.lat - deltaLat, lng: center.lng + deltaLng },
        { lat: center.lat + deltaLat, lng: center.lng + deltaLng },
        { lat: center.lat + deltaLat, lng: center.lng - deltaLng }
      ];
  
      try {
        drawingLayer.removeAll();
  
        const lineString = new H.geo.LineString();
        rectPoints.forEach(point => {
          lineString.pushPoint({ lat: point.lat, lng: point.lng });
        });
        // Close the polygon
        lineString.pushPoint({ lat: rectPoints[0].lat, lng: rectPoints[0].lng });
  
        landPolygon = new H.map.Polygon(lineString);
        drawingLayer.addObject(landPolygon);
  
        // Also add markers at the corners for visibility
        rectPoints.forEach(point => {
          const marker = new H.map.Marker({ lat: point.lat, lng: point.lng });
          drawingLayer.addObject(marker);
        });
  
        document.getElementById('landData').value = JSON.stringify(rectPoints);
        enablePhotoCapture(Math.ceil((length * breadth) / 5000)); // 1 photo per ~50 m²
      } catch (error) {
        console.error("Error creating rectangle:", error);
        alert("Error generating the land boundary. Please try again.");
      }
    }, () => {
      alert("Unable to get current location. Please ensure location services are enabled.");
    });
  };
  

  function enablePhotoCapture(requiredPhotos) {
    const photoSection = document.getElementById('photoUploadSection');
    const inputContainer = document.getElementById('photoInputs');
    const instruction = document.getElementById('photoInstruction');

    if (photoSection && inputContainer && instruction) {
      photoSection.style.display = 'block';
      inputContainer.innerHTML = '';
      instruction.textContent = `Please upload ${requiredPhotos} photo(s) of the land from different angles`;

      for (let i = 0; i < requiredPhotos; i++) {
        const input = document.createElement('input');
        input.type = 'file';
        input.name = 'landPhotos';
        input.accept = 'image/*';
        input.capture = 'environment'; // mobile back camera
        input.required = true;
        inputContainer.appendChild(input);
        inputContainer.appendChild(document.createElement('br'));
      }
    }
  }
});