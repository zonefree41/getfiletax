require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require("connect-mongo");
const mongoose = require('mongoose');
const path = require('path');
const fs = require("fs");
const multer = require("multer");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");

const app = express();
const dbName = "taxApp";


// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// index.js (only the new/changed parts)

const { sendMail, completionEmailHTML } = require("./mail"); // ⬅️ import helper

// ===== SIGN UP ROUTES =====

// Show sign-up page
app.get("/signup", (req, res) => {
    res.render("signup");
});

// Handle new user signup
app.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const usersCol = client.db("taxApp").collection("users");

        // Check if user already exists
        const existing = await usersCol.findOne({ email });
        if (existing) {
            return res.send("User already exists. Please log in instead.");
        }

        // Hash password before saving
        const hashed = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = {
            name,
            email,
            password: hashed,
            taxStatus: "pending", // default status
        };

        await usersCol.insertOne(newUser);

        // Auto-login
        req.session.user = newUser;
        res.redirect("/dashboard");
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).send("Internal Server Error");
    }
});


// ✅ Connect to MongoDB first

// Debug
console.log("DEBUG: MONGO_URI =", process.env.MONGO_URI);

async function startServer() {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error("❌ MONGO_URI is undefined!");

        await mongoose.connect(uri);
        console.log("✅ MongoDB connected successfully!");

        // ✅ Use mongoURL instead of client (simpler for Render)
        app.use(
            session({
                secret: process.env.SESSION_SECRET || "taxSecretKey",
                resave: false,
                saveUninitialized: false,
                store: MongoStore.create({
                    mongoUrl: process.env.MONGO_URI, // use this , not client
                    collectionName: "sessions",
                }),
                cookie: {
                    secure: process.env.NODE_ENV === "production", // use secure cookies in production
                    maxAge: 1000 * 60 * 60 * 24, // 1 day
                },
            })
        );

        app.get("/", (req, res) => res.render("home"));

        // =================== Start Server ===================

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error("❌ MongoDB connection failed:");
        console.error(err.message || err);
    }
}

// Call the function
startServer();


// Example home route
app.get("/", (req, res) => {
    res.send("Server running and connected to MongoDB!");
});

// Middleware to protect routes
function requireLogin(req, res, next) {
    if (!req.session.user) return res.redirect("/login");
    next();
}

// Routes
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await client.db(dbName).collection("users").findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
        req.session.user = user;
        return res.redirect("/dashboard");
    }
    res.send("Invalid email or password");
});

app.get("/dashboard", requireLogin, (req, res) => {
    res.render("dashboard", { user: req.session.user });
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});

// Show admin login page
app.get("/admin", (req, res) => {
    res.render("admin-login");
});

// Handle admin login form submission
app.post("/admin", (req, res) => {
    const { username, password } = req.body;

    if (username === "admin" && password === "Ethiopia5@") {
        req.session.admin = true;
        return res.redirect("/admin/dashboard");
    }

    res.send("Invalid admin credentials");
});

// ✅ Mark client as completed
app.post("/admin/mark-complete/:id", async (req, res) => {
    try {
        const { ObjectId } = require("mongodb");
        const userId = req.params.id;

        // Update the client's tax status
        await client
            .db("taxApp")
            .collection("users")
            .updateOne(
                { _id: new ObjectId(userId) },
                { $set: { taxStatus: "completed" } }
            );

        console.log(`✅ Marked client ${userId} as completed`);
        res.redirect("/admin/dashboard");
    } catch (err) {
        console.error("Error marking complete:", err);
        res.status(500).send("Internal Server Error");
    }
});


// Show admin dashboard
app.get("/admin/dashboard", async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin");
    const users = await client.db("taxApp").collection("users").find().toArray();
    res.render("admin-dashboard", { users });
});


