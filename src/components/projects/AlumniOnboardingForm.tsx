import { useState, useEffect } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import type { AlumniProfile } from '../../types/projects';

interface AlumniOnboardingFormProps {
  projectId: string;
  userId: string;
  existingProfile?: AlumniProfile;
  onComplete: () => void;
}

export function AlumniOnboardingForm({ projectId, userId, existingProfile, onComplete }: AlumniOnboardingFormProps) {
  const { saveAlumniProfile } = useProjects();
  const { appUser } = useAuth();

  const [fullName, setFullName] = useState(existingProfile?.fullName ?? appUser?.fullName ?? '');
  const [company, setCompany] = useState(existingProfile?.company ?? '');
  const [position, setPosition] = useState(existingProfile?.position ?? '');
  const [phone, setPhone] = useState(existingProfile?.phone ?? '');
  const [city, setCity] = useState(existingProfile?.city ?? '');
  const [expectations, setExpectations] = useState(existingProfile?.expectations ?? '');
  const [previousExperience, setPreviousExperience] = useState(existingProfile?.previousExperience ?? '');
  const [targetKpi, setTargetKpi] = useState(existingProfile?.targetKpi ?? '');
  const [targetKpiCurrentValue, setTargetKpiCurrentValue] = useState(existingProfile?.targetKpiCurrentValue ?? '');
  const [targetKpiGoalValue, setTargetKpiGoalValue] = useState(existingProfile?.targetKpiGoalValue ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingProfile) {
      setFullName(existingProfile.fullName);
      setCompany(existingProfile.company ?? '');
      setPosition(existingProfile.position ?? '');
      setPhone(existingProfile.phone ?? '');
      setCity(existingProfile.city ?? '');
      setExpectations(existingProfile.expectations);
      setPreviousExperience(existingProfile.previousExperience ?? '');
      setTargetKpi(existingProfile.targetKpi);
      setTargetKpiCurrentValue(existingProfile.targetKpiCurrentValue ?? '');
      setTargetKpiGoalValue(existingProfile.targetKpiGoalValue ?? '');
    }
  }, [existingProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await saveAlumniProfile({
        projectId,
        userId,
        fullName,
        company: company || null,
        position: position || null,
        phone: phone || null,
        city: city || null,
        expectations,
        previousExperience: previousExperience || null,
        targetKpi,
        targetKpiCurrentValue: targetKpiCurrentValue || null,
        targetKpiGoalValue: targetKpiGoalValue || null,
      });
      if (result) {
        onComplete();
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
      {/* Datos personales */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          Datos personales
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre completo *</label>
            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Empresa</label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cargo</label>
            <input type="text" value={position} onChange={e => setPosition(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Telefono</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ciudad</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
          </div>
        </div>
      </section>

      {/* Sobre el curso */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          Sobre el curso
        </h3>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Que expectativas tenes de este proyecto/curso? *</label>
            <textarea required rows={3} value={expectations} onChange={e => setExpectations(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tenes experiencia previa en este tema?</label>
            <textarea rows={3} value={previousExperience} onChange={e => setPreviousExperience(e.target.value)} className={inputClass} />
          </div>
        </div>
      </section>

      {/* Indicador de mejora */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
          Indicador de mejora
        </h3>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Que indicador te gustaria ver que mejore con este proyecto? *</label>
            <input type="text" required value={targetKpi} onChange={e => setTargetKpi(e.target.value)} className={inputClass} placeholder='Ej: "Tasa de conversion", "Facturacion mensual"' />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Valor actual de ese indicador</label>
              <input type="text" value={targetKpiCurrentValue} onChange={e => setTargetKpiCurrentValue(e.target.value)} className={inputClass} placeholder='Ej: "15%", "$50.000"' />
            </div>
            <div>
              <label className={labelClass}>Cual es tu meta?</label>
              <input type="text" value={targetKpiGoalValue} onChange={e => setTargetKpiGoalValue(e.target.value)} className={inputClass} placeholder='Ej: "25%", "$100.000"' />
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : existingProfile ? 'Actualizar' : 'Completar onboarding'}
        </button>
      </div>
    </form>
  );
}
