import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { supabase, onTabResumed } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { notify } from '../lib/notify';
import type { Task, TaskStatus, TaskComment, TaskLabel, TaskAttachment, TaskAssignee } from '../types';

interface TaskContextType {
  tasks: Task[];
  fetchTasks: () => Promise<void>;
  addTask: (data: { title: string; description?: string | null; responsibleId?: string | null; dueDate?: string | null; isPrivate?: boolean }) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'responsibleId' | 'dueDate' | 'status' | 'sortOrder' | 'isPrivate'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  taskComments: Record<string, TaskComment[]>;
  fetchTaskComments: (taskId: string) => Promise<void>;
  addTaskComment: (taskId: string, text: string) => Promise<TaskComment>;
  deleteTaskComment: (commentId: string, taskId: string) => Promise<void>;

  // Labels
  labels: TaskLabel[];
  fetchLabels: () => Promise<void>;
  addLabel: (name: string, color: string) => Promise<TaskLabel | null>;
  deleteLabel: (id: string) => Promise<void>;
  taskLabels: Record<string, TaskLabel[]>;
  fetchTaskLabels: (taskId: string) => Promise<void>;
  assignLabel: (taskId: string, labelId: string) => Promise<void>;
  removeLabel: (taskId: string, labelId: string) => Promise<void>;

  // Attachments
  taskAttachments: Record<string, TaskAttachment[]>;
  fetchAttachments: (taskId: string) => Promise<void>;
  addAttachment: (taskId: string, data: { type: 'file' | 'link'; name: string; url: string }) => Promise<void>;
  deleteAttachment: (id: string, taskId: string) => Promise<void>;

  // Assignees
  taskAssignees: Record<string, TaskAssignee[]>;
  fetchAssignees: (taskId: string) => Promise<void>;
  addAssignee: (taskId: string, userId: string) => Promise<void>;
  removeAssignee: (id: string, taskId: string) => Promise<void>;
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
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [taskLabels, setTaskLabels] = useState<Record<string, TaskLabel[]>>({});
  const [taskAttachments, setTaskAttachments] = useState<Record<string, TaskAttachment[]>>({});
  const [taskAssignees, setTaskAssignees] = useState<Record<string, TaskAssignee[]>>({});

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
        isPrivate: (t as any).is_private ?? false,
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

  const addTask = useCallback(async (data: { title: string; description?: string | null; responsibleId?: string | null; dueDate?: string | null; isPrivate?: boolean }): Promise<Task | null> => {
    if (!organization?.id) {
      throw new Error('No se encontró la organización. Recargá la página.');
    }
    const { data: row, error: err } = await supabase
      .from('tasks')
      .insert({
        organization_id: organization.id,
        title: data.title,
        description: data.description || null,
        responsible_id: data.responsibleId || null,
        due_date: data.dueDate || null,
        is_private: data.isPrivate ?? false,
      } as any)
      .select('*, users!tasks_responsible_id_fkey(full_name)')
      .single();

    if (err) {
      console.error('Error adding task:', err);
      throw new Error(err.message || 'Error al crear la tarea.');
    }

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
      isPrivate: (row as any).is_private ?? false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    setTasks(prev => [...prev, newTask]);

    if (newTask.responsibleId && newTask.responsibleId !== appUser?.id && organization?.id) {
      notify({
        organizationId: organization.id,
        userId: newTask.responsibleId,
        type: 'task_assigned',
        title: `Te asignaron una tarea: ${newTask.title}`,
        entityType: 'task',
        entityId: newTask.id,
        actionUrl: '/tareas',
      });
    }

    return newTask;
  }, [organization?.id, appUser?.id]);

