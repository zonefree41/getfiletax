const { app } = require('.');

app.get("/privacy", (req, res) => res.render("Privacy Policy"));
