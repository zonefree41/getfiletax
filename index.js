require('dotenv').config();
const express = require('express');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
console.log("Stripe Secret Key:", process.env.STRIPE_SECRET_KEY); // Debugging line

const app = express();

const { SitemapStream, streamToPromise } = require("sitemap");
const { createGzip } = require('zlib');



//view engine setup
const path = require("path");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));


const sitemapStream = new SitemapStream({ hostname: 'http://localhost:3000' });
const pipeline = sitemapStream.pipe(createGzip());

// Server static files from the "public" directory
app.use(express.static("public"));

// Serve all static files in (CSS, JS, Images) from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

app.use("/css", express.static(path.join(__dirname, 'public/css')));
app.use("/images", express.static(path.join(__dirname, 'public/images')));



// Home page

app.get("/", (req, res) => {
    res.render("home"); // home.ejs
});

// Create Checkout Session for single filing ($130)
app.post("/checkout/individual", async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Single Filing',
                    },
                    unit_amount: 13000, // $130 in cents
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${process.env.BASE_URL}/success`,
        cancel_url: `${process.env.BASE_URL}/get-started?canceled=true`,
    });

    res.redirect(session.url);
});

// Example for Stripe checkout success
app.get('/success', (req, res) => {
    res.send('<h1>Payment successful!</h1><p>Your payment has been processed successfully.</p><a href="/">Go back to home</a>');
});


app.get('/cancel', (req, res) => {
    res.redirect("get started.ejs");
});

app.get("/", (req, res) => {
    res.render("get started.ejs"); // Render the get started.ejs file
});


// Business Filing Card
app.post("/checkout/business", async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: { name: "Business Tax Filing" },
                    unit_amount: 25000, // $250 in cents
                },
                quantity: 1,
            },
        ],
        mode: "payment",
        shipping_address_collection: { allowed_countries: ["US", "CA"] },
        success_url: "http://localhost:3000/success",
        cancel_url: "http://localhost:3000/get-started?canceled=true",
    });
    res.redirect(session.url);
});

// Create Checkout Session for Family Filing ($150)
app.post("/checkout/family", async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: { name: "Married Filing Jointly" },
                    unit_amount: 15000, // $150 in cents
                },
                quantity: 1,
            },
        ],
        mode: "payment",
        shipping_address_collection: { allowed_countries: ["US", "CA"] },
        success_url: "http://localhost:3000/success",
        cancel_url: "http://localhost:3000/get-started?canceled=true",
    });
    res.redirect(session.url);
});

app.get('/success', (req, res) => {
    res.send("Payment successful!");
});

app.get('/cancel', (req, res) => {
    res.redirect('/');
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

// debugging: log every request 
app.use((req, res, next) => {
    console.log("Request URL:", req.url);
    next();
});


app.get("/", (req, res) => {
    res.render("home");
});

// Route 
app.get("/home", (req, res) => res.render("home"));
app.get("/about", (req, res) => res.render("about"));
app.get("/contact", (req, res) => res.render("contact"));
app.get("/book-now", (req, res) => res.render("book-now"));
app.get("/appointments", (req, res) => res.render("appointments"));
app.get("/book-an-appointment", (req, res) => res.render("book-an-appointment"));
app.get("/get-consultation", (req, res) => res.render("get-consultation"));
app.get("/explore", (req, res) => res.render("explore"));
app.get("/get-free-consultation", (req, res) => res.render("get-free-consultation"));
app.get("/view-our-services", (req, res) => res.render("view-our-services"));
app.get("/get-started", (req, res) => res.render("get-started"));
app.get("/pricing", (req, res) => res.render("pricing"));
app.get("/checkout", (req, res) => res.render("checkout"));
app.get("/services", (req, res) => res.render("services"));
app.get("/terms", (req, res) => res.render("terms"));
app.get("/book", (req, res) => res.render("book"));

app.get("/privacy", (req, res) => res.render("privacy", { company: { name: "Tax Expert", address: "320 23rd St, Arlington, VA, 22202 USA", contactEmail: "info@tax-expert.pro" } }));
app.get("/terms", (req, res) => res.render("terms"));
app.get("/sitemap", (req, res) => res.render("sitemap"));
app.get("/faq", (req, res) => res.render("faq"));
app.get("/blog", (req, res) => res.render("blog"));

app.get("/blog", (req, res) => res.render("blog"));

// Blog post pages
app.get("/blog1", (req, res) => {
    res.render("blog1"); // this loads views/5-ways-to-maximize-your-tax-refund.ejs
});

app.get("/blog2", (req, res) => res.render("blog2"));
app.get("/blog3", (req, res) => res.render("blog3"));

app.get("/payment-success", (req, res) => res.render("success"));
app.get("/payment-cancel", (req, res) => res.render("cancel"));

// Images route
app.use("/images", express.static(path.join(__dirname, "public/images")));




// Checkout routes
app.get("/checkout/start", (req, res) => res.render("checkout/start"));

app.get("/checkout/single", (req, res) => {
    res.send("Stripe checkout for Single Filing goes here!");
});
app.get("/checkout/business", (req, res) => {
    res.send("Stripe checkout for Business Filing goes here!");
});
app.get("/checkout/family", (req, res) => {
    res.send("Stripe checkout for Family Filing goes here!");
});


// Serve all static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