  const updateTask = useCallback(async (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'responsibleId' | 'dueDate' | 'status' | 'sortOrder' | 'isPrivate'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.responsibleId !== undefined) dbUpdates.responsible_id = updates.responsibleId;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      if (updates.isPrivate !== undefined) dbUpdates.is_private = updates.isPrivate;
      dbUpdates.updated_at = new Date().toISOString();

      const { error: err } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
      if (err) throw err;

      if (updates.responsibleId && updates.responsibleId !== appUser?.id && organization?.id) {
        const task = tasks.find(t => t.id === id);
        if (task && task.responsibleId !== updates.responsibleId) {
          notify({
            organizationId: organization.id,
            userId: updates.responsibleId,
            type: 'task_assigned',
            title: `Te asignaron una tarea: ${task.title}`,
            entityType: 'task',
            entityId: id,
            actionUrl: '/tareas',
          });
        }
      }

      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
    } catch (err: any) {
      console.error('Error updating task:', err);
      // Surface the error so callers can show feedback. Previously this was
      // swallowed and the UI silently kept showing the old state on failure.
      throw new Error(err?.message || 'No se pudo actualizar la tarea');
    }
  }, [appUser?.id, organization?.id, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase.from('tasks').delete().eq('id', id);
      if (err) throw err;
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('Error deleting task:', err);
      throw new Error(err?.message || 'No se pudo eliminar la tarea');
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

  const addTaskComment = useCallback(async (taskId: string, text: string): Promise<TaskComment> => {
    if (!appUser) {
      throw new Error('Sesión no inicializada. Cerrá sesión y volvé a iniciar.');
    }
    const { data, error: err } = await supabase
      .from('task_comments')
      .insert({ task_id: taskId, user_id: appUser.id, text })
      .select('*, users(full_name)')
      .single();

    if (err) {
      console.error('Error adding task comment:', err);
      throw new Error(err.message || 'No se pudo publicar el comentario');
    }
    if (!data) throw new Error('No se pudo publicar el comentario');

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
    return newComment;
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

  // ===== LABELS =====

  const fetchLabels = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error: err } = await supabase
        .from('task_labels')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');
      if (err) throw err;
      setLabels((data || []).map((l: any) => ({
        id: l.id,
        organizationId: l.organization_id,
        name: l.name,
        color: l.color,
      })));
    } catch (err) {
      console.error('Error fetching labels:', err);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (organization?.id) fetchLabels();
  }, [organization?.id, fetchLabels]);

  // ===== REALTIME =====
  // Tasks + task comments + labels. Comments don't carry organization_id;
  // we refetch only if we have comments loaded for the affected task.
  useEffect(() => {
    if (!organization?.id) return;
    const orgFilter = `organization_id=eq.${organization.id}`;
    const timers: Record<string, ReturnType<typeof setTimeout> | null> = {
      tasks: null, labels: null, comments: null,
    };
    const debounce = (key: keyof typeof timers, fn: () => void) => {
      if (timers[key]) clearTimeout(timers[key]!);
      timers[key] = setTimeout(fn, 300);
    };

    const channel = supabase
      .channel(`tasks:${organization.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: orgFilter },
        () => debounce('tasks', fetchTasks))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_labels', filter: orgFilter },
        () => debounce('labels', fetchLabels))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' },
        (payload: any) => {
          const taskId = payload.new?.task_id || payload.old?.task_id;
          if (!taskId) return;
          setTaskComments(prev => {
            // Only refetch if we have comments cached for this task.
            if (prev[taskId]) {
              debounce('comments', () => fetchTaskComments(taskId));
            }
            return prev;
          });
        })
      .subscribe();

    return () => {
      Object.values(timers).forEach((t) => { if (t) clearTimeout(t); });
      supabase.removeChannel(channel);
    };
  }, [organization?.id, fetchTasks, fetchLabels, fetchTaskComments]);

  // ===== TAB RESUMED =====
  useEffect(() => {
    if (!organization?.id) return;
    return onTabResumed(() => {
      fetchTasks();
      fetchLabels();
    });
  }, [organization?.id, fetchTasks, fetchLabels]);

  const addLabel = useCallback(async (name: string, color: string): Promise<TaskLabel | null> => {
    if (!organization?.id) return null;
    const { data, error: err } = await supabase
      .from('task_labels')
      .insert({ organization_id: organization.id, name, color })
      .select()
      .single();
    if (err) throw new Error(err.message);
    const label: TaskLabel = { id: data.id, organizationId: data.organization_id, name: data.name, color: data.color };
    setLabels(prev => [...prev, label]);
    return label;
  }, [organization?.id]);

  const deleteLabel = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase.from('task_labels').delete().eq('id', id);
      if (err) throw err;
      setLabels(prev => prev.filter(l => l.id !== id));
      // Remove from all tasks
      setTaskLabels(prev => {
        const next = { ...prev };
        for (const tid of Object.keys(next)) {
          next[tid] = next[tid].filter(l => l.id !== id);
        }
        return next;
      });
    } catch (err) {
      console.error('Error deleting label:', err);
    }
  }, []);

  const fetchTaskLabels = useCallback(async (taskId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('task_label_assignments')
        .select('label_id, task_labels(*)')
        .eq('task_id', taskId);
      if (err) throw err;
      setTaskLabels(prev => ({
        ...prev,
        [taskId]: (data || []).map((r: any) => ({
          id: r.task_labels.id,
          organizationId: r.task_labels.organization_id,
          name: r.task_labels.name,
          color: r.task_labels.color,
        })),
      }));
    } catch (err) {
      console.error('Error fetching task labels:', err);
    }
  }, []);

  const assignLabel = useCallback(async (taskId: string, labelId: string) => {
    const { error: err } = await supabase.from('task_label_assignments').insert({ task_id: taskId, label_id: labelId });
    if (err) throw new Error(err.message);
    const label = labels.find(l => l.id === labelId);
    if (label) {
      setTaskLabels(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), label],
      }));
    }
  }, [labels]);

  const removeLabel = useCallback(async (taskId: string, labelId: string) => {
    try {
      const { error: err } = await supabase
        .from('task_label_assignments')
        .delete()
        .eq('task_id', taskId)
        .eq('label_id', labelId);
      if (err) throw err;
      setTaskLabels(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter(l => l.id !== labelId),
      }));
    } catch (err) {
      console.error('Error removing label:', err);
    }
  }, []);

  // ===== ATTACHMENTS =====

  const fetchAttachments = useCallback(async (taskId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at');
      if (err) throw err;
      setTaskAttachments(prev => ({
        ...prev,
        [taskId]: (data || []).map((a: any) => ({
          id: a.id,
          taskId: a.task_id,
          type: a.type,
          name: a.name,
          url: a.url,
          uploadedBy: a.uploaded_by,
          createdAt: a.created_at,
        })),
      }));
    } catch (err) {
      console.error('Error fetching attachments:', err);
    }
  }, []);

  const addAttachment = useCallback(async (taskId: string, data: { type: 'file' | 'link'; name: string; url: string }) => {
    try {
      const { data: row, error: err } = await supabase
        .from('task_attachments')
        .insert({ task_id: taskId, type: data.type, name: data.name, url: data.url, uploaded_by: appUser?.id || null })
        .select()
        .single();
      if (err) throw err;
      const att: TaskAttachment = {
        id: row.id,
        taskId: row.task_id,
        type: row.type,
        name: row.name,
        url: row.url,
        uploadedBy: row.uploaded_by,
        createdAt: row.created_at,
      };
      setTaskAttachments(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), att],
      }));
    } catch (err) {
      console.error('Error adding attachment:', err);
    }
  }, [appUser?.id]);

  const deleteAttachment = useCallback(async (id: string, taskId: string) => {
    try {
      const { error: err } = await supabase.from('task_attachments').delete().eq('id', id);
      if (err) throw err;
      setTaskAttachments(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter(a => a.id !== id),
      }));
    } catch (err) {
      console.error('Error deleting attachment:', err);
    }
  }, []);

  // ===== ASSIGNEES =====

  const fetchAssignees = useCallback(async (taskId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('task_assignees')
        .select('*, users(full_name)')
        .eq('task_id', taskId);
      if (err) throw err;
      setTaskAssignees(prev => ({
        ...prev,
        [taskId]: (data || []).map((a: any) => ({
          id: a.id,
          taskId: a.task_id,
          userId: a.user_id,
          userName: a.users?.full_name || null,
          createdAt: a.created_at,
        })),
      }));
    } catch (err) {
      console.error('Error fetching assignees:', err);
    }
  }, []);

  const addAssignee = useCallback(async (taskId: string, userId: string) => {
    try {
      const { data: row, error: err } = await supabase
        .from('task_assignees')
        .insert({ task_id: taskId, user_id: userId })
        .select('*, users(full_name)')
        .single();
      if (err) throw err;
      const assignee: TaskAssignee = {
        id: row.id,
        taskId: row.task_id,
        userId: row.user_id,
        userName: row.users?.full_name || null,
        createdAt: row.created_at,
      };
      setTaskAssignees(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), assignee],
      }));

      // Notify
      if (userId !== appUser?.id && organization?.id) {
        const task = tasks.find(t => t.id === taskId);
        notify({
          organizationId: organization.id,
          userId,
          type: 'task_assigned',
          title: `Te asignaron una tarea: ${task?.title || 'Tarea'}`,
          entityType: 'task',
          entityId: taskId,
          actionUrl: '/tareas',
        });
      }
    } catch (err) {
      console.error('Error adding assignee:', err);
    }
  }, [appUser?.id, organization?.id, tasks]);

  const removeAssignee = useCallback(async (id: string, taskId: string) => {
    try {
      const { error: err } = await supabase.from('task_assignees').delete().eq('id', id);
      if (err) throw err;
      setTaskAssignees(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter(a => a.id !== id),
      }));
    } catch (err) {
      console.error('Error removing assignee:', err);
    }
  }, []);

  // ===== CONTEXT VALUE =====

  const value = useMemo(() => ({
    tasks, fetchTasks, addTask, updateTask, deleteTask,
    taskComments, fetchTaskComments, addTaskComment, deleteTaskComment,
    labels, fetchLabels, addLabel, deleteLabel,
    taskLabels, fetchTaskLabels, assignLabel, removeLabel,
    taskAttachments, fetchAttachments, addAttachment, deleteAttachment,
    taskAssignees, fetchAssignees, addAssignee, removeAssignee,
  }), [
    tasks, fetchTasks, addTask, updateTask, deleteTask,
    taskComments, fetchTaskComments, addTaskComment, deleteTaskComment,
    labels, fetchLabels, addLabel, deleteLabel,
    taskLabels, fetchTaskLabels, assignLabel, removeLabel,
    taskAttachments, fetchAttachments, addAttachment, deleteAttachment,
    taskAssignees, fetchAssignees, addAssignee, removeAssignee,
  ]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
