'use client'

import { retryTask } from "@/app/actions";
import { RotateCw } from "lucide-react";
import { useState } from "react";

export function TaskControls({ taskId, status }: { taskId: string, status: string }) {
    const [isLoading, setIsLoading] = useState(false);
    if (status !== 'FAILED') return null;

    const handleRetry = async () => {
        setIsLoading(true);
        await retryTask(taskId);
        setTimeout(() => setIsLoading(false), 2000); 
    };

    return (
        <button 
            onClick={handleRetry} 
            disabled={isLoading}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors border border-blue-200 bg-blue-50 px-2 py-1 rounded"
        >
            <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Queuing...' : 'Retry'}
        </button>
    );
}