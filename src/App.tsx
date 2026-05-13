import { useState, type FormEvent, useEffect, useRef } from "react";
import { CreditCard, History, Smartphone, AlertCircle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import * as motion from "motion/react-client";

export default function App() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [activeReference, setActiveReference] = useState("");
  
  const pollIntervalRef = useRef<number | null>(null);

  const startPolling = (ref: string) => {
    setActiveReference(ref);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/status/${ref}`);
        if (response.ok) {
           const data = await response.json();
           if (data.success && data.transaction) {
              if (data.transaction.status === "completed") {
                setStatus("success");
                setMessage("Payment completed successfully!");
                setIsLoading(false);
                clearInterval(pollIntervalRef.current!);
              } else if (data.transaction.status === "failed") {
                setStatus("error");
                setMessage("Payment failed or was cancelled.");
                setIsLoading(false);
                clearInterval(pollIntervalRef.current!);
              }
           }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000); // Poll every 3 seconds
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus("idle");
    setMessage("");

    if (!amount || !phoneNumber) {
      setStatus("error");
      setMessage("Phone number and amount are required.");
      setIsLoading(false);
      return;
    }

    let finalPhone = phoneNumber.replace(/\s+/g, "");
    if (!finalPhone.startsWith("254") && !finalPhone.startsWith("0")) {
      finalPhone = "254" + finalPhone;
    } else if (finalPhone.startsWith("0")) {
      finalPhone = "254" + finalPhone.substring(1);
    }

    try {
      const response = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: finalPhone,
          amount: amount,
          reference: reference || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("pending");
        setMessage("Payment prompt sent to your phone. Enter your PIN to complete the transaction.");
        if (data.reference) {
          startPolling(data.reference);
        }
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to initiate payment. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Network error. Make sure the server is running.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F1F5F9] flex flex-col font-sans text-slate-900 overflow-y-auto">
      {/* Header Navigation */}
      <nav className="h-20 bg-white border-b border-slate-200 px-4 md:px-10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <span className="text-xl font-bold tracking-tight">PayHero<span className="text-emerald-600">Hub</span></span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 text-slate-500 text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
            SECURE ENCRYPTION
          </div>
          <div className="hidden sm:block h-8 w-px bg-slate-200"></div>
          <span className="text-slate-400 text-xs text-right">ID: #{reference || '4902-XJ9'}</span>
        </div>
      </nav>

      {/* Main Checkout Interface */}
      <main className="flex-1 flex flex-col lg:flex-row p-4 md:p-12 gap-8 lg:gap-12 items-center lg:items-start justify-center">
        
        {/* Left Column: Order Information */}
        <div className="w-full max-w-[380px] space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Order Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Payment Amount</span>
                <span className="font-semibold text-slate-800 text-right max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                  KES {amount || "0.00"}
                </span>
              </div>
              {reference && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Reference:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">{reference}</span>
                </div>
              )}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-lg font-bold text-slate-800">Total Amount</span>
                <span className="text-2xl font-bold text-emerald-600 text-right max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                  KES {amount || "0.00"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <p className="text-emerald-900 font-semibold text-sm">Instant Mobile Payment</p>
                <p className="text-emerald-700 text-xs mt-1 leading-relaxed">Payments are processed via PayHero API. You will receive an M-Pesa prompt on your device immediately.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden"
        >
          <div className="bg-slate-900 p-8 text-white relative">
            <h1 className="text-2xl font-bold">Pay with M-Pesa</h1>
            <p className="text-slate-400 text-sm mt-1">Powered by PayHero Secure Gateway</p>
          </div>
          
          <div className="p-8 space-y-6">
             {/* Status Messages */}
             {status !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className={`mb-2 p-4 rounded-xl text-sm flex flex-col items-start gap-3 border ${
                    status === "success" 
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                      : status === "pending"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-red-50 text-red-800 border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="mt-0.5 flex-shrink-0">
                      {status === "success" ? <CheckCircle2 size={18} /> : status === "pending" ? <Loader2 size={18} className="animate-spin" /> : <AlertCircle size={18} />}
                    </div>
                    <div className="leading-relaxed font-medium">
                      {message}
                    </div>
                  </div>
                  {status === "pending" && (
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch('/api/callback', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reference: activeReference, status: "Success" })
                        });
                      }}
                      className="ml-7 text-xs bg-amber-200/50 hover:bg-amber-200 text-amber-800 font-semibold px-3 py-1.5 rounded focus:outline-none transition-colors border border-amber-200"
                    >
                      Simulate Webhook (Dev Mode Hook)
                    </button>
                  )}
                </motion.div>
              )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-emerald-600 transition-colors">
                    <span className="text-slate-400 font-medium">+254</span>
                  </div>
                  <input 
                    type="tel"
                    id="phone"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="712 345 678" 
                    className="w-full pl-16 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800"
                  />
                </div>
                <p className="text-[10px] text-slate-400 italic">Format: 7xx xxx xxx or 07xx xxx xxx</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="amount" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Amount</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-emerald-600 transition-colors">
                    <span className="text-slate-400 font-medium font-serif italic">KES</span>
                  </div>
                  <input 
                    type="number"
                    id="amount"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reference" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reference <span className="font-normal normal-case text-slate-400">(Optional)</span></label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-emerald-600 transition-colors">
                    <History size={18} className="text-slate-400" />
                  </div>
                  <input 
                    type="text"
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Order ID"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-5 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 mt-4"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Authorize Payment</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-6 pt-4">
                 <div className="flex items-center gap-1 opacity-40">
                   <div className="w-6 h-4 bg-slate-300 rounded-sm"></div>
                   <div className="w-6 h-4 bg-slate-300 rounded-sm"></div>
                   <div className="w-6 h-4 bg-slate-300 rounded-sm"></div>
                 </div>
                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">PCI DSS Compliant</span>
              </div>
            </form>
          </div>
        </motion.div>
      </main>

      {/* Sticky Footer/Status Bar */}
      <footer className="h-12 bg-white border-t border-slate-200 flex items-center justify-center px-10 shrink-0 mt-auto">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">PayHero API Status: Operational</span>
        </div>
      </footer>
    </div>
  );
}
