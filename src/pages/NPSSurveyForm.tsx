import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const db = supabase as any;

export function NPSSurveyForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<{ id: string; sessionTitle: string; projectName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [liked, setLiked] = useState('');
  const [improvement, setImprovement] = useState('');

  useEffect(() => {
    const loadSurvey = async () => {
      if (!token) { setError('Token inválido'); setLoading(false); return; }

      const { data, error: err } = await db
        .from('nps_surveys')
        .select('id, session_title, is_active, projects(name)')
        .eq('token', token)
        .single();

      if (err || !data) {
        setError('Encuesta no encontrada');
      } else if (!data.is_active) {
        setError('Esta encuesta ya fue cerrada');
      } else {
        setSurvey({
          id: data.id,
          sessionTitle: data.session_title,
          projectName: data.projects?.name || '',
        });
      }
      setLoading(false);
    };
    loadSurvey();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey || score === null || !name.trim()) return;

    setSubmitting(true);
    const { error: err } = await db
      .from('nps_responses')
      .insert({
        survey_id: survey.id,
        respondent_name: name.trim(),
        score,
        liked: liked.trim() || null,
        improvement: improvement.trim() || null,
      });

    if (err) {
      setError('Error al enviar respuesta. Intentá de nuevo.');
      setSubmitting(false);
    } else {
      setSubmitted(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <XCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">{error}</h1>
          <p className="text-gray-500">Contactá al organizador si creés que es un error.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias por tu feedback!</h1>
          <p className="text-gray-500">Tu respuesta fue registrada correctamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/wau-logo.png" alt="WAU" className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">{survey!.sessionTitle}</h1>
          {survey!.projectName && (
            <p className="text-gray-500 mt-1">{survey!.projectName}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              placeholder="Nombre y apellido"
              required
            />
          </div>

          {/* Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              ¿Cómo calificas del 1 al 10 este encuentro? *
            </label>
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(n)}
                  className={`aspect-square rounded-lg text-sm font-bold transition-all ${
                    score === n
                      ? n >= 9
                        ? 'bg-green-500 text-white shadow-lg scale-110'
                        : n >= 7
                        ? 'bg-yellow-500 text-white shadow-lg scale-110'
                        : 'bg-red-500 text-white shadow-lg scale-110'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400">Muy malo</span>
              <span className="text-xs text-gray-400">Excelente</span>
            </div>
          </div>

          {/* Liked */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ¿Qué es lo que más te gustó del encuentro?
            </label>
            <textarea
              value={liked}
              onChange={(e) => setLiked(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
              rows={3}
              placeholder="Contanos qué te gustó..."
            />
          </div>

          {/* Improvement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ¿Qué sugerís como oportunidad de mejora?
            </label>
            <textarea
              value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
              rows={3}
              placeholder="Sugerencias de mejora..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting || score === null || !name.trim()}
            className="w-full py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar respuesta
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          WAU Platform
        </p>
      </div>
    </div>
  );
}