// seed demo user (optional)
app.get("/seed", async (req, res) => {
    const hashed = await bcrypt.hash("client123", 10);
    await client.db(dbName).collection("users").insertOne({
        name: "John Doe",
        email: "john@example.com",
        password: hashed,
        taxStatus: "pending",
    });
    res.send("Seeded sample client: john@example.com / client123");
});



// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// =================== Routes ===================

// Home
app.get('/', (req, res) => res.redirect('/home'));
app.get('/home', (req, res) => res.render('home'));

// Static pages
app.get('/about-us', (req, res) => res.render('about-us'));
app.get('/contact-us', (req, res) => res.render('contact-us'));
app.get('/pricing', (req, res) => res.render('pricing'));
app.get("/checkout", (req, res) => res.render("checkout"));
app.get('/services', (req, res) => res.render('services'));
app.get('/faq', (req, res) => res.render('faq'));
app.get('/sitemap', (req, res) => res.render('sitemap'));

// Checkout with Stripe

// Terms & Privacy
const companyInfo = {
    name: "Tax Expert",
    address: "320 23rd St, Arlington, VA, 22202 USA",
    contactEmail: "info@tax-expert.pro"
};

app.get('/terms', (req, res) =>
    res.render("terms-of-services", { company: { name: "Tax Expert", address: "320 23rd St, Arlington, VA, 22202 USA", contactEmail: "info@tax-expert.pro" } }));
app.get('/privacy', (req, res) =>
    res.render("privacy-policy", { company: { name: "Tax Expert", address: "320 23rd St, Arlington, VA, 22202 USA", contactEmail: "info@tax-expert.pro" } }));

// Booking & consultation pages
app.get('/book-now', (req, res) => res.render('book-now'));
app.get('/appointment', (req, res) => res.render('appointment'));
app.get('/book-an-appointment', (req, res) => res.render('book-an-appointment'));
app.get('/get-consultation', (req, res) => res.render('get-consultation'));
app.get('/upload-documents', (req, res) => res.render('upload-documents'));
app.get('/upload-forms', (req, res) => res.render('upload-forms'));
app.get('/get-free-consultation', (req, res) => res.render('get-free-consultation'));
app.get('/view-our-services', (req, res) => res.render('view-our-services'));
app.get('/get-started', (req, res) => res.render('get-started'));
app.get('/payment', (req, res) => res.render('payment'));
app.get('/book', (req, res) => res.render('book'));
app.get('/explore', (req, res) => res.render('explore'));
app.get("/requirements", (req, res) => res.render("requirements"));
// Show the form
app.get("/rates", (req, res) => {
    res.render("rates");

});

// Handle form submission
app.post("/submit-llc", (req, res) => {
    // You can later connect this to MongoDB, email, or upload storage
    console.log(req.body);
    res.send("✅ Thank you! Your Aviation Mechanic LLC form has been submitted.");
});


// Blog pages
app.get('/blog', (req, res) => res.render('blog'));
app.get('/blog1', (req, res) => res.render('blog1'));
app.get('/blog2', (req, res) => res.render('blog2'));
app.get('/blog3', (req, res) => res.render('blog3'));

app.use((req, res, next) => {
    // Don't force HTTPS when running locally
    if (req.hostname !== "localhost" && req.headers["x-forwarded-proto"] !== "https") {
        return res.redirect("https://" + req.headers.host + req.url);
    }
    next();
});

// Show the request page
app.get("/request", (req, res) => {
    res.render("request");
});

// Handle form submissions
app.post("/submit-request", (req, res) => {
    const { name, email, phone, filingType, message } = req.body;

    const newRequest = {
        id: Date.now(),
        name,
        email,
        phone,
        filingType,
        message,
        date: new Date().toLocaleString()
    };

    const filePath = path.join(__dirname, "requests.json");
    let data = [];

    if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath));
    }

    data.push(newRequest);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    res.send("<h2>✅ Your request has been sent successfully!</h2><a href='/request'>Back</a>");
});

app.get("/admin/requests", (req, res) => {
    const filePath = path.join(__dirname, "requests.json");
    let data = [];

    if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath));
    }

    res.render("admin-requests", { requests: data });
});


