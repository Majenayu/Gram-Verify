let landData = null;
let landPhotos = [];
let mapInitialized = false;
let map = null;

// Function to check if user is logged in
function checkUserLogin() {
  const urlParams = new URLSearchParams(window.location.search);
  const cardNo = urlParams.get('cardNo');

  if (!cardNo) {
    window.location.href = '/login';
  } else {
    fetchUserInfo(cardNo);
  }
}

// Fetch user info from backend
async function fetchUserInfo(cardNo) {
  try {
    const response = await fetch(`/api/userinfo?cardNo=${cardNo}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    // Update UI elements
    document.getElementById('govtLogo').src = 'https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg';

    const fullNameElements = document.querySelectorAll("#displayFullName, #displayFullName2");
    fullNameElements.forEach(el => el.textContent = data.fullName);

    document.getElementById('cardNo').textContent = `Card No: ${data.cardNo}`;
    document.getElementById('gotoDocumentsBtn').href = `documents.html?cardNo=${encodeURIComponent(cardNo)}`;
    document.getElementById('displayDob').textContent = data.dob;
    document.getElementById('displayMobile').textContent = data.mobile;
    document.getElementById('displayBankAccount').textContent = data.bankAccount;
    document.getElementById('displayIfsc').textContent = data.ifsc;
    document.getElementById('displayNomineeName').textContent = data.nomineeName;
    document.getElementById('displayNomineeRelation').textContent = data.nomineeRelation;
    
    if (document.getElementById('userPhoto')) {
      document.getElementById('userPhoto').src = data.photo || 'path/to/default-photo.jpg';
    }

    document.getElementById('lastUpdated').textContent = new Date().toLocaleDateString();

    // Store land info - ensure proper parsing
    try {
      landData = data.landData ? 
        (typeof data.landData === 'string' ? JSON.parse(data.landData) : data.landData) : 
        null;
    } catch (e) {
      console.error('Error parsing land data:', e);
      landData = null;
    }

    // Ensure landPhotos is always an array
    landPhotos = Array.isArray(data.landPhotos) ? data.landPhotos : 
                (data.landPhotos ? [data.landPhotos] : []);

    // Display documents
    const documentsList = document.getElementById('documentsList');
    if (documentsList) {
      documentsList.innerHTML = '';

      if (data.documents && data.documents.length > 0) {
        data.documents.forEach((docUrl, index) => {
          const docCard = document.createElement('div');
          docCard.className = 'document-card';

          docCard.innerHTML = `
            <div class="document-icon"><i class="fas fa-file-alt"></i></div>
            <div class="document-details">
              <h4>Document ${index + 1}</h4>
              <a href="${docUrl}" target="_blank">View Document</a>
            </div>
          `;

          documentsList.appendChild(docCard);
        });
      } else {
        documentsList.innerHTML = '<p>No documents uploaded</p>';
      }
    }

  } catch (error) {
    console.error('Error fetching user info:', error);
    alert('Failed to load user information. Please try again later.');
  }
}

// Show land polygon on HERE map
function showMap() {
  resetView();
  const mapContainer = document.getElementById('landMapContainer');
  
  if (!mapContainer) {
    console.error('Map container not found');
    return;
  }
  
  mapContainer.style.display = 'block';

  if (!landData || !Array.isArray(landData) || landData.length < 3) {
    mapContainer.innerHTML = '<div class="error-message">No valid land map data available.</div>';
    return;
  }

  // Clean up previous map instance if it exists
  if (map) {
    map.dispose();
    mapInitialized = false;
  }
  
  // Create new map
  try {
    const platform = new H.service.Platform({
      apikey: 'mzDLjmDOdq62sKIc4y81FgMv8pqj2ndZWPBraNyCm2w'
    });

    const defaultLayers = platform.createDefaultLayers();
    map = new H.Map(
      mapContainer, 
      defaultLayers.vector.normal.map, 
      {
        zoom: 18,
        center: { lat: landData[0].lat || landData[0][0], lng: landData[0].lng || landData[0][1] },
        pixelRatio: window.devicePixelRatio || 1
      }
    );

    // Add window resize handler
    window.addEventListener('resize', () => {
      if (map && map.getViewPort()) {
        map.getViewPort().resize();
      }
    });
    
    // Add map behavior
    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
    
    // Add UI
    const ui = H.ui.UI.createDefault(map, defaultLayers);
    
    // Create polygon from coordinates
    const polygonCoords = new H.geo.LineString();
    
    // Add points to polygon
    landData.forEach(point => {
      if (Array.isArray(point)) {
        // If point is [lat, lng] array
        polygonCoords.pushPoint({lat: point[0], lng: point[1]});
      } else if (typeof point === 'object') {
        // If point is {lat, lng} object
        polygonCoords.pushPoint({lat: point.lat, lng: point.lng});
      }
    });
    
    // Close the polygon
    if (landData.length > 0) {
      if (Array.isArray(landData[0])) {
        polygonCoords.pushPoint({lat: landData[0][0], lng: landData[0][1]});
      } else {
        polygonCoords.pushPoint({lat: landData[0].lat, lng: landData[0].lng});
      }
    }

    // Create and add polygon to map
    const polygon = new H.map.Polygon(polygonCoords, {
      style: {
        fillColor: 'rgba(0, 128, 255, 0.3)',
        strokeColor: '#0044cc',
        lineWidth: 3
      }
    });

    map.addObject(polygon);
    
    // Ensure the polygon is visible in the viewport
    map.getViewModel().setLookAtData({
      bounds: polygon.getBoundingBox()
    });
    
    mapInitialized = true;
  } catch (error) {
    console.error('Error initializing map:', error);
    mapContainer.innerHTML = '<div class="error-message">Failed to load map. Please try again later.</div>';
  }
}

// Show uploaded land photos
function showPhotos() {
  resetView();
  const gallery = document.getElementById('photoGallery');
  
  if (!gallery) {
    console.error('Photo gallery container not found');
    return;
  }
  
  gallery.style.display = 'block';
  gallery.innerHTML = '';

  if (!landPhotos || !landPhotos.length) {
    gallery.innerHTML = '<p class="no-data-message">No photos uploaded.</p>';
    return;
  }

  // Create photo gallery container
  const galleryContainer = document.createElement('div');
  galleryContainer.className = 'photo-gallery-container';
  
  // Add photos to gallery
  landPhotos.forEach((url, idx) => {
    if (!url) return;
    
    const photoCard = document.createElement('div');
    photoCard.className = 'photo-card';
    
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Land Photo ${idx + 1}`;
    img.loading = 'lazy';
    
    img.onerror = function() {
      this.onerror = null;
      this.src = 'path/to/error-image.jpg';
      this.alt = 'Image failed to load';
    };
    
    photoCard.appendChild(img);
    
    const caption = document.createElement('div');
    caption.className = 'photo-caption';
    caption.textContent = `Photo ${idx + 1}`;
    photoCard.appendChild(caption);
    
    galleryContainer.appendChild(photoCard);
  });
  
  gallery.appendChild(galleryContainer);
}

