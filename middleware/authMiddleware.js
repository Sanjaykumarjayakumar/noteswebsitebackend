const jwt = require("jsonwebtoken");
const User = require("../models/User");
module.exports=
async(req,res,next)=>{
    try{
        const authHeader = req.headers.authorization;
        if(!authHeader){
            return res.status(401).json({msg:"No token provided"});
        }
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token,process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if(!user){
            return res.status(404).json({msg:"User not found"});
        }
        req.user =user;
        next();
    }
    catch(err){
        console.error(err);
        res.status(500).json({msg:"Invalid token provided"});
    }
};