// ✅ Checkout route (handles Stripe session creation)
app.post("/create-checkout-session", async (req, res) => {
    const { plan } = req.body;

    let price;
    if (plan === "basic") price = 30000;      // $300
    else if (plan === "standard") price = 60000; // $600
    else price = 100000;                        // $1,000

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `${plan} Tax Filing Plan`,
                        },
                        unit_amount: price,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: "http://localhost:3000/success",
            cancel_url: "http://www.getfiletax.com/rates",
        });

        res.redirect(303, session.url);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ✅ Success page
app.get("/success", (req, res) => {
    res.send("<h2>✅ Payment successful! Thank you for choosing our tax service.</h2>");
});

// ✅ Rates page
app.get("/rates", (req, res) => {
    res.render("rates");
});

// Individual tax payment

app.get("/checkout/individual", async (req, res) => {
    res.redirect("https://buy.stripe.com/dRmdR8awJ1El8v84Z6e3e01");
});


// Business tax payment

app.get("/checkout/business", async (req, res) => {
    res.redirect("https://buy.stripe.com/6oU28q5cp1Elh1Ecrye3e02");
});

// Family tax payment

app.get("/checkout/family", async (req, res) => {
    res.redirect("https://buy.stripe.com/6oUeVc6gt5UB6n03V2e3e00");
});


app.get('/payment', (req, res) => {
    const plan = req.query.plan || 'Standard'; // or from req.body, etc.
    res.render('payment', { plan }); // ✅ now plan is defined
});


// Payment success / cancel pages
app.get('/success', (req, res) => res.render('success'));
app.get('/cancel', (req, res) => res.redirect('/get-started'));



app.get("/admin/uploads", (req, res) => {
    const uploadDir = path.join(__dirname, "uploads");
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.status(500).send("Error reading uploads folder");
        res.render("uploads", { files });
    });
});



// Set storage engine
const storage = multer.diskStorage({
    destination: "./uploads/", // make sure this folder exists
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // unique file name
    }
});

// Initialize upload
const diskUpload = multer({ storage });

// Static folder to serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Your upload route
app.post("/upload", diskUpload.single("w2form"), (req, res) => {
    console.log("File uploaded:", req.file);
    res.send("Upload successful!");
});

// =================== File Upload (W-2 / 1099) ===================

// =================== File Upload (Local) ===================

// Create local uploads folder (for dev)
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

const localStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const localUpload = multer({ storage: localStorage });

// =================== AWS S3 (SDK v3) storage (for production) ===================

// Initialize S3 client
const s3 = new S3Client({
    region: process.env.AWS_REGION,   // e.g. "us-east-1"
    credentials: {
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
    },
});

// Configure Multer-S3 storage
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME, // put your bucket name in .env
        acl: "private", // or "public-read" if you want public access
        key: (req, file, cb) => {
            cb(null, Date.now().toString() + "-" + file.originalname);
        },
    }),
});

// Upload route
app.post("/upload", upload.single("file"), (req, res) => {
    res.send({
        message: "✅ File uploaded successfully to S3",
        fileUrl: req.file.location, // URL to the uploaded file
    });
});



// =================== Upload Routes ===================

// form page
app.get("/upload-forms", (req, res) => res.render("upload-forms"));


// Upload locally (dev/test)
app.post("/upload-forms", localUpload.array("documents", 10), (req, res) => {
    console.log("Local Uploaded files:", req.files.map(f => f.location));

    res.render("upload-success", { files: req.files });
});

// Upload to S3 (production)
app.post("/upload-forms-s3", upload.array("documents", 10), (req, res) => {
    console.log("S3 Uploaded:", req.files.map(f => f.location));
    res.render("upload-success", { files: req.files });
});

// =================== Upload Route ===================

// Serve local uploads folder (optional, only works if using local storage)
app.use("/uploads", express.static(path.join(__dirname, 'uploads')));




