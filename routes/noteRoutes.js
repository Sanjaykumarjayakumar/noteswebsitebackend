const router = require("express").Router();
const Note = require( "../models/Note");
const auth = require("../middleware/authMiddleware"); 
const crypto = require("crypto");

const getClientUrl = (req) => {
    const configuredUrl = process.env.CLIENT_URL;
    if (configuredUrl) return configuredUrl.replace(/\/$/, "");
    const origin = req.get("origin");
    if (origin) return origin.replace(/\/$/, "");
    return `${req.protocol}://${req.get("host")}`;
};

const getAttachmentBuffer = (attachment) => {
    if (!attachment || !attachment.data) return null;
    const rawData = attachment.data.includes(",")
        ? attachment.data.split(",")[1]
        : attachment.data;
    return Buffer.from(rawData, "base64");
};

const getAttachmentSignatureSecret = () =>
    process.env.JWT_SECRET ||
    process.env.JWT_SECRET_KEY ||
    process.env.AUTH_SECRET ||
    "notes-local-share-secret";

const getAttachmentSignature = (note, index, attachment) =>
    crypto
        .createHmac("sha256", getAttachmentSignatureSecret())
        .update([
            note.shareToken,
            index,
            attachment?.name || "",
            attachment?.type || "",
            attachment?.size || 0
        ].join(":"))
        .digest("hex");

const isValidAttachmentSignature = (note, index, attachment, signature) => {
    if (!signature || typeof signature !== "string") return false;
    const expected = getAttachmentSignature(note, index, attachment);
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    return expectedBuffer.length === signatureBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
};

const getPublicNote = (note) => ({
    title: note.title,
    content: note.content,
    attachments: note.shareIncludeFiles
        ? (note.attachments || []).map((attachment, index) => ({
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            accessToken: getAttachmentSignature(note, index, attachment)
        }))
        : []
});
router.post("/",auth,
    async(req,res)=>{
        try{
            const{title,content,attachments=[]}=req.body;
            const note = await Note.create({title,content,attachments,shared:false,userId:req.user._id});
            res.status(201).json(note);
        }
        catch(err){
            res.status(500).json({msg:"Create failed"});
        }
    }
);
router.get("/",auth,
    async(req,res)=>{
        try{
            const notes =await Note.find({userId:req.user._id}).populate("userId","name email");
            res.json(notes);
        }
        catch(err){
            res.status(500).json({msg:"Fetch failed"});
        }
    }
);
router.get("/:id",auth,
    async(req,res)=>{
        try {
            const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
            if (!note) {
                return res.status(404).json({ msg: "Note not found" });
            }
            res.json(note);
        } catch (err) {
            res.status(500).json({ msg: "Fetch failed" });
        }
    }
);
router.put("/:id",auth,
    async(req,res)=>{
        try{
            const{title,content,attachments=[]}=req.body;
            const note = await Note.findOneAndUpdate({
                _id:req.params.id,
                userId:req.user._id
            },
            {
                title,
                content,
                attachments
            },
            {
                new:true
            }
        );
        res.json(note);
    }
    catch{res.status(500).json({msg:"Update failed"});
}});
router.delete("/:id",auth,
    async(req,res)=>{
        try{
            const note = await Note.findOneAndDelete({
                _id:req.params.id,
                userId:req.user._id,
            })
            if(!note){
                return res.status(404).json({msg:"Note not found"});
            }
            return res.status(200).json({msg:"Deleted successfully"});
        }
        catch(err){
            res.status(500).json({msg:"Delete failed"});
        }
    }
);
router.put("/share/:id", auth, async (req,res)=>{
    try {
        const { includeFiles } = req.body;
        const note = await Note.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if(!note){
            return res.status(404).json({ msg:"Note not found" });
        }

        note.shared = true;
        note.shareIncludeFiles = Boolean(includeFiles);
        note.shareToken = crypto.randomBytes(32).toString("hex");
        await note.save();

        res.json({
            link: `${getClientUrl(req)}/share/${note.shareToken}`,
            shared: note.shared,
            shareIncludeFiles: note.shareIncludeFiles
        });
    }
    catch{
        res.status(500).json({ msg:"Share failed" });
    }
});

router.put("/unshare/:id", auth, async (req,res)=>{
    try {
        const note = await Note.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if(!note){
            return res.status(404).json({ msg:"Note not found" });
        }

        note.shared = false;
        note.shareIncludeFiles = false;
        note.shareToken = null;
        await note.save();

        res.json({ msg: "Access removed" });
    }
    catch{
        res.status(500).json({ msg:"Remove access failed" });
    }
});

router.get("/public/:token", async(req,res)=>{
    try {
        const note = await Note.findOne({
            shareToken: req.params.token,
            shared: true
        });

        if(!note){
            return res.status(403).json({ msg:"Access removed" });
        }

        res.json(getPublicNote(note));
    }
    catch{
        res.status(500).json({ msg:"Fetch failed" });
    }
});

router.get("/public/:token/attachment/:index/:fileToken", async (req, res) => {
    try{
        const note = await Note.findOne({
            shareToken: req.params.token,
            shared: true,
            shareIncludeFiles: true
        });
        if(!note)return res.status(403).json({ msg: "No access" });
        const idx = parseInt(req.params.index, 10);
        if(isNaN(idx) || idx < 0 || idx >= (note.attachments || []).length){
            return res.status(404).json({ msg: "Attachment not found" });
        }
        const att = note.attachments[idx];
        if(!isValidAttachmentSignature(note, idx, att, req.params.fileToken)){
            return res.status(403).json({ msg: "No access" });
        }
        const buf = getAttachmentBuffer(att);
        if(!buf)return res.status(404).json({ msg: "Attachment data missing" });
        res.setHeader("Content-Type", att.type || "application/octet-stream");
        res.setHeader("Content-Disposition",`inline; filename*=UTF-8''${encodeURIComponent(att.name)}`);
        return res.end(buf);
    }
    catch(err){
        res.status(500).json({ msg: "Attachment fetch failed" });
    }
});
router.get("/public/:token/attachment/:index", async (req, res) => {
    return res.status(403).json({ msg: "No access" });
});
router.get('/:id/attachment/:index', auth, async (req, res) => {
    try{
        const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
        if(!note)return res.status(404).json({ msg: 'Note not found' });
        const idx = parseInt(req.params.index, 10);
        if(isNaN(idx) || idx < 0 || idx >= (note.attachments || []).length){
            return res.status(404).json({ msg: 'Attachment not found' });
        }
        const att = note.attachments[idx];
        if(!att || !att.data)return res.status(404).json({ msg: 'Attachment data missing' });
        const matches = /^data:([^;]+);base64,(.+)$/.exec(att.data);
        if(!matches)return res.status(400).json({ msg: 'Invalid attachment data' });
        const mime = matches[1];
        const b64 = matches[2];
        const buf = Buffer.from(b64, 'base64');
        res.set('Content-Type', mime);
        res.setHeader("Content-Type",att.type || "application/octet-stream");
        res.setHeader("Content-Disposition",`inline; filename*=UTF-8''${encodeURIComponent(att.name)}`);
        return res.end(buf);
    }
    catch(err){
        res.status(500).json({ msg: 'Attachment fetch failed' });
    }
});
router.get('/share/:id/attachment/:index', async (req, res) => {
    return res.status(403).json({ msg: 'No access' });
});
module.exports=router;
