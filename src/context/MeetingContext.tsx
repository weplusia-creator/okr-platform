import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Meeting, MeetingOccurrence, MeetingOccurrenceStatus } from '../types';

interface MeetingContextType {
  meetings: Meeting[];
  occurrences: Record<string, MeetingOccurrence[]>;
  loading: boolean;
  fetchMeetings: () => Promise<void>;
  addMeeting: (data: {
    title: string;
    description?: string;
    dayOfWeek: number;
    startTime: string;
    durationMinutes: number;
    location?: string;
  }) => Promise<void>;
  updateMeeting: (id: string, updates: Partial<Pick<Meeting, 'title' | 'description' | 'dayOfWeek' | 'startTime' | 'durationMinutes' | 'location' | 'active'>>) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  fetchOccurrences: (meetingId: string) => Promise<void>;
  updateOccurrence: (id: string, updates: { minutes?: string | null; status?: MeetingOccurrenceStatus }) => Promise<void>;
  getGoogleCalendarUrl: (meeting: Meeting, date: string) => string;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

function generateOccurrenceDates(dayOfWeek: number, weeks: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find next occurrence of dayOfWeek
  const current = new Date(today);
  const diff = (dayOfWeek - current.getDay() + 7) % 7;
  current.setDate(current.getDate() + (diff === 0 ? 0 : diff));

  for (let i = 0; i < weeks; i++) {
    const d = new Date(current);
    d.setDate(d.getDate() + i * 7);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function MeetingProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [occurrences, setOccurrences] = useState<Record<string, MeetingOccurrence[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchMeetings = useCallback(async () => {
    if (!appUser?.organizationId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('meetings')
        .select('*')
        .eq('organization_id', appUser.organizationId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (data) {
        setMeetings(data.map(m => ({
          id: m.id,
          organizationId: m.organization_id,
          title: m.title,
          description: m.description,
          dayOfWeek: m.day_of_week,
          startTime: m.start_time,
          durationMinutes: m.duration_minutes,
          location: m.location,
          createdBy: m.created_by,
          active: m.active,
          createdAt: m.created_at,
        })));
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  }, [appUser?.organizationId]);

  const addMeeting = useCallback(async (data: {
    title: string;
    description?: string;
    dayOfWeek: number;
    startTime: string;
    durationMinutes: number;
    location?: string;
  }) => {
    if (!appUser?.organizationId) return;

    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        organization_id: appUser.organizationId,
        title: data.title,
        description: data.description || null,
        day_of_week: data.dayOfWeek,
        start_time: data.startTime,
        duration_minutes: data.durationMinutes,
        location: data.location || null,
        created_by: appUser.id,
      })
      .select()
      .single();

    if (error || !meeting) return;

    // Generate occurrences for next 8 weeks
    const dates = generateOccurrenceDates(data.dayOfWeek, 8);
    const occRows = dates.map(date => ({
      meeting_id: meeting.id,
      organization_id: appUser.organizationId!,
      date,
      status: 'scheduled' as const,
    }));

    const { error: occErr } = await supabase.from('meeting_occurrences').insert(occRows);
    if (occErr) throw new Error(occErr.message);
    await fetchMeetings();
  }, [appUser, fetchMeetings]);

  const updateMeeting = useCallback(async (id: string, updates: Partial<Pick<Meeting, 'title' | 'description' | 'dayOfWeek' | 'startTime' | 'durationMinutes' | 'location' | 'active'>>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.dayOfWeek !== undefined) dbUpdates.day_of_week = updates.dayOfWeek;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.durationMinutes !== undefined) dbUpdates.duration_minutes = updates.durationMinutes;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.active !== undefined) dbUpdates.active = updates.active;

    const { error } = await supabase.from('meetings').update(dbUpdates).eq('id', id);
    if (error) throw new Error(error.message);
    await fetchMeetings();
  }, [fetchMeetings]);

  const deleteMeeting = useCallback(async (id: string) => {
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setOccurrences(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await fetchMeetings();
  }, [fetchMeetings]);

  const fetchOccurrences = useCallback(async (meetingId: string) => {
    const { data } = await supabase
      .from('meeting_occurrences')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('date', { ascending: true });

    if (data) {
      setOccurrences(prev => ({
        ...prev,
        [meetingId]: data.map(o => ({
          id: o.id,
          meetingId: o.meeting_id,
          organizationId: o.organization_id,
          date: o.date,
          status: o.status,
          minutes: o.minutes,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        })),
      }));
    }
  }, []);

  const updateOccurrence = useCallback(async (id: string, updates: { minutes?: string | null; status?: MeetingOccurrenceStatus }) => {
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.minutes !== undefined) dbUpdates.minutes = updates.minutes;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabase.from('meeting_occurrences').update(dbUpdates).eq('id', id);
    if (error) throw new Error(error.message);

    // Refresh all occurrences that contain this id
    setOccurrences(prev => {
      const next = { ...prev };
      for (const [mId, occs] of Object.entries(next)) {
        const idx = occs.findIndex(o => o.id === id);
        if (idx !== -1) {
          next[mId] = occs.map(o => o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o);
          break;
        }
      }
      return next;
    });
  }, []);

  const getGoogleCalendarUrl = useCallback((meeting: Meeting, date: string) => {
    const [h, m] = meeting.startTime.split(':').map(Number);
    const start = new Date(`${date}T00:00:00`);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + meeting.durationMinutes * 60000);

    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: meeting.title,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: meeting.description || '',
      location: meeting.location || '',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, []);

  return (
    <MeetingContext.Provider value={{
      meetings, occurrences, loading,
      fetchMeetings, addMeeting, updateMeeting, deleteMeeting,
      fetchOccurrences, updateOccurrence, getGoogleCalendarUrl,
    }}>
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeetings() {
  const ctx = useContext(MeetingContext);
  if (!ctx) throw new Error('useMeetings must be used within MeetingProvider');
  return ctx;
}
