const User = require("../models/user");
const router = require("express").Router();
const zod = require("zod");
const jwt = require("jsonwebtoken");
const { authMiddleware, validateUser } = require("../middlewares/auth");
const userSchema = zod.object({
    email: zod.string().email(),
    name: zod.string(),
    password: zod.string().min(6),
});

router.post("/register", async (req, res) => {
    try {
        const validatedData = userSchema.parse(req.body);
        const { email, name, password } = validatedData;
        console.log(email, name, password);

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }
        const user = await User.create({ email, name, password });
        const token = jwt.sign({ 
            id: user._id, 
            email, 
            name 
        }, process.env.key);
        
        res.cookie("token", token);
        return res.status(201).json({ user: { id: user._id, email, name }, token });
    }
    catch (error) {
        if (error instanceof zod.ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: error.errors,
            });
        }
        return res.status(500).json({ error: error.message });
    }
});

router.post("/login", authMiddleware, async (req, res) => {
    const { _id, email, name } = req.user;
    const token = jwt.sign({ 
        id: _id, 
        email, 
        name 
    }, process.env.key);
    res.cookie("token", token);
    return res.status(200).json({ user: { id: _id, email, name }, token });
});

router.get("/logout", validateUser, (req, res) => {
    res.clearCookie("token");
    return res.status(200).json({ message: "Logged out" });
});

router.get("/profile", validateUser, (req, res) => {
    const { email, name } = req.user;
    return res.status(200).json({ user: { email, name } });
});

module.exports = router;
