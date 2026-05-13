import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// In-memory store for payment statuses (for demo purposes)
// In a real app, use a database (e.g., PostgreSQL, Firestore)
const paymentStatuses = new Map<string, any>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware to parse incoming body
  app.use(express.json());

  // API Route for Payhero
  app.post("/api/pay", async (req, res) => {
    const { amount, phone, reference } = req.body;

    const apiKey = process.env.PAYHERO_API_KEY;
    const channelId = process.env.PAYHERO_CHANNEL_ID;

    if (!apiKey || !channelId) {
      return res.status(500).json({ 
        success: false, 
        message: "Payhero configuration (Environment Variables) is missing on the server. Please add PAYHERO_API_KEY and PAYHERO_CHANNEL_ID."
      });
    }

    if (!amount || !phone) {
       return res.status(400).json({
          success: false,
          message: "Amount and phone are required."
       });
    }

    try {
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const actualReference = reference || `REF-${Date.now()}`;
      
      const payload = {
        amount: parseFloat(amount),
        phone_number: phone, 
        channel_id: channelId,
        provider: "m-pesa",
        external_reference: actualReference,
        callback_url: `${appUrl}/api/callback`
      };

      const authHeader = apiKey.startsWith("Basic ") ? apiKey : `Basic ${apiKey}`;

      const response = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
         return res.status(response.status).json({
            success: false,
            message: responseData.message || "Payment request failed from PayHero.",
            error: responseData
         });
      }

      // Initialize status in our mock DB
      paymentStatuses.set(actualReference, { status: "pending", data: responseData });
      
      // Deep alias all possible IDs from Payhero's response back to our reference
      if (responseData) {
         if (responseData.CheckoutRequestID) paymentStatuses.set(responseData.CheckoutRequestID, { isAlias: true, reference: actualReference });
         if (responseData.MerchantRequestID) paymentStatuses.set(responseData.MerchantRequestID, { isAlias: true, reference: actualReference });
         if (responseData.reference) paymentStatuses.set(responseData.reference, { isAlias: true, reference: actualReference });
         if (responseData.id) paymentStatuses.set(String(responseData.id), { isAlias: true, reference: actualReference });
      }

      res.json({
        success: true,
        message: "Payment initiated successfully! Please check your phone for the STK prompt.",
        data: responseData,
        reference: actualReference
      });
    } catch (error) {
      console.error("Payhero Error:", error);
      res.status(500).json({ 
        success: false, 
        message: "An error occurred while making the payment request." 
      });
    }
  });

  // Example callback endpoint for the webhook
  app.post("/api/callback", (req, res) => {
     console.log("Payment Callback Received:", JSON.stringify(req.body, null, 2));
     
     const body = req.body;
     if (!body) return res.status(200).send("OK");

     // Try to identify the transaction from the callback body
     const possibleRefs = [
       body.CheckoutRequestID, body.checkoutRequestID,
       body.external_reference, body.reference, 
       body.MerchantRequestID, body.id,
       (body.Body?.stkCallback?.CheckoutRequestID),
       (body.Body?.stkCallback?.MerchantRequestID)
     ].filter(Boolean);

     let targetReference = null;
     for (const ref of possibleRefs) {
       if (paymentStatuses.has(ref)) {
         const entry = paymentStatuses.get(ref);
         targetReference = entry.isAlias ? entry.reference : ref;
         break;
       }
     }

     if (targetReference && paymentStatuses.has(targetReference)) {
        // Evaluate success (Usually based on ResultCode == 0 or status == "Success")
        // M-Pesa standard is ResultCode: 0 for success inside stkCallback
        const isSuccess = 
          body.status === "Success" || 
          body.status === "Completed" || 
          body.status === "Successful" ||
          body.status === true ||
          body.success === true ||
          body.ResultCode === 0 || 
          body.ResultCode === "0" ||
          (body.Body && body.Body.stkCallback && body.Body.stkCallback.ResultCode === 0);

        const newStatus = isSuccess ? "completed" : "failed";

        paymentStatuses.set(targetReference, { 
          status: newStatus, 
          data: body 
        });
        console.log(`Updated transaction ${targetReference} to ${newStatus}`);
     } else {
        // If we can't find the exact reference, we could just store it generally, 
        // but for now we'll just log it.
        console.log(`Could not find a matching in-memory transaction for callback.`);
     }

     res.status(200).send("OK");
  });

  // Polling endpoint to check status
  app.get("/api/status/:reference", (req, res) => {
    const ref = req.params.reference;
    if (paymentStatuses.has(ref)) {
       res.json({ success: true, transaction: paymentStatuses.get(ref) });
    } else {
       res.status(404).json({ success: false, message: "Transaction not found" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
