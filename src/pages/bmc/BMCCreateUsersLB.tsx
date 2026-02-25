import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase, getAccessTokenFresh } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const TEAM = [
  { name: 'Saso', email: 'saso@lbconstructora.com' },
  { name: 'Joaco', email: 'joaco@lbconstructora.com' },
  { name: 'Iván', email: 'ivan@lbconstructora.com' },
  { name: 'Cecilia', email: 'cecilia@lbconstructora.com' },
  { name: 'Pancha', email: 'pancha@lbconstructora.com' },
];

const DEFAULT_PASSWORD = 'WAU2026';

export function BMCCreateUsersLB() {
  const { organization, appUser } = useAuth();
  const [status, setStatus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const log = (msg: string) => setStatus(prev => [...prev, msg]);

  const run = async () => {
    if (!organization?.id || !appUser?.id) {
      log('ERROR: No hay organización o usuario activo');
      return;
    }

    setLoading(true);
    try {
      // 1. Find LB Constructora project
      log('Buscando proyecto LB Constructora...');
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', organization.id);

      const project = projects?.find(p =>
        p.name.toLowerCase().includes('lb') ||
        p.name.toLowerCase().includes('constructora')
      );

      if (!project) {
        log('ERROR: No se encontró el proyecto LB Constructora');
        setLoading(false);
        return;
      }
      log(`Proyecto: ${project.name} (${project.id})`);

      // 2. Find BMC canvas for this project
      log('Buscando canvas BMC...');
      const { data: canvases } = await supabase
        .from('bmc_canvases')
        .select('id, name')
        .eq('project_id', project.id);

      const canvas = canvases?.[0];
      if (!canvas) {
        log('ERROR: No se encontró canvas BMC para este proyecto');
        setLoading(false);
        return;
      }
      log(`Canvas: ${canvas.name} (${canvas.id})`);

      // 3. Get existing BMC participants
      log('Obteniendo participantes BMC...');
      const { data: bmcParticipants } = await supabase
        .from('bmc_participants')
        .select('id, name, user_id')
        .eq('canvas_id', canvas.id);

      log(`${bmcParticipants?.length || 0} participantes BMC encontrados`);

      // Get auth token for API calls (direct from localStorage to avoid lock)
      const token = await getAccessTokenFresh();

      // 4. Create users, add to project, link to BMC
      for (const member of TEAM) {
        log(`\n--- ${member.name} (${member.email}) ---`);

        // Check if user already exists
        const { data: existing } = await supabase
          .from('users')
          .select('id, email')
          .ilike('email', member.email)
          .maybeSingle();

        let userId: string;

        if (existing) {
          userId = existing.id;
          log(`  Usuario ya existe: ${userId}`);
        } else {
          // Create user via API
          log(`  Creando usuario...`);
          let created = false;

          try {
            const res = await fetch('/api/create-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                email: member.email,
                password: DEFAULT_PASSWORD,
                fullName: member.name,
                organizationId: organization.id,
                role: 'member',
                userType: 'client',
              }),
            });

            const text = await res.text();
            if (text) {
              const result = JSON.parse(text);
              if (res.ok && result.userId) {
                userId = result.userId;
                created = true;
                log(`  Usuario creado via API: ${userId}`);
              } else {
                log(`  API respondió con error: ${result.error || text}`);
              }
            }
          } catch {
            log(`  API no disponible, usando fallback...`);
          }

          if (!created) {
            // Fallback: use isolated Supabase client
            const tempClient = createClient(
              import.meta.env.VITE_SUPABASE_URL,
              import.meta.env.VITE_SUPABASE_ANON_KEY,
              { auth: { autoRefreshToken: false, persistSession: false } }
            );

            const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
              email: member.email,
              password: DEFAULT_PASSWORD,
              options: { data: { full_name: member.name } },
            });

            if (signUpErr) {
              log(`  ERROR creando usuario: ${signUpErr.message}`);
              continue;
            }
            if (!signUpData.user) {
              log(`  ERROR: signUp no devolvió usuario`);
              continue;
            }

            userId = signUpData.user.id;
            log(`  Usuario creado via signUp: ${userId}`);

            // Wait for trigger, then upsert user row
            await new Promise(r => setTimeout(r, 500));
            await supabase.from('users').upsert({
              id: userId,
              email: member.email,
              full_name: member.name,
              organization_id: organization.id,
              role: 'member',
              user_type: 'client',
            }, { onConflict: 'id' });
            log(`  Registro en tabla users creado`);
          }
        }

        // Add as project participant (if not already)
        const { data: existingPart } = await supabase
          .from('project_participants')
          .select('id')
          .eq('project_id', project.id)
          .eq('user_id', userId!)
          .maybeSingle();

        if (existingPart) {
          log(`  Ya es participante del proyecto`);
        } else {
          const { error: partErr } = await supabase
            .from('project_participants')
            .insert({
              project_id: project.id,
              user_id: userId!,
              role: 'alumno',
            });

          if (partErr) {
            log(`  ERROR agregando al proyecto: ${partErr.message}`);
          } else {
            log(`  Agregado al proyecto como alumno`);
          }
        }

        // Link to BMC participant
        const bmcPart = bmcParticipants?.find(p => p.name === member.name);
        if (bmcPart) {
          if (bmcPart.user_id) {
            log(`  BMC participant ya vinculado`);
          } else {
            const { error: linkErr } = await supabase
              .from('bmc_participants')
              .update({ user_id: userId! })
              .eq('id', bmcPart.id);

            if (linkErr) {
              log(`  ERROR vinculando BMC: ${linkErr.message}`);
            } else {
              log(`  Vinculado a participante BMC`);
            }
          }
        } else {
          log(`  No se encontró participante BMC con nombre "${member.name}"`);
        }
      }

      log('\n=== PROCESO COMPLETO ===');
      log(`5 usuarios creados con contraseña: ${DEFAULT_PASSWORD}`);
      log('Los emails se pueden editar desde Admin > Clientes');
      setDone(true);
    } catch (err: any) {
      log(`ERROR: ${err.message || JSON.stringify(err)}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Crear usuarios LB Constructora
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-2">
        Crea 5 usuarios con mails genéricos, los agrega al proyecto y los vincula a los participantes del BMC.
      </p>
      <div className="mb-6 bg-gray-50 dark:bg-[#1e1b1c] rounded-lg p-4 text-sm">
        {TEAM.map(m => (
          <div key={m.email} className="text-gray-700 dark:text-gray-300">
            <strong>{m.name}</strong> → {m.email} (contraseña: {DEFAULT_PASSWORD})
          </div>
        ))}
      </div>

      {!done && (
        <button
          onClick={run}
          disabled={loading}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Creando...' : 'Crear usuarios'}
        </button>
      )}

      {status.length > 0 && (
        <div className="mt-6 bg-gray-50 dark:bg-[#1e1b1c] rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
          {status.map((line, i) => (
            <div
              key={i}
              className={`${line.startsWith('ERROR') ? 'text-red-600' : line.startsWith('===') ? 'text-green-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
            >
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      )}

      {done && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-green-700 dark:text-green-400 font-medium">
            Usuarios creados. Podés editar los emails desde{' '}
            <a href="/admin/clients" className="underline">Admin &gt; Clientes</a>.
          </p>
        </div>
      )}
    </div>
  );
}
