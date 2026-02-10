'use server'

import { revalidatePath } from 'next/cache';

export async function retryTask(taskId: string) {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks/${taskId}/retry`, {
            method: 'POST',
        });
        
        if (!res.ok) throw new Error('Failed to retry task');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
}