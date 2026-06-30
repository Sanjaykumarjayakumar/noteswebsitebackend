const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    name:String,
    email:{ type:String, unique:true },
    password:String,
    firebaseUid:String,
    provider:{ type:String, default:"email" }
},{timestamps:true});
module.exports=mongoose.model( "User", userSchema );
