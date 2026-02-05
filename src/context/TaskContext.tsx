import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Task, TaskStatus, TaskComment } from '../types';

interface TaskContextType {
  tasks: Task[];
  fetchTasks: () => Promise<void>;
  addTask: (data: { title: string; description?: string | null; responsibleId?: string | null; dueDate?: string | null }) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'responsibleId' | 'dueDate' | 'status' | 'sortOrder'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  taskComments: Record<string, TaskComment[]>;
  fetchTaskComments: (taskId: string) => Promise<void>;
  addTaskComment: (taskId: string, text: string) => Promise<void>;
  deleteTaskComment: (commentId: string, taskId: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | null>(null);

export function useTask() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTask must be used within TaskProvider');
  return ctx;
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const { organization, appUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskComments, setTaskComments] = useState<Record<string, TaskComment[]>>({});

  const fetchTasks = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error: err } = await supabase
        .from('tasks')
        .select('*, users!tasks_responsible_id_fkey(full_name)')
        .eq('organization_id', organization.id)
        .order('sort_order');

      if (err) throw err;

      setTasks((data || []).map((t: any) => ({
        id: t.id,
        organizationId: t.organization_id,
        title: t.title,
        description: t.description,
        responsibleId: t.responsible_id,
        responsibleName: t.users?.full_name || null,
        dueDate: t.due_date,
        status: t.status as TaskStatus,
        sortOrder: t.sort_order || 0,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (organization?.id) fetchTasks();
  }, [organization?.id, fetchTasks]);

  const addTask = useCallback(async (data: { title: string; description?: string | null; responsibleId?: string | null; dueDate?: string | null }): Promise<Task | null> => {
    if (!organization?.id) return null;
    try {
      const { data: row, error: err } = await supabase
        .from('tasks')
        .insert({
          organization_id: organization.id,
          title: data.title,
          description: data.description || null,
          responsible_id: data.responsibleId || null,
          due_date: data.dueDate || null,
        })
        .select('*, users!tasks_responsible_id_fkey(full_name)')
        .single();

      if (err) throw err;

      const newTask: Task = {
        id: row.id,
        organizationId: row.organization_id,
        title: row.title,
        description: row.description,
        responsibleId: row.responsible_id,
        responsibleName: row.users?.full_name || null,
        dueDate: row.due_date,
        status: row.status as TaskStatus,
        sortOrder: row.sort_order || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err) {
      console.error('Error adding task:', err);
      return null;
    }
  }, [organization?.id]);

  const updateTask = useCallback(async (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'responsibleId' | 'dueDate' | 'status' | 'sortOrder'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.responsibleId !== undefined) dbUpdates.responsible_id = updates.responsibleId;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      dbUpdates.updated_at = new Date().toISOString();

      const { error: err } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
      if (err) throw err;

      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
    } catch (err) {
      console.error('Error updating task:', err);
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase.from('tasks').delete().eq('id', id);
      if (err) throw err;
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  }, []);

  // ===== COMMENTS =====

  const fetchTaskComments = useCallback(async (taskId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('task_comments')
        .select('*, users(full_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (err) throw err;

      setTaskComments(prev => ({
        ...prev,
        [taskId]: (data || []).map((c: any) => ({
          id: c.id,
          taskId: c.task_id,
          userId: c.user_id,
          userName: c.users?.full_name || null,
          text: c.text,
          createdAt: c.created_at,
        })),
      }));
    } catch (err) {
      console.error('Error fetching task comments:', err);
    }
  }, []);

  const addTaskComment = useCallback(async (taskId: string, text: string) => {
    if (!appUser) return;
    try {
      const { data, error: err } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: appUser.id,
          text,
        })
        .select('*, users(full_name)')
        .single();

      if (err) throw err;

      const newComment: TaskComment = {
        id: data.id,
        taskId: data.task_id,
        userId: data.user_id,
        userName: data.users?.full_name || null,
        text: data.text,
        createdAt: data.created_at,
      };

      setTaskComments(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), newComment],
      }));
    } catch (err) {
      console.error('Error adding task comment:', err);
    }
  }, [appUser]);

  const deleteTaskComment = useCallback(async (commentId: string, taskId: string) => {
    try {
      const { error: err } = await supabase.from('task_comments').delete().eq('id', commentId);
      if (err) throw err;
      setTaskComments(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter(c => c.id !== commentId),
      }));
    } catch (err) {
      console.error('Error deleting task comment:', err);
    }
  }, []);

  const value = useMemo(() => ({
    tasks,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    taskComments,
    fetchTaskComments,
    addTaskComment,
    deleteTaskComment,
  }), [tasks, fetchTasks, addTask, updateTask, deleteTask, taskComments, fetchTaskComments, addTaskComment, deleteTaskComment]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
