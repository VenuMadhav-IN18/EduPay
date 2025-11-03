const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, "public")));

// In-memory "DB" for demo purposes
const users = []; // { id, username, passwordHash }
let payments = []; // same structure as in your snippet

function generateId(prefix) {
  return prefix + "_" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

/* -------------------------
   Auth routes
   ------------------------- */
// Register
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing username or password" });

    // check existing
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = { id: generateId("USR"), username, passwordHash };
    users.push(user);

    return res.json({ message: "User registered successfully!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: "Missing fields" });

    const user = users.find(u => u.username === username);
    if (!user) {
      // You may still allow a local demo bypass (like you had) but here we keep clear behavior
      return res.json({ success: false, message: "Invalid username or password" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.json({ success: false, message: "Invalid username or password" });

    // For demo: return success (no real sessions here)
    return res.json({ success: true, message: "Login successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin: list users (simple, no auth)
app.get("/admin", (req, res) => {
  const sanitized = users.map(u => ({ id: u.id, username: u.username }));
  res.json(sanitized);
});

// Admin: delete user by id
app.delete("/admin/:id", (req, res) => {
  const id = req.params.id;
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "User not found" });
  users.splice(idx, 1);
  res.json({ message: "User deleted" });
});

/* -------------------------
   Payment demo API (in-memory)
   ------------------------- */

// Create payment
app.post("/api/create-payment", (req, res) => {
  const { method, amount } = req.body;
  if (!method || !amount) return res.status(400).json({ error: "Invalid data" });

  const payment = {
    orderId: generateId("ORDER"),
    txnId: generateId("TXN"),
    method,
    amount: parseFloat(amount),
    status: "PENDING",
    createdAt: new Date().toISOString()
  };

  payments.push(payment);
  console.log("New payment:", payment);
  res.json(payment);
});

// Confirm payment (simulate)
app.post("/api/confirm-payment", (req, res) => {
  const { orderId, succeed = true } = req.body;
  const payment = payments.find(p => p.orderId === orderId);
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  payment.status = succeed ? "SUCCESS" : "FAILED";
  payment.updatedAt = new Date().toISOString();
  res.json(payment);
});

// Get all payments
app.get("/api/payments", (req, res) => {
  res.json(payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// Get single payment
app.get("/api/payment/:orderId", (req, res) => {
  const { orderId } = req.params;
  const payment = payments.find(p => p.orderId === orderId);
  if (!payment) return res.status(404).json({ error: "Not found" });
  res.json(payment);
});

// Receipt download (text)
app.get("/api/receipt/:orderId", (req, res) => {
  const { orderId } = req.params;
  const payment = payments.find(p => p.orderId === orderId);
  if (!payment) return res.status(404).send("Receipt not found");

  const receiptText = `
==== Demo Payment Receipt ====

Order ID  : ${payment.orderId}
Txn ID    : ${payment.txnId}
Method    : ${payment.method}
Amount    : ₹${payment.amount}
Status    : ${payment.status}
Created   : ${payment.createdAt}

Note: This is a simulated payment (not real).
`;
  res.setHeader("Content-disposition", `attachment; filename=receipt_${payment.txnId}.txt`);
  res.setHeader("Content-Type", "text/plain");
  res.send(receiptText);
});

/* -------------------------
   Serve default frontend /public/index.html if any
   ------------------------- */
app.get("/", (req, res) => {
  // default to login
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
