const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const router = express.Router();

// Set up multer for file upload
const upload = multer({ dest: 'uploads/' });

// Route to serve user registration page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'user.html'));
});

// Serve admin login page
router.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'adlogin.html'));
});

// API endpoint to verify email uniqueness
router.post('/verify/email', async (req, res) => {
  try {
    const { email } = req.body;
    const db = req.db;
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // For login verification, check if the email exists in admin users
    const existingUser = await db.collection('adminUsers').findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email not found in admin records' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Email verified successfully' 
    });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error during email verification' 
    });
  }
});

// API endpoint to verify name
router.post('/verify/name', async (req, res) => {
  try {
    const { name, email } = req.body;
    const db = req.db;
    
    // Name validation
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name must be at least 3 characters' 
      });
    }

    // If email is provided, check if name matches
    if (email) {
      // Find the admin user by email
      const adminUser = await db.collection('adminUsers').findOne({ email });
      if (!adminUser) {
        return res.status(400).json({
          success: false,
          message: 'Admin user not found'
        });
      }
      
      // Check if the name matches
      if (adminUser.name !== name) {
        return res.status(400).json({
          success: false,
          message: 'Name does not match our records'
        });
      }
    }

    res.json({ 
      success: true, 
      message: 'Name verified successfully' 
    });
  } catch (err) {
    console.error('Name verification error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error during name verification' 
    });
  }
});

// API endpoint to verify phone
router.post('/verify/phone', async (req, res) => {
  try {
    const { phone, email } = req.body;
    const db = req.db;
    
    // Phone validation
    const phoneRegex = /^\d{10}$/;
    if (!phone || !phoneRegex.test(phone.replace(/[^0-9]/g, ''))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number must be 10 digits' 
      });
    }

    // If email is provided, check if phone matches
    if (email) {
      // Find the admin user by email
      const adminUser = await db.collection('adminUsers').findOne({ email });
      if (!adminUser) {
        return res.status(400).json({
          success: false,
          message: 'Admin user not found'
        });
      }
      
      // Check if the phone matches
      if (adminUser.phone !== phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number does not match our records'
        });
      }
    }

    res.json({ 
      success: true, 
      message: 'Phone number verified successfully' 
    });
  } catch (err) {
    console.error('Phone verification error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error during phone verification' 
    });
  }
});

// API endpoint to verify password
router.post('/verify/password', async (req, res) => {
  try {
    const { password, email } = req.body;
    const db = req.db;
    
    // Password validation
    if (!password || password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters' 
      });
    }

    // If email is provided, check if password matches
    if (email) {
      // Find the admin user by email
      const adminUser = await db.collection('adminUsers').findOne({ email });
      if (!adminUser) {
        return res.status(400).json({
          success: false,
          message: 'Admin user not found'
        });
      }
      
      // Check if the password matches
      if (adminUser.password !== password) {
        return res.status(400).json({
          success: false,
          message: 'Password does not match our records'
        });
      }
    } else {
      // If this is for registration, check password strength
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      
      if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
        return res.status(400).json({
          success: false,
          message: 'Password must include uppercase, lowercase, number, and special character'
        });
      }
    }

    res.json({ 
      success: true, 
      message: 'Password verified successfully' 
    });
  } catch (err) {
    console.error('Password verification error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error during password verification' 
    });
  }
});

// API endpoint to verify admin ID
router.post('/verify/adminId', async (req, res) => {
  try {
    const { adminId, email } = req.body;
    const db = req.db;
    
    // Admin ID validation
    if (!adminId || adminId.length < 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin ID must be at least 5 characters' 
      });
    }

    // If email is provided, check if adminId matches
    if (email) {
      // Find the admin user by email
      const adminUser = await db.collection('adminUsers').findOne({ email });
      if (!adminUser) {
        return res.status(400).json({
          success: false,
          message: 'Admin user not found'
        });
      }
      
      // Check if the adminId matches
      if (adminUser.adminId !== adminId) {
        return res.status(400).json({
          success: false,
          message: 'Admin ID does not match our records'
        });
      }
    } else {
      // For registration, check if ID already exists
      const existingAdmin = await db.collection('adminUsers').findOne({ adminId });
      if (existingAdmin) {
        return res.status(400).json({ 
          success: false, 
          message: 'Admin ID already in use' 
        });
      }
    }

    res.json({ 
      success: true, 
      message: 'Admin ID verified successfully' 
    });
  } catch (err) {
    console.error('Admin ID verification error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error during Admin ID verification' 
    });
  }
});

// Form validation middleware
const validateUserData = (req, res, next) => {
  console.log("Form data received:", req.body);
  
  const { name, phone, password, adminId, email } = req.body;
  
  // Basic validation
  if (!name || !phone || !password || !adminId || !email) {
    console.log("Missing fields:", { name, phone, password, adminId, email });
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  // All validations passed
  next();
};

// Handle admin user registration
router.post('/', upload.single('photo'), validateUserData, async (req, res) => {
  try {
    const { name, phone, password, adminId, email } = req.body;
    
    const db = req.db;

    // Final check if email already exists
    const existingAdmin = await db.collection('adminUsers').findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Upload photo to Cloudinary
    const photoUpload = await cloudinary.uploader.upload(req.file.path, { folder: 'admin_users' });

    // Prepare admin user data
    const adminData = {
      name,
      phone,
      password, // In production, this should be hashed
      adminId,
      email,
      photoUrl: photoUpload.secure_url,
      createdAt: new Date()
    };

    // Save to MongoDB in 'adminUsers' collection
    await db.collection('adminUsers').insertOne(adminData);

    res.send(`
      <html>
        <body style="text-align:center; font-family:sans-serif;">
          <h2>Admin Registered Successfully ✅</h2>
          <p><a href="/user">Register Another</a> | <a href="/">Home</a></p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Admin registration error:', err);
    res.status(500).json({ message: 'Error during admin registration' });
  }
});

module.exports = router;