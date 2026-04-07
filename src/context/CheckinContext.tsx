import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { notifyMany } from '../lib/notify';
import type {
  CheckinPlantilla, CheckinPlantillaPregunta, CheckinConfig, Checkin,
  CheckinPregunta, CheckinCompromiso, CheckinMetrica,
  CheckinStatus, CompromisoStatus, CheckinEmoji,
} from '../types/checkin';

interface CheckinContextType {
  // State
  plantillas: CheckinPlantilla[];
  plantillaPreguntas: CheckinPlantillaPregunta[];
  configs: CheckinConfig[];
  checkins: Checkin[];
  preguntas: CheckinPregunta[];
  compromisos: CheckinCompromiso[];
  metricas: CheckinMetrica[];
  loading: boolean;

  // Plantillas
  fetchPlantillas: () => Promise<void>;
  fetchPlantillaPreguntas: (plantillaId: string) => Promise<void>;
  addPlantilla: (data: Omit<CheckinPlantilla, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => Promise<CheckinPlantilla | null>;
  updatePlantilla: (id: string, updates: Partial<CheckinPlantilla>) => Promise<void>;
  deletePlantilla: (id: string) => Promise<void>;
  addPlantillaPregunta: (data: Omit<CheckinPlantillaPregunta, 'id' | 'createdAt'>) => Promise<CheckinPlantillaPregunta | null>;
  updatePlantillaPregunta: (id: string, updates: Partial<CheckinPlantillaPregunta>) => Promise<void>;
  deletePlantillaPregunta: (id: string) => Promise<void>;

  // Config
  fetchConfigs: () => Promise<void>;
  addConfig: (data: Omit<CheckinConfig, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => Promise<CheckinConfig | null>;
  updateConfig: (id: string, updates: Partial<CheckinConfig>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;

  // Checkins
  fetchCheckins: (projectId?: string) => Promise<void>;
  addCheckin: (data: Omit<Checkin, 'id' | 'organizationId' | 'token' | 'createdAt' | 'updatedAt'>) => Promise<Checkin | null>;
  updateCheckin: (id: string, updates: Partial<Checkin>) => Promise<void>;
  deleteCheckin: (id: string) => Promise<void>;
  cerrarCheckin: (id: string, data: { notasConsultor: string; resumenReunion: string }) => Promise<void>;

  // Public access (no auth required)
  fetchCheckinByToken: (token: string) => Promise<{ checkin: Checkin; preguntas: CheckinPregunta[]; compromisos: CheckinCompromiso[] } | null>;
  submitCheckinResponses: (token: string, data: {
    pulsoScore: number;
    npsScore?: number;
    emoji: CheckinEmoji;
    palabraClave?: string;
    necesitaAyudaUrgente: boolean;
    detalleAyudaUrgente?: string;
    respuestas: { preguntaId: string; respuesta: string }[];
    compromisosUpdate: { id: string; estado: CompromisoStatus; notas?: string }[];
  }) => Promise<boolean>;

  // Preguntas
  fetchPreguntas: (checkinId: string) => Promise<void>;

  // Compromisos
  fetchCompromisos: (options?: { checkinId?: string; proyectoId?: string; pendingOnly?: boolean }) => Promise<void>;
  addCompromiso: (data: Omit<CheckinCompromiso, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => Promise<CheckinCompromiso | null>;
  updateCompromiso: (id: string, updates: Partial<CheckinCompromiso>) => Promise<void>;
  deleteCompromiso: (id: string) => Promise<void>;

  // Metricas
  fetchMetricas: (checkinId: string) => Promise<void>;
  addMetrica: (data: Omit<CheckinMetrica, 'id' | 'createdAt'>) => Promise<CheckinMetrica | null>;
  updateMetrica: (id: string, updates: Partial<CheckinMetrica>) => Promise<void>;
  deleteMetrica: (id: string) => Promise<void>;
}

const CheckinContext = createContext<CheckinContextType | undefined>(undefined);

export function CheckinProvider({ children }: { children: ReactNode }) {
  const { appUser, organization } = useAuth();
  const db = supabase;

  const [plantillas, setPlantillas] = useState<CheckinPlantilla[]>([]);
  const [plantillaPreguntas, setPlantillaPreguntas] = useState<CheckinPlantillaPregunta[]>([]);
  const [configs, setConfigs] = useState<CheckinConfig[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [preguntas, setPreguntas] = useState<CheckinPregunta[]>([]);
  const [compromisos, setCompromisos] = useState<CheckinCompromiso[]>([]);
  const [metricas, setMetricas] = useState<CheckinMetrica[]>([]);
  const [loading, setLoading] = useState(false);

  // ===== PLANTILLAS =====

  const fetchPlantillas = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error } = await db
        .from('checkin_plantillas')
        .select('*')
        .or(`organization_id.eq.${organization.id},es_publica.eq.true`)
        .order('nombre');

      if (error) throw error;

      setPlantillas((data || []).map((p: any) => ({
        id: p.id,
        organizationId: p.organization_id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        tipo: p.tipo,
        esPublica: p.es_publica,
        creadoPor: p.creado_por,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching checkin plantillas:', err);
    }
  }, [organization?.id]);

  const fetchPlantillaPreguntas = useCallback(async (plantillaId: string) => {
    try {
      const { data, error } = await db
        .from('checkin_plantilla_preguntas')
        .select('*')
        .eq('plantilla_id', plantillaId)
        .order('orden');

      if (error) throw error;

      const mapped = (data || []).map((p: any) => ({
        id: p.id,
        plantillaId: p.plantilla_id,
        seccion: p.seccion,
        pregunta: p.pregunta,
        tipoRespuesta: p.tipo_respuesta,
        esRequerida: p.es_requerida,
        orden: p.orden,
        createdAt: p.created_at,
      }));

      setPlantillaPreguntas(prev => {
        const others = prev.filter(p => p.plantillaId !== plantillaId);
        return [...others, ...mapped];
      });
    } catch (err) {
      console.error('Error fetching checkin plantilla preguntas:', err);
    }
  }, []);

  const addPlantilla = useCallback(async (data: Omit<CheckinPlantilla, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<CheckinPlantilla | null> => {
    if (!organization?.id || !appUser?.id) {
      console.error('addPlantilla: missing org or user', { orgId: organization?.id, userId: appUser?.id });
      throw new Error('No se encontró la organización o el usuario. Intentá recargar la página.');
    }
    const { data: row, error } = await db
      .from('checkin_plantillas')
      .insert({
        organization_id: organization.id,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        tipo: data.tipo || 'custom',
        es_publica: data.esPublica ?? false,
        creado_por: data.creadoPor || appUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding checkin plantilla:', error);
      throw new Error(error.message || 'Error al crear la plantilla en la base de datos.');
    }

    const plantilla: CheckinPlantilla = {
      id: row.id,
      organizationId: row.organization_id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      tipo: row.tipo,
      esPublica: row.es_publica,
      creadoPor: row.creado_por,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    setPlantillas(prev => [...prev, plantilla].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return plantilla;
  }, [organization?.id, appUser?.id]);

  const updatePlantilla = useCallback(async (id: string, updates: Partial<CheckinPlantilla>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.nombre !== undefined) dbUpdates.nombre = updates.nombre;
      if (updates.descripcion !== undefined) dbUpdates.descripcion = updates.descripcion;
      if (updates.tipo !== undefined) dbUpdates.tipo = updates.tipo;
      if (updates.esPublica !== undefined) dbUpdates.es_publica = updates.esPublica;

      const { error } = await db.from('checkin_plantillas').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setPlantillas(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (err) {
      console.error('Error updating checkin plantilla:', err);
    }
  }, []);

  const deletePlantilla = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('checkin_plantillas').delete().eq('id', id);
      if (error) throw error;
      setPlantillas(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting checkin plantilla:', err);
    }
  }, []);

  const addPlantillaPregunta = useCallback(async (data: Omit<CheckinPlantillaPregunta, 'id' | 'createdAt'>): Promise<CheckinPlantillaPregunta | null> => {
    try {
      const { data: row, error } = await db
        .from('checkin_plantilla_preguntas')
        .insert({
          plantilla_id: data.plantillaId,
          seccion: data.seccion,
          pregunta: data.pregunta,
          tipo_respuesta: data.tipoRespuesta || 'texto',
          es_requerida: data.esRequerida ?? true,
          orden: data.orden ?? 0,
        })
        .select()
        .single();

      if (error) throw error;

      const pregunta: CheckinPlantillaPregunta = {
        id: row.id,
        plantillaId: row.plantilla_id,
        seccion: row.seccion,
        pregunta: row.pregunta,
        tipoRespuesta: row.tipo_respuesta,
        esRequerida: row.es_requerida,
        orden: row.orden,
        createdAt: row.created_at,
      };

      setPlantillaPreguntas(prev => [...prev, pregunta]);
      return pregunta;
    } catch (err) {
      console.error('Error adding checkin plantilla pregunta:', err);
      return null;
    }
  }, []);

  const updatePlantillaPregunta = useCallback(async (id: string, updates: Partial<CheckinPlantillaPregunta>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.pregunta !== undefined) dbUpdates.pregunta = updates.pregunta;
      if (updates.tipoRespuesta !== undefined) dbUpdates.tipo_respuesta = updates.tipoRespuesta;
      if (updates.esRequerida !== undefined) dbUpdates.es_requerida = updates.esRequerida;
      if (updates.orden !== undefined) dbUpdates.orden = updates.orden;

      const { error } = await db.from('checkin_plantilla_preguntas').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setPlantillaPreguntas(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (err) {
      console.error('Error updating checkin plantilla pregunta:', err);
    }
  }, []);

  const deletePlantillaPregunta = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('checkin_plantilla_preguntas').delete().eq('id', id);
      if (error) throw error;
      setPlantillaPreguntas(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting checkin plantilla pregunta:', err);
    }
  }, []);

  // ===== CONFIG =====

  const fetchConfigs = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error } = await db
        .from('checkin_config')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setConfigs((data || []).map((c: any) => ({
        id: c.id,
        organizationId: c.organization_id,
        proyectoId: c.proyecto_id,
        clienteId: c.cliente_id,
        activo: c.activo,
        frecuencia: c.frecuencia,
        diaPreferido: c.dia_preferido,
        horaEnvio: c.hora_envio,
        plantillaId: c.plantilla_id,
        metricasConfig: c.metricas_config,
        creadoPor: c.creado_por,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching checkin configs:', err);
    }
  }, [organization?.id]);

  const addConfig = useCallback(async (data: Omit<CheckinConfig, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<CheckinConfig | null> => {
    if (!organization?.id || !appUser?.id) {
      throw new Error('No se encontró la organización o el usuario. Recargá la página.');
    }
    const { data: row, error } = await db
      .from('checkin_config')
      .insert({
        organization_id: organization.id,
        proyecto_id: data.proyectoId || null,
        cliente_id: data.clienteId || null,
        activo: data.activo ?? true,
        frecuencia: data.frecuencia || 'semanal',
        dia_preferido: data.diaPreferido || null,
        hora_envio: data.horaEnvio || null,
        plantilla_id: data.plantillaId || null,
        metricas_config: data.metricasConfig || null,
        creado_por: data.creadoPor || appUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding checkin config:', error);
      throw new Error(error.message || 'Error al crear configuración de check-in.');
    }

      const config: CheckinConfig = {
        id: row.id,
        organizationId: row.organization_id,
        proyectoId: row.proyecto_id,
        clienteId: row.cliente_id,
        activo: row.activo,
        frecuencia: row.frecuencia,
        diaPreferido: row.dia_preferido,
        horaEnvio: row.hora_envio,
        plantillaId: row.plantilla_id,
        metricasConfig: row.metricas_config,
        creadoPor: row.creado_por,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setConfigs(prev => [config, ...prev]);
      return config;
  }, [organization?.id, appUser?.id]);

  const updateConfig = useCallback(async (id: string, updates: Partial<CheckinConfig>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.activo !== undefined) dbUpdates.activo = updates.activo;
      if (updates.frecuencia !== undefined) dbUpdates.frecuencia = updates.frecuencia;
      if (updates.diaPreferido !== undefined) dbUpdates.dia_preferido = updates.diaPreferido;
      if (updates.horaEnvio !== undefined) dbUpdates.hora_envio = updates.horaEnvio;
      if (updates.plantillaId !== undefined) dbUpdates.plantilla_id = updates.plantillaId;
      if (updates.metricasConfig !== undefined) dbUpdates.metricas_config = updates.metricasConfig;
      if (updates.proyectoId !== undefined) dbUpdates.proyecto_id = updates.proyectoId;
      if (updates.clienteId !== undefined) dbUpdates.cliente_id = updates.clienteId;

      const { error } = await db.from('checkin_config').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (err) {
      console.error('Error updating checkin config:', err);
    }
  }, []);

  const deleteConfig = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('checkin_config').delete().eq('id', id);
      if (error) throw error;
      setConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting checkin config:', err);
    }
  }, []);

  // ===== CHECKINS =====

  const fetchCheckins = useCallback(async (projectId?: string) => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      let query = db
        .from('checkins')
        .select('*, project:projects(name), client:clients(name)')
        .eq('organization_id', organization.id);

      if (projectId) query = query.eq('proyecto_id', projectId);
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      setCheckins((data || []).map((c: any) => ({
        id: c.id,
        organizationId: c.organization_id,
        configId: c.config_id,
        proyectoId: c.proyecto_id,
        clienteId: c.cliente_id,
        token: c.token,
        numero: c.numero,
        periodo: c.periodo,
        estado: c.estado,
        pulsoScore: c.pulso_score,
        npsScore: c.nps_score,
        emoji: c.emoji,
        palabraClave: c.palabra_clave,
        necesitaAyudaUrgente: c.necesita_ayuda_urgente,
        detalleAyudaUrgente: c.detalle_ayuda_urgente,
        notasConsultor: c.notas_consultor,
        resumenReunion: c.resumen_reunion,
        fechaEnvio: c.fecha_envio,
        fechaCompletadoCliente: c.fecha_completado_cliente,
        fechaReunion: c.fecha_reunion,
        fechaCierre: c.fecha_cierre,
        creadoPor: c.creado_por,
        projectName: c.project?.name || null,
        clientName: c.client?.name || null,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching checkins:', err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const addCheckin = useCallback(async (data: Omit<Checkin, 'id' | 'organizationId' | 'token' | 'createdAt' | 'updatedAt'>): Promise<Checkin | null> => {
    if (!organization?.id || !appUser?.id) {
      throw new Error('No se encontró la organización o el usuario. Recargá la página.');
    }
    const { data: row, error } = await db
      .from('checkins')
      .insert({
          organization_id: organization.id,
          config_id: data.configId || null,
          proyecto_id: data.proyectoId || null,
          cliente_id: data.clienteId || null,
          numero: data.numero || 1,
          periodo: data.periodo || null,
          estado: data.estado || 'pendiente',
          pulso_score: data.pulsoScore || null,
          nps_score: data.npsScore || null,
          emoji: data.emoji || null,
          palabra_clave: data.palabraClave || null,
          necesita_ayuda_urgente: data.necesitaAyudaUrgente ?? false,
          detalle_ayuda_urgente: data.detalleAyudaUrgente || null,
          notas_consultor: data.notasConsultor || null,
          resumen_reunion: data.resumenReunion || null,
          fecha_envio: data.fechaEnvio || null,
          fecha_completado_cliente: data.fechaCompletadoCliente || null,
          fecha_reunion: data.fechaReunion || null,
          fecha_cierre: data.fechaCierre || null,
          creado_por: data.creadoPor || appUser.id,
        })
        .select()
        .single();

    if (error) {
      console.error('Error adding checkin:', error);
      throw new Error(error.message || 'Error al crear check-in.');
    }

      const checkin: Checkin = {
        id: row.id,
        organizationId: row.organization_id,
        configId: row.config_id,
        proyectoId: row.proyecto_id,
        clienteId: row.cliente_id,
        token: row.token,
        numero: row.numero,
        periodo: row.periodo,
        estado: row.estado,
        pulsoScore: row.pulso_score,
        npsScore: row.nps_score,
        emoji: row.emoji,
        palabraClave: row.palabra_clave,
        necesitaAyudaUrgente: row.necesita_ayuda_urgente,
        detalleAyudaUrgente: row.detalle_ayuda_urgente,
        notasConsultor: row.notas_consultor,
        resumenReunion: row.resumen_reunion,
        fechaEnvio: row.fecha_envio,
        fechaCompletadoCliente: row.fecha_completado_cliente,
        fechaReunion: row.fecha_reunion,
        fechaCierre: row.fecha_cierre,
        creadoPor: row.creado_por,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setCheckins(prev => [checkin, ...prev]);
      return checkin;
  }, [organization?.id, appUser?.id]);

  const updateCheckin = useCallback(async (id: string, updates: Partial<Checkin>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.estado !== undefined) dbUpdates.estado = updates.estado;
      if (updates.pulsoScore !== undefined) dbUpdates.pulso_score = updates.pulsoScore;
      if (updates.npsScore !== undefined) dbUpdates.nps_score = updates.npsScore;
      if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
      if (updates.palabraClave !== undefined) dbUpdates.palabra_clave = updates.palabraClave;
      if (updates.necesitaAyudaUrgente !== undefined) dbUpdates.necesita_ayuda_urgente = updates.necesitaAyudaUrgente;
      if (updates.detalleAyudaUrgente !== undefined) dbUpdates.detalle_ayuda_urgente = updates.detalleAyudaUrgente;
      if (updates.notasConsultor !== undefined) dbUpdates.notas_consultor = updates.notasConsultor;
      if (updates.resumenReunion !== undefined) dbUpdates.resumen_reunion = updates.resumenReunion;
      if (updates.fechaEnvio !== undefined) dbUpdates.fecha_envio = updates.fechaEnvio;
      if (updates.fechaCompletadoCliente !== undefined) dbUpdates.fecha_completado_cliente = updates.fechaCompletadoCliente;
      if (updates.fechaReunion !== undefined) dbUpdates.fecha_reunion = updates.fechaReunion;
      if (updates.fechaCierre !== undefined) dbUpdates.fecha_cierre = updates.fechaCierre;
      if (updates.configId !== undefined) dbUpdates.config_id = updates.configId;
      if (updates.proyectoId !== undefined) dbUpdates.proyecto_id = updates.proyectoId;
      if (updates.clienteId !== undefined) dbUpdates.cliente_id = updates.clienteId;

      const { error } = await db.from('checkins').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setCheckins(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (err) {
      console.error('Error updating checkin:', err);
    }
  }, []);

  const deleteCheckin = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('checkins').delete().eq('id', id);
      if (error) throw error;
      setCheckins(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting checkin:', err);
    }
  }, []);

  const cerrarCheckin = useCallback(async (id: string, data: { notasConsultor: string; resumenReunion: string }) => {
    try {
      const now = new Date().toISOString();
      const { error } = await db
        .from('checkins')
        .update({
          estado: 'cerrado',
          fecha_cierre: now,
          notas_consultor: data.notasConsultor,
          resumen_reunion: data.resumenReunion,
        })
        .eq('id', id);

      if (error) throw error;

      setCheckins(prev => prev.map(c => c.id === id ? {
        ...c,
        estado: 'cerrado' as CheckinStatus,
        fechaCierre: now,
        notasConsultor: data.notasConsultor,
        resumenReunion: data.resumenReunion,
      } : c));
    } catch (err) {
      console.error('Error cerrando checkin:', err);
    }
  }, []);

  // ===== PUBLIC ACCESS (no auth required) =====

  const fetchCheckinByToken = useCallback(async (token: string): Promise<{ checkin: Checkin; preguntas: CheckinPregunta[]; compromisos: CheckinCompromiso[] } | null> => {
    try {
      // Fetch checkin by token (anonymous access)
      const { data: checkinRow, error: checkinError } = await supabase
        .from('checkins')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (checkinError) throw checkinError;
      if (!checkinRow) return null;

      const checkin: Checkin = {
        id: checkinRow.id,
        organizationId: checkinRow.organization_id,
        configId: checkinRow.config_id,
        proyectoId: checkinRow.proyecto_id,
        clienteId: checkinRow.cliente_id,
        token: checkinRow.token,
        numero: checkinRow.numero,
        periodo: checkinRow.periodo,
        estado: checkinRow.estado,
        pulsoScore: checkinRow.pulso_score,
        npsScore: checkinRow.nps_score,
        emoji: checkinRow.emoji,
        palabraClave: checkinRow.palabra_clave,
        necesitaAyudaUrgente: checkinRow.necesita_ayuda_urgente,
        detalleAyudaUrgente: checkinRow.detalle_ayuda_urgente,
        notasConsultor: checkinRow.notas_consultor,
        resumenReunion: checkinRow.resumen_reunion,
        fechaEnvio: checkinRow.fecha_envio,
        fechaCompletadoCliente: checkinRow.fecha_completado_cliente,
        fechaReunion: checkinRow.fecha_reunion,
        fechaCierre: checkinRow.fecha_cierre,
        creadoPor: checkinRow.creado_por,
        createdAt: checkinRow.created_at,
        updatedAt: checkinRow.updated_at,
      };

      // Fetch related preguntas
      const { data: preguntasData, error: preguntasError } = await supabase
        .from('checkin_preguntas')
        .select('*')
        .eq('checkin_id', checkinRow.id)
        .order('orden');

      if (preguntasError) throw preguntasError;

      const preguntasMapped: CheckinPregunta[] = (preguntasData || []).map((p: any) => ({
        id: p.id,
        checkinId: p.checkin_id,
        pregunta: p.pregunta,
        respuesta: p.respuesta,
        orden: p.orden,
        createdAt: p.created_at,
      }));

      // Fetch related compromisos
      const { data: compromisosData, error: compromisosError } = await supabase
        .from('checkin_compromisos')
        .select('*')
        .eq('checkin_id', checkinRow.id)
        .order('created_at');

      if (compromisosError) throw compromisosError;

      const compromisosMapped: CheckinCompromiso[] = (compromisosData || []).map((c: any) => ({
        id: c.id,
        organizationId: c.organization_id,
        checkinId: c.checkin_id,
        proyectoId: c.proyecto_id,
        descripcion: c.descripcion,
        responsable: c.responsable,
        prioridad: c.prioridad,
        estado: c.estado,
        fechaLimite: c.fecha_limite,
        notas: c.notas,
        checkinOrigenId: c.checkin_origen_id,
        checkinRevisionId: c.checkin_revision_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      return { checkin, preguntas: preguntasMapped, compromisos: compromisosMapped };
    } catch (err) {
      console.error('Error fetching checkin by token:', err);
      return null;
    }
  }, []);

  const submitCheckinResponses = useCallback(async (token: string, data: {
    pulsoScore: number;
    npsScore?: number;
    emoji: CheckinEmoji;
    palabraClave?: string;
    necesitaAyudaUrgente: boolean;
    detalleAyudaUrgente?: string;
    respuestas: { preguntaId: string; respuesta: string }[];
    compromisosUpdate: { id: string; estado: CompromisoStatus; notas?: string }[];
  }): Promise<boolean> => {
    try {
      // 1. Find the checkin by token
      const { data: checkinRow, error: findError } = await supabase
        .from('checkins')
        .select('id')
        .eq('token', token)
        .maybeSingle();

      if (findError) throw findError;
      if (!checkinRow) throw new Error('Checkin not found');

      // 2. Update checkin main fields
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('checkins')
        .update({
          pulso_score: data.pulsoScore,
          nps_score: data.npsScore ?? null,
          emoji: data.emoji,
          palabra_clave: data.palabraClave || null,
          necesita_ayuda_urgente: data.necesitaAyudaUrgente,
          detalle_ayuda_urgente: data.detalleAyudaUrgente || null,
          estado: 'completado_cliente',
          fecha_completado_cliente: now,
        })
        .eq('id', checkinRow.id);

      if (updateError) throw updateError;

      // 3. Update each pregunta's respuesta
      for (const resp of data.respuestas) {
        const { error: respError } = await supabase
          .from('checkin_preguntas')
          .update({ respuesta: resp.respuesta })
          .eq('id', resp.preguntaId);

        if (respError) throw respError;
      }

      // 4. Update each compromiso's estado and notas
      for (const comp of data.compromisosUpdate) {
        const compUpdates: Record<string, unknown> = { estado: comp.estado };
        if (comp.notas !== undefined) compUpdates.notas = comp.notas;

        const { error: compError } = await supabase
          .from('checkin_compromisos')
          .update(compUpdates)
          .eq('id', comp.id);

        if (compError) throw compError;
      }

      // Update local state
      setCheckins(prev => prev.map(c => c.token === token ? {
        ...c,
        pulsoScore: data.pulsoScore,
        npsScore: data.npsScore ?? null,
        emoji: data.emoji,
        palabraClave: data.palabraClave || null,
        necesitaAyudaUrgente: data.necesitaAyudaUrgente,
        detalleAyudaUrgente: data.detalleAyudaUrgente || null,
        estado: 'completado_cliente' as CheckinStatus,
        fechaCompletadoCliente: now,
      } : c));

      // Notify admins that a client completed the checkin
      try {
        const { data: checkinFull } = await supabase
          .from('checkins')
          .select('id, organization_id')
          .eq('token', token)
          .maybeSingle();

        if (checkinFull) {
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('organization_id', checkinFull.organization_id)
            .in('role', ['admin', 'super_admin']);

          if (admins && admins.length > 0) {
            notifyMany(admins.map(a => a.id), {
              organizationId: checkinFull.organization_id,
              type: 'checkin',
              title: 'Check-in completado por cliente',
              entityType: 'checkin',
              entityId: checkinFull.id,
              actionUrl: `/checkins/${checkinFull.id}`,
            });
          }
        }
      } catch { /* notification is best-effort */ }

      return true;
    } catch (err) {
      console.error('Error submitting checkin responses:', err);
      return false;
    }
  }, []);

  // ===== PREGUNTAS =====

  const fetchPreguntas = useCallback(async (checkinId: string) => {
    try {
      const { data, error } = await db
        .from('checkin_preguntas')
        .select('*')
        .eq('checkin_id', checkinId)
        .order('orden');

      if (error) throw error;

      const mapped = (data || []).map((p: any) => ({
        id: p.id,
        checkinId: p.checkin_id,
        seccion: p.seccion,
        pregunta: p.pregunta,
        respuesta: p.respuesta,
        orden: p.orden,
        createdAt: p.created_at,
      }));

      setPreguntas(prev => {
        const others = prev.filter(p => p.checkinId !== checkinId);
        return [...others, ...mapped];
      });
    } catch (err) {
      console.error('Error fetching checkin preguntas:', err);
    }
  }, []);

  // ===== COMPROMISOS =====

  const fetchCompromisos = useCallback(async (options?: { checkinId?: string; proyectoId?: string; pendingOnly?: boolean }) => {
    if (!organization?.id) return;
    try {
      let query = db
        .from('checkin_compromisos')
        .select('*')
        .eq('organization_id', organization.id);

      if (options?.checkinId) query = query.eq('checkin_id', options.checkinId);
      if (options?.proyectoId) query = query.eq('proyecto_id', options.proyectoId);
      if (options?.pendingOnly) query = query.in('estado', ['pendiente', 'en_progreso']);

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((c: any) => ({
        id: c.id,
        organizationId: c.organization_id,
        checkinId: c.checkin_id,
        proyectoId: c.proyecto_id,
        descripcion: c.descripcion,
        responsable: c.responsable,
        prioridad: c.prioridad,
        estado: c.estado,
        fechaLimite: c.fecha_limite,
        notas: c.notas,
        checkinOrigenId: c.checkin_origen_id,
        checkinRevisionId: c.checkin_revision_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      if (options?.checkinId) {
        setCompromisos(prev => {
          const others = prev.filter(c => c.checkinId !== options.checkinId);
          return [...others, ...mapped];
        });
      } else {
        setCompromisos(mapped);
      }
    } catch (err) {
      console.error('Error fetching checkin compromisos:', err);
    }
  }, [organization?.id]);

  const addCompromiso = useCallback(async (data: Omit<CheckinCompromiso, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<CheckinCompromiso | null> => {
    if (!organization?.id) return null;
    try {
      const { data: row, error } = await db
        .from('checkin_compromisos')
        .insert({
          organization_id: organization.id,
          checkin_id: data.checkinId || null,
          proyecto_id: data.proyectoId || null,
          descripcion: data.descripcion,
          responsable: data.responsable || null,
          prioridad: data.prioridad || 'media',
          estado: data.estado || 'pendiente',
          fecha_limite: data.fechaLimite || null,
          notas: data.notas || null,
          checkin_origen_id: data.checkinOrigenId || null,
          checkin_revision_id: data.checkinRevisionId || null,
        })
        .select()
        .single();

      if (error) throw error;

      const compromiso: CheckinCompromiso = {
        id: row.id,
        organizationId: row.organization_id,
        checkinId: row.checkin_id,
        proyectoId: row.proyecto_id,
        descripcion: row.descripcion,
        responsable: row.responsable,
        prioridad: row.prioridad,
        estado: row.estado,
        fechaLimite: row.fecha_limite,
        notas: row.notas,
        checkinOrigenId: row.checkin_origen_id,
        checkinRevisionId: row.checkin_revision_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setCompromisos(prev => [compromiso, ...prev]);
      return compromiso;
    } catch (err) {
      console.error('Error adding checkin compromiso:', err);
      return null;
    }
  }, [organization?.id]);

  const updateCompromiso = useCallback(async (id: string, updates: Partial<CheckinCompromiso>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.descripcion !== undefined) dbUpdates.descripcion = updates.descripcion;
      if (updates.responsable !== undefined) dbUpdates.responsable = updates.responsable;
      if (updates.prioridad !== undefined) dbUpdates.prioridad = updates.prioridad;
      if (updates.estado !== undefined) dbUpdates.estado = updates.estado;
      if (updates.fechaLimite !== undefined) dbUpdates.fecha_limite = updates.fechaLimite;
      if (updates.notas !== undefined) dbUpdates.notas = updates.notas;
      if (updates.checkinRevisionId !== undefined) dbUpdates.checkin_revision_id = updates.checkinRevisionId;

      const { error } = await db.from('checkin_compromisos').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setCompromisos(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (err) {
      console.error('Error updating checkin compromiso:', err);
    }
  }, []);

  const deleteCompromiso = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('checkin_compromisos').delete().eq('id', id);
      if (error) throw error;
      setCompromisos(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting checkin compromiso:', err);
    }
  }, []);

  // ===== METRICAS =====

  const fetchMetricas = useCallback(async (checkinId: string) => {
    try {
      const { data, error } = await db
        .from('checkin_metricas')
        .select('*')
        .eq('checkin_id', checkinId)
        .order('created_at');

      if (error) throw error;

      const mapped = (data || []).map((m: any) => ({
        id: m.id,
        checkinId: m.checkin_id,
        nombreMetrica: m.nombre_metrica,
        valorActual: m.valor_actual,
        valorMeta: m.valor_meta,
        valorAnterior: m.valor_anterior,
        unidad: m.unidad,
        tendencia: m.tendencia,
        createdAt: m.created_at,
      }));

      setMetricas(prev => {
        const others = prev.filter(m => m.checkinId !== checkinId);
        return [...others, ...mapped];
      });
    } catch (err) {
      console.error('Error fetching checkin metricas:', err);
    }
  }, []);

  const addMetrica = useCallback(async (data: Omit<CheckinMetrica, 'id' | 'createdAt'>): Promise<CheckinMetrica | null> => {
    try {
      const { data: row, error } = await db
        .from('checkin_metricas')
        .insert({
          checkin_id: data.checkinId,
          nombre_metrica: data.nombreMetrica,
          valor_actual: data.valorActual ?? null,
          valor_meta: data.valorMeta ?? null,
          valor_anterior: data.valorAnterior ?? null,
          unidad: data.unidad || null,
          tendencia: data.tendencia || null,
        })
        .select()
        .single();

      if (error) throw error;

      const metrica: CheckinMetrica = {
        id: row.id,
        checkinId: row.checkin_id,
        nombreMetrica: row.nombre_metrica,
        valorActual: row.valor_actual,
        valorMeta: row.valor_meta,
        valorAnterior: row.valor_anterior,
        unidad: row.unidad,
        tendencia: row.tendencia,
        createdAt: row.created_at,
      };

      setMetricas(prev => [...prev, metrica]);
      return metrica;
    } catch (err) {
      console.error('Error adding checkin metrica:', err);
      return null;
    }
  }, []);

  const updateMetrica = useCallback(async (id: string, updates: Partial<CheckinMetrica>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.nombreMetrica !== undefined) dbUpdates.nombre_metrica = updates.nombreMetrica;
      if (updates.valorActual !== undefined) dbUpdates.valor_actual = updates.valorActual;
      if (updates.valorMeta !== undefined) dbUpdates.valor_meta = updates.valorMeta;
      if (updates.valorAnterior !== undefined) dbUpdates.valor_anterior = updates.valorAnterior;
      if (updates.unidad !== undefined) dbUpdates.unidad = updates.unidad;
      if (updates.tendencia !== undefined) dbUpdates.tendencia = updates.tendencia;

      const { error } = await db.from('checkin_metricas').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setMetricas(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    } catch (err) {
      console.error('Error updating checkin metrica:', err);
    }
  }, []);

  const deleteMetrica = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('checkin_metricas').delete().eq('id', id);
      if (error) throw error;
      setMetricas(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Error deleting checkin metrica:', err);
    }
  }, []);

  // ===== INITIAL LOAD =====

  useEffect(() => {
    if (organization?.id) {
      fetchPlantillas();
      fetchConfigs();
      fetchCheckins();
    }
  }, [organization?.id, fetchPlantillas, fetchConfigs, fetchCheckins]);

  // ===== CONTEXT VALUE =====

  const value: CheckinContextType = useMemo(() => ({
    plantillas, plantillaPreguntas, configs, checkins, preguntas, compromisos, metricas, loading,
    fetchPlantillas, fetchPlantillaPreguntas, addPlantilla, updatePlantilla, deletePlantilla,
    addPlantillaPregunta, updatePlantillaPregunta, deletePlantillaPregunta,
    fetchConfigs, addConfig, updateConfig, deleteConfig,
    fetchCheckins, addCheckin, updateCheckin, deleteCheckin, cerrarCheckin,
    fetchCheckinByToken, submitCheckinResponses,
    fetchPreguntas,
    fetchCompromisos, addCompromiso, updateCompromiso, deleteCompromiso,
    fetchMetricas, addMetrica, updateMetrica, deleteMetrica,
  }), [
    plantillas, plantillaPreguntas, configs, checkins, preguntas, compromisos, metricas, loading,
    fetchPlantillas, fetchPlantillaPreguntas, addPlantilla, updatePlantilla, deletePlantilla,
    addPlantillaPregunta, updatePlantillaPregunta, deletePlantillaPregunta,
    fetchConfigs, addConfig, updateConfig, deleteConfig,
    fetchCheckins, addCheckin, updateCheckin, deleteCheckin, cerrarCheckin,
    fetchCheckinByToken, submitCheckinResponses,
    fetchPreguntas,
    fetchCompromisos, addCompromiso, updateCompromiso, deleteCompromiso,
    fetchMetricas, addMetrica, updateMetrica, deleteMetrica,
  ]);

  return <CheckinContext.Provider value={value}>{children}</CheckinContext.Provider>;
}

export function useCheckin() {
  const context = useContext(CheckinContext);
  if (!context) throw new Error('useCheckin must be used within CheckinProvider');
  return context;
}
