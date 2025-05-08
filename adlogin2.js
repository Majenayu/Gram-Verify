document.addEventListener('DOMContentLoaded', function() {
    // Define verification steps in order
    const steps = ['email', 'name', 'phone', 'password', 'adminId'];
    let currentStepIndex = 0;
    let completedSteps = 0;
    
    // Store verified data
    const verifiedData = {};
    
    // Get elements
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    
    // Initialize first step
    showCurrentStep();
    updateProgress(0);
    
    // Set up verification button event listeners
    steps.forEach(step => {
      const verifyButton = document.getElementById(`verify-${step}`);
      if (verifyButton) {
        verifyButton.addEventListener('click', () => verifyStep(step));
      }
    });
    
    // Set up login button
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
      loginButton.addEventListener('click', submitLogin);
    }
    
    // Function to show current step
    function showCurrentStep() {
      // Hide all steps
      document.querySelectorAll('.verification-step').forEach(step => {
        step.classList.remove('active');
      });
      
      // Show current step
      const currentStep = document.getElementById(`step-${steps[currentStepIndex]}`);
      if (currentStep) {
        currentStep.classList.add('active');
      }
    }
    
    // Function to update progress bar
    function updateProgress(completedStepsCount) {
      const percentage = Math.round((completedStepsCount / steps.length) * 100);
      progressFill.style.width = `${percentage}%`;
      progressPercentage.textContent = `${percentage}%`;
    }
    
    // Function to verify a step
    function verifyStep(step) {
      const input = document.getElementById(step);
      const errorElement = document.getElementById(`${step}-error`);
      const indicator = document.getElementById(`${step}-indicator`);
      const status = document.getElementById(`${step}-status`);
      
      // Clear previous error
      errorElement.textContent = '';
      
      // Get input value
      const value = input.value.trim();
      
      // Basic client-side validation
      if (!value) {
        errorElement.textContent = `${step.charAt(0).toUpperCase() + step.slice(1)} is required`;
        return;
      }
      
      // Show loading state
      status.textContent = 'Verifying...';
      
      // Include the current email in all verification requests after email step
      const requestBody = { [step]: value };
      if (step !== 'email' && verifiedData.email) {
        requestBody.email = verifiedData.email;
      }
      
      // Send verification request to server
      fetch(`/user/verify/${step}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Success
          input.classList.add('success');
          input.classList.remove('error');
          input.disabled = true;
          
          indicator.classList.remove('pending');
          indicator.classList.add('verified');
          indicator.textContent = '✓';
          
          status.textContent = 'Verified';
          
          // Store the verified value
          verifiedData[step] = value;
          
          // Move to next step
          completedSteps++;
          updateProgress(completedSteps);
          
          // If there are more steps, show the next one
          if (currentStepIndex < steps.length - 1) {
            currentStepIndex++;
            showCurrentStep();
          } else {
            // Show final step
            document.getElementById('step-final').classList.add('active');
            document.getElementById('finalMessage').innerHTML = '<span class="success-message">All verifications complete! You can now login.</span>';
            loginButton.disabled = false;
          }
        } else {
          // Error
          errorElement.textContent = data.message;
          input.classList.add('error');
          input.classList.remove('success');
          
          indicator.classList.remove('pending');
          indicator.classList.add('failed');
          indicator.textContent = '!';
          
          status.textContent = 'Failed';
        }
      })
      .catch(error => {
        console.error('Error:', error);
        errorElement.textContent = 'Verification failed. Please try again.';
        
        indicator.classList.remove('pending');
        indicator.classList.add('failed');
        indicator.textContent = '!';
        
        status.textContent = 'Failed';
      });
    }
    
    // Function to handle login submission
    function submitLogin() {
      // Show loading message
      const finalMessage = document.getElementById('finalMessage');
      finalMessage.textContent = 'Logging in...';
      loginButton.disabled = true;
      
      // Send login data to server
      fetch('/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verifiedData.email,
          password: verifiedData.password
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          finalMessage.innerHTML = '<span class="success-message">Login successful! Redirecting to dashboard...</span>';
          
          // Store admin info in session storage
          sessionStorage.setItem('adminUser', JSON.stringify(data.admin));
          
          // Redirect after a short delay
          setTimeout(() => {
            window.location.href = 'register.html';

          }, 1500);
        } else {
          finalMessage.innerHTML = `<span class="error-final-message">${data.message}</span>`;
          loginButton.disabled = false;
        }
      })
      .catch(error => {
        console.error('Login error:', error);
        finalMessage.innerHTML = '<span class="error-final-message">Login failed. Please try again.</span>';
        loginButton.disabled = false;
      });
    }
  });