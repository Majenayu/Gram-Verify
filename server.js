const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { MongoClient } = require('mongodb');
const path = require('path');
const bodyParser = require('body-parser');

const nodemailer = require('nodemailer');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = 3000;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'pgayushrai@gmail.com',       // replace with your Gmail address
    pass: 'vzhy zrkg vygb dybc'           // use an App Password, not your real password
  }
});


// Cloudinary config
cloudinary.config({
  cloud_name: 'dxijtk4uh',
  api_key: '673884187959811',
  api_secret: 'IoNIcYPj__zDx4C0_thf1x3Z7gk'
});

// MongoDB
const mongoURI = 'mongodb+srv://ADD:ADD@add.6socxdt.mongodb.net/?retryWrites=true&w=majority&appName=ADD';
const client = new MongoClient(mongoURI);
let db;
client.connect().then(() => {
  db = client.db('users');
  console.log('Connected to MongoDB');
});

// Body parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Add JSON body parser
app.use(express.static(__dirname)); // Serve static files from the root directory

// Pass db to routes
app.use((req, res, next) => {
  req.db = db; // Pass the database connection to routes
  next();
});

// Serve index page
app.get('/', (req, res) => {
  res.send(`
    <html><head><title>Welcome</title></head>
    <body style="font-family:sans-serif; text-align:center;">
      <h1>Welcome to Divizira</h1>
      <a href="/login">Login</a> | 
      <a href="/register">Register</a> | 
      <a href="/user/admin">Admin Login</a>
    </body></html>
  `);
});

// Serve login page
app.get('/login', (req, res) => {
  res.send(`
  <html>
    <head><title>Login</title></head>
    <body style="font-family:sans-serif; text-align:center;">
      <h2>Login Page</h2>
      <form id="loginForm">
        <input 
          type="text" 
          id="cardNo" 
          name="cardNo" 
          placeholder="Card No" 
          required
        ><br><br>
        <button type="submit">Login</button>
      </form>
      <p><a href="/">Back</a></p>
      <script src="/script.js"></script>
    </body>
  </html>
  `);
});

// Serve register page
app.get('/register', (req, res) => {
  res.send(`
    <html>
    <head><title>Register</title></head>
    <body style="font-family:sans-serif; padding:20px;">
      <h2>Registration</h2>
      <form id="registrationForm" enctype="multipart/form-data" method="post" action="/register">
        <input type="text" name="fullName" placeholder="Full Name" required><br><br>
        <input type="date" name="dob" required><br><br>
        <input type="tel" name="mobile" placeholder="Mobile" required><br><br>
        <input type="text" name="bankAccount" placeholder="Bank Account" required><br><br>
        <input type="text" name="ifsc" placeholder="IFSC Code" required><br><br>
        <input type="text" name="nomineeName" placeholder="Nominee Name" required><br><br>
        <input type="text" name="nomineeRelation" placeholder="Nominee Relationship" required><br><br>
        <label>Upload Photo:</label><br>
        <input type="file" name="photo" required><br><br>
        <label>Upload Documents:</label><br>
        <input type="file" name="documents" multiple required><br><br>
        <button type="submit">Register</button>
      </form>

      <div id="cardDisplay"></div> <!-- Display the card number here -->

      <script src="/script.js"></script>
    </body>
    </html>
  `);
});

