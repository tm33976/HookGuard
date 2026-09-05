"use client";

import { useState } from "react";
import { Send, Lock, Zap, RefreshCw, CheckCircle, AlertCircle, Key } from "lucide-react";

export default function WebhookPlayground({ onWebhookSent }: { onWebhookSent: () => void }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Form State
  const [targetUrl, setTargetUrl] = useState("https://jsonplaceholder.typicode.com/posts");
  const [secret, setSecret] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("at_least_once");
  const [payload, setPayload] = useState('{\n  "event": "user_signup",\n  "user_id": 12345\n}');

  const handleSend = async () => {
    setLoading(true);
    setStatus('idle');

    try {
      // Use user-defined idempotency key if provided; otherwise fallback to dynamic timestamp
      const effectiveKey = idempotencyKey.trim() !== "" 
        ? idempotencyKey.trim() 
        : `test-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Validate JSON
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(payload);
      } catch (e) {
        alert("Invalid JSON Payload");
        setLoading(false);
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

      // Send Request
      const res = await fetch(`${API_URL}/api/v1/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          secret: secret || undefined,
          deliveryMode,
          payload: parsedPayload,
          idempotencyKey: effectiveKey
        })
      });

      if (!res.ok) throw new Error("Failed");
      
      setStatus('success');
      onWebhookSent(); 
      
      // Reset status badge after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);

    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 mb-8">
      <div className="flex items-center gap-3 mb-6 border-b pb-4">
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <Zap className="w-5 h-5" />
        </div>
        <div>
            <h2 className="text-lg font-bold text-gray-900">Interactive Playground</h2>
            <p className="text-sm text-gray-500">Test the system live without Postman.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT COL: Configuration */}
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Target URL</label>
                <input 
                    type="text" 
                    value={targetUrl} 
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full text-sm p-2.5 border border-gray-200 rounded-lg font-mono text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="https://api.example.com/webhook"
                />
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Idempotency Key (Optional)</label>
                <div className="relative">
                    <Key className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="e.g. req-unique-token"
                        value={idempotencyKey}
                        onChange={(e) => setIdempotencyKey(e.target.value)}
                        className="w-full text-sm pl-9 p-2.5 border border-gray-200 rounded-lg font-mono text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Secret Key (Optional)</label>
                    <div className="relative">
                        <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="my-secret-key"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            className="w-full text-sm pl-9 p-2.5 border border-gray-200 rounded-lg font-mono text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">Delivery Mode</label>
                    <select 
                        value={deliveryMode}
                        onChange={(e) => setDeliveryMode(e.target.value)}
                        className="w-full text-sm p-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                        <option value="at_least_once">Guaranteed (Retry)</option>
                        <option value="best_effort">Best Effort (No Retry)</option>
                    </select>
                </div>
            </div>
        </div>

        {/* RIGHT COL: Payload & Action */}
        <div className="flex flex-col h-full">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wider">JSON Payload</label>
            <textarea 
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="flex-1 w-full text-sm p-3 border border-gray-200 rounded-lg font-mono text-gray-700 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none min-h-[140px] transition-all"
            />
            
            <button 
                onClick={handleSend}
                disabled={loading}
                className={`mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all shadow-sm ${
                    status === 'success' ? 'bg-green-600 hover:bg-green-700 text-white ring-2 ring-green-200' :
                    status === 'error' ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-200' :
                    'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:shadow-blue-300'
                }`}
            >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
                 status === 'success' ? <CheckCircle className="w-4 h-4" /> : 
                 status === 'error' ? <AlertCircle className="w-4 h-4" /> : 
                 <Send className="w-4 h-4 text-white" />}
                
                {loading ? "Ingesting..." : 
                 status === 'success' ? "Sent Successfully!" : 
                 status === 'error' ? "Failed to Send" : 
                 "Ingest Webhook"}
            </button>
        </div>
      </div>
    </div>
  );
}