"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TaskControls } from "@/components/TaskControls";
import { formatDistanceToNow } from "date-fns"; 
import { ShieldCheck, Zap, Activity, Clock } from "lucide-react"; 
import WebhookPlayground from "./WebhookPlayground"; 

export default function DashboardClient() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Logic
  const fetchTasks = async () => {
    try {
    
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
      
      const res = await fetch(`${API_URL}/api/v1/tasks?limit=20`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTasks(data.tasks || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 2000);
    return () => clearInterval(interval);
  }, []);

  // Stats Logic
  const totalTasks = tasks.length;
  const activeWorkers = tasks.some((t: any) => ['PROCESSING', 'PENDING'].includes(t.status)) ? 1 : 0;
  const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;
  const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500 animate-pulse font-medium">Loading HookGuard v2.0...</div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-7xl mx-auto p-8">
        
        {/* Header */}
        <header className="mb-8 flex justify-between items-center">
          <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                HookGuard <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full border border-blue-200">v2.0 Pro</span>
              </h1>
              <p className="text-gray-500 mt-2">Distributed Webhook System with Rate Limiting & Security</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg text-sm font-mono border shadow-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">System:</span>
              <span className="text-green-600 font-bold">Online</span>
          </div>
        </header>

        {/* === NEW PLAYGROUND SECTION === */}
        <WebhookPlayground onWebhookSent={fetchTasks} />
        {/* ============================== */}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Tasks</h3>
              <p className="text-3xl font-bold mt-2 text-gray-900">{totalTasks}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Workers</h3>
              <p className="text-3xl font-bold mt-2 text-blue-600">{activeWorkers}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Success Rate</h3>
              <p className="text-3xl font-bold mt-2 text-green-600">{successRate}%</p>
          </div>
        </div>

        {/* Task Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target & Security</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th> 
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task: any) => (
                <tr key={task._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={task.idempotencyKey}>{task.idempotencyKey}</div>
                        {task.security?.secret && (
                            <div title="Signed Request (HMAC)">
                                <ShieldCheck className="w-4 h-4 text-green-600" />
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[300px]">{task.targetUrl}</div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-6 py-4">
                    {task.deliveryMode === 'best_effort' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            <Zap className="w-3 h-3 mr-1" /> Best Effort
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            Guaranteed
                        </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {task.currentAttempt} / {task.retryConfig.maxAttempts}
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                      <TaskControls taskId={task._id} status={task.status} />
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                  <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                              <Activity className="w-8 h-8 text-gray-300" />
                              <p>No tasks found. Use the playground above to create one!</p>
                          </div>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}