// Clear map/photo display
function resetView() {
  const photoGallery = document.getElementById('photoGallery');
  const landMapContainer = document.getElementById('landMapContainer');
  
  if (photoGallery) {
    photoGallery.style.display = 'none';
    photoGallery.innerHTML = '';
  }
  
  if (landMapContainer) {
    landMapContainer.style.display = 'none';
  }
  
  // Don't dispose map here - we'll do that in showMap if needed
}

// Logout
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem('cardNo');
    window.location.href = 'login.html';
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check user login first
  checkUserLogin();

  // Set up modal for Aadhaar info if present
  const aadhaarInfoBtn = document.getElementById('aadhaarInfoBtn');
  const aadhaarInfoModal = document.getElementById('aadhaarInfoModal');
  const closeAadhaarModal = document.getElementById('closeAadhaarModal');

  if (aadhaarInfoBtn && aadhaarInfoModal && closeAadhaarModal) {
    aadhaarInfoBtn.addEventListener('click', function(e) {
      e.preventDefault();
      aadhaarInfoModal.style.display = 'flex';
    });

    closeAadhaarModal.addEventListener('click', function() {
      aadhaarInfoModal.style.display = 'none';
    });

    window.addEventListener('click', function(e) {
      if (e.target === aadhaarInfoModal) {
        aadhaarInfoModal.style.display = 'none';
      }
    });
  }
  
  // Add button event listeners directly instead of inline HTML
  const mapButton = document.querySelector('button[onclick="showMap()"]');
  const photosButton = document.querySelector('button[onclick="showPhotos()"]');
  
  if (mapButton) {
    mapButton.removeAttribute('onclick');
    mapButton.addEventListener('click', showMap);
  }
  
  if (photosButton) {
    photosButton.removeAttribute('onclick');
    photosButton.addEventListener('click', showPhotos);
  }
});

// Expose these functions globally for backward compatibility
window.showMap = showMap;
window.showPhotos = showPhotos;
window.logout = logout;