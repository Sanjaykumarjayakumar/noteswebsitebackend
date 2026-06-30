require("dotenv").config();
const express = require("express");
const cors =require("cors");
const connectDB =require("./config/db");
connectDB();
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use("/api/auth",require("./routes/authRoutes"));
app.use("/api/notes",require("./routes/noteRoutes"));
app.listen(process.env.PORT,()=>{
    console.log("Server Running");
});