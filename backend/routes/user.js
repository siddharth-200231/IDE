const User = require("../models/user");
const router = require("express").Router();
const zod = require("zod");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middlewares/auth");

const userSchema = zod.object({
    email: zod.string().email(),
    name: zod.string(),
    password: zod.string().min(6),
});

router.post("/register", async (req, res) => {
    try {
        const validatedData = userSchema.parse(req.body);
        const { email, name, password } = validatedData;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }
        const user = await User.create({ email, name, password });
        const token = jwt.sign({ email, name }, process.env.JWT_SECRET);
        res.cookie("token", token);
        return res.status(201).json({ user: { email , name  }, token });
    } 
    catch (error) {
        if (error instanceof zod.ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: error.errors,
            });
        }
        return res.status(500).json({ error: "Something went wrong" });
    }
});

router.post("/login", authMiddleware, async (req, res) => {
    const { email, name } = req.user;
    const token = jwt.sign({ email, name }, process.env.JWT_SECRET);
    res.cookie("token", token);
    return res.status(200).json({ user: { email, name }, token });
});

router.get("/logout", (req, res) => {
    res.clearCookie("token");
    return res.status(200).json({ message: "Logged out" });
});

module.exports = router;