// Handle form submission
// Registration endpoint with land data and photo handling
app.post('/register', upload.fields([
  { name: 'photo' },
  { name: 'landDocument' },
  { name: 'voterID' },
  { name: 'incomeCertificate' },
  { name: 'drivingLicense' },
  { name: 'bankPassbook' },
  { name: 'landPhotos' }
]), async (req, res) => {
  try {
    const data = req.body;
    
    // Ensure photo exists in the request
    if (!req.files.photo) {
      return res.status(400).json({ message: 'Photo is required.' });
    }
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
      return res.status(400).json({ message: 'Invalid or missing email address.' });
    }
    
    // Log the file information for debugging
    console.log('Uploaded photo:', req.files.photo[0]);
    
    // Validate photo file type
    const photoFile = req.files.photo[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(photoFile.mimetype)) {
      return res.status(400).json({ message: 'Invalid image file type. Please upload a .jpeg, .jpg, or .png file.' });
    }
    
    // Generate card number
    const cardNo = Math.floor(Math.random() * 9000) + 1000;
    
    // Upload photo to Cloudinary
    const photo = await cloudinary.uploader.upload(photoFile.path, { folder: cardNo.toString() });
    const uploadedDocs = {};

const docFields = ['landDocument', 'voterID', 'incomeCertificate', 'drivingLicense', 'bankPassbook'];

for (const field of docFields) {
  if (req.files[field]) {
    const result = await cloudinary.uploader.upload(req.files[field][0].path, {
      folder: `${cardNo}/documents`,
      public_id: field
    });
    uploadedDocs[field] = result.secure_url;
  }
}

    // Upload documents (if any) to Cloudinary
    const docs = req.files.documents ? await Promise.all(
      req.files.documents.map(file =>
        cloudinary.uploader.upload(file.path, {
          folder: cardNo.toString(),
          resource_type: 'raw',
          type: 'upload'
        })
      )
    ) : [];
    
    // Upload land photos (if any) to Cloudinary
    const landPics = req.files.landPhotos ? await Promise.all(
      req.files.landPhotos.map((f, i) =>
        cloudinary.uploader.upload(f.path, { 
          folder: `${cardNo}/land`, 
          public_id: `view${i + 1}` 
        })
      )
    ) : [];
    
    // Parse land data if it exists
    let parsedLandData = {};
    if (data.landData) {
      try {
        parsedLandData = JSON.parse(data.landData);
      } catch (e) {
        console.error('Error parsing land data:', e);
        // Continue with empty land data if parsing fails
      }
    }
    
    // Prepare user data
const userData = {
  ...data,
  cardNo,
  landData: parsedLandData,
  photo: photo.secure_url,
  documents: uploadedDocs,
  landPhotos: landPics.map(p => p.secure_url)
};

    
    // Save user data in MongoDB collection named by cardNo
    await db.collection(cardNo.toString()).insertOne(userData);
    
// Send a welcome email to the new userd4e
const mailOptions = {
  from: 'pgayushrai@gmail.com',
  to: data.email,
  subject: 'Welcome to Divizira!',
  text: `Hi,Congratulations on the successful creation/update of your Aadhaar card Your card number is ${cardNo}.Kindly proceed to pay the registration charges of Rs. 100.`
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Email sending error:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});



    // Respond with the card number
    res.json({ cardNo });
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ message: 'Something went wrong during registration.' });
  } finally {
    // Clean up temporary files if needed
    // This would depend on your upload middleware implementation
  }
});

app.post('/login', async (req, res) => {
  const { cardNo } = req.body;

  try {
    const collections = await db.listCollections().toArray();
    const exists = collections.some(col => col.name === cardNo);

    if (exists) {
      res.json({ success: true, cardNo });
    } else {
      res.status(404).json({ success: false, message: 'Card number not found' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve bank account dashboard page
app.get('/banking', (req, res) => {
  // Check if cardNo is provided in query params
  const cardNo = req.query.cardNo;
  if (!cardNo) {
    return res.redirect('/login'); // Redirect to login if no card number
  }
  
  // Serve the bank account dashboard HTML
  res.sendFile(path.join(__dirname, 'bank-dashboard.html'));
});

app.get('/api/userinfo', async (req, res) => {
  const cardNo = req.query.cardNo;

  try {
    const collection = db.collection(cardNo);
    const user = await collection.findOne({});
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Dashboard API error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// API endpoint to get bank account information
app.get('/api/bankinfo', async (req, res) => {
  const cardNo = req.query.cardNo;

  try {
    const collection = db.collection(cardNo);
    const user = await collection.findOne({});

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return only bank-related information
    res.json({
      fullName: user.fullName,
      cardNo: user.cardNo,
      bankAccount: user.bankAccount,
      ifsc: user.ifsc,
      nomineeName: user.nomineeName,
      nomineeRelation: user.nomineeRelation
    });
  } catch (err) {
    console.error('Bank info API error:', err);
    res.status(500).json({ error: 'Something went wrong when fetching bank information' });
  }
});

// API endpoint to update bank details
app.post('/api/updatebank', async (req, res) => {
  const { cardNo, bankAccount, ifsc } = req.body;

  try {
    const collection = db.collection(cardNo);
    
    // Update only bank-related fields
    const result = await collection.updateOne(
      {}, // Find the user document
      { $set: { bankAccount, ifsc } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'Bank details updated successfully' 
    });
  } catch (err) {
    console.error('Update bank details error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating bank details' 
    });
  }
});

// Admin dashboard route
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

// Admin login verification
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find admin user by email
    const adminUser = await db.collection('adminUsers').findOne({ email });
    
    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    
    // In production, use proper password hashing and comparison
    if (adminUser.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Successful login
    res.json({ 
      success: true, 
      message: 'Login successful',
      admin: {
        name: adminUser.name,
        email: adminUser.email,
        adminId: adminUser.adminId,
        photoUrl: adminUser.photoUrl
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Simple admin dashboard HTML
app.get('/admin/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Dashboard</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 15px;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .admin-info {
          display: flex;
          align-items: center;
        }
        .admin-photo {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          margin-right: 15px;
          object-fit: cover;
        }
        .admin-details h3 {
          margin: 0;
        }
        .admin-details p {
          margin: 5px 0 0 0;
          color: #666;
        }
        .logout-btn {
          background: #ff4d4d;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
        }
        .content-panel {
          background: white;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
      </style>
    </head>
    <body>
      <div class="dashboard-header">
        <div class="admin-info">
          <img id="adminPhoto" class="admin-photo" src="/api/placeholder/50/50" alt="Admin">
          <div class="admin-details">
            <h3 id="adminName">Admin Name</h3>
            <p id="adminId">Admin ID</p>
          </div>
        </div>
        <button class="logout-btn" id="logoutBtn">Logout</button>
      </div>

      <div class="content-panel">
        <h2>Welcome to Admin Dashboard</h2>
        <p>You have successfully logged in as an administrator.</p>
      </div>

      <script>
        document.addEventListener('DOMContentLoaded', function() {
          // Check if admin is logged in
          const adminData = JSON.parse(sessionStorage.getItem('adminUser'));
          if (!adminData) {
            // Redirect to login page if not logged in
            window.location.href = '/user/admin';
            return;
          }
          
          // Display admin info
          document.getElementById('adminName').textContent = adminData.name;
          document.getElementById('adminId').textContent = 'ID: ' + adminData.adminId;
          if (adminData.photoUrl) {
            document.getElementById('adminPhoto').src = adminData.photoUrl;
          }
          
          // Set up logout button
          document.getElementById('logoutBtn').addEventListener('click', function() {
            sessionStorage.removeItem('adminUser');
            window.location.href = '/user/admin';
          });
        });
      </script>
    </body>
    </html>
  `);
});

// Import and use user routes
const userRoutes = require('./user');
app.use('/user', userRoutes);



// Step 1: Verify Card No
app.post('/login/verify/cardNo', async (req, res) => {
  const { cardNo } = req.body;
  const exists = (await db.listCollections().toArray()).some(col => col.name === cardNo);
  if (!exists) return res.status(404).json({ success: false, message: 'Card number not found.' });
  res.json({ success: true });
});

// Step 2: Verify Phone (based on cardNo)
app.post('/login/verify/phone', async (req, res) => {
  const { cardNo, phone } = req.body;
  const user = await db.collection(cardNo).findOne({});
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  if (user.mobile !== phone) return res.status(401).json({ success: false, message: 'Phone number mismatch.' });
  res.json({ success: true });
});

// Step 3: Verify DOB (based on cardNo)
app.post('/login/verify/dob', async (req, res) => {
  const { cardNo, dob } = req.body;
  const user = await db.collection(cardNo).findOne({});
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  if (user.dob !== dob) return res.status(401).json({ success: false, message: 'Date of Birth mismatch.' });
  res.json({ success: true });
});


// Add this new API endpoint after the /api/updatebank endpoint

// API endpoint to verify nominee by card number
app.post('/api/verify-nominee', async (req, res) => {
  const { nomineeCardNo } = req.body;

  try {
    // Check if the nominee card number exists in the database
    const collections = await db.listCollections().toArray();
    const exists = collections.some(col => col.name === nomineeCardNo);

    if (exists) {
      // Get the nominee information
      const nomineeCollection = db.collection(nomineeCardNo);
      const nominee = await nomineeCollection.findOne({});
      
      if (!nominee) {
        return res.status(404).json({ success: false, message: 'Nominee information not found' });
      }
      
      // Return basic nominee information
      res.json({ 
        success: true, 
        nominee: {
          fullName: nominee.fullName,
          cardNo: nominee.cardNo
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'Nominee card number not found' });
    }
  } catch (err) {
    console.error('Nominee verification error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// API endpoint to update bank and nominee details
app.post('/api/updatebankandnominee', async (req, res) => {
  const { cardNo, bankAccount, ifsc, nomineeName, nomineeRelation, nomineeCardNo } = req.body;

  try {
    const collection = db.collection(cardNo);
    
    // Update bank and nominee related fields
    const result = await collection.updateOne(
      {}, // Find the user document
      { $set: { bankAccount, ifsc, nomineeName, nomineeRelation, nomineeCardNo } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If nominee info is provided, add this user as a nominator to the nominee's record
    if (nomineeCardNo) {
      const nomineeCollection = db.collection(nomineeCardNo);
      
      // Check if the nominee has a nominators array; if not, create one
      await nomineeCollection.updateOne(
        {}, 
        { 
          $addToSet: { 
            nominators: { 
              cardNo, 
              fullName: req.body.nominatorName // This should be passed from the client
            } 
          }
        },
        { upsert: true }
      );
    }

    res.json({ 
      success: true, 
      message: 'Bank and nominee details updated successfully' 
    });
  } catch (err) {
    console.error('Update bank and nominee details error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating bank and nominee details' 
    });
  }
});

// API endpoint to get nominee information for a user
app.get('/api/nominees', async (req, res) => {
  const cardNo = req.query.cardNo;

  try {
    const collection = db.collection(cardNo);
    const user = await collection.findOne({});

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the list of people who have nominated this user
    if (user.nominators && user.nominators.length > 0) {
      res.json({
        success: true,
        nominators: user.nominators
      });
    } else {
      res.json({
        success: true,
        nominators: []
      });
    }
  } catch (err) {
    console.error('Nominees API error:', err);
    res.status(500).json({ success: false, message: 'Something went wrong when fetching nominees' });
  }
});





app